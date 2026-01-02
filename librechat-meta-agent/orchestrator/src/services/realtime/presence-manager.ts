import { Pool } from 'pg';
import { Logger } from 'pino';
import Redis from 'ioredis';

/**
 * User presence status
 */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

/**
 * User presence data
 */
export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  currentView?: {
    type: 'project' | 'conversation' | 'workflow' | 'task';
    id: string;
    name?: string;
  };
  cursor?: {
    x: number;
    y: number;
    viewportId?: string;
  };
  lastActive: Date;
  metadata?: Record<string, any>;
}

/**
 * Typing indicator data
 */
export interface TypingIndicator {
  userId: string;
  roomId: string;
  isTyping: boolean;
  location?: string; // e.g., "message-input", "workflow-node-123"
  startedAt?: Date;
}

/**
 * Presence event types
 */
export type PresenceEvent =
  | { type: 'status:changed'; userId: string; status: PresenceStatus }
  | { type: 'view:changed'; userId: string; view: UserPresence['currentView'] }
  | { type: 'cursor:moved'; userId: string; cursor: UserPresence['cursor'] }
  | { type: 'typing:started'; userId: string; roomId: string; location?: string }
  | { type: 'typing:stopped'; userId: string; roomId: string }
  | { type: 'user:online'; userId: string }
  | { type: 'user:offline'; userId: string };

/**
 * Callback for presence events
 */
export type PresenceEventCallback = (event: PresenceEvent) => void;

/**
 * Presence Manager
 *
 * Tracks online users, their activities, and real-time indicators:
 * - Who's viewing what (projects, conversations, workflows)
 * - Cursor positions (for collaborative editing)
 * - Typing indicators
 * - Last active timestamps
 * - User status (online, away, busy, offline)
 */
export class PresenceManager {
  private db: Pool;
  private logger: Logger;
  private redis?: Redis;

  // In-memory cache for fast lookups
  private presenceCache: Map<string, UserPresence>;
  private typingIndicators: Map<string, Map<string, TypingIndicator>>; // roomId -> userId -> indicator
  private eventCallbacks: Set<PresenceEventCallback>;

  // Cleanup intervals
  private cleanupInterval: NodeJS.Timeout | null = null;
  private typingCleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly PRESENCE_TTL = 300; // 5 minutes in seconds
  private readonly TYPING_TIMEOUT = 5000; // 5 seconds
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute
  private readonly AWAY_THRESHOLD = 300000; // 5 minutes

  constructor(
    db: Pool,
    logger: Logger,
    redis?: Redis
  ) {
    this.db = db;
    this.logger = logger;
    this.redis = redis;
    this.presenceCache = new Map();
    this.typingIndicators = new Map();
    this.eventCallbacks = new Set();

    this.startCleanupTimers();
  }

  /**
   * Subscribe to presence events
   */
  public subscribe(callback: PresenceEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => {
      this.eventCallbacks.delete(callback);
    };
  }

  /**
   * Emit presence event to all subscribers
   */
  private emit(event: PresenceEvent): void {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.logger.error({ error, event }, 'Error in presence event callback');
      }
    });
  }

  /**
   * Update user presence
   */
  public async updatePresence(
    userId: string,
    updates: Partial<Omit<UserPresence, 'userId' | 'lastActive'>>
  ): Promise<UserPresence> {
    const now = new Date();

    // Get existing presence or create new
    let presence = this.presenceCache.get(userId);
    if (!presence) {
      presence = {
        userId,
        status: 'online',
        lastActive: now,
      };
    }

    // Update fields
    const updatedPresence: UserPresence = {
      ...presence,
      ...updates,
      userId,
      lastActive: now,
    };

    // Update cache
    this.presenceCache.set(userId, updatedPresence);

    // Persist to database
    try {
      await this.db.query(
        `INSERT INTO presence_status (user_id, status, current_view, cursor, metadata, last_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id)
         DO UPDATE SET
           status = EXCLUDED.status,
           current_view = EXCLUDED.current_view,
           cursor = EXCLUDED.cursor,
           metadata = EXCLUDED.metadata,
           last_active = EXCLUDED.last_active,
           updated_at = NOW()`,
        [
          userId,
          updatedPresence.status,
          JSON.stringify(updatedPresence.currentView || null),
          JSON.stringify(updatedPresence.cursor || null),
          JSON.stringify(updatedPresence.metadata || {}),
          now
        ]
      );
    } catch (error) {
      this.logger.error({ error, userId }, 'Error persisting presence to database');
    }

    // Store in Redis for fast distributed access
    if (this.redis) {
      try {
        await this.redis.setex(
          `presence:${userId}`,
          this.PRESENCE_TTL,
          JSON.stringify(updatedPresence)
        );
      } catch (error) {
        this.logger.error({ error, userId }, 'Error storing presence in Redis');
      }
    }

    // Emit events
    if (updates.status && updates.status !== presence.status) {
      this.emit({ type: 'status:changed', userId, status: updates.status });
    }
    if (updates.currentView) {
      this.emit({ type: 'view:changed', userId, view: updates.currentView });
    }
    if (updates.cursor) {
      this.emit({ type: 'cursor:moved', userId, cursor: updates.cursor });
    }

    this.logger.debug({ userId, updates }, 'Presence updated');

    return updatedPresence;
  }

  /**
   * Set user online
   */
  public async setOnline(userId: string, metadata?: Record<string, any>): Promise<UserPresence> {
    const presence = await this.updatePresence(userId, {
      status: 'online',
      metadata,
    });

    this.emit({ type: 'user:online', userId });
    this.logger.info({ userId }, 'User online');

    return presence;
  }

  /**
   * Set user offline
   */
  public async setOffline(userId: string): Promise<void> {
    const presence = await this.updatePresence(userId, {
      status: 'offline',
      cursor: undefined,
    });

    // Clear typing indicators
    this.typingIndicators.forEach((roomIndicators, roomId) => {
      if (roomIndicators.has(userId)) {
        roomIndicators.delete(userId);
        this.emit({ type: 'typing:stopped', userId, roomId });
      }
    });

    this.emit({ type: 'user:offline', userId });
    this.logger.info({ userId }, 'User offline');
  }

  /**
   * Get user presence
   */
  public async getPresence(userId: string): Promise<UserPresence | null> {
    // Check cache first
    let presence = this.presenceCache.get(userId);
    if (presence) {
      return presence;
    }

    // Try Redis
    if (this.redis) {
      try {
        const cached = await this.redis.get(`presence:${userId}`);
        if (cached) {
          presence = JSON.parse(cached);
          this.presenceCache.set(userId, presence!);
          return presence!;
        }
      } catch (error) {
        this.logger.error({ error, userId }, 'Error getting presence from Redis');
      }
    }

    // Fall back to database
    try {
      const result = await this.db.query(
        `SELECT user_id, status, current_view, cursor, metadata, last_active
         FROM presence_status
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        presence = {
          userId: row.user_id,
          status: row.status,
          currentView: row.current_view,
          cursor: row.cursor,
          metadata: row.metadata,
          lastActive: new Date(row.last_active),
        };
        this.presenceCache.set(userId, presence);
        return presence;
      }
    } catch (error) {
      this.logger.error({ error, userId }, 'Error getting presence from database');
    }

    return null;
  }

  /**
   * Get all online users
   */
  public async getOnlineUsers(): Promise<UserPresence[]> {
    const onlineUsers: UserPresence[] = [];

    // Get from cache
    this.presenceCache.forEach((presence) => {
      if (presence.status === 'online') {
        onlineUsers.push(presence);
      }
    });

    return onlineUsers;
  }

  /**
   * Get users viewing a specific resource
   */
  public async getUsersViewingResource(
    type: 'project' | 'conversation' | 'workflow' | 'task',
    id: string
  ): Promise<UserPresence[]> {
    const viewers: UserPresence[] = [];

    this.presenceCache.forEach((presence) => {
      if (
        presence.currentView?.type === type &&
        presence.currentView?.id === id &&
        presence.status === 'online'
      ) {
        viewers.push(presence);
      }
    });

    return viewers;
  }

  /**
   * Update user's current view
   */
  public async updateCurrentView(
    userId: string,
    view: UserPresence['currentView']
  ): Promise<void> {
    await this.updatePresence(userId, { currentView: view });
  }

  /**
   * Update user's cursor position
   */
  public async updateCursor(
    userId: string,
    cursor: UserPresence['cursor']
  ): Promise<void> {
    await this.updatePresence(userId, { cursor });
  }

  /**
   * Start typing indicator
   */
  public async startTyping(
    userId: string,
    roomId: string,
    location?: string
  ): Promise<void> {
    let roomIndicators = this.typingIndicators.get(roomId);
    if (!roomIndicators) {
      roomIndicators = new Map();
      this.typingIndicators.set(roomId, roomIndicators);
    }

    roomIndicators.set(userId, {
      userId,
      roomId,
      isTyping: true,
      location,
      startedAt: new Date(),
    });

    this.emit({ type: 'typing:started', userId, roomId, location });

    this.logger.debug({ userId, roomId, location }, 'Typing started');
  }

  /**
   * Stop typing indicator
   */
  public async stopTyping(userId: string, roomId: string): Promise<void> {
    const roomIndicators = this.typingIndicators.get(roomId);
    if (roomIndicators) {
      roomIndicators.delete(userId);

      if (roomIndicators.size === 0) {
        this.typingIndicators.delete(roomId);
      }
    }

    this.emit({ type: 'typing:stopped', userId, roomId });

    this.logger.debug({ userId, roomId }, 'Typing stopped');
  }

  /**
   * Get typing users in a room
   */
  public getTypingUsers(roomId: string): TypingIndicator[] {
    const roomIndicators = this.typingIndicators.get(roomId);
    if (!roomIndicators) return [];

    return Array.from(roomIndicators.values()).filter(
      (indicator) => indicator.isTyping
    );
  }

  /**
   * Clean up stale presence data
   */
  private async cleanupStalePresence(): Promise<void> {
    const now = Date.now();
    const staleUserIds: string[] = [];

    // Check for stale users in cache
    this.presenceCache.forEach((presence, userId) => {
      const timeSinceActive = now - presence.lastActive.getTime();

      if (timeSinceActive > this.AWAY_THRESHOLD && presence.status !== 'offline') {
        // Mark as away if inactive
        this.updatePresence(userId, { status: 'away' });
      }
    });

    this.logger.debug('Cleaned up stale presence data');
  }

  /**
   * Clean up stale typing indicators
   */
  private cleanupStaleTyping(): void {
    const now = Date.now();

    this.typingIndicators.forEach((roomIndicators, roomId) => {
      roomIndicators.forEach((indicator, userId) => {
        if (indicator.startedAt) {
          const elapsed = now - indicator.startedAt.getTime();
          if (elapsed > this.TYPING_TIMEOUT) {
            this.stopTyping(userId, roomId);
          }
        }
      });
    });
  }

  /**
   * Start cleanup timers
   */
  private startCleanupTimers(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, this.CLEANUP_INTERVAL);

    this.typingCleanupInterval = setInterval(() => {
      this.cleanupStaleTyping();
    }, this.TYPING_TIMEOUT);

    this.logger.info('Presence cleanup timers started');
  }

  /**
   * Stop cleanup timers
   */
  public stopCleanupTimers(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.typingCleanupInterval) {
      clearInterval(this.typingCleanupInterval);
      this.typingCleanupInterval = null;
    }

    this.logger.info('Presence cleanup timers stopped');
  }

  /**
   * Get presence statistics
   */
  public getStats(): {
    totalUsers: number;
    onlineUsers: number;
    awayUsers: number;
    busyUsers: number;
    typingRooms: number;
    totalTypingUsers: number;
  } {
    let onlineUsers = 0;
    let awayUsers = 0;
    let busyUsers = 0;

    this.presenceCache.forEach((presence) => {
      switch (presence.status) {
        case 'online':
          onlineUsers++;
          break;
        case 'away':
          awayUsers++;
          break;
        case 'busy':
          busyUsers++;
          break;
      }
    });

    let totalTypingUsers = 0;
    this.typingIndicators.forEach((roomIndicators) => {
      totalTypingUsers += roomIndicators.size;
    });

    return {
      totalUsers: this.presenceCache.size,
      onlineUsers,
      awayUsers,
      busyUsers,
      typingRooms: this.typingIndicators.size,
      totalTypingUsers,
    };
  }
}

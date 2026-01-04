/**
 * Browser WebSocket client for real-time collaboration
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Event emitter pattern
 * - Connection state management
 * - Message queuing during disconnection
 * - Heartbeat/ping-pong
 */

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface SocketMessage {
  type: string;
  payload?: any;
  roomId?: string;
  userId?: string;
  timestamp?: string;
}

export interface SocketClientConfig {
  url: string;
  autoReconnect?: boolean;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

type EventHandler = (data: any) => void;

/**
 * Real-time Socket Client
 */
export class SocketClient {
  private config: Required<SocketClientConfig>;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';

  // Event handlers
  private eventHandlers: Map<string, Set<EventHandler>>;

  // Connection management
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttemptCount: number = 0;
  private currentReconnectDelay: number;

  // Heartbeat
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPongTime: number = 0;

  // Message queue for offline messages
  private messageQueue: SocketMessage[] = [];
  private queueMessages: boolean = true;

  // Client info
  private clientId: string | null = null;
  private currentRoomId: string | null = null;

  constructor(config: SocketClientConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      reconnectAttempts: config.reconnectAttempts ?? Infinity,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      debug: config.debug ?? false,
    };

    this.currentReconnectDelay = this.config.reconnectDelay;
    this.eventHandlers = new Map();
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.log('Already connected');
        resolve();
        return;
      }

      this.setState('connecting');
      this.log('Connecting to', this.config.url);

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.log('Connected');
          this.setState('connected');
          this.reconnectAttemptCount = 0;
          this.currentReconnectDelay = this.config.reconnectDelay;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          this.log('WebSocket error', error);
          this.setState('error');
          this.emit('error', error);
        };

        this.ws.onclose = (event) => {
          this.log('Disconnected', event.code, event.reason);
          this.handleDisconnect();

          if (event.code !== 1000 && event.code !== 1001) {
            // Abnormal closure, reject if this is initial connection
            if (this.state === 'connecting') {
              reject(new Error(`Connection failed: ${event.reason || event.code}`));
            }
          }
        };
      } catch (error) {
        this.setState('error');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.log('Disconnecting...');
    this.queueMessages = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.setState('disconnected');
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: SocketMessage = JSON.parse(data);
      this.log('Received message:', message.type);

      // Handle built-in message types
      switch (message.type) {
        case 'connection:established':
          this.clientId = message.payload?.clientId;
          this.emit('connected', message.payload);
          break;

        case 'pong':
          this.lastPongTime = Date.now();
          break;

        case 'room:joined':
          this.currentRoomId = message.payload?.roomId;
          this.emit('room:joined', message.payload);
          break;

        case 'error':
          this.emit('error', message.payload);
          break;

        default:
          // Emit event for custom message types
          this.emit(message.type, message.payload || message);
          break;
      }

      // Emit all messages on '*' channel
      this.emit('*', message);
    } catch (error) {
      this.log('Error parsing message:', error);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(): void {
    this.setState('disconnected');
    this.stopHeartbeat();

    this.emit('disconnected', {
      clientId: this.clientId,
      roomId: this.currentRoomId,
    });

    // Auto reconnect
    if (this.config.autoReconnect && this.reconnectAttemptCount < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    this.setState('reconnecting');
    this.reconnectAttemptCount++;

    const delay = Math.min(
      this.currentReconnectDelay,
      this.config.maxReconnectDelay
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttemptCount})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnection failed:', error);
      });
    }, delay);

    // Exponential backoff
    this.currentReconnectDelay = Math.min(
      this.currentReconnectDelay * 2,
      this.config.maxReconnectDelay
    );

    this.emit('reconnecting', {
      attempt: this.reconnectAttemptCount,
      delay,
    });
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.lastPongTime = Date.now();

    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastPong = Date.now() - this.lastPongTime;

      // Check if connection is still alive
      if (timeSinceLastPong > this.config.heartbeatInterval * 2) {
        this.log('Heartbeat timeout, reconnecting...');
        this.ws?.close();
        return;
      }

      // Send ping
      this.send({ type: 'ping' });
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send message to server
   */
  public send(message: SocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.queueMessages) {
        this.log('Queueing message (not connected):', message.type);
        this.messageQueue.push(message);
      } else {
        this.log('Cannot send message (not connected):', message.type);
      }
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      }));
      this.log('Sent message:', message.type);
    } catch (error) {
      this.log('Error sending message:', error);
      if (this.queueMessages) {
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Join a room
   */
  public joinRoom(roomId: string, userId?: string, metadata?: any): void {
    this.send({
      type: 'join:room',
      payload: { roomId, userId, metadata },
    });
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (this.currentRoomId) {
      this.send({
        type: 'leave:room',
        payload: { roomId: this.currentRoomId },
      });
      this.currentRoomId = null;
    }
  }

  /**
   * Broadcast message to room
   */
  public broadcast(payload: any): void {
    this.send({
      type: 'broadcast:room',
      payload,
    });
  }

  /**
   * Update presence
   */
  public updatePresence(status: string, metadata?: any): void {
    this.send({
      type: 'presence:update',
      payload: { status, metadata },
    });
  }

  /**
   * Send cursor position
   */
  public sendCursor(x: number, y: number, viewportId?: string): void {
    this.send({
      type: 'cursor:move',
      payload: { x, y, viewportId },
    });
  }

  /**
   * Start typing indicator
   */
  public startTyping(location?: string): void {
    this.send({
      type: 'typing:start',
      payload: { location },
    });
  }

  /**
   * Stop typing indicator
   */
  public stopTyping(): void {
    this.send({
      type: 'typing:stop',
    });
  }

  /**
   * Subscribe to event
   */
  public on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from event
   */
  public off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Subscribe to event once
   */
  public once(event: string, handler: EventHandler): void {
    const onceHandler = (data: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.log('Error in event handler:', error);
        }
      });
    }
  }

  /**
   * Set connection state and emit event
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      const previousState = this.state;
      this.state = state;
      this.emit('stateChange', { state, previousState });
    }
  }

  /**
   * Get current connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get client ID
   */
  public getClientId(): string | null {
    return this.clientId;
  }

  /**
   * Get current room ID
   */
  public getRoomId(): string | null {
    return this.currentRoomId;
  }

  /**
   * Clear message queue
   */
  public clearQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Debug logging
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[SocketClient]', ...args);
    }
  }
}

/**
 * Create and connect socket client
 */
export async function createSocketClient(config: SocketClientConfig): Promise<SocketClient> {
  const client = new SocketClient(config);
  await client.connect();
  return client;
}

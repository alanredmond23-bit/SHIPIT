import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Types for WebSocket messages
export interface WSMessage {
  type: string;
  payload?: any;
  roomId?: string;
  userId?: string;
  timestamp?: string;
}

export interface WSClient {
  id: string;
  ws: WebSocket;
  userId?: string;
  roomId?: string;
  metadata: Record<string, any>;
  lastHeartbeat: Date;
  isAlive: boolean;
}

export interface Room {
  id: string;
  name?: string;
  clients: Map<string, WSClient>;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface WebSocketServerConfig {
  path?: string;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * Enhanced WebSocket Server for real-time collaboration
 * Features:
 * - Room-based connections (per project/conversation)
 * - User presence tracking
 * - Broadcast to room members
 * - Heartbeat/ping-pong for connection health
 * - Reconnection handling
 */
export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private logger: Logger;
  private clients: Map<string, WSClient>;
  private rooms: Map<string, Room>;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private config: Required<WebSocketServerConfig>;

  constructor(
    server: HttpServer,
    logger: Logger,
    config: WebSocketServerConfig = {}
  ) {
    this.logger = logger;
    this.clients = new Map();
    this.rooms = new Map();

    this.config = {
      path: config.path || '/ws/collaboration',
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      heartbeatTimeout: config.heartbeatTimeout || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectDelay: config.reconnectDelay || 3000,
    };

    this.wss = new WebSocketServer({
      server,
      path: this.config.path
    });

    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = uuidv4();
      this.handleConnection(ws, clientId, request);
    });

    this.wss.on('error', (error) => {
      this.logger.error({ error }, 'WebSocket server error');
    });

    // Start heartbeat checker
    this.startHeartbeat();

    this.logger.info(
      { path: this.config.path },
      'Collaboration WebSocket server initialized'
    );
  }

  private handleConnection(
    ws: WebSocket,
    clientId: string,
    request: any
  ): void {
    const client: WSClient = {
      id: clientId,
      ws,
      metadata: {},
      lastHeartbeat: new Date(),
      isAlive: true,
    };

    this.clients.set(clientId, client);

    this.logger.info(
      { clientId, url: request.url },
      'Client connected'
    );

    // Send welcome message
    this.sendToClient(client, {
      type: 'connection:established',
      payload: {
        clientId,
        timestamp: new Date().toISOString(),
      },
    });

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(client, data);
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
      client.isAlive = true;
      client.lastHeartbeat = new Date();
    });

    // Handle close
    ws.on('close', (code, reason) => {
      this.handleDisconnection(client, code, reason);
    });

    // Handle errors
    ws.on('error', (error) => {
      this.logger.error(
        { clientId, error: error.message },
        'Client WebSocket error'
      );
    });
  }

  private handleMessage(client: WSClient, rawData: any): void {
    try {
      const message: WSMessage = JSON.parse(rawData.toString());

      this.logger.debug(
        { clientId: client.id, type: message.type },
        'Received message'
      );

      // Handle built-in message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(client, { type: 'pong' });
          break;

        case 'join:room':
          this.handleJoinRoom(client, message);
          break;

        case 'leave:room':
          this.handleLeaveRoom(client, message);
          break;

        case 'broadcast:room':
          this.handleBroadcastToRoom(client, message);
          break;

        case 'presence:update':
          this.handlePresenceUpdate(client, message);
          break;

        case 'cursor:move':
          this.handleCursorMove(client, message);
          break;

        case 'typing:start':
        case 'typing:stop':
          this.handleTypingIndicator(client, message);
          break;

        default:
          // Forward other messages to room
          if (client.roomId) {
            this.broadcastToRoom(client.roomId, message, client.id);
          }
          break;
      }
    } catch (error) {
      this.logger.error(
        { clientId: client.id, error },
        'Error handling message'
      );

      this.sendToClient(client, {
        type: 'error',
        payload: {
          message: 'Invalid message format',
        },
      });
    }
  }

  private handleJoinRoom(client: WSClient, message: WSMessage): void {
    const { roomId, userId, metadata } = message.payload || {};

    if (!roomId) {
      this.sendToClient(client, {
        type: 'error',
        payload: { message: 'roomId is required' },
      });
      return;
    }

    // Leave current room if in one
    if (client.roomId) {
      this.leaveRoom(client);
    }

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        name: metadata?.name,
        clients: new Map(),
        metadata: metadata || {},
        createdAt: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    // Add client to room
    client.roomId = roomId;
    client.userId = userId;
    client.metadata = { ...client.metadata, ...metadata };
    room.clients.set(client.id, client);

    this.logger.info(
      { clientId: client.id, roomId, userId },
      'Client joined room'
    );

    // Notify client
    this.sendToClient(client, {
      type: 'room:joined',
      payload: {
        roomId,
        members: this.getRoomMembers(roomId),
      },
    });

    // Notify other room members
    this.broadcastToRoom(
      roomId,
      {
        type: 'member:joined',
        payload: {
          clientId: client.id,
          userId: client.userId,
          metadata: client.metadata,
        },
      },
      client.id
    );
  }

  private handleLeaveRoom(client: WSClient, message: WSMessage): void {
    this.leaveRoom(client);
  }

  private leaveRoom(client: WSClient): void {
    if (!client.roomId) return;

    const roomId = client.roomId;
    const room = this.rooms.get(roomId);

    if (room) {
      room.clients.delete(client.id);

      this.logger.info(
        { clientId: client.id, roomId },
        'Client left room'
      );

      // Notify other room members
      this.broadcastToRoom(
        roomId,
        {
          type: 'member:left',
          payload: {
            clientId: client.id,
            userId: client.userId,
          },
        },
        client.id
      );

      // Clean up empty room
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
        this.logger.info({ roomId }, 'Room closed (no members)');
      }
    }

    client.roomId = undefined;
  }

  private handleBroadcastToRoom(client: WSClient, message: WSMessage): void {
    if (!client.roomId) {
      this.sendToClient(client, {
        type: 'error',
        payload: { message: 'Not in a room' },
      });
      return;
    }

    this.broadcastToRoom(client.roomId, message.payload, client.id);
  }

  private handlePresenceUpdate(client: WSClient, message: WSMessage): void {
    if (!client.roomId) return;

    const { status, metadata } = message.payload || {};
    client.metadata = { ...client.metadata, status, ...metadata };

    this.broadcastToRoom(
      client.roomId,
      {
        type: 'presence:updated',
        payload: {
          clientId: client.id,
          userId: client.userId,
          status,
          metadata,
        },
      },
      client.id
    );
  }

  private handleCursorMove(client: WSClient, message: WSMessage): void {
    if (!client.roomId) return;

    const { x, y, viewportId } = message.payload || {};

    this.broadcastToRoom(
      client.roomId,
      {
        type: 'cursor:moved',
        payload: {
          clientId: client.id,
          userId: client.userId,
          x,
          y,
          viewportId,
        },
      },
      client.id
    );
  }

  private handleTypingIndicator(client: WSClient, message: WSMessage): void {
    if (!client.roomId) return;

    this.broadcastToRoom(
      client.roomId,
      {
        type: message.type,
        payload: {
          clientId: client.id,
          userId: client.userId,
          ...message.payload,
        },
      },
      client.id
    );
  }

  private handleDisconnection(
    client: WSClient,
    code: number,
    reason: Buffer
  ): void {
    this.logger.info(
      {
        clientId: client.id,
        code,
        reason: reason.toString()
      },
      'Client disconnected'
    );

    // Leave room if in one
    this.leaveRoom(client);

    // Remove from clients map
    this.clients.delete(client.id);
  }

  /**
   * Start heartbeat checker to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          this.logger.warn(
            { clientId: client.id },
            'Client failed heartbeat, terminating'
          );
          client.ws.terminate();
          return;
        }

        client.isAlive = false;
        client.ws.ping();
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Send message to specific client
   */
  public sendToClient(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          ...message,
          timestamp: message.timestamp || new Date().toISOString(),
        }));
      } catch (error) {
        this.logger.error(
          { clientId: client.id, error },
          'Error sending message to client'
        );
      }
    }
  }

  /**
   * Broadcast message to all clients in a room
   */
  public broadcastToRoom(
    roomId: string,
    message: WSMessage,
    excludeClientId?: string
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.clients.forEach((client) => {
      if (client.id !== excludeClientId) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcastToAll(message: WSMessage, excludeClientId?: string): void {
    this.clients.forEach((client) => {
      if (client.id !== excludeClientId) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Get list of members in a room
   */
  public getRoomMembers(roomId: string): Array<{
    clientId: string;
    userId?: string;
    metadata: Record<string, any>;
  }> {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room.clients.values()).map((client) => ({
      clientId: client.id,
      userId: client.userId,
      metadata: client.metadata,
    }));
  }

  /**
   * Get all active rooms
   */
  public getRooms(): Array<{
    roomId: string;
    name?: string;
    memberCount: number;
    metadata: Record<string, any>;
  }> {
    return Array.from(this.rooms.values()).map((room) => ({
      roomId: room.id,
      name: room.name,
      memberCount: room.clients.size,
      metadata: room.metadata,
    }));
  }

  /**
   * Get client by ID
   */
  public getClient(clientId: string): WSClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients for a user
   */
  public getClientsByUserId(userId: string): WSClient[] {
    return Array.from(this.clients.values()).filter(
      (client) => client.userId === userId
    );
  }

  /**
   * Close WebSocket server
   */
  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      this.wss.close((err) => {
        if (err) {
          this.logger.error({ error: err }, 'Error closing WebSocket server');
          reject(err);
        } else {
          this.logger.info('WebSocket server closed');
          resolve();
        }
      });
    });
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    totalClients: number;
    totalRooms: number;
    clientsPerRoom: Record<string, number>;
  } {
    const clientsPerRoom: Record<string, number> = {};
    this.rooms.forEach((room, roomId) => {
      clientsPerRoom[roomId] = room.clients.size;
    });

    return {
      totalClients: this.clients.size,
      totalRooms: this.rooms.size,
      clientsPerRoom,
    };
  }
}

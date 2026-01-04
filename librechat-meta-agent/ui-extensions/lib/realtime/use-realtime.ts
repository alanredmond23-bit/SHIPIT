'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { SocketClient, SocketMessage, ConnectionState } from './socket-client';

/**
 * User presence data
 */
export interface UserPresence {
  userId: string;
  clientId: string;
  status?: 'online' | 'away' | 'busy';
  metadata?: Record<string, any>;
}

/**
 * Cursor position data
 */
export interface CursorPosition {
  userId: string;
  clientId: string;
  x: number;
  y: number;
  viewportId?: string;
  color?: string;
  name?: string;
}

/**
 * Typing indicator data
 */
export interface TypingUser {
  userId: string;
  clientId: string;
  location?: string;
  name?: string;
}

/**
 * useSocket - Main hook for WebSocket connection
 */
export function useSocket(url: string, autoConnect: boolean = true) {
  const [socket, setSocket] = useState<SocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    const client = new SocketClient({
      url,
      autoReconnect: true,
      debug: process.env.NODE_ENV === 'development',
    });

    client.on('stateChange', ({ state }) => {
      setConnectionState(state);
    });

    client.on('error', (err) => {
      setError(err instanceof Error ? err : new Error(String(err)));
    });

    client.connect().catch((err) => {
      setError(err);
    });

    setSocket(client);

    return () => {
      client.disconnect();
    };
  }, [url, autoConnect]);

  const connect = useCallback(() => {
    if (socket) {
      socket.connect();
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
  }, [socket]);

  return {
    socket,
    connectionState,
    isConnected: connectionState === 'connected',
    error,
    connect,
    disconnect,
  };
}

/**
 * usePresence - Track online users in a room
 */
export function usePresence(socket: SocketClient | null, roomId: string, userId?: string) {
  const [members, setMembers] = useState<UserPresence[]>([]);
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join room
    socket.joinRoom(roomId, userId);

    // Handle room joined
    const unsubJoined = socket.on('room:joined', (data) => {
      setIsJoined(true);
      setMembers(data.members || []);
    });

    // Handle member joined
    const unsubMemberJoined = socket.on('member:joined', (data) => {
      setMembers((prev) => {
        const exists = prev.some((m) => m.clientId === data.clientId);
        if (exists) return prev;
        return [...prev, {
          userId: data.userId,
          clientId: data.clientId,
          status: data.metadata?.status || 'online',
          metadata: data.metadata,
        }];
      });
    });

    // Handle member left
    const unsubMemberLeft = socket.on('member:left', (data) => {
      setMembers((prev) => prev.filter((m) => m.clientId !== data.clientId));
    });

    // Handle presence updated
    const unsubPresenceUpdated = socket.on('presence:updated', (data) => {
      setMembers((prev) => {
        return prev.map((m) => {
          if (m.clientId === data.clientId) {
            return {
              ...m,
              status: data.status,
              metadata: { ...m.metadata, ...data.metadata },
            };
          }
          return m;
        });
      });
    });

    return () => {
      socket.leaveRoom();
      unsubJoined();
      unsubMemberJoined();
      unsubMemberLeft();
      unsubPresenceUpdated();
      setIsJoined(false);
    };
  }, [socket, roomId, userId]);

  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'busy', metadata?: any) => {
      if (socket) {
        socket.updatePresence(status, metadata);
      }
    },
    [socket]
  );

  return {
    members,
    isJoined,
    updatePresence,
  };
}

/**
 * useRealtimeData - Subscribe to real-time data changes
 */
export function useRealtimeData<T = any>(
  socket: SocketClient | null,
  eventType: string,
  initialData?: T
) {
  const [data, setData] = useState<T | undefined>(initialData);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!socket) return;

    const unsubscribe = socket.on(eventType, (newData: T) => {
      setData(newData);
      setLastUpdate(new Date());
    });

    return () => {
      unsubscribe();
    };
  }, [socket, eventType]);

  const sendUpdate = useCallback(
    (update: any) => {
      if (socket) {
        socket.send({
          type: eventType,
          payload: update,
        });
      }
    },
    [socket, eventType]
  );

  return {
    data,
    lastUpdate,
    sendUpdate,
  };
}

/**
 * useCursors - Track collaborative cursor positions
 */
export function useCursors(socket: SocketClient | null, viewportId?: string) {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const unsubscribe = socket.on('cursor:moved', (data) => {
      // Only show cursors for the same viewport
      if (viewportId && data.viewportId && data.viewportId !== viewportId) {
        return;
      }

      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.clientId, {
          userId: data.userId,
          clientId: data.clientId,
          x: data.x,
          y: data.y,
          viewportId: data.viewportId,
        });
        return next;
      });

      // Remove cursor after inactivity
      setTimeout(() => {
        setCursors((prev) => {
          const next = new Map(prev);
          next.delete(data.clientId);
          return next;
        });
      }, 5000);
    });

    return () => {
      unsubscribe();
    };
  }, [socket, viewportId]);

  const sendCursorPosition = useCallback(
    (x: number, y: number) => {
      if (!socket) return;

      // Throttle cursor updates to avoid flooding
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }

      throttleTimeout.current = setTimeout(() => {
        socket.sendCursor(x, y, viewportId);
      }, 50); // Update at most 20 times per second
    },
    [socket, viewportId]
  );

  return {
    cursors: Array.from(cursors.values()),
    sendCursorPosition,
  };
}

/**
 * useTypingIndicator - Track who's typing
 */
export function useTypingIndicator(socket: SocketClient | null, location?: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    const unsubTypingStart = socket.on('typing:start', (data) => {
      // Only track typing in same location
      if (location && data.location && data.location !== location) {
        return;
      }

      setTypingUsers((prev) => {
        const exists = prev.some((u) => u.clientId === data.clientId);
        if (exists) return prev;
        return [...prev, {
          userId: data.userId,
          clientId: data.clientId,
          location: data.location,
        }];
      });
    });

    const unsubTypingStop = socket.on('typing:stop', (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.clientId !== data.clientId));
    });

    return () => {
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [socket, location]);

  const startTyping = useCallback(() => {
    if (!socket) return;

    socket.startTyping(location);

    // Auto-stop typing after 5 seconds
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      socket.stopTyping();
    }, 5000);
  }, [socket, location]);

  const stopTyping = useCallback(() => {
    if (!socket) return;

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }

    socket.stopTyping();
  }, [socket]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
}

/**
 * useRoomSync - Sync data with operational transforms
 */
export function useRoomSync<T = any>(
  socket: SocketClient | null,
  resourceId: string,
  initialData: T
) {
  const [data, setData] = useState<T>(initialData);
  const [version, setVersion] = useState(0);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    if (!socket) return;

    const unsubSyncUpdate = socket.on('sync:update', (payload) => {
      if (payload.resourceId === resourceId) {
        setData(payload.data);
        setVersion(payload.version);
      }
    });

    const unsubSyncConflict = socket.on('sync:conflict', (payload) => {
      if (payload.resourceId === resourceId) {
        setConflicts((prev) => [...prev, payload]);
      }
    });

    return () => {
      unsubSyncUpdate();
      unsubSyncConflict();
    };
  }, [socket, resourceId]);

  const sendOperation = useCallback(
    (operation: any) => {
      if (!socket) return;

      socket.send({
        type: 'sync:operation',
        payload: {
          resourceId,
          operation: {
            ...operation,
            version,
          },
        },
      });
    },
    [socket, resourceId, version]
  );

  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'accept' | 'reject') => {
      setConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    },
    []
  );

  return {
    data,
    version,
    conflicts,
    sendOperation,
    resolveConflict,
  };
}

/**
 * useBroadcast - Simple broadcast/subscribe pattern
 */
export function useBroadcast(socket: SocketClient | null) {
  const broadcast = useCallback(
    (message: any) => {
      if (socket) {
        socket.broadcast(message);
      }
    },
    [socket]
  );

  const subscribe = useCallback(
    (eventType: string, handler: (data: any) => void) => {
      if (!socket) return () => {};
      return socket.on(eventType, handler);
    },
    [socket]
  );

  return {
    broadcast,
    subscribe,
  };
}

type EventHandler = (data: any) => void;

export class EventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private wildcardHandlers: Set<EventHandler> = new Set();

  subscribe(event: string, handler: EventHandler): () => void {
    if (event === '*') {
      this.wildcardHandlers.add(handler);
      return () => this.wildcardHandlers.delete(handler);
    }

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit(event: string, data: any): void {
    const eventData = { event, data, timestamp: new Date().toISOString() };

    // Notify specific handlers
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(eventData);
      } catch (e) {
        console.error(`Event handler error for ${event}:`, e);
      }
    });

    // Notify wildcard handlers
    this.wildcardHandlers.forEach(handler => {
      try {
        handler(eventData);
      } catch (e) {
        console.error(`Wildcard handler error for ${event}:`, e);
      }
    });
  }
}

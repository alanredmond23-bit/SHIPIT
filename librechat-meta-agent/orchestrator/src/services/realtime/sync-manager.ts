import { Pool } from 'pg';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

/**
 * Operation types for operational transformation
 */
export type OperationType = 'insert' | 'delete' | 'update' | 'move';

/**
 * Base operation interface
 */
export interface Operation {
  id: string;
  type: OperationType;
  userId: string;
  resourceType: string; // 'workflow', 'conversation', 'task', etc.
  resourceId: string;
  timestamp: string;
  version: number;
}

/**
 * Insert operation
 */
export interface InsertOperation extends Operation {
  type: 'insert';
  path: string; // JSON path or position
  value: any;
}

/**
 * Delete operation
 */
export interface DeleteOperation extends Operation {
  type: 'delete';
  path: string;
  previousValue?: any; // For undo
}

/**
 * Update operation
 */
export interface UpdateOperation extends Operation {
  type: 'update';
  path: string;
  value: any;
  previousValue?: any;
}

/**
 * Move operation (for reordering)
 */
export interface MoveOperation extends Operation {
  type: 'move';
  fromPath: string;
  toPath: string;
}

/**
 * Union type for all operations
 */
export type AnyOperation = InsertOperation | DeleteOperation | UpdateOperation | MoveOperation;

/**
 * Sync event for broadcasting
 */
export interface SyncEvent {
  eventId: string;
  operation: AnyOperation;
  clientId: string;
  timestamp: string;
}

/**
 * Resource state with version
 */
export interface ResourceState {
  resourceType: string;
  resourceId: string;
  version: number;
  data: any;
  lastModified: Date;
  lastModifiedBy?: string;
}

/**
 * Sync callback
 */
export type SyncEventCallback = (event: SyncEvent) => void;

/**
 * Sync Manager
 *
 * Handles real-time data synchronization with:
 * - Operational transforms for conflict resolution
 * - Event broadcasting to subscribers
 * - State reconciliation
 * - Version management
 */
export class SyncManager {
  private db: Pool;
  private logger: Logger;

  // Subscribers for sync events
  private subscribers: Map<string, Set<SyncEventCallback>>; // resourceId -> callbacks

  // Operation queue for pending operations
  private operationQueue: Map<string, AnyOperation[]>; // resourceId -> operations

  // Resource version cache
  private versionCache: Map<string, number>; // resourceId -> version

  constructor(db: Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
    this.subscribers = new Map();
    this.operationQueue = new Map();
    this.versionCache = new Map();
  }

  /**
   * Subscribe to sync events for a resource
   */
  public subscribe(resourceId: string, callback: SyncEventCallback): () => void {
    if (!this.subscribers.has(resourceId)) {
      this.subscribers.set(resourceId, new Set());
    }

    this.subscribers.get(resourceId)!.add(callback);

    this.logger.debug({ resourceId }, 'Subscribed to sync events');

    return () => {
      const callbacks = this.subscribers.get(resourceId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(resourceId);
        }
      }
    };
  }

  /**
   * Emit sync event to all subscribers
   */
  private emit(resourceId: string, event: SyncEvent): void {
    const callbacks = this.subscribers.get(resourceId);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        this.logger.error({ error, resourceId, event }, 'Error in sync event callback');
      }
    });
  }

  /**
   * Apply operation to resource
   */
  public async applyOperation(
    operation: AnyOperation,
    clientId: string
  ): Promise<{ success: boolean; newVersion: number; conflicts?: AnyOperation[] }> {
    const { resourceId } = operation;

    try {
      // Get current resource state
      const currentState = await this.getResourceState(
        operation.resourceType,
        resourceId
      );

      if (!currentState) {
        return {
          success: false,
          newVersion: 0,
          conflicts: [],
        };
      }

      // Check version for conflicts
      if (operation.version < currentState.version) {
        // Operation is based on old version, need to transform
        const pendingOps = await this.getPendingOperations(
          resourceId,
          operation.version
        );

        // Transform operation against pending operations
        const transformed = this.transformOperation(operation, pendingOps);

        if (!transformed) {
          // Conflict cannot be resolved
          return {
            success: false,
            newVersion: currentState.version,
            conflicts: pendingOps,
          };
        }

        operation = transformed;
      }

      // Apply operation to data
      const newData = this.applyOperationToData(currentState.data, operation);
      const newVersion = currentState.version + 1;

      // Update database
      await this.updateResourceState(
        operation.resourceType,
        resourceId,
        newData,
        newVersion,
        operation.userId
      );

      // Store operation in history
      await this.storeOperation(operation, newVersion);

      // Update version cache
      this.versionCache.set(resourceId, newVersion);

      // Broadcast event
      const event: SyncEvent = {
        eventId: uuidv4(),
        operation: { ...operation, version: newVersion },
        clientId,
        timestamp: new Date().toISOString(),
      };

      this.emit(resourceId, event);

      this.logger.debug(
        { resourceId, operationType: operation.type, version: newVersion },
        'Operation applied successfully'
      );

      return {
        success: true,
        newVersion,
      };
    } catch (error) {
      this.logger.error({ error, operation }, 'Error applying operation');
      throw error;
    }
  }

  /**
   * Apply operation to data (simplified OT)
   */
  private applyOperationToData(data: any, operation: AnyOperation): any {
    // Clone data to avoid mutations
    const newData = JSON.parse(JSON.stringify(data));

    switch (operation.type) {
      case 'insert':
        return this.applyInsert(newData, operation as InsertOperation);
      case 'delete':
        return this.applyDelete(newData, operation as DeleteOperation);
      case 'update':
        return this.applyUpdate(newData, operation as UpdateOperation);
      case 'move':
        return this.applyMove(newData, operation as MoveOperation);
      default:
        return newData;
    }
  }

  /**
   * Apply insert operation
   */
  private applyInsert(data: any, operation: InsertOperation): any {
    const pathParts = operation.path.split('.');
    let current = data;

    // Navigate to parent
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    // Insert value
    const lastPart = pathParts[pathParts.length - 1];
    if (Array.isArray(current)) {
      const index = parseInt(lastPart);
      current.splice(index, 0, operation.value);
    } else {
      current[lastPart] = operation.value;
    }

    return data;
  }

  /**
   * Apply delete operation
   */
  private applyDelete(data: any, operation: DeleteOperation): any {
    const pathParts = operation.path.split('.');
    let current = data;

    // Navigate to parent
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        return data; // Path doesn't exist, nothing to delete
      }
      current = current[part];
    }

    // Delete value
    const lastPart = pathParts[pathParts.length - 1];
    if (Array.isArray(current)) {
      const index = parseInt(lastPart);
      current.splice(index, 1);
    } else {
      delete current[lastPart];
    }

    return data;
  }

  /**
   * Apply update operation
   */
  private applyUpdate(data: any, operation: UpdateOperation): any {
    const pathParts = operation.path.split('.');
    let current = data;

    // Navigate to parent
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    // Update value
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = operation.value;

    return data;
  }

  /**
   * Apply move operation
   */
  private applyMove(data: any, operation: MoveOperation): any {
    // Get value from source
    const fromParts = operation.fromPath.split('.');
    let current = data;

    for (let i = 0; i < fromParts.length - 1; i++) {
      current = current[fromParts[i]];
    }

    const value = current[fromParts[fromParts.length - 1]];

    // Delete from source
    delete current[fromParts[fromParts.length - 1]];

    // Insert at destination
    const toParts = operation.toPath.split('.');
    current = data;

    for (let i = 0; i < toParts.length - 1; i++) {
      if (!(toParts[i] in current)) {
        current[toParts[i]] = {};
      }
      current = current[toParts[i]];
    }

    current[toParts[toParts.length - 1]] = value;

    return data;
  }

  /**
   * Transform operation against other operations (simplified OT)
   */
  private transformOperation(
    operation: AnyOperation,
    against: AnyOperation[]
  ): AnyOperation | null {
    let transformed = { ...operation };

    for (const other of against) {
      // Check if operations affect same path
      if (this.pathsConflict(this.getOperationPath(transformed), this.getOperationPath(other))) {
        // Simplified conflict resolution:
        // Later timestamp wins
        if (new Date(operation.timestamp) < new Date(other.timestamp)) {
          return null; // Conflict, reject operation
        }
      }

      // Transform position for insert/delete operations
      if (operation.type === 'insert' && other.type === 'insert') {
        transformed = this.transformInsertInsert(transformed as InsertOperation, other as InsertOperation) as AnyOperation;
      } else if (operation.type === 'delete' && other.type === 'delete') {
        // Both deleting, check if same item
        if (this.getOperationPath(operation) === this.getOperationPath(other)) {
          return null; // Already deleted
        }
      }
    }

    return transformed;
  }

  /**
   * Transform insert against insert
   */
  private transformInsertInsert(op1: InsertOperation, op2: InsertOperation): InsertOperation {
    const path1Parts = op1.path.split('.');
    const path2Parts = op2.path.split('.');

    // Check if inserting into same array
    if (path1Parts.slice(0, -1).join('.') === path2Parts.slice(0, -1).join('.')) {
      const index1 = parseInt(path1Parts[path1Parts.length - 1]);
      const index2 = parseInt(path2Parts[path2Parts.length - 1]);

      // Adjust index if needed
      if (index1 >= index2) {
        path1Parts[path1Parts.length - 1] = (index1 + 1).toString();
        return {
          ...op1,
          path: path1Parts.join('.'),
        };
      }
    }

    return op1;
  }

  /**
   * Get operation path
   */
  private getOperationPath(operation: AnyOperation): string {
    switch (operation.type) {
      case 'insert':
      case 'delete':
      case 'update':
        return operation.path;
      case 'move':
        return operation.fromPath;
      default:
        return '';
    }
  }

  /**
   * Check if paths conflict
   */
  private pathsConflict(path1: string, path2: string): boolean {
    return path1 === path2 || path1.startsWith(path2 + '.') || path2.startsWith(path1 + '.');
  }

  /**
   * Get resource state from database
   */
  private async getResourceState(
    resourceType: string,
    resourceId: string
  ): Promise<ResourceState | null> {
    try {
      const result = await this.db.query(
        `SELECT resource_type, resource_id, version, data, last_modified, last_modified_by
         FROM realtime_resource_state
         WHERE resource_type = $1 AND resource_id = $2`,
        [resourceType, resourceId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        version: row.version,
        data: row.data,
        lastModified: new Date(row.last_modified),
        lastModifiedBy: row.last_modified_by,
      };
    } catch (error) {
      this.logger.error({ error, resourceType, resourceId }, 'Error getting resource state');
      return null;
    }
  }

  /**
   * Update resource state in database
   */
  private async updateResourceState(
    resourceType: string,
    resourceId: string,
    data: any,
    version: number,
    userId: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO realtime_resource_state (resource_type, resource_id, version, data, last_modified_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (resource_type, resource_id)
       DO UPDATE SET
         version = EXCLUDED.version,
         data = EXCLUDED.data,
         last_modified = NOW(),
         last_modified_by = EXCLUDED.last_modified_by`,
      [resourceType, resourceId, version, JSON.stringify(data), userId]
    );
  }

  /**
   * Store operation in history
   */
  private async storeOperation(operation: AnyOperation, version: number): Promise<void> {
    await this.db.query(
      `INSERT INTO realtime_operations (
        operation_id, resource_type, resource_id, operation_type,
        operation_data, user_id, version
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        operation.id,
        operation.resourceType,
        operation.resourceId,
        operation.type,
        JSON.stringify(operation),
        operation.userId,
        version
      ]
    );
  }

  /**
   * Get operations after a specific version
   */
  private async getPendingOperations(
    resourceId: string,
    afterVersion: number
  ): Promise<AnyOperation[]> {
    const result = await this.db.query(
      `SELECT operation_data
       FROM realtime_operations
       WHERE resource_id = $1 AND version > $2
       ORDER BY version ASC`,
      [resourceId, afterVersion]
    );

    return result.rows.map((row) => row.operation_data as AnyOperation);
  }

  /**
   * Get current version of a resource
   */
  public async getVersion(resourceType: string, resourceId: string): Promise<number> {
    // Check cache
    const cached = this.versionCache.get(resourceId);
    if (cached !== undefined) {
      return cached;
    }

    // Get from database
    const state = await this.getResourceState(resourceType, resourceId);
    const version = state?.version || 0;

    this.versionCache.set(resourceId, version);
    return version;
  }

  /**
   * Initialize resource state
   */
  public async initializeResource(
    resourceType: string,
    resourceId: string,
    initialData: any,
    userId: string
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO realtime_resource_state (resource_type, resource_id, version, data, last_modified_by)
       VALUES ($1, $2, 0, $3, $4)
       ON CONFLICT (resource_type, resource_id) DO NOTHING`,
      [resourceType, resourceId, JSON.stringify(initialData), userId]
    );

    this.versionCache.set(resourceId, 0);
    this.logger.info({ resourceType, resourceId }, 'Resource initialized');
  }

  /**
   * Get operation history for a resource
   */
  public async getOperationHistory(
    resourceId: string,
    limit: number = 50
  ): Promise<AnyOperation[]> {
    const result = await this.db.query(
      `SELECT operation_data
       FROM realtime_operations
       WHERE resource_id = $1
       ORDER BY version DESC
       LIMIT $2`,
      [resourceId, limit]
    );

    return result.rows.map((row) => row.operation_data as AnyOperation);
  }

  /**
   * Clear cache for a resource
   */
  public clearCache(resourceId: string): void {
    this.versionCache.delete(resourceId);
  }
}

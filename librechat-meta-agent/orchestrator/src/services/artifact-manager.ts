import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';

interface CreateArtifactInput {
  task_id: string;
  name: string;
  type: string;
  storage_path: string;
  mime_type?: string;
  size_bytes?: number;
  metadata?: Record<string, unknown>;
}

export class ArtifactManager {
  constructor(
    private db: Pool,
    private logger: Logger
  ) {}

  async create(input: CreateArtifactInput) {
    const id = uuidv4();
    const { rows } = await this.db.query(
      `INSERT INTO meta_artifacts (id, task_id, name, type, storage_path, mime_type, size_bytes, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        input.task_id,
        input.name,
        input.type,
        input.storage_path,
        input.mime_type || 'application/octet-stream',
        input.size_bytes || 0,
        JSON.stringify(input.metadata || {})
      ]
    );
    return rows[0];
  }

  async list(filters: { taskId?: string } = {}) {
    let query = 'SELECT * FROM meta_artifacts WHERE 1=1';
    const params: any[] = [];

    if (filters.taskId) {
      params.push(filters.taskId);
      query += ` AND task_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async get(id: string) {
    const { rows } = await this.db.query('SELECT * FROM meta_artifacts WHERE id = $1', [id]);
    if (!rows[0]) throw new Error(`Artifact ${id} not found`);
    return rows[0];
  }

  async updateStatus(id: string, status: 'draft' | 'verified' | 'promoted') {
    const { rows } = await this.db.query(
      'UPDATE meta_artifacts SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return rows[0];
  }
}

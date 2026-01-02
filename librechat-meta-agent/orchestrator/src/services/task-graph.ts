import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import { EventEmitter } from '../events/emitter';

interface CreateProjectInput {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface CreateWorkstreamInput {
  name: string;
  description?: string;
  lead_agent?: string;
  priority?: number;
}

interface CreateTaskInput {
  workstream_id: string;
  title: string;
  description?: string;
  assigned_agent?: string;
  model_tier?: 'haiku' | 'sonnet' | 'opus';
  priority?: number;
  definition_of_done?: string[];
  context_packet?: Record<string, unknown>;
  dependencies?: string[];
}

export class TaskGraphService {
  constructor(
    private db: Pool,
    private events: EventEmitter,
    private logger: Logger
  ) {}

  async createProject(input: CreateProjectInput) {
    const id = uuidv4();
    const { rows } = await this.db.query(
      `INSERT INTO meta_projects (id, name, description, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, input.name, input.description || '', JSON.stringify(input.metadata || {})]
    );
    this.events.emit('project:created', { project: rows[0] });
    return rows[0];
  }

  async getProject(id: string) {
    const { rows } = await this.db.query('SELECT * FROM meta_projects WHERE id = $1', [id]);
    if (!rows[0]) throw new Error(`Project ${id} not found`);
    return rows[0];
  }

  async listProjects() {
    const { rows } = await this.db.query(
      'SELECT * FROM meta_projects ORDER BY created_at DESC'
    );
    return rows;
  }

  async createWorkstream(projectId: string, input: CreateWorkstreamInput) {
    const id = uuidv4();
    const { rows } = await this.db.query(
      `INSERT INTO meta_workstreams (id, project_id, name, description, lead_agent, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, projectId, input.name, input.description || '', input.lead_agent || '', input.priority || 5]
    );
    this.events.emit('workstream:created', { workstream: rows[0] });
    return rows[0];
  }

  async listWorkstreams(projectId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM meta_workstreams WHERE project_id = $1 ORDER BY priority DESC',
      [projectId]
    );
    return rows;
  }

  async createTask(input: CreateTaskInput) {
    const id = uuidv4();
    const { rows } = await this.db.query(
      `INSERT INTO meta_tasks (id, workstream_id, title, description, assigned_agent, model_tier, priority, definition_of_done, context_packet)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        input.workstream_id,
        input.title,
        input.description || '',
        input.assigned_agent || '',
        input.model_tier || 'sonnet',
        input.priority || 5,
        JSON.stringify(input.definition_of_done || []),
        JSON.stringify(input.context_packet || {})
      ]
    );

    // Add dependencies
    if (input.dependencies?.length) {
      for (const depId of input.dependencies) {
        await this.db.query(
          `INSERT INTO meta_task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2)`,
          [id, depId]
        );
      }
    }

    this.events.emit('task:created', { task: rows[0] });
    return rows[0];
  }

  async getTask(id: string) {
    const { rows } = await this.db.query('SELECT * FROM meta_tasks WHERE id = $1', [id]);
    if (!rows[0]) throw new Error(`Task ${id} not found`);

    // Get dependencies
    const { rows: deps } = await this.db.query(
      'SELECT depends_on_task_id FROM meta_task_dependencies WHERE task_id = $1',
      [id]
    );

    return { ...rows[0], dependencies: deps.map(d => d.depends_on_task_id) };
  }

  async listTasks(filters: { workstreamId?: string; status?: string } = {}) {
    let query = 'SELECT * FROM meta_tasks WHERE 1=1';
    const params: any[] = [];

    if (filters.workstreamId) {
      params.push(filters.workstreamId);
      query += ` AND workstream_id = $${params.length}`;
    }
    if (filters.status) {
      params.push(filters.status);
      query += ` AND status = $${params.length}`;
    }

    query += ' ORDER BY priority DESC, created_at ASC';

    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async updateTask(id: string, updates: Partial<CreateTaskInput & { status: string }>) {
    const setClauses: string[] = [];
    const params: any[] = [id];

    const fields = ['title', 'description', 'assigned_agent', 'status', 'priority'];
    for (const field of fields) {
      if (field in updates) {
        params.push((updates as any)[field]);
        setClauses.push(`${field} = $${params.length}`);
      }
    }

    if (updates.status === 'running' && !setClauses.includes('started_at')) {
      setClauses.push('started_at = NOW()');
    }
    if (updates.status === 'done') {
      setClauses.push('completed_at = NOW()');
    }

    const { rows } = await this.db.query(
      `UPDATE meta_tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    this.events.emit('task:updated', { task: rows[0] });
    return rows[0];
  }

  async getReadyTasks(workstreamId?: string) {
    const { rows } = await this.db.query('SELECT * FROM get_ready_tasks($1)', [workstreamId || null]);
    return rows;
  }

  async getTaskGraph(taskId: string) {
    // Get task and all dependencies recursively
    const { rows } = await this.db.query(`
      WITH RECURSIVE task_tree AS (
        SELECT t.*, 0 as depth FROM meta_tasks t WHERE t.id = $1
        UNION ALL
        SELECT t.*, tt.depth + 1
        FROM meta_tasks t
        JOIN meta_task_dependencies d ON t.id = d.depends_on_task_id
        JOIN task_tree tt ON d.task_id = tt.id
        WHERE tt.depth < 10
      )
      SELECT * FROM task_tree ORDER BY depth
    `, [taskId]);
    return rows;
  }

  async getDashboardStats() {
    const { rows: projectCount } = await this.db.query('SELECT COUNT(*) as count FROM meta_projects');
    const { rows: taskStats } = await this.db.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM meta_tasks
      GROUP BY status
    `);
    const { rows: recentTasks } = await this.db.query(`
      SELECT * FROM meta_tasks ORDER BY updated_at DESC LIMIT 10
    `);

    return {
      projects: parseInt(projectCount[0].count),
      tasksByStatus: taskStats.reduce((acc, row) => ({ ...acc, [row.status]: parseInt(row.count) }), {}),
      recentTasks,
    };
  }
}

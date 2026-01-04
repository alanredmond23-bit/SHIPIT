// Workflow Engine Service
// Merged from Joanna - executes state machine workflows

import { Pool } from 'pg';
import type { Logger } from 'pino';
import type {
  Workflow,
  WorkflowState,
  WorkflowTransition,
  WorkflowInstance,
  WorkflowLog,
  WorkflowWithDetails,
  ExecutionContext,
  ConditionConfig,
  ActionConfig,
} from '../types/workflow';

export class WorkflowEngine {
  constructor(
    private pool: Pool,
    private logger: Logger
  ) {}

  // =============================================
  // WORKFLOW CRUD
  // =============================================

  async createWorkflow(
    userId: string,
    data: Partial<Workflow>
  ): Promise<Workflow> {
    const result = await this.pool.query(
      `INSERT INTO meta_workflows (user_id, name, description, trigger_type, trigger_config, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        data.name,
        data.description || null,
        data.trigger_type || 'manual',
        JSON.stringify(data.trigger_config || {}),
        JSON.stringify(data.metadata || {}),
      ]
    );
    return result.rows[0];
  }

  async getWorkflow(workflowId: string): Promise<WorkflowWithDetails | null> {
    const workflowResult = await this.pool.query(
      `SELECT * FROM meta_workflows WHERE id = $1`,
      [workflowId]
    );

    if (workflowResult.rows.length === 0) return null;

    const workflow = workflowResult.rows[0] as Workflow;

    const [statesResult, transitionsResult, schedulesResult] = await Promise.all([
      this.pool.query(
        `SELECT * FROM meta_workflow_states WHERE workflow_id = $1 ORDER BY created_at`,
        [workflowId]
      ),
      this.pool.query(
        `SELECT * FROM meta_workflow_transitions WHERE workflow_id = $1`,
        [workflowId]
      ),
      this.pool.query(
        `SELECT * FROM meta_workflow_schedules WHERE workflow_id = $1`,
        [workflowId]
      ),
    ]);

    return {
      ...workflow,
      states: statesResult.rows,
      transitions: transitionsResult.rows,
      schedules: schedulesResult.rows,
    };
  }

  async listWorkflows(
    userId: string,
    options: { status?: string; includeTemplates?: boolean } = {}
  ): Promise<Workflow[]> {
    let query = `SELECT * FROM meta_workflows WHERE (user_id = $1 OR user_id IS NULL)`;
    const params: any[] = [userId];

    if (options.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }

    if (!options.includeTemplates) {
      query += ` AND is_template = false`;
    }

    query += ` ORDER BY updated_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // =============================================
  // STATE MANAGEMENT
  // =============================================

  async addState(
    workflowId: string,
    data: Partial<WorkflowState>
  ): Promise<WorkflowState> {
    const result = await this.pool.query(
      `INSERT INTO meta_workflow_states
       (workflow_id, name, description, state_type, action_type, action_config, position_x, position_y, color, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        workflowId,
        data.name,
        data.description || null,
        data.state_type || 'action',
        data.action_type || null,
        JSON.stringify(data.action_config || {}),
        data.position_x || 0,
        data.position_y || 0,
        data.color || '#6366f1',
        data.icon || null,
      ]
    );
    return result.rows[0];
  }

  async updateStatePosition(
    stateId: string,
    x: number,
    y: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_states SET position_x = $1, position_y = $2 WHERE id = $3`,
      [x, y, stateId]
    );
  }

  async addTransition(
    workflowId: string,
    fromStateId: string,
    toStateId: string,
    data: Partial<WorkflowTransition> = {}
  ): Promise<WorkflowTransition> {
    const result = await this.pool.query(
      `INSERT INTO meta_workflow_transitions
       (workflow_id, from_state_id, to_state_id, name, condition, condition_expression, priority, routing_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        workflowId,
        fromStateId,
        toStateId,
        data.name || null,
        JSON.stringify(data.condition || {}),
        data.condition_expression || null,
        data.priority || 0,
        JSON.stringify(data.routing_points || []),
      ]
    );
    return result.rows[0];
  }

  // =============================================
  // WORKFLOW EXECUTION
  // =============================================

  async startWorkflow(
    workflowId: string,
    userId: string,
    inputData: Record<string, any> = {},
    triggerSource?: string
  ): Promise<WorkflowInstance> {
    // Get workflow and find start state
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active' && workflow.status !== 'draft') {
      throw new Error(`Workflow is ${workflow.status}, cannot start`);
    }

    const startState = workflow.states.find((s) => s.state_type === 'start');
    if (!startState) {
      throw new Error('Workflow has no start state');
    }

    // Create instance
    const result = await this.pool.query(
      `INSERT INTO meta_workflow_instances
       (workflow_id, user_id, status, current_state_id, context, input_data, trigger_source)
       VALUES ($1, $2, 'running', $3, $4, $5, $6)
       RETURNING *`,
      [
        workflowId,
        userId,
        startState.id,
        JSON.stringify({ variables: {} }),
        JSON.stringify(inputData),
        triggerSource || 'manual',
      ]
    );

    const instance = result.rows[0] as WorkflowInstance;

    // Log start
    await this.logExecution(instance.id, startState.id, null, 'workflow_started', 'success', inputData);

    this.logger.info({ workflowId, instanceId: instance.id }, 'Workflow started');

    // Begin execution (async)
    this.executeNextStep(instance.id).catch((err) => {
      this.logger.error({ err, instanceId: instance.id }, 'Workflow execution failed');
    });

    return instance;
  }

  async executeNextStep(instanceId: string): Promise<void> {
    const instanceResult = await this.pool.query(
      `SELECT * FROM meta_workflow_instances WHERE id = $1`,
      [instanceId]
    );

    if (instanceResult.rows.length === 0) return;
    const instance = instanceResult.rows[0] as WorkflowInstance;

    if (instance.status !== 'running') return;
    if (!instance.current_state_id) return;

    // Get current state
    const stateResult = await this.pool.query(
      `SELECT * FROM meta_workflow_states WHERE id = $1`,
      [instance.current_state_id]
    );

    if (stateResult.rows.length === 0) return;
    const currentState = stateResult.rows[0] as WorkflowState;

    // Check if end state
    if (currentState.state_type === 'end') {
      await this.completeWorkflow(instanceId);
      return;
    }

    // Execute state action
    const startTime = Date.now();
    let actionResult: Record<string, any> = {};
    let actionError: string | null = null;

    try {
      actionResult = await this.executeStateAction(currentState, instance);
    } catch (err: any) {
      actionError = err.message;
      this.logger.error({ err, stateId: currentState.id }, 'State action failed');
    }

    const duration = Date.now() - startTime;

    // Log action result
    await this.logExecution(
      instanceId,
      currentState.id,
      null,
      'state_executed',
      actionError ? 'failed' : 'success',
      { action_config: currentState.action_config },
      actionResult,
      actionError || undefined,
      duration
    );

    if (actionError) {
      // Handle retry logic
      if (currentState.retry_count > 0) {
        // TODO: Implement retry with delay
      }
      await this.failWorkflow(instanceId, actionError);
      return;
    }

    // Update context with action result
    const updatedContext = {
      ...instance.context,
      outputs: {
        ...(instance.context as any).outputs,
        [currentState.id]: actionResult,
      },
    };

    await this.pool.query(
      `UPDATE meta_workflow_instances SET context = $1 WHERE id = $2`,
      [JSON.stringify(updatedContext), instanceId]
    );

    // Find next transition
    const transition = await this.evaluateTransitions(instance.current_state_id, updatedContext);

    if (!transition) {
      await this.failWorkflow(instanceId, 'No valid transition found');
      return;
    }

    // Transition to next state
    await this.pool.query(
      `UPDATE meta_workflow_instances SET current_state_id = $1 WHERE id = $2`,
      [transition.to_state_id, instanceId]
    );

    await this.logExecution(
      instanceId,
      transition.to_state_id,
      transition.id,
      'state_transition',
      'success',
      { from: instance.current_state_id, to: transition.to_state_id }
    );

    // Continue execution
    await this.executeNextStep(instanceId);
  }

  private async executeStateAction(
    state: WorkflowState,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const config = state.action_config as ActionConfig;

    switch (state.action_type) {
      case 'ai_task':
        return this.executeAITask(config, instance);
      case 'http_request':
        return this.executeHttpRequest(config, instance);
      case 'delay':
        return this.executeDelay(config);
      case 'transform':
        return this.executeTransform(config, instance);
      case 'code':
        return this.executeCode(config, instance);
      default:
        return { executed: true, action_type: state.action_type };
    }
  }

  private async executeAITask(
    config: ActionConfig,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    // Placeholder for AI task execution
    // Would integrate with the Anthropic/OpenAI APIs
    return {
      type: 'ai_task',
      prompt: config.prompt,
      response: 'AI task placeholder response',
    };
  }

  private async executeHttpRequest(
    config: ActionConfig,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    const response = await fetch(config.url!, {
      method: config.method || 'GET',
      headers: config.headers || {},
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    return {
      status: response.status,
      data: await response.json().catch(() => response.text()),
    };
  }

  private async executeDelay(config: ActionConfig): Promise<Record<string, any>> {
    const delayMs = (config.delay_seconds || 0) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { delayed_seconds: config.delay_seconds };
  }

  private async executeTransform(
    config: ActionConfig,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    // Apply mappings to transform data
    const result: Record<string, any> = {};
    const context = instance.context as any;

    if (config.mappings) {
      for (const [key, path] of Object.entries(config.mappings)) {
        result[key] = this.getValueByPath(context, path);
      }
    }

    return result;
  }

  private async executeCode(
    config: ActionConfig,
    instance: WorkflowInstance
  ): Promise<Record<string, any>> {
    // Sandboxed code execution (simplified)
    // In production, use a proper sandbox like vm2 or isolated-vm
    try {
      const fn = new Function('context', 'input', `return (${config.code})`);
      const result = fn(instance.context, instance.input_data);
      return { result };
    } catch (err: any) {
      throw new Error(`Code execution failed: ${err.message}`);
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  // =============================================
  // TRANSITION EVALUATION
  // =============================================

  private async evaluateTransitions(
    fromStateId: string,
    context: Record<string, any>
  ): Promise<WorkflowTransition | null> {
    const result = await this.pool.query(
      `SELECT * FROM meta_workflow_transitions
       WHERE from_state_id = $1
       ORDER BY priority DESC`,
      [fromStateId]
    );

    for (const transition of result.rows as WorkflowTransition[]) {
      if (this.evaluateCondition(transition.condition as ConditionConfig, context)) {
        return transition;
      }
    }

    return null;
  }

  private evaluateCondition(
    condition: ConditionConfig | Record<string, any>,
    context: Record<string, any>
  ): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true; // No condition means always true
    }

    if ('type' in condition) {
      const c = condition as ConditionConfig;

      switch (c.type) {
        case 'expression':
          try {
            const fn = new Function('ctx', `return (${c.expression})`);
            return Boolean(fn(context));
          } catch {
            return false;
          }

        case 'comparison':
          const value = this.getValueByPath(context, c.field || '');
          switch (c.operator) {
            case '==': return value === c.value;
            case '!=': return value !== c.value;
            case '>': return value > c.value;
            case '<': return value < c.value;
            case '>=': return value >= c.value;
            case '<=': return value <= c.value;
            case 'contains': return String(value).includes(String(c.value));
            case 'startsWith': return String(value).startsWith(String(c.value));
            case 'endsWith': return String(value).endsWith(String(c.value));
            default: return false;
          }

        case 'all':
          return (c.conditions || []).every((sub) => this.evaluateCondition(sub, context));

        case 'any':
          return (c.conditions || []).some((sub) => this.evaluateCondition(sub, context));

        default:
          return true;
      }
    }

    // Simple equality check for legacy conditions
    for (const [key, value] of Object.entries(condition)) {
      if (this.getValueByPath(context, key) !== value) {
        return false;
      }
    }

    return true;
  }

  // =============================================
  // WORKFLOW LIFECYCLE
  // =============================================

  async pauseWorkflow(instanceId: string): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_instances SET status = 'paused' WHERE id = $1`,
      [instanceId]
    );
    await this.logExecution(instanceId, null, null, 'workflow_paused', 'success');
  }

  async resumeWorkflow(instanceId: string): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_instances SET status = 'running' WHERE id = $1`,
      [instanceId]
    );
    await this.logExecution(instanceId, null, null, 'workflow_resumed', 'success');

    // Continue execution
    this.executeNextStep(instanceId).catch((err) => {
      this.logger.error({ err, instanceId }, 'Workflow resume failed');
    });
  }

  async cancelWorkflow(instanceId: string): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_instances SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
      [instanceId]
    );
    await this.logExecution(instanceId, null, null, 'workflow_cancelled', 'success');
  }

  private async completeWorkflow(instanceId: string): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_instances SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [instanceId]
    );
    await this.logExecution(instanceId, null, null, 'workflow_completed', 'success');
    this.logger.info({ instanceId }, 'Workflow completed');
  }

  private async failWorkflow(instanceId: string, error: string): Promise<void> {
    await this.pool.query(
      `UPDATE meta_workflow_instances SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
      [error, instanceId]
    );
    await this.logExecution(instanceId, null, null, 'workflow_failed', 'failed', null, null, error);
    this.logger.error({ instanceId, error }, 'Workflow failed');
  }

  // =============================================
  // LOGGING
  // =============================================

  private async logExecution(
    instanceId: string,
    stateId: string | null,
    transitionId: string | null,
    action: string,
    status: 'success' | 'failed' | 'skipped' | 'pending',
    inputData?: Record<string, any> | null,
    outputData?: Record<string, any> | null,
    error?: string,
    durationMs?: number
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO meta_workflow_logs
       (instance_id, state_id, transition_id, action, status, input_data, output_data, error, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        instanceId,
        stateId,
        transitionId,
        action,
        status,
        inputData ? JSON.stringify(inputData) : null,
        outputData ? JSON.stringify(outputData) : null,
        error || null,
        durationMs || null,
      ]
    );
  }

  async getInstanceLogs(instanceId: string, limit = 100): Promise<WorkflowLog[]> {
    const result = await this.pool.query(
      `SELECT * FROM meta_workflow_logs WHERE instance_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [instanceId, limit]
    );
    return result.rows;
  }

  // =============================================
  // TEMPLATES
  // =============================================

  async cloneAsTemplate(
    workflowId: string,
    name: string,
    category: string
  ): Promise<Workflow> {
    const result = await this.pool.query(
      `UPDATE meta_workflows SET is_template = true, template_category = $1, name = $2 WHERE id = $3 RETURNING *`,
      [category, name, workflowId]
    );
    return result.rows[0];
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    name: string
  ): Promise<string> {
    const result = await this.pool.query(
      `SELECT clone_workflow($1, $2, $3) as new_id`,
      [templateId, name, userId]
    );
    return result.rows[0].new_id;
  }
}

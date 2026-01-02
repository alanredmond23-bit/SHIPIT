import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from '../events/emitter';

const AGENT_CONFIGS = {
  'ui-lead': {
    name: 'UI Lead Agent',
    capabilities: ['react', 'typescript', 'css', 'accessibility'],
    systemPrompt: 'You are a senior frontend engineer specializing in React, TypeScript, and modern UI development.',
  },
  'backend-lead': {
    name: 'Backend Lead Agent',
    capabilities: ['nodejs', 'python', 'databases', 'api-design'],
    systemPrompt: 'You are a senior backend engineer specializing in APIs, databases, and server-side development.',
  },
  'compliance-lead': {
    name: 'Compliance Lead Agent',
    capabilities: ['security', 'privacy', 'audit', 'regulations'],
    systemPrompt: 'You are a security engineer and compliance specialist for security reviews and regulatory compliance.',
  },
  'research-lead': {
    name: 'Research Lead Agent',
    capabilities: ['research', 'analysis', 'documentation', 'citations'],
    systemPrompt: 'You are a research analyst specializing in information gathering, analysis, and synthesis.',
  },
  'verifier': {
    name: 'Verifier Agent',
    capabilities: ['testing', 'qa', 'review', 'validation'],
    systemPrompt: 'You are a QA engineer responsible for testing, validation, and quality assurance.',
  },
  'librarian': {
    name: 'Librarian Agent',
    capabilities: ['indexing', 'memory', 'search', 'archiving'],
    systemPrompt: 'You are responsible for managing memory, indexing artifacts, and maintaining the knowledge base.',
  },
};

export class SupervisorDispatch {
  private anthropic: Anthropic;
  private runningAgents: Map<string, { taskId: string; startedAt: Date }> = new Map();

  constructor(
    private db: Pool,
    private events: EventEmitter,
    private logger: Logger
  ) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async executeTask(taskId: string) {
    // Get task details
    const { rows: [task] } = await this.db.query('SELECT * FROM meta_tasks WHERE id = $1', [taskId]);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const runId = uuidv4();
    const agentType = task.assigned_agent || 'backend-lead';
    const agentConfig = AGENT_CONFIGS[agentType as keyof typeof AGENT_CONFIGS] || AGENT_CONFIGS['backend-lead'];

    // Create run record
    await this.db.query(
      `INSERT INTO meta_task_runs (id, task_id, agent_id, model_used) VALUES ($1, $2, $3, $4)`,
      [runId, taskId, agentType, this.getModelForTier(task.model_tier)]
    );

    // Update task status
    await this.db.query(
      `UPDATE meta_tasks SET status = 'running', started_at = NOW() WHERE id = $1`,
      [taskId]
    );

    this.events.emit('task:started', { taskId, runId, agent: agentType });
    this.runningAgents.set(runId, { taskId, startedAt: new Date() });

    // Execute with Claude
    try {
      const response = await this.anthropic.messages.create({
        model: this.getModelForTier(task.model_tier),
        max_tokens: 4096,
        system: `${agentConfig.systemPrompt}

You are working on the following task:
Title: ${task.title}
Description: ${task.description}

Definition of Done:
${JSON.stringify(task.definition_of_done, null, 2)}

Context:
${JSON.stringify(task.context_packet, null, 2)}

Complete this task and provide a structured response.`,
        messages: [
          { role: 'user', content: `Execute this task: ${task.title}\n\n${task.description}` }
        ],
      });

      const output = response.content[0].type === 'text' ? response.content[0].text : '';
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

      // Update run as completed
      await this.db.query(
        `UPDATE meta_task_runs
         SET status = 'completed', ended_at = NOW(), tokens_used = $2, output = $3
         WHERE id = $1`,
        [runId, tokensUsed, JSON.stringify({ response: output })]
      );

      // Update task status
      await this.db.query(
        `UPDATE meta_tasks SET status = 'needs_review' WHERE id = $1`,
        [taskId]
      );

      this.events.emit('task:completed', { taskId, runId, output });
      this.runningAgents.delete(runId);

      return { runId, output, tokensUsed };
    } catch (error: any) {
      // Update run as failed
      await this.db.query(
        `UPDATE meta_task_runs SET status = 'failed', ended_at = NOW(), error_message = $2 WHERE id = $1`,
        [runId, error.message]
      );

      // Update task for retry
      await this.db.query(
        `UPDATE meta_tasks SET status = 'queued', retry_count = retry_count + 1 WHERE id = $1`,
        [taskId]
      );

      this.events.emit('task:failed', { taskId, runId, error: error.message });
      this.runningAgents.delete(runId);
      throw error;
    }
  }

  async getAgentStatus() {
    const agents = Object.entries(AGENT_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      capabilities: config.capabilities,
      status: 'idle',
      currentTask: null,
    }));

    // Check for running agents
    for (const [runId, { taskId }] of this.runningAgents) {
      const agentId = await this.getAgentForRun(runId);
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        agent.status = 'running';
        agent.currentTask = taskId;
      }
    }

    return agents;
  }

  private async getAgentForRun(runId: string): Promise<string> {
    const { rows } = await this.db.query('SELECT agent_id FROM meta_task_runs WHERE id = $1', [runId]);
    return rows[0]?.agent_id || 'unknown';
  }

  private getModelForTier(tier: string): string {
    switch (tier) {
      case 'haiku': return 'claude-3-haiku-20240307';
      case 'opus': return 'claude-3-opus-20240229';
      case 'sonnet':
      default: return 'claude-sonnet-4-20250514';
    }
  }
}

/**
 * Extended Thinking Engine - Superior to Claude Extended Thinking and ChatGPT o1/o3
 *
 * Key Differentiators:
 * 1. VISUAL THOUGHT TREE - Branching reasoning paths (competitors hide this)
 * 2. CONFIDENCE SCORING - Each thought step has confidence %
 * 3. SELF-CRITIQUE LOOPS - Automatic review and revision of reasoning
 * 4. PARALLEL EXPLORATION - Multiple solution paths simultaneously
 * 5. THINKING BUDGET - User controls depth (tokens/time)
 * 6. PAUSE/RESUME - Can pause thinking, review, and continue
 * 7. THOUGHT BOOKMARKS - Save interesting reasoning branches
 * 8. REASONING TEMPLATES - Pre-built thinking patterns for common tasks
 */

import { Pool } from 'pg';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type ThoughtType =
  | 'observation'
  | 'hypothesis'
  | 'analysis'
  | 'critique'
  | 'conclusion'
  | 'question'
  | 'evidence'
  | 'alternative'
  | 'synthesis';

export type ThoughtStatus = 'exploring' | 'completed' | 'abandoned' | 'bookmarked' | 'revised';

export type ThinkingStyle = 'thorough' | 'fast' | 'creative' | 'analytical' | 'methodical';

export type SessionStatus = 'thinking' | 'paused' | 'completed' | 'error';

export interface ThoughtNode {
  id: string;
  parentId: string | null;
  sessionId: string;
  content: string;
  type: ThoughtType;
  confidence: number; // 0-100
  depth: number;
  children: string[];
  metadata: {
    tokens: number;
    duration: number;
    model: string;
    revisedFrom?: string;
    timestamp: Date;
  };
  status: ThoughtStatus;
  reasoning?: string; // Why this thought was generated
  alternatives?: string[]; // IDs of alternative thought branches
}

export interface ThinkingSession {
  id: string;
  userId: string | null;
  projectId: string;
  query: string;
  rootNodeId: string;
  currentNodeId: string; // Current exploration point
  config: ThinkingConfig;
  status: SessionStatus;
  stats: SessionStats;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  finalConclusion?: string;
}

export interface ThinkingConfig {
  maxTokens: number;
  maxDepth: number;
  maxBranches: number;
  minConfidenceThreshold: number;
  enableSelfCritique: boolean;
  enableParallelExploration: boolean;
  autoExpand: boolean; // Automatically expand high-confidence paths
  thinkingStyle: ThinkingStyle;
  template?: string;
  model?: string;
}

export interface SessionStats {
  totalTokens: number;
  totalDuration: number;
  branchesExplored: number;
  revisionsCount: number;
  averageConfidence: number;
  confidenceProgression: number[];
  thoughtsByType: Record<ThoughtType, number>;
  maxDepthReached: number;
}

export interface ThinkingEvent {
  type: 'node_created' | 'node_updated' | 'session_paused' | 'session_resumed' | 'session_completed' | 'error';
  sessionId: string;
  nodeId?: string;
  data?: any;
  timestamp: Date;
}

export interface ReasoningTemplate {
  id: string;
  name: string;
  description: string;
  steps: TemplateStep[];
  category: string;
  createdAt: Date;
}

export interface TemplateStep {
  order: number;
  type: ThoughtType;
  prompt: string;
  minConfidence?: number;
}

// ============================================================================
// Reasoning Templates Library
// ============================================================================

export const REASONING_TEMPLATES: Record<string, ReasoningTemplate> = {
  'problem-solving': {
    id: 'problem-solving',
    name: 'Problem Solving',
    description: 'Systematic approach to breaking down and solving complex problems',
    category: 'general',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'observation',
        prompt: 'What is the core problem? Break it down into its fundamental components.',
        minConfidence: 70,
      },
      {
        order: 2,
        type: 'analysis',
        prompt: 'What are the constraints, requirements, and boundaries of this problem?',
        minConfidence: 65,
      },
      {
        order: 3,
        type: 'hypothesis',
        prompt: 'What are possible solution approaches? Generate at least 3 different strategies.',
        minConfidence: 60,
      },
      {
        order: 4,
        type: 'analysis',
        prompt: 'Evaluate each solution approach against the constraints. What are the pros and cons?',
        minConfidence: 70,
      },
      {
        order: 5,
        type: 'critique',
        prompt: 'What are the weaknesses in each approach? What could go wrong?',
        minConfidence: 65,
      },
      {
        order: 6,
        type: 'conclusion',
        prompt: 'Select the best approach and explain why. What is the implementation plan?',
        minConfidence: 75,
      },
    ],
  },

  'code-review': {
    id: 'code-review',
    name: 'Code Review',
    description: 'Comprehensive code analysis for bugs, security, and performance',
    category: 'development',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'observation',
        prompt: 'Understand the code: What is its purpose? What does it do?',
        minConfidence: 80,
      },
      {
        order: 2,
        type: 'analysis',
        prompt: 'Find potential bugs: Logic errors, edge cases, null checks, type safety.',
        minConfidence: 70,
      },
      {
        order: 3,
        type: 'analysis',
        prompt: 'Security check: Input validation, SQL injection, XSS, authentication, authorization.',
        minConfidence: 75,
      },
      {
        order: 4,
        type: 'analysis',
        prompt: 'Performance analysis: Time complexity, space complexity, bottlenecks, optimizations.',
        minConfidence: 65,
      },
      {
        order: 5,
        type: 'critique',
        prompt: 'Code quality: Readability, maintainability, best practices, design patterns.',
        minConfidence: 70,
      },
      {
        order: 6,
        type: 'conclusion',
        prompt: 'Prioritized list of improvements with specific code suggestions.',
        minConfidence: 75,
      },
    ],
  },

  'research': {
    id: 'research',
    name: 'Research Analysis',
    description: 'Structured approach to research questions and hypothesis testing',
    category: 'analysis',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'question',
        prompt: 'What is the research question? What are we trying to discover?',
        minConfidence: 75,
      },
      {
        order: 2,
        type: 'hypothesis',
        prompt: 'Generate hypotheses: What are the possible answers or explanations?',
        minConfidence: 65,
      },
      {
        order: 3,
        type: 'evidence',
        prompt: 'Gather evidence: What data, facts, or information supports or refutes each hypothesis?',
        minConfidence: 70,
      },
      {
        order: 4,
        type: 'analysis',
        prompt: 'Analyze the evidence: What patterns emerge? What contradictions exist?',
        minConfidence: 70,
      },
      {
        order: 5,
        type: 'critique',
        prompt: 'Challenge the analysis: What biases might exist? What alternative interpretations?',
        minConfidence: 65,
      },
      {
        order: 6,
        type: 'conclusion',
        prompt: 'Draw conclusions: What can we confidently say? What remains uncertain?',
        minConfidence: 75,
      },
    ],
  },

  'creative': {
    id: 'creative',
    name: 'Creative Ideation',
    description: 'Divergent thinking for generating novel ideas and solutions',
    category: 'creative',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'observation',
        prompt: 'What is the creative challenge or opportunity?',
        minConfidence: 70,
      },
      {
        order: 2,
        type: 'hypothesis',
        prompt: 'Brainstorm wildly: Generate as many ideas as possible without judgment.',
        minConfidence: 50,
      },
      {
        order: 3,
        type: 'synthesis',
        prompt: 'Combine ideas: Can we merge concepts to create something new?',
        minConfidence: 60,
      },
      {
        order: 4,
        type: 'analysis',
        prompt: 'Refine the ideas: Make them more concrete and actionable.',
        minConfidence: 65,
      },
      {
        order: 5,
        type: 'critique',
        prompt: 'Evaluate novelty: How original is each idea? Has it been done before?',
        minConfidence: 70,
      },
      {
        order: 6,
        type: 'conclusion',
        prompt: 'Select the most promising ideas and create an execution plan.',
        minConfidence: 75,
      },
    ],
  },

  'debugging': {
    id: 'debugging',
    name: 'Systematic Debugging',
    description: 'Methodical approach to finding and fixing bugs',
    category: 'development',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'observation',
        prompt: 'Reproduce the bug: What are the exact steps? What is the expected vs actual behavior?',
        minConfidence: 80,
      },
      {
        order: 2,
        type: 'analysis',
        prompt: 'Isolate the problem: What component or function is responsible?',
        minConfidence: 70,
      },
      {
        order: 3,
        type: 'hypothesis',
        prompt: 'Hypothesize the root cause: What could be causing this behavior?',
        minConfidence: 65,
      },
      {
        order: 4,
        type: 'evidence',
        prompt: 'Test the hypothesis: Add logging, breakpoints, or tests to verify.',
        minConfidence: 75,
      },
      {
        order: 5,
        type: 'conclusion',
        prompt: 'Implement the fix: Write the corrected code.',
        minConfidence: 80,
      },
      {
        order: 6,
        type: 'critique',
        prompt: 'Verify the fix: Test thoroughly. Could this fix cause other issues?',
        minConfidence: 85,
      },
    ],
  },

  'decision-making': {
    id: 'decision-making',
    name: 'Decision Analysis',
    description: 'Structured framework for making complex decisions',
    category: 'analysis',
    createdAt: new Date(),
    steps: [
      {
        order: 1,
        type: 'observation',
        prompt: 'Define the decision: What needs to be decided? What are the stakes?',
        minConfidence: 75,
      },
      {
        order: 2,
        type: 'analysis',
        prompt: 'Define criteria: What factors matter most? How should we weight them?',
        minConfidence: 70,
      },
      {
        order: 3,
        type: 'hypothesis',
        prompt: 'List all options: What are the possible choices?',
        minConfidence: 65,
      },
      {
        order: 4,
        type: 'analysis',
        prompt: 'Score each option against the criteria. Create a decision matrix.',
        minConfidence: 70,
      },
      {
        order: 5,
        type: 'critique',
        prompt: 'Sensitivity analysis: How would the decision change if our assumptions change?',
        minConfidence: 65,
      },
      {
        order: 6,
        type: 'conclusion',
        prompt: 'Make the decision and explain the reasoning behind it.',
        minConfidence: 75,
      },
    ],
  },
};

// ============================================================================
// Extended Thinking Engine
// ============================================================================

export class ExtendedThinkingEngine extends EventEmitter {
  private anthropic: Anthropic;

  // In-memory cache for active sessions (for fast access)
  private activeSessions = new Map<string, ThinkingSession>();
  private sessionNodes = new Map<string, Map<string, ThoughtNode>>();

  constructor(
    private db: Pool,
    private logger: Logger,
    anthropicApiKey: string
  ) {
    super();
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Start a new thinking session
   */
  async startThinking(
    query: string,
    config: Partial<ThinkingConfig>,
    userId?: string,
    projectId: string = 'default'
  ): Promise<ThinkingSession> {
    const sessionId = uuidv4();
    const rootNodeId = uuidv4();

    // Default configuration
    const fullConfig: ThinkingConfig = {
      maxTokens: config.maxTokens || 10000,
      maxDepth: config.maxDepth || 10,
      maxBranches: config.maxBranches || 5,
      minConfidenceThreshold: config.minConfidenceThreshold || 60,
      enableSelfCritique: config.enableSelfCritique !== false,
      enableParallelExploration: config.enableParallelExploration !== false,
      autoExpand: config.autoExpand !== false,
      thinkingStyle: config.thinkingStyle || 'thorough',
      template: config.template,
      model: config.model || 'claude-3-7-sonnet-20250219',
    };

    // Create root node
    const rootNode: ThoughtNode = {
      id: rootNodeId,
      parentId: null,
      sessionId,
      content: query,
      type: 'observation',
      confidence: 100,
      depth: 0,
      children: [],
      metadata: {
        tokens: 0,
        duration: 0,
        model: fullConfig.model!,
        timestamp: new Date(),
      },
      status: 'completed',
      reasoning: 'Initial query',
    };

    // Create session
    const session: ThinkingSession = {
      id: sessionId,
      userId: userId || null,
      projectId,
      query,
      rootNodeId,
      currentNodeId: rootNodeId,
      config: fullConfig,
      status: 'thinking',
      stats: {
        totalTokens: 0,
        totalDuration: 0,
        branchesExplored: 1,
        revisionsCount: 0,
        averageConfidence: 100,
        confidenceProgression: [100],
        thoughtsByType: { observation: 1 } as any,
        maxDepthReached: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    await this.db.query(
      `INSERT INTO thinking_sessions
       (id, user_id, project_id, query, root_node_id, current_node_id, config, status, stats, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        userId || null,
        projectId,
        query,
        rootNodeId,
        rootNodeId,
        JSON.stringify(fullConfig),
        'thinking',
        JSON.stringify(session.stats),
        session.createdAt,
        session.updatedAt,
      ]
    );

    await this.saveNode(rootNode);

    // Cache in memory
    this.activeSessions.set(sessionId, session);
    this.sessionNodes.set(sessionId, new Map([[rootNodeId, rootNode]]));

    this.logger.info({ sessionId, query }, 'Started thinking session');
    this.emit('session_created', { sessionId, session });

    // Start initial expansion based on template or query
    if (fullConfig.autoExpand) {
      setImmediate(() => this.autoExpandThinking(sessionId));
    }

    return session;
  }

  /**
   * Expand a thought branch - create child nodes
   */
  async expandThought(
    sessionId: string,
    nodeId: string,
    count: number = 1
  ): Promise<ThoughtNode[]> {
    const session = await this.getSession(sessionId);
    const parentNode = await this.getNode(sessionId, nodeId);

    if (!session || !parentNode) {
      throw new Error('Session or node not found');
    }

    if (session.status !== 'thinking') {
      throw new Error('Session is not in thinking state');
    }

    // Check if we've exceeded depth limit
    if (parentNode.depth >= session.config.maxDepth) {
      this.logger.warn({ sessionId, nodeId }, 'Max depth reached');
      return [];
    }

    // Check token budget
    if (session.stats.totalTokens >= session.config.maxTokens) {
      await this.pauseThinking(sessionId);
      throw new Error('Token budget exceeded');
    }

    const newNodes: ThoughtNode[] = [];
    const template = session.config.template
      ? REASONING_TEMPLATES[session.config.template]
      : null;

    for (let i = 0; i < Math.min(count, session.config.maxBranches); i++) {
      const startTime = Date.now();

      // Determine next thought type based on template or current type
      const nextType = this.determineNextThoughtType(
        parentNode,
        template,
        session.config.thinkingStyle
      );

      // Generate thought content
      const thought = await this.generateThought(
        session,
        parentNode,
        nextType,
        template
      );

      const duration = Date.now() - startTime;
      const nodeId = uuidv4();

      const newNode: ThoughtNode = {
        id: nodeId,
        parentId: parentNode.id,
        sessionId,
        content: thought.content,
        type: nextType,
        confidence: thought.confidence,
        depth: parentNode.depth + 1,
        children: [],
        metadata: {
          tokens: thought.tokens,
          duration,
          model: session.config.model!,
          timestamp: new Date(),
        },
        status: 'completed',
        reasoning: thought.reasoning,
      };

      // Save node
      await this.saveNode(newNode);
      newNodes.push(newNode);

      // Update parent's children
      parentNode.children.push(nodeId);
      await this.updateNode(parentNode);

      // Update session stats
      session.stats.totalTokens += thought.tokens;
      session.stats.totalDuration += duration;
      session.stats.branchesExplored++;
      session.stats.confidenceProgression.push(thought.confidence);
      session.stats.thoughtsByType[nextType] =
        (session.stats.thoughtsByType[nextType] || 0) + 1;
      session.stats.maxDepthReached = Math.max(
        session.stats.maxDepthReached,
        newNode.depth
      );

      // Recalculate average confidence
      session.stats.averageConfidence =
        session.stats.confidenceProgression.reduce((a, b) => a + b, 0) /
        session.stats.confidenceProgression.length;

      session.currentNodeId = nodeId;
      session.updatedAt = new Date();

      await this.updateSession(session);

      this.emit('node_created', {
        type: 'node_created',
        sessionId,
        nodeId,
        data: newNode,
        timestamp: new Date(),
      } as ThinkingEvent);

      this.logger.info(
        { sessionId, nodeId, type: nextType, confidence: thought.confidence },
        'Created thought node'
      );
    }

    return newNodes;
  }

  /**
   * Self-critique a reasoning path
   */
  async critiqueReasoning(
    sessionId: string,
    nodeId: string
  ): Promise<ThoughtNode> {
    const session = await this.getSession(sessionId);
    const node = await this.getNode(sessionId, nodeId);

    if (!session || !node) {
      throw new Error('Session or node not found');
    }

    const startTime = Date.now();

    // Build context path from root to this node
    const pathContext = await this.buildPathContext(sessionId, nodeId);

    // Generate critique
    const critiquePrompt = `Review this reasoning step critically:

Path Context:
${pathContext}

Current Step:
Type: ${node.type}
Content: ${node.content}
Confidence: ${node.confidence}%

Provide a critical analysis:
1. What are the strengths of this reasoning?
2. What are the weaknesses or potential flaws?
3. What assumptions might be incorrect?
4. What alternative interpretations exist?
5. How can this reasoning be improved?

Be brutally honest and thorough.`;

    const response = await this.anthropic.messages.create({
      model: session.config.model!,
      max_tokens: 1500,
      messages: [{ role: 'user', content: critiquePrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const duration = Date.now() - startTime;
    const tokens = response.usage.input_tokens + response.usage.output_tokens;

    // Create critique node
    const critiqueId = uuidv4();
    const critiqueNode: ThoughtNode = {
      id: critiqueId,
      parentId: node.id,
      sessionId,
      content: content.text,
      type: 'critique',
      confidence: this.extractConfidence(content.text, 75),
      depth: node.depth + 1,
      children: [],
      metadata: {
        tokens,
        duration,
        model: session.config.model!,
        timestamp: new Date(),
      },
      status: 'completed',
      reasoning: 'Self-critique of parent reasoning step',
    };

    await this.saveNode(critiqueNode);

    // Update parent
    node.children.push(critiqueId);
    await this.updateNode(node);

    // Update session stats
    session.stats.totalTokens += tokens;
    session.stats.totalDuration += duration;
    session.stats.revisionsCount++;
    session.updatedAt = new Date();
    await this.updateSession(session);

    this.emit('node_created', {
      type: 'node_created',
      sessionId,
      nodeId: critiqueId,
      data: critiqueNode,
      timestamp: new Date(),
    } as ThinkingEvent);

    this.logger.info({ sessionId, nodeId: critiqueId }, 'Created critique node');

    return critiqueNode;
  }

  /**
   * Explore alternative paths in parallel
   */
  async exploreAlternatives(
    sessionId: string,
    nodeId: string,
    count: number = 3
  ): Promise<ThoughtNode[]> {
    const session = await this.getSession(sessionId);
    const node = await this.getNode(sessionId, nodeId);

    if (!session || !node) {
      throw new Error('Session or node not found');
    }

    const pathContext = await this.buildPathContext(sessionId, nodeId);

    const alternativesPrompt = `Given this reasoning path:

${pathContext}

Current conclusion: ${node.content}

Generate ${count} alternative approaches or conclusions that:
1. Take a different perspective
2. Consider factors not yet explored
3. Challenge the current assumptions
4. Offer creative or unconventional thinking

For each alternative, provide:
- The alternative reasoning
- Why it's worth considering
- Confidence level (0-100)

Format as JSON array:
[
  {
    "content": "...",
    "reasoning": "...",
    "confidence": 75
  }
]`;

    const response = await this.anthropic.messages.create({
      model: session.config.model!,
      max_tokens: 2000,
      messages: [{ role: 'user', content: alternativesPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse alternatives
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse alternatives');
    }

    const alternatives = JSON.parse(jsonMatch[0]);
    const alternativeNodes: ThoughtNode[] = [];

    for (const alt of alternatives) {
      const altId = uuidv4();
      const altNode: ThoughtNode = {
        id: altId,
        parentId: node.parentId, // Branch from same parent
        sessionId,
        content: alt.content,
        type: 'alternative',
        confidence: alt.confidence,
        depth: node.depth,
        children: [],
        metadata: {
          tokens: response.usage.input_tokens + response.usage.output_tokens,
          duration: 0,
          model: session.config.model!,
          timestamp: new Date(),
        },
        status: 'completed',
        reasoning: alt.reasoning,
      };

      await this.saveNode(altNode);
      alternativeNodes.push(altNode);

      // Link as alternatives
      if (!node.alternatives) {
        node.alternatives = [];
      }
      node.alternatives.push(altId);
    }

    await this.updateNode(node);

    // Update parent to include these alternatives
    if (node.parentId) {
      const parent = await this.getNode(sessionId, node.parentId);
      if (parent) {
        parent.children.push(...alternativeNodes.map((n) => n.id));
        await this.updateNode(parent);
      }
    }

    // Update stats
    session.stats.branchesExplored += alternativeNodes.length;
    session.updatedAt = new Date();
    await this.updateSession(session);

    this.logger.info(
      { sessionId, nodeId, count: alternativeNodes.length },
      'Explored alternatives'
    );

    return alternativeNodes;
  }

  /**
   * Pause thinking session
   */
  async pauseThinking(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'paused';
    session.updatedAt = new Date();

    await this.db.query(
      'UPDATE thinking_sessions SET status = $1, updated_at = $2 WHERE id = $3',
      ['paused', session.updatedAt, sessionId]
    );

    this.activeSessions.set(sessionId, session);

    this.emit('session_paused', {
      type: 'session_paused',
      sessionId,
      timestamp: new Date(),
    } as ThinkingEvent);

    this.logger.info({ sessionId }, 'Paused thinking session');
  }

  /**
   * Resume thinking session
   */
  async resumeThinking(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'paused') {
      throw new Error('Session is not paused');
    }

    session.status = 'thinking';
    session.updatedAt = new Date();

    await this.db.query(
      'UPDATE thinking_sessions SET status = $1, updated_at = $2 WHERE id = $3',
      ['thinking', session.updatedAt, sessionId]
    );

    this.activeSessions.set(sessionId, session);

    this.emit('session_resumed', {
      type: 'session_resumed',
      sessionId,
      timestamp: new Date(),
    } as ThinkingEvent);

    this.logger.info({ sessionId }, 'Resumed thinking session');

    // Continue auto-expansion if enabled
    if (session.config.autoExpand) {
      setImmediate(() => this.autoExpandThinking(sessionId));
    }
  }

  /**
   * Get thought tree for visualization
   */
  async getThoughtTree(sessionId: string): Promise<ThoughtNode[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM thought_nodes WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    return rows.map((row) => this.dbRowToNode(row));
  }

  /**
   * Bookmark a branch
   */
  async bookmarkBranch(
    sessionId: string,
    nodeId: string,
    userId?: string,
    note?: string
  ): Promise<void> {
    const node = await this.getNode(sessionId, nodeId);
    if (!node) {
      throw new Error('Node not found');
    }

    // Update node status
    node.status = 'bookmarked';
    await this.updateNode(node);

    // Save bookmark
    await this.db.query(
      `INSERT INTO bookmarked_thoughts (id, user_id, session_id, node_id, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), userId || null, sessionId, nodeId, note || null, new Date()]
    );

    this.logger.info({ sessionId, nodeId }, 'Bookmarked thought branch');
  }

  /**
   * Synthesize final conclusion from thought tree
   */
  async synthesizeConclusion(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const tree = await this.getThoughtTree(sessionId);

    // Build a comprehensive view of the thinking process
    const treeContext = this.buildTreeSummary(tree, session.rootNodeId);

    const synthesisPrompt = `You have explored this question through an extended thinking process:

Original Query: ${session.query}

Thinking Process:
${treeContext}

Session Statistics:
- Total thoughts explored: ${session.stats.branchesExplored}
- Maximum depth: ${session.stats.maxDepthReached}
- Average confidence: ${session.stats.averageConfidence.toFixed(1)}%
- Revisions/critiques: ${session.stats.revisionsCount}

Now synthesize all this thinking into a comprehensive, well-reasoned final answer:

1. Start with your conclusion
2. Explain the reasoning process that led to it
3. Acknowledge uncertainties and alternatives considered
4. Provide actionable recommendations if applicable

Be clear, confident, and thorough.`;

    const response = await this.anthropic.messages.create({
      model: session.config.model!,
      max_tokens: 3000,
      messages: [{ role: 'user', content: synthesisPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const conclusion = content.text;

    // Update session
    session.finalConclusion = conclusion;
    session.status = 'completed';
    session.completedAt = new Date();
    session.updatedAt = new Date();

    await this.db.query(
      `UPDATE thinking_sessions
       SET final_conclusion = $1, status = $2, completed_at = $3, updated_at = $4
       WHERE id = $5`,
      [conclusion, 'completed', session.completedAt, session.updatedAt, sessionId]
    );

    this.activeSessions.set(sessionId, session);

    this.emit('session_completed', {
      type: 'session_completed',
      sessionId,
      data: { conclusion },
      timestamp: new Date(),
    } as ThinkingEvent);

    this.logger.info({ sessionId }, 'Synthesized final conclusion');

    return conclusion;
  }

  /**
   * Stream thinking process in real-time
   */
  async *streamThinking(sessionId: string): AsyncGenerator<ThinkingEvent> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Set up event listeners
    const eventQueue: ThinkingEvent[] = [];
    let resolveNext: ((value: ThinkingEvent) => void) | null = null;

    const eventHandler = (event: ThinkingEvent) => {
      if (resolveNext) {
        resolveNext(event);
        resolveNext = null;
      } else {
        eventQueue.push(event);
      }
    };

    this.on('node_created', (data) => eventHandler({ ...data, type: 'node_created' }));
    this.on('node_updated', (data) => eventHandler({ ...data, type: 'node_updated' }));
    this.on('session_paused', (data) => eventHandler({ ...data, type: 'session_paused' }));
    this.on('session_resumed', (data) => eventHandler({ ...data, type: 'session_resumed' }));
    this.on('session_completed', (data) => eventHandler({ ...data, type: 'session_completed' }));
    this.on('error', (data) => eventHandler({ ...data, type: 'error' }));

    try {
      while (session.status !== 'completed') {
        if (eventQueue.length > 0) {
          yield eventQueue.shift()!;
        } else {
          // Wait for next event
          const event = await new Promise<ThinkingEvent>((resolve) => {
            resolveNext = resolve;
          });
          yield event;
        }

        // Check if session is still active
        const currentSession = await this.getSession(sessionId);
        if (currentSession?.status === 'completed') {
          break;
        }
      }
    } finally {
      this.removeAllListeners('node_created');
      this.removeAllListeners('node_updated');
      this.removeAllListeners('session_paused');
      this.removeAllListeners('session_resumed');
      this.removeAllListeners('session_completed');
      this.removeAllListeners('error');
    }
  }

  /**
   * Get available reasoning templates
   */
  getTemplates(): ReasoningTemplate[] {
    return Object.values(REASONING_TEMPLATES);
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async autoExpandThinking(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session || session.status !== 'thinking') {
        return;
      }

      const currentNode = await this.getNode(sessionId, session.currentNodeId);
      if (!currentNode) {
        return;
      }

      // Auto-expand if:
      // 1. Node has high confidence
      // 2. Within budget
      // 3. Below max depth
      const shouldExpand =
        currentNode.confidence >= session.config.minConfidenceThreshold &&
        session.stats.totalTokens < session.config.maxTokens &&
        currentNode.depth < session.config.maxDepth;

      if (shouldExpand) {
        await this.expandThought(sessionId, currentNode.id, 1);

        // Continue expansion
        if (session.config.autoExpand) {
          setImmediate(() => this.autoExpandThinking(sessionId));
        }
      } else if (currentNode.depth >= session.config.maxDepth) {
        // Reached max depth, synthesize conclusion
        await this.synthesizeConclusion(sessionId);
      }
    } catch (error: any) {
      this.logger.error({ error: error.message, sessionId }, 'Auto-expand failed');
      this.emit('error', {
        type: 'error',
        sessionId,
        data: { error: error.message },
        timestamp: new Date(),
      } as ThinkingEvent);
    }
  }

  private async generateThought(
    session: ThinkingSession,
    parentNode: ThoughtNode,
    type: ThoughtType,
    template: ReasoningTemplate | null
  ): Promise<{ content: string; confidence: number; tokens: number; reasoning: string }> {
    const pathContext = await this.buildPathContext(session.id, parentNode.id);

    // Build prompt based on type and template
    let prompt = '';

    if (template) {
      const stepIndex = parentNode.depth;
      const templateStep = template.steps.find((s) => s.order === stepIndex + 1);

      if (templateStep) {
        prompt = `${templateStep.prompt}

Context from previous thinking:
${pathContext}

Provide your ${type} and explain your reasoning. Include a confidence level (0-100).`;
      }
    }

    if (!prompt) {
      prompt = this.getDefaultPromptForType(type, pathContext, session.config.thinkingStyle);
    }

    const response = await this.anthropic.messages.create({
      model: session.config.model!,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const confidence = this.extractConfidence(content.text, 70);
    const reasoning = this.extractReasoning(content.text);

    return {
      content: content.text,
      confidence,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
      reasoning,
    };
  }

  private determineNextThoughtType(
    currentNode: ThoughtNode,
    template: ReasoningTemplate | null,
    style: ThinkingStyle
  ): ThoughtType {
    if (template) {
      const nextStep = template.steps.find((s) => s.order === currentNode.depth + 1);
      if (nextStep) {
        return nextStep.type;
      }
    }

    // Default progression based on current type
    const typeProgression: Record<ThoughtType, ThoughtType> = {
      observation: 'analysis',
      analysis: 'hypothesis',
      hypothesis: 'evidence',
      evidence: 'analysis',
      critique: 'synthesis',
      conclusion: 'observation',
      question: 'hypothesis',
      alternative: 'analysis',
      synthesis: 'conclusion',
    };

    // Modify based on style
    if (style === 'creative') {
      if (Math.random() > 0.7) {
        return 'alternative';
      }
    } else if (style === 'analytical') {
      if (currentNode.type !== 'analysis' && Math.random() > 0.6) {
        return 'analysis';
      }
    }

    return typeProgression[currentNode.type] || 'analysis';
  }

  private getDefaultPromptForType(
    type: ThoughtType,
    context: string,
    style: ThinkingStyle
  ): string {
    const styleModifier = {
      thorough: 'Be extremely thorough and consider all angles.',
      fast: 'Be concise and focus on the most important points.',
      creative: 'Think creatively and consider unconventional approaches.',
      analytical: 'Provide deep analytical reasoning with supporting evidence.',
      methodical: 'Follow a systematic, step-by-step approach.',
    };

    const basePrompts: Record<ThoughtType, string> = {
      observation: `Observe and understand the situation. What are the key facts?

${context}

${styleModifier[style]}`,
      analysis: `Analyze the information deeply. What patterns or insights emerge?

${context}

${styleModifier[style]}`,
      hypothesis: `Generate hypotheses. What might be true? What are possible explanations?

${context}

${styleModifier[style]}`,
      evidence: `What evidence supports or refutes the hypotheses?

${context}

${styleModifier[style]}`,
      critique: `Critically examine the reasoning so far. What are the flaws or gaps?

${context}

${styleModifier[style]}`,
      conclusion: `Draw a conclusion based on all the thinking so far.

${context}

${styleModifier[style]}`,
      question: `What key questions need to be answered?

${context}

${styleModifier[style]}`,
      alternative: `Consider alternative perspectives or approaches.

${context}

${styleModifier[style]}`,
      synthesis: `Synthesize the different threads of thinking into a coherent whole.

${context}

${styleModifier[style]}`,
    };

    return basePrompts[type];
  }

  private async buildPathContext(sessionId: string, nodeId: string): Promise<string> {
    const path: ThoughtNode[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = await this.getNode(sessionId, currentId);
      if (!node) break;

      path.unshift(node);
      currentId = node.parentId;
    }

    return path
      .map(
        (node, idx) =>
          `Step ${idx + 1} [${node.type}, confidence: ${node.confidence}%]:\n${node.content}`
      )
      .join('\n\n');
  }

  private buildTreeSummary(tree: ThoughtNode[], rootId: string, depth: number = 0): string {
    const root = tree.find((n) => n.id === rootId);
    if (!root) return '';

    const indent = '  '.repeat(depth);
    let summary = `${indent}- [${root.type}] ${root.content.substring(0, 100)}${root.content.length > 100 ? '...' : ''} (${root.confidence}%)\n`;

    for (const childId of root.children) {
      summary += this.buildTreeSummary(tree, childId, depth + 1);
    }

    return summary;
  }

  private extractConfidence(text: string, defaultValue: number = 70): number {
    // Look for confidence indicators in the text
    const confidenceMatch = text.match(/confidence[:\s]+(\d+)%?/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]);
    }

    // Look for certainty words
    const highConfidence = ['certain', 'definitely', 'clearly', 'obviously'];
    const mediumConfidence = ['likely', 'probably', 'suggests', 'indicates'];
    const lowConfidence = ['possibly', 'might', 'could', 'maybe', 'uncertain'];

    const lowerText = text.toLowerCase();

    if (highConfidence.some((w) => lowerText.includes(w))) {
      return 85;
    }
    if (mediumConfidence.some((w) => lowerText.includes(w))) {
      return 70;
    }
    if (lowConfidence.some((w) => lowerText.includes(w))) {
      return 50;
    }

    return defaultValue;
  }

  private extractReasoning(text: string): string {
    // Try to extract a "reasoning" or "because" section
    const reasoningMatch = text.match(/(?:reasoning|because|rationale)[:\s]+([^.]+\.)/i);
    if (reasoningMatch) {
      return reasoningMatch[1];
    }

    // Use first sentence as reasoning
    const firstSentence = text.split('.')[0];
    return firstSentence.substring(0, 200);
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  private async saveNode(node: ThoughtNode): Promise<void> {
    await this.db.query(
      `INSERT INTO thought_nodes
       (id, session_id, parent_id, content, type, confidence, depth, children, metadata, status, reasoning, alternatives, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        node.id,
        node.sessionId,
        node.parentId,
        node.content,
        node.type,
        node.confidence,
        node.depth,
        JSON.stringify(node.children),
        JSON.stringify(node.metadata),
        node.status,
        node.reasoning,
        JSON.stringify(node.alternatives || []),
        node.metadata.timestamp,
      ]
    );

    // Cache in memory
    let nodeMap = this.sessionNodes.get(node.sessionId);
    if (!nodeMap) {
      nodeMap = new Map();
      this.sessionNodes.set(node.sessionId, nodeMap);
    }
    nodeMap.set(node.id, node);
  }

  private async updateNode(node: ThoughtNode): Promise<void> {
    await this.db.query(
      `UPDATE thought_nodes
       SET content = $1, confidence = $2, children = $3, metadata = $4, status = $5,
           reasoning = $6, alternatives = $7
       WHERE id = $8`,
      [
        node.content,
        node.confidence,
        JSON.stringify(node.children),
        JSON.stringify(node.metadata),
        node.status,
        node.reasoning,
        JSON.stringify(node.alternatives || []),
        node.id,
      ]
    );

    // Update cache
    const nodeMap = this.sessionNodes.get(node.sessionId);
    if (nodeMap) {
      nodeMap.set(node.id, node);
    }
  }

  private async getNode(sessionId: string, nodeId: string): Promise<ThoughtNode | null> {
    // Check cache first
    const cached = this.sessionNodes.get(sessionId)?.get(nodeId);
    if (cached) {
      return cached;
    }

    // Load from database
    const { rows } = await this.db.query(
      'SELECT * FROM thought_nodes WHERE id = $1 AND session_id = $2',
      [nodeId, sessionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const node = this.dbRowToNode(rows[0]);

    // Cache it
    let nodeMap = this.sessionNodes.get(sessionId);
    if (!nodeMap) {
      nodeMap = new Map();
      this.sessionNodes.set(sessionId, nodeMap);
    }
    nodeMap.set(nodeId, node);

    return node;
  }

  private async getSession(sessionId: string): Promise<ThinkingSession | null> {
    // Check cache first
    const cached = this.activeSessions.get(sessionId);
    if (cached) {
      return cached;
    }

    // Load from database
    const { rows } = await this.db.query(
      'SELECT * FROM thinking_sessions WHERE id = $1',
      [sessionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const session = this.dbRowToSession(rows[0]);
    this.activeSessions.set(sessionId, session);

    return session;
  }

  private async updateSession(session: ThinkingSession): Promise<void> {
    await this.db.query(
      `UPDATE thinking_sessions
       SET current_node_id = $1, status = $2, stats = $3, updated_at = $4,
           final_conclusion = $5, completed_at = $6
       WHERE id = $7`,
      [
        session.currentNodeId,
        session.status,
        JSON.stringify(session.stats),
        session.updatedAt,
        session.finalConclusion || null,
        session.completedAt || null,
        session.id,
      ]
    );

    this.activeSessions.set(session.id, session);
  }

  private dbRowToNode(row: any): ThoughtNode {
    return {
      id: row.id,
      parentId: row.parent_id,
      sessionId: row.session_id,
      content: row.content,
      type: row.type,
      confidence: row.confidence,
      depth: row.depth,
      children: JSON.parse(row.children),
      metadata: JSON.parse(row.metadata),
      status: row.status,
      reasoning: row.reasoning,
      alternatives: JSON.parse(row.alternatives || '[]'),
    };
  }

  private dbRowToSession(row: any): ThinkingSession {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      query: row.query,
      rootNodeId: row.root_node_id,
      currentNodeId: row.current_node_id,
      config: JSON.parse(row.config),
      status: row.status,
      stats: JSON.parse(row.stats),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      finalConclusion: row.final_conclusion,
    };
  }
}

// AI Agent Orchestrator
// Coordinates multiple AI agents and manages conversation flow

import { supabase } from '@/lib/supabase/client';

export interface Agent {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
}

export interface OrchestratorConfig {
  maxConcurrentAgents?: number;
  enableMemory?: boolean;
  defaultModel?: string;
}

export class AgentOrchestrator {
  private config: OrchestratorConfig;
  private activeAgents: Map<string, Agent>;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrentAgents: 3,
      enableMemory: true,
      defaultModel: 'gpt-4-turbo-preview',
      ...config,
    };
    this.activeAgents = new Map();
  }

  async selectAgent(userInput: string, userId: string): Promise<Agent | null> {
    // Fetch available agents for user
    const { data: agents } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!agents || agents.length === 0) {
      return null;
    }

    // Simple keyword-based routing (enhance with embeddings for production)
    const lowerInput = userInput.toLowerCase();

    for (const agent of agents) {
      const matchesCapability = agent.capabilities.some((cap: string) =>
        lowerInput.includes(cap.toLowerCase())
      );

      if (matchesCapability) {
        return agent as Agent;
      }
    }

    // Default to first agent
    return agents[0] as Agent;
  }

  async processMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<{
    response: string;
    agent: Agent;
    conversationId: string;
  }> {
    // Select appropriate agent
    const agent = await this.selectAgent(message, userId);

    if (!agent) {
      throw new Error('No active agents available');
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          agent_id: agent.id,
          title: message.substring(0, 50),
        })
        .select()
        .single();

      convId = conv?.id;
    }

    if (!convId) {
      throw new Error('Failed to create conversation');
    }

    // Store user message
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'user',
      content: message,
    });

    // Process with AI (placeholder - integrate with actual AI service)
    const response = `Agent ${agent.name} received: ${message}`;

    // Store AI response
    await supabase.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: response,
      metadata: { agent_id: agent.id },
    });

    return {
      response,
      agent,
      conversationId: convId,
    };
  }

  async getConversationHistory(conversationId: string) {
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    return messages || [];
  }
}

export default AgentOrchestrator;

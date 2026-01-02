// AI Orchestrator Edge Function
// Routes requests to appropriate AI agents and manages multi-agent conversations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrchestratorRequest {
  message: string;
  conversationId?: string;
  agentType?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { message, conversationId, agentType, context }: OrchestratorRequest = await req.json();

    // Determine which agent should handle this
    const selectedAgent = await selectAgent(supabaseClient, user.id, agentType, message);

    // Get or create conversation
    const conversation = conversationId
      ? await getConversation(supabaseClient, user.id, conversationId)
      : await createConversation(supabaseClient, user.id, selectedAgent.id);

    // Store user message
    await supabaseClient.from('messages').insert({
      conversation_id: conversation.id,
      role: 'user',
      content: message,
      metadata: { context },
    });

    // Process with AI (placeholder - integrate with actual AI service)
    const aiResponse = await processWithAI(selectedAgent, message, context);

    // Store AI response
    await supabaseClient.from('messages').insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: aiResponse.content,
      metadata: { agent_id: selectedAgent.id, ...aiResponse.metadata },
    });

    // Update agent last active
    await supabaseClient
      .from('agents')
      .update({ last_active: new Date().toISOString() })
      .eq('id', selectedAgent.id);

    return new Response(
      JSON.stringify({
        conversationId: conversation.id,
        agent: selectedAgent.name,
        response: aiResponse.content,
        metadata: aiResponse.metadata,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function selectAgent(supabase: any, userId: string, agentType?: string, message?: string) {
  if (agentType) {
    // Use specified agent type
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('type', agentType)
      .eq('status', 'active')
      .single();

    if (agent) return agent;
  }

  // Auto-select based on message content (simple keyword matching - enhance with embeddings)
  const lowerMessage = message?.toLowerCase() || '';

  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'task_manager')
      .eq('status', 'active')
      .single();

    if (agent) return agent;
  }

  if (lowerMessage.includes('workflow') || lowerMessage.includes('automate')) {
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'workflow_engine')
      .eq('status', 'active')
      .single();

    if (agent) return agent;
  }

  // Default to first active agent
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();

  return agent || { id: null, name: 'Default Assistant', type: 'general' };
}

async function getConversation(supabase: any, userId: string, conversationId: string) {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  return data;
}

async function createConversation(supabase: any, userId: string, agentId: string) {
  const { data } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      agent_id: agentId,
      title: 'New Conversation',
    })
    .select()
    .single();

  return data;
}

async function processWithAI(agent: any, message: string, context?: Record<string, any>) {
  // Placeholder for actual AI processing
  // In production, call OpenAI/Anthropic API based on agent type and configuration

  const responses: Record<string, string> = {
    task_manager: `I can help you manage that task. Let me break it down into actionable steps.`,
    workflow_engine: `I'll help you set up that workflow. What trigger would you like to use?`,
    researcher: `Let me research that topic for you and provide a comprehensive summary.`,
    general: `I understand. How can I assist you with this?`,
  };

  return {
    content: responses[agent.type] || responses.general,
    metadata: {
      model: 'placeholder',
      tokens: 0,
    },
  };
}

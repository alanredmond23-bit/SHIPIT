// Workflow Engine Edge Function
// Executes workflow transitions and handles state management

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowRequest {
  action: 'start' | 'transition' | 'pause' | 'resume' | 'complete';
  workflowId: string;
  instanceId?: string;
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

    const { action, workflowId, instanceId, context }: WorkflowRequest = await req.json();

    let result;

    switch (action) {
      case 'start':
        result = await startWorkflow(supabaseClient, user.id, workflowId, context);
        break;
      case 'transition':
        result = await executeTransition(supabaseClient, user.id, instanceId!);
        break;
      case 'pause':
        result = await pauseWorkflow(supabaseClient, user.id, instanceId!);
        break;
      case 'resume':
        result = await resumeWorkflow(supabaseClient, user.id, instanceId!);
        break;
      case 'complete':
        result = await completeWorkflow(supabaseClient, user.id, instanceId!);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

async function startWorkflow(
  supabase: any,
  userId: string,
  workflowId: string,
  context: Record<string, any> = {}
) {
  // Get workflow and its start state
  const { data: workflow } = await supabase
    .from('workflows')
    .select('*, workflow_states(*)')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .single();

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const startState = workflow.workflow_states.find((s: any) => s.state_type === 'start');

  if (!startState) {
    throw new Error('Workflow has no start state');
  }

  // Create workflow instance
  const { data: instance, error } = await supabase
    .from('workflow_instances')
    .insert({
      workflow_id: workflowId,
      user_id: userId,
      status: 'running',
      current_state_id: startState.id,
      context,
    })
    .select()
    .single();

  if (error) throw error;

  // Log the start
  await supabase.from('workflow_logs').insert({
    instance_id: instance.id,
    state_id: startState.id,
    action: 'workflow_started',
    result: { context },
  });

  return { instance, message: 'Workflow started successfully' };
}

async function executeTransition(supabase: any, userId: string, instanceId: string) {
  // Get current instance
  const { data: instance } = await supabase
    .from('workflow_instances')
    .select('*, workflows(*)')
    .eq('id', instanceId)
    .eq('user_id', userId)
    .single();

  if (!instance) {
    throw new Error('Workflow instance not found');
  }

  // Get available transitions from current state
  const { data: transitions } = await supabase
    .from('workflow_transitions')
    .select('*, to_state:workflow_states!workflow_transitions_to_state_id_fkey(*)')
    .eq('from_state_id', instance.current_state_id)
    .order('priority', { ascending: true });

  if (!transitions || transitions.length === 0) {
    throw new Error('No transitions available from current state');
  }

  // Evaluate transition conditions and select the first matching one
  const selectedTransition = transitions.find((t: any) => evaluateCondition(t.condition, instance.context));

  if (!selectedTransition) {
    throw new Error('No transition conditions met');
  }

  // Update instance to new state
  const { error } = await supabase
    .from('workflow_instances')
    .update({
      current_state_id: selectedTransition.to_state_id,
    })
    .eq('id', instanceId);

  if (error) throw error;

  // Log the transition
  await supabase.from('workflow_logs').insert({
    instance_id: instanceId,
    state_id: selectedTransition.to_state_id,
    action: 'state_transition',
    result: { from: instance.current_state_id, to: selectedTransition.to_state_id },
  });

  return {
    instanceId,
    newState: selectedTransition.to_state,
    message: 'Transition executed successfully',
  };
}

function evaluateCondition(condition: any, context: Record<string, any>): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;

  // Simple condition evaluation (extend this for complex logic)
  for (const [key, value] of Object.entries(condition)) {
    if (context[key] !== value) return false;
  }

  return true;
}

async function pauseWorkflow(supabase: any, userId: string, instanceId: string) {
  const { error } = await supabase
    .from('workflow_instances')
    .update({ status: 'paused' })
    .eq('id', instanceId)
    .eq('user_id', userId);

  if (error) throw error;

  return { instanceId, status: 'paused' };
}

async function resumeWorkflow(supabase: any, userId: string, instanceId: string) {
  const { error } = await supabase
    .from('workflow_instances')
    .update({ status: 'running' })
    .eq('id', instanceId)
    .eq('user_id', userId);

  if (error) throw error;

  return { instanceId, status: 'running' };
}

async function completeWorkflow(supabase: any, userId: string, instanceId: string) {
  const { error } = await supabase
    .from('workflow_instances')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', instanceId)
    .eq('user_id', userId);

  if (error) throw error;

  return { instanceId, status: 'completed' };
}

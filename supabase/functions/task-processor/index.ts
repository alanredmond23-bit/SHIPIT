// Task Processor Edge Function
// Handles task prioritization, breakdown suggestions, and dependency detection

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskProcessRequest {
  action: 'prioritize' | 'suggest_breakdown' | 'detect_dependencies';
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, taskId, taskTitle, taskDescription }: TaskProcessRequest = await req.json();

    let result;

    switch (action) {
      case 'prioritize':
        result = await prioritizeTask(supabaseClient, user.id, taskId!);
        break;
      case 'suggest_breakdown':
        result = await suggestBreakdown(taskTitle!, taskDescription!);
        break;
      case 'detect_dependencies':
        result = await detectDependencies(supabaseClient, user.id, taskId!);
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

async function prioritizeTask(supabase: any, userId: string, taskId: string) {
  // Get the task
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .single();

  if (!task) {
    throw new Error('Task not found');
  }

  // AI-based prioritization logic (placeholder - integrate with OpenAI/Anthropic)
  const suggestedPriority = calculatePriority(task);

  return {
    taskId,
    currentPriority: task.priority,
    suggestedPriority,
    reasoning: 'Based on due date, dependencies, and current workload',
  };
}

function calculatePriority(task: any): number {
  let priority = 3; // Default medium priority

  // Increase priority if due soon
  if (task.due_date) {
    const daysUntilDue = Math.floor(
      (new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue <= 1) priority = 1; // High
    else if (daysUntilDue <= 3) priority = 2; // Medium-high
  }

  // Adjust based on status
  if (task.status === 'blocked') priority = Math.min(priority + 1, 5);

  return priority;
}

async function suggestBreakdown(title: string, description: string) {
  // Placeholder for AI integration to suggest subtasks
  // In production, call OpenAI/Anthropic API here

  return {
    suggestions: [
      { title: `Research phase for: ${title}`, priority: 2 },
      { title: `Implementation of ${title}`, priority: 2 },
      { title: `Testing and validation for ${title}`, priority: 3 },
    ],
  };
}

async function detectDependencies(supabase: any, userId: string, taskId: string) {
  // Get all user tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description')
    .eq('user_id', userId)
    .neq('id', taskId);

  // Placeholder for AI-based dependency detection
  // In production, use embeddings and semantic similarity

  return {
    potentialDependencies: [],
    confidence: 0,
  };
}

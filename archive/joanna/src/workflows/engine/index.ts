// Workflow Engine
// Executes workflows and manages state transitions

import { supabase } from '@/lib/supabase/client';
import type { WorkflowInstance, WorkflowTransition } from '@/types/workflows';

export class WorkflowEngine {
  async startWorkflow(
    workflowId: string,
    userId: string,
    initialContext: Record<string, any> = {}
  ): Promise<WorkflowInstance> {
    // Get workflow and find start state
    const { data: workflow } = await supabase
      .from('workflows')
      .select('*, workflow_states(*)')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single();

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const startState = (workflow as any).workflow_states.find(
      (s: any) => s.state_type === 'start'
    );

    if (!startState) {
      throw new Error('Workflow has no start state');
    }

    // Create instance
    const { data: instance, error } = await supabase
      .from('workflow_instances')
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        status: 'running',
        current_state_id: startState.id,
        context: initialContext,
      })
      .select()
      .single();

    if (error) throw error;

    // Log start
    await supabase.from('workflow_logs').insert({
      instance_id: instance.id,
      state_id: startState.id,
      action: 'workflow_started',
      result: { context: initialContext },
    });

    return instance as WorkflowInstance;
  }

  async executeTransition(instanceId: string, userId: string): Promise<void> {
    // Get instance
    const { data: instance } = await supabase
      .from('workflow_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('user_id', userId)
      .single();

    if (!instance || !instance.current_state_id) {
      throw new Error('Invalid workflow instance');
    }

    // Get available transitions
    const { data: transitions } = await supabase
      .from('workflow_transitions')
      .select('*, to_state:workflow_states!workflow_transitions_to_state_id_fkey(*)')
      .eq('from_state_id', instance.current_state_id)
      .order('priority', { ascending: true });

    if (!transitions || transitions.length === 0) {
      throw new Error('No transitions available');
    }

    // Find first matching transition
    const selectedTransition = transitions.find((t) =>
      this.evaluateCondition(t.condition as any, instance.context as any)
    );

    if (!selectedTransition) {
      throw new Error('No transition conditions met');
    }

    // Update instance
    await supabase
      .from('workflow_instances')
      .update({
        current_state_id: selectedTransition.to_state_id,
      })
      .eq('id', instanceId);

    // Log transition
    await supabase.from('workflow_logs').insert({
      instance_id: instanceId,
      state_id: selectedTransition.to_state_id,
      action: 'state_transition',
      result: {
        from: instance.current_state_id,
        to: selectedTransition.to_state_id,
      },
    });
  }

  private evaluateCondition(
    condition: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    if (!condition || Object.keys(condition).length === 0) return true;

    // Simple equality check (enhance for complex conditions)
    for (const [key, value] of Object.entries(condition)) {
      if (context[key] !== value) return false;
    }

    return true;
  }

  async pauseWorkflow(instanceId: string, userId: string): Promise<void> {
    await supabase
      .from('workflow_instances')
      .update({ status: 'paused' })
      .eq('id', instanceId)
      .eq('user_id', userId);
  }

  async resumeWorkflow(instanceId: string, userId: string): Promise<void> {
    await supabase
      .from('workflow_instances')
      .update({ status: 'running' })
      .eq('id', instanceId)
      .eq('user_id', userId);
  }

  async completeWorkflow(instanceId: string, userId: string): Promise<void> {
    await supabase
      .from('workflow_instances')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .eq('user_id', userId);
  }
}

export default WorkflowEngine;

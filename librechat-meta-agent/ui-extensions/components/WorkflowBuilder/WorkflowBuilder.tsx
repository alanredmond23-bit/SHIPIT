'use client';

import React, { useState, useCallback } from 'react';
import { WorkflowCanvas } from './WorkflowCanvas';

// Types
interface WorkflowState {
  id: string;
  name: string;
  state_type: 'start' | 'action' | 'decision' | 'parallel' | 'wait' | 'end';
  action_type?: string;
  action_config?: Record<string, any>;
  position_x: number;
  position_y: number;
  color: string;
  icon?: string;
}

interface WorkflowTransition {
  id: string;
  from_state_id: string;
  to_state_id: string;
  name?: string;
  condition?: Record<string, any>;
  condition_expression?: string;
}

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  trigger_type?: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave: (workflow: Workflow) => void;
  onRun?: (workflowId: string) => void;
}

const ACTION_TYPES = [
  { id: 'ai_task', name: 'AI Task', icon: '🤖' },
  { id: 'http_request', name: 'HTTP Request', icon: '🌐' },
  { id: 'email', name: 'Send Email', icon: '📧' },
  { id: 'notification', name: 'Notification', icon: '🔔' },
  { id: 'transform', name: 'Transform Data', icon: '🔄' },
  { id: 'delay', name: 'Delay', icon: '⏱️' },
  { id: 'code', name: 'Run Code', icon: '💻' },
  { id: 'database', name: 'Database Query', icon: '💾' },
  { id: 'webhook', name: 'Webhook', icon: '🔗' },
];

export function WorkflowBuilder({ workflow: initialWorkflow, onSave, onRun }: WorkflowBuilderProps) {
  const [workflow, setWorkflow] = useState<Workflow>(
    initialWorkflow || {
      id: crypto.randomUUID(),
      name: 'New Workflow',
      status: 'draft',
      states: [],
      transitions: [],
    }
  );

  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(true);

  const selectedState = workflow.states.find((s) => s.id === selectedStateId);
  const selectedTransition = workflow.transitions.find((t) => t.id === selectedTransitionId);

  // State management
  const handleStateMove = useCallback((stateId: string, x: number, y: number) => {
    setWorkflow((prev) => ({
      ...prev,
      states: prev.states.map((s) =>
        s.id === stateId ? { ...s, position_x: x, position_y: y } : s
      ),
    }));
  }, []);

  const handleStateAdd = useCallback(
    (position: { x: number; y: number }, type: WorkflowState['state_type']) => {
      const newState: WorkflowState = {
        id: crypto.randomUUID(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} State`,
        state_type: type,
        position_x: position.x,
        position_y: position.y,
        color: '#6366f1',
      };

      setWorkflow((prev) => ({
        ...prev,
        states: [...prev.states, newState],
      }));
      setSelectedStateId(newState.id);
    },
    []
  );

  const handleStateDelete = useCallback(() => {
    if (!selectedStateId) return;
    setWorkflow((prev) => ({
      ...prev,
      states: prev.states.filter((s) => s.id !== selectedStateId),
      transitions: prev.transitions.filter(
        (t) => t.from_state_id !== selectedStateId && t.to_state_id !== selectedStateId
      ),
    }));
    setSelectedStateId(null);
  }, [selectedStateId]);

  const handleStateUpdate = useCallback(
    (updates: Partial<WorkflowState>) => {
      if (!selectedStateId) return;
      setWorkflow((prev) => ({
        ...prev,
        states: prev.states.map((s) =>
          s.id === selectedStateId ? { ...s, ...updates } : s
        ),
      }));
    },
    [selectedStateId]
  );

  // Transition management
  const handleTransitionAdd = useCallback((fromId: string, toId: string) => {
    const newTransition: WorkflowTransition = {
      id: crypto.randomUUID(),
      from_state_id: fromId,
      to_state_id: toId,
    };

    setWorkflow((prev) => ({
      ...prev,
      transitions: [...prev.transitions, newTransition],
    }));
  }, []);

  const handleTransitionDelete = useCallback(() => {
    if (!selectedTransitionId) return;
    setWorkflow((prev) => ({
      ...prev,
      transitions: prev.transitions.filter((t) => t.id !== selectedTransitionId),
    }));
    setSelectedTransitionId(null);
  }, [selectedTransitionId]);

  const handleTransitionUpdate = useCallback(
    (updates: Partial<WorkflowTransition>) => {
      if (!selectedTransitionId) return;
      setWorkflow((prev) => ({
        ...prev,
        transitions: prev.transitions.map((t) =>
          t.id === selectedTransitionId ? { ...t, ...updates } : t
        ),
      }));
    },
    [selectedTransitionId]
  );

  // Connection mode
  const handleConnectStart = useCallback((stateId: string) => {
    setIsConnecting(true);
    setConnectingFromId(stateId);
  }, []);

  const handleConnectEnd = useCallback(() => {
    setIsConnecting(false);
    setConnectingFromId(null);
  }, []);

  // Save workflow
  const handleSave = useCallback(() => {
    onSave(workflow);
  }, [workflow, onSave]);

  // Run workflow
  const handleRun = useCallback(() => {
    if (onRun) {
      onRun(workflow.id);
    }
  }, [workflow.id, onRun]);

  return (
    <div className="flex h-full bg-white">
      {/* Main canvas area */}
      <div className="flex-1 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={workflow.name}
              onChange={(e) => setWorkflow((prev) => ({ ...prev, name: e.target.value }))}
              className="text-lg font-semibold bg-transparent border-b border-transparent hover:border-stone-300 focus:border-indigo-500 focus:outline-none"
            />
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                workflow.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : workflow.status === 'paused'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-stone-100 text-stone-300'
              }`}
            >
              {workflow.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className="px-3 py-1.5 text-sm text-stone-400 hover:bg-stone-100 rounded"
            >
              {showConfigPanel ? 'Hide Panel' : 'Show Panel'}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-stone-900 rounded hover:bg-indigo-700"
            >
              Save
            </button>
            {onRun && (
              <button
                onClick={handleRun}
                className="px-4 py-1.5 text-sm bg-green-600 text-stone-900 rounded hover:bg-green-700"
              >
                Run ▶
              </button>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="pt-12 h-full">
          <WorkflowCanvas
            states={workflow.states}
            transitions={workflow.transitions}
            onStateMove={handleStateMove}
            onStateSelect={(id) => {
              setSelectedStateId(id);
              if (id) setSelectedTransitionId(null);
            }}
            onStateAdd={handleStateAdd}
            onTransitionAdd={handleTransitionAdd}
            onTransitionSelect={(id) => {
              setSelectedTransitionId(id);
              if (id) setSelectedStateId(null);
            }}
            selectedStateId={selectedStateId}
            selectedTransitionId={selectedTransitionId}
            isConnecting={isConnecting}
            connectingFromId={connectingFromId}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
          />
        </div>
      </div>

      {/* Configuration panel */}
      {showConfigPanel && (
        <div className="w-80 border-l bg-white overflow-y-auto">
          <div className="p-4">
            {selectedState ? (
              // State configuration
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">State Configuration</h3>
                  <button
                    onClick={handleStateDelete}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedState.name}
                    onChange={(e) => handleStateUpdate({ name: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Type
                  </label>
                  <div className="text-sm bg-stone-100 px-3 py-2 rounded capitalize">
                    {selectedState.state_type}
                  </div>
                </div>

                {selectedState.state_type === 'action' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Action Type
                    </label>
                    <select
                      value={selectedState.action_type || ''}
                      onChange={(e) => handleStateUpdate({ action_type: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select action...</option>
                      {ACTION_TYPES.map((action) => (
                        <option key={action.id} value={action.id}>
                          {action.icon} {action.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedState.action_type === 'ai_task' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Prompt
                    </label>
                    <textarea
                      value={selectedState.action_config?.prompt || ''}
                      onChange={(e) =>
                        handleStateUpdate({
                          action_config: {
                            ...selectedState.action_config,
                            prompt: e.target.value,
                          },
                        })
                      }
                      rows={4}
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter AI prompt..."
                    />
                  </div>
                )}

                {selectedState.action_type === 'http_request' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        URL
                      </label>
                      <input
                        type="text"
                        value={selectedState.action_config?.url || ''}
                        onChange={(e) =>
                          handleStateUpdate({
                            action_config: {
                              ...selectedState.action_config,
                              url: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Method
                      </label>
                      <select
                        value={selectedState.action_config?.method || 'GET'}
                        onChange={(e) =>
                          handleStateUpdate({
                            action_config: {
                              ...selectedState.action_config,
                              method: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                        <option>PATCH</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedState.action_type === 'delay' && (
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Delay (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedState.action_config?.delay_seconds || 0}
                      onChange={(e) =>
                        handleStateUpdate({
                          action_config: {
                            ...selectedState.action_config,
                            delay_seconds: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min={0}
                    />
                  </div>
                )}
              </div>
            ) : selectedTransition ? (
              // Transition configuration
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Transition Configuration</h3>
                  <button
                    onClick={handleTransitionDelete}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedTransition.name || ''}
                    onChange={(e) => handleTransitionUpdate({ name: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 'Yes', 'No', 'Continue'"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">
                    Condition Expression
                  </label>
                  <textarea
                    value={selectedTransition.condition_expression || ''}
                    onChange={(e) =>
                      handleTransitionUpdate({ condition_expression: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., ctx.variables.approved === true"
                  />
                  <p className="mt-1 text-xs text-stone-400">
                    JavaScript expression. Use 'ctx' for context.
                  </p>
                </div>
              </div>
            ) : (
              // No selection
              <div className="text-center text-stone-400 py-8">
                <div className="text-4xl mb-4">🔧</div>
                <p className="font-medium">No Selection</p>
                <p className="text-sm mt-2">
                  Click on a state or transition to configure it, or add new states from the
                  palette below.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowBuilder;

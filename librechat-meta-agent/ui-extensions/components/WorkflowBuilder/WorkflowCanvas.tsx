'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

// Types
interface Position {
  x: number;
  y: number;
}

interface WorkflowState {
  id: string;
  name: string;
  state_type: 'start' | 'action' | 'decision' | 'parallel' | 'wait' | 'end';
  action_type?: string;
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
}

interface WorkflowCanvasProps {
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  onStateMove: (stateId: string, x: number, y: number) => void;
  onStateSelect: (stateId: string | null) => void;
  onStateAdd: (position: Position, type: WorkflowState['state_type']) => void;
  onTransitionAdd: (fromId: string, toId: string) => void;
  onTransitionSelect: (transitionId: string | null) => void;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  isConnecting: boolean;
  connectingFromId: string | null;
  onConnectStart: (stateId: string) => void;
  onConnectEnd: () => void;
}

const STATE_WIDTH = 160;
const STATE_HEIGHT = 80;

const STATE_ICONS: Record<string, string> = {
  start: '▶',
  action: '⚡',
  decision: '◇',
  parallel: '⫴',
  wait: '⏱',
  end: '⬛',
};

const STATE_COLORS: Record<string, string> = {
  start: '#22c55e',
  action: '#6366f1',
  decision: '#f59e0b',
  parallel: '#8b5cf6',
  wait: '#64748b',
  end: '#ef4444',
};

export function WorkflowCanvas({
  states,
  transitions,
  onStateMove,
  onStateSelect,
  onStateAdd,
  onTransitionAdd,
  onTransitionSelect,
  selectedStateId,
  selectedTransitionId,
  isConnecting,
  connectingFromId,
  onConnectStart,
  onConnectEnd,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState<Position>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });

  // Handle mouse move for dragging and connecting
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / scale;
      const y = (e.clientY - rect.top - pan.y) / scale;
      setMousePos({ x, y });

      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      if (dragging) {
        onStateMove(dragging, x - dragOffset.x, y - dragOffset.y);
      }
    },
    [dragging, dragOffset, onStateMove, scale, pan, isPanning, panStart]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setDragging(null);
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [dragging, isPanning]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current) {
        onStateSelect(null);
        onTransitionSelect(null);
        if (isConnecting) {
          onConnectEnd();
        }
      }
    },
    [onStateSelect, onTransitionSelect, isConnecting, onConnectEnd]
  );

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => Math.min(2, Math.max(0.25, s * delta)));
  }, []);

  // Start dragging a state
  const handleStateMouseDown = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      const state = states.find((s) => s.id === stateId);
      if (!state) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / scale;
      const y = (e.clientY - rect.top - pan.y) / scale;

      setDragOffset({
        x: x - state.position_x,
        y: y - state.position_y,
      });
      setDragging(stateId);
      onStateSelect(stateId);
    },
    [states, onStateSelect, scale, pan]
  );

  // Handle state connection
  const handleConnectorClick = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      if (isConnecting && connectingFromId && connectingFromId !== stateId) {
        onTransitionAdd(connectingFromId, stateId);
        onConnectEnd();
      } else {
        onConnectStart(stateId);
      }
    },
    [isConnecting, connectingFromId, onTransitionAdd, onConnectStart, onConnectEnd]
  );

  // Middle mouse pan
  const handleMiddleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  // Draw connection line
  const renderConnectionLine = () => {
    if (!isConnecting || !connectingFromId) return null;

    const fromState = states.find((s) => s.id === connectingFromId);
    if (!fromState) return null;

    const startX = fromState.position_x + STATE_WIDTH / 2;
    const startY = fromState.position_y + STATE_HEIGHT / 2;

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: '100%', height: '100%' }}
      >
        <line
          x1={startX}
          y1={startY}
          x2={mousePos.x}
          y2={mousePos.y}
          stroke="#6366f1"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      </svg>
    );
  };

  // Render transitions
  const renderTransitions = () => {
    return transitions.map((transition) => {
      const fromState = states.find((s) => s.id === transition.from_state_id);
      const toState = states.find((s) => s.id === transition.to_state_id);
      if (!fromState || !toState) return null;

      const startX = fromState.position_x + STATE_WIDTH / 2;
      const startY = fromState.position_y + STATE_HEIGHT / 2;
      const endX = toState.position_x + STATE_WIDTH / 2;
      const endY = toState.position_y + STATE_HEIGHT / 2;

      // Calculate control points for curved line
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const ctrl1X = midX - dy * 0.2;
      const ctrl1Y = midY + dx * 0.2;

      const isSelected = selectedTransitionId === transition.id;

      return (
        <g key={transition.id}>
          {/* Clickable area */}
          <path
            d={`M ${startX} ${startY} Q ${ctrl1X} ${ctrl1Y} ${endX} ${endY}`}
            fill="none"
            stroke="transparent"
            strokeWidth={20}
            className="cursor-pointer"
            onClick={() => onTransitionSelect(transition.id)}
          />
          {/* Visible line */}
          <path
            d={`M ${startX} ${startY} Q ${ctrl1X} ${ctrl1Y} ${endX} ${endY}`}
            fill="none"
            stroke={isSelected ? '#6366f1' : '#94a3b8'}
            strokeWidth={isSelected ? 3 : 2}
            markerEnd="url(#arrowhead)"
          />
          {/* Label */}
          {transition.name && (
            <text
              x={ctrl1X}
              y={ctrl1Y - 10}
              textAnchor="middle"
              className="text-xs fill-slate-400"
            >
              {transition.name}
            </text>
          )}
        </g>
      );
    });
  };

  // Render states
  const renderStates = () => {
    return states.map((state) => {
      const isSelected = selectedStateId === state.id;
      const color = STATE_COLORS[state.state_type] || state.color;

      return (
        <div
          key={state.id}
          className={`absolute cursor-move select-none transition-shadow ${
            isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
          }`}
          style={{
            left: state.position_x,
            top: state.position_y,
            width: STATE_WIDTH,
            height: STATE_HEIGHT,
          }}
          onMouseDown={(e) => handleStateMouseDown(e, state.id)}
        >
          <div
            className="w-full h-full rounded-lg shadow-lg border-2 flex flex-col items-center justify-center"
            style={{
              backgroundColor: `${color}20`,
              borderColor: color,
            }}
          >
            <span className="text-2xl mb-1">{STATE_ICONS[state.state_type]}</span>
            <span className="text-sm font-medium text-slate-700 truncate px-2 max-w-full">
              {state.name}
            </span>
            {state.action_type && (
              <span className="text-xs text-slate-500">{state.action_type}</span>
            )}
          </div>

          {/* Connection points */}
          <div
            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
              isConnecting ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-slate-300 hover:border-indigo-500'
            }`}
            onClick={(e) => handleConnectorClick(e, state.id)}
          >
            <span className="text-xs">→</span>
          </div>
          <div
            className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
              isConnecting && connectingFromId !== state.id
                ? 'bg-green-500 border-green-600'
                : 'bg-white border-slate-300 hover:border-green-500'
            }`}
            onClick={(e) => {
              if (isConnecting && connectingFromId && connectingFromId !== state.id) {
                handleConnectorClick(e, state.id);
              }
            }}
          >
            <span className="text-xs">●</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-slate-50 overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle, #cbd5e1 1px, transparent 1px)`,
        backgroundSize: `${20 * scale}px ${20 * scale}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onMouseDown={handleMiddleMouseDown}
      onWheel={handleWheel}
    >
      {/* Transform container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG for transitions */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: 4000, height: 4000, overflow: 'visible' }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
            </marker>
          </defs>
          {renderTransitions()}
        </svg>

        {/* Connection line while connecting */}
        {renderConnectionLine()}

        {/* States */}
        {renderStates()}
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex gap-2 bg-white rounded-lg shadow-lg p-2">
        <button
          onClick={() => setScale((s) => Math.min(2, s * 1.2))}
          className="p-2 hover:bg-slate-100 rounded"
          title="Zoom In"
        >
          🔍+
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.25, s * 0.8))}
          className="p-2 hover:bg-slate-100 rounded"
          title="Zoom Out"
        >
          🔍-
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-2 hover:bg-slate-100 rounded"
          title="Reset View"
        >
          ⌂
        </button>
        <div className="w-px bg-slate-200" />
        <span className="text-sm text-slate-500 self-center px-2">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* State type palette */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white rounded-lg shadow-lg p-2">
        {(['start', 'action', 'decision', 'parallel', 'wait', 'end'] as const).map((type) => (
          <button
            key={type}
            className="flex flex-col items-center p-2 hover:bg-slate-100 rounded min-w-[60px]"
            onClick={() => onStateAdd({ x: 200, y: 200 }, type)}
            title={`Add ${type} state`}
          >
            <span className="text-xl mb-1" style={{ color: STATE_COLORS[type] }}>
              {STATE_ICONS[type]}
            </span>
            <span className="text-xs text-slate-500 capitalize">{type}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default WorkflowCanvas;

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

  // Touch state
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

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

  // Touch event handlers
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two-finger pinch to zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      setLastTouchDistance(distance);
      setIsPanning(true);
    } else if (e.touches.length === 1) {
      // Single finger - record for potential drag
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance !== null) {
        // Pinch to zoom
        e.preventDefault();
        const distance = getTouchDistance(e.touches[0], e.touches[1]);
        const delta = distance / lastTouchDistance;
        setScale((s) => Math.min(2, Math.max(0.25, s * delta)));
        setLastTouchDistance(distance);
      } else if (e.touches.length === 1 && touchStartRef.current) {
        // Pan with single finger
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only start panning if moved more than 10px
        if (distance > 10 || isTouchDragging) {
          e.preventDefault();
          setIsTouchDragging(true);
          setPan((prev) => ({
            x: prev.x + dx / scale,
            y: prev.y + dy / scale,
          }));
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: touchStartRef.current.time,
          };
        }
      }
    },
    [lastTouchDistance, isTouchDragging, scale]
  );

  const handleTouchEnd = useCallback(() => {
    setLastTouchDistance(null);
    setIsTouchDragging(false);
    setIsPanning(false);
    touchStartRef.current = null;
  }, []);

  // State touch handlers
  const handleStateTouchStart = useCallback(
    (e: React.TouchEvent, stateId: string) => {
      e.stopPropagation();
      const state = states.find((s) => s.id === stateId);
      if (!state) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touch = e.touches[0];
      const x = (touch.clientX - rect.left - pan.x) / scale;
      const y = (touch.clientY - rect.top - pan.y) / scale;

      setDragOffset({
        x: x - state.position_x,
        y: y - state.position_y,
      });
      setDragging(stateId);
      onStateSelect(stateId);
    },
    [states, onStateSelect, scale, pan]
  );

  const handleStateTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const touch = e.touches[0];
      const x = (touch.clientX - rect.left - pan.x) / scale;
      const y = (touch.clientY - rect.top - pan.y) / scale;

      onStateMove(dragging, x - dragOffset.x, y - dragOffset.y);
    },
    [dragging, dragOffset, onStateMove, scale, pan]
  );

  const handleStateTouchEnd = useCallback(() => {
    if (dragging) {
      setDragging(null);
    }
  }, [dragging]);

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
              className="text-xs fill-stone-400"
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
          className={`absolute cursor-move select-none transition-shadow touch-manipulation ${
            isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
          }`}
          style={{
            left: state.position_x,
            top: state.position_y,
            width: STATE_WIDTH,
            height: STATE_HEIGHT,
          }}
          onMouseDown={(e) => handleStateMouseDown(e, state.id)}
          onTouchStart={(e) => handleStateTouchStart(e, state.id)}
          onTouchMove={handleStateTouchMove}
          onTouchEnd={handleStateTouchEnd}
        >
          <div
            className="w-full h-full rounded-lg shadow-lg border-2 flex flex-col items-center justify-center"
            style={{
              backgroundColor: `${color}20`,
              borderColor: color,
            }}
          >
            <span className="text-2xl mb-1">{STATE_ICONS[state.state_type]}</span>
            <span className="text-sm font-medium text-stone-300 truncate px-2 max-w-full">
              {state.name}
            </span>
            {state.action_type && (
              <span className="text-xs text-stone-400">{state.action_type}</span>
            )}
          </div>

          {/* Connection points - Touch-friendly size */}
          <div
            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all touch-manipulation ${
              isConnecting ? 'bg-indigo-500 border-indigo-600' : 'bg-white border-stone-300 hover:border-indigo-500 active:border-indigo-600'
            }`}
            onClick={(e) => handleConnectorClick(e, state.id)}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleConnectorClick(e as any, state.id);
            }}
          >
            <span className="text-xs md:text-[10px]">→</span>
          </div>
          <div
            className={`absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all touch-manipulation ${
              isConnecting && connectingFromId !== state.id
                ? 'bg-green-500 border-green-600'
                : 'bg-white border-stone-300 hover:border-green-500 active:border-green-600'
            }`}
            onClick={(e) => {
              if (isConnecting && connectingFromId && connectingFromId !== state.id) {
                handleConnectorClick(e, state.id);
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (isConnecting && connectingFromId && connectingFromId !== state.id) {
                handleConnectorClick(e as any, state.id);
              }
            }}
          >
            <span className="text-xs md:text-[10px]">●</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full bg-stone-50 overflow-hidden touch-none"
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

      {/* Toolbar - Mobile optimized */}
      <div className="absolute top-4 left-4 flex gap-2 bg-white rounded-lg shadow-lg p-2 z-10">
        <button
          onClick={() => setScale((s) => Math.min(2, s * 1.2))}
          className="p-2 md:p-1.5 hover:bg-stone-100 active:bg-stone-200 rounded touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          title="Zoom In"
        >
          <span className="text-base md:text-sm">🔍+</span>
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.25, s * 0.8))}
          className="p-2 md:p-1.5 hover:bg-stone-100 active:bg-stone-200 rounded touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          title="Zoom Out"
        >
          <span className="text-base md:text-sm">🔍-</span>
        </button>
        <button
          onClick={() => {
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-2 md:p-1.5 hover:bg-stone-100 active:bg-stone-200 rounded touch-manipulation min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
          title="Reset View"
        >
          <span className="text-base md:text-sm">⌂</span>
        </button>
        <div className="w-px bg-stone-200 hidden md:block" />
        <span className="text-sm text-stone-400 self-center px-2 hidden md:inline">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* State type palette - Horizontal scroll on mobile */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[90vw] overflow-x-auto hide-scrollbar z-10">
        <div className="flex gap-2 bg-white rounded-lg shadow-lg p-2">
          {(['start', 'action', 'decision', 'parallel', 'wait', 'end'] as const).map((type) => (
            <button
              key={type}
              className="flex flex-col items-center p-3 md:p-2 hover:bg-stone-100 active:bg-stone-200 rounded min-w-[64px] md:min-w-[60px] touch-manipulation"
              onClick={() => onStateAdd({ x: 200, y: 200 }, type)}
              title={`Add ${type} state`}
            >
              <span className="text-2xl md:text-xl mb-1" style={{ color: STATE_COLORS[type] }}>
                {STATE_ICONS[type]}
              </span>
              <span className="text-xs text-stone-400 capitalize whitespace-nowrap">{type}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkflowCanvas;

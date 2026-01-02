'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  X,
  MousePointer,
  Type,
  ArrowDown,
  ArrowUp,
  Camera,
  Play,
  Pause,
  Square,
  RotateCcw,
  History,
  Wand2,
  Loader2,
  Eye,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Search,
  Save,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Computer Session Interface
 */
export interface ComputerSession {
  id: string;
  status: 'starting' | 'active' | 'paused' | 'ended';
  currentUrl?: string;
  screenshot?: string;
  createdAt: Date;
}

/**
 * Computer Action Interface
 */
export interface ComputerAction {
  id: string;
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'screenshot' | 'wait' | 'task';
  params: Record<string, any>;
  result?: {
    success: boolean;
    screenshot?: string;
    error?: string;
  };
  timestamp: Date;
}

/**
 * Detected Element Interface
 */
export interface DetectedElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'text' | 'image' | 'dropdown' | 'checkbox';
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  interactable: boolean;
  selector?: string;
}

/**
 * Screen Analysis Interface
 */
export interface ScreenAnalysis {
  elements: DetectedElement[];
  text: string;
  description: string;
  suggestedActions: string[];
}

export interface ComputerUseProps {
  /** User ID for session management */
  userId: string;
  /** API base URL */
  apiUrl?: string;
  /** Initial session to resume */
  sessionId?: string;
  /** Callback when session starts */
  onSessionStart?: (sessionId: string) => void;
  /** Callback when session ends */
  onSessionEnd?: () => void;
  /** Callback when action completes */
  onActionComplete?: (action: ComputerAction) => void;
}

type ActionMode = 'click' | 'type' | 'scroll' | 'navigate' | 'analyze' | 'task';

/**
 * Computer Use Component - Browser & Desktop Automation
 *
 * Features:
 * - Live screenshot display with click overlay
 * - Action toolbar (click, type, scroll, navigate)
 * - URL navigation bar
 * - AI task execution
 * - Action history sidebar
 * - Element detection and highlighting
 * - Recording and playback
 * - Saved workflows
 */
export default function ComputerUse({
  userId,
  apiUrl = '/api/computer',
  sessionId: initialSessionId,
  onSessionStart,
  onSessionEnd,
  onActionComplete,
}: ComputerUseProps) {
  // Session state
  const [session, setSession] = useState<ComputerSession | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [actionMode, setActionMode] = useState<ActionMode>('click');
  const [url, setUrl] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [typeInput, setTypeInput] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Action history
  const [actions, setActions] = useState<ComputerAction[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordedActions, setRecordedActions] = useState<ComputerAction[]>([]);

  // Screen analysis
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [hoveredElement, setHoveredElement] = useState<DetectedElement | null>(null);
  const [highlightedElements, setHighlightedElements] = useState<DetectedElement[]>([]);

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);
  const screenshotRef = useRef<HTMLDivElement>(null);

  /**
   * Start a new session
   */
  const startSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${apiUrl}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          config: {
            viewport: { width: 1280, height: 720 },
            headless: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start session');
      }

      const data = await response.json();
      const newSession: ComputerSession = {
        id: data.data.sessionId,
        status: data.data.status,
        createdAt: new Date(data.data.createdAt),
      };

      setSession(newSession);
      onSessionStart?.(newSession.id);

      // Connect WebSocket for real-time updates
      connectWebSocket(newSession.id);

      // Take initial screenshot
      await takeScreenshot(newSession.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * End current session
   */
  const endSession = async () => {
    if (!session) return;

    try {
      await fetch(`${apiUrl}/${session.id}/end`, {
        method: 'POST',
      });

      setSession(null);
      setScreenshot(null);
      setActions([]);
      onSessionEnd?.();

      // Close WebSocket
      wsRef.current?.close();
    } catch (err: any) {
      setError(err.message);
    }
  };

  /**
   * Connect WebSocket for real-time updates
   */
  const connectWebSocket = (sessionId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/computer/${sessionId}`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'screenshot':
          setScreenshot(data.data.screenshot);
          break;
        case 'action':
          const action: ComputerAction = data.data.action;
          setActions((prev) => [...prev, action]);
          onActionComplete?.(action);
          if (action.result?.screenshot) {
            setScreenshot(action.result.screenshot);
          }
          break;
        case 'session_update':
          setSession((prev) =>
            prev ? { ...prev, status: data.data.status, currentUrl: data.data.currentUrl } : null
          );
          break;
      }
    };

    ws.onerror = () => {
      console.error('WebSocket error');
    };

    wsRef.current = ws;
  };

  /**
   * Take screenshot
   */
  const takeScreenshot = async (sessionId?: string) => {
    const sid = sessionId || session?.id;
    if (!sid) return;

    try {
      const response = await fetch(`${apiUrl}/${sid}/screenshot`);
      const data = await response.json();
      setScreenshot(data.data.screenshot);
    } catch (err) {
      console.error('Failed to take screenshot:', err);
    }
  };

  /**
   * Navigate to URL
   */
  const navigate = async () => {
    if (!session || !url) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/${session.id}/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      setScreenshot(data.data.screenshot);
      setSession((prev) => (prev ? { ...prev, currentUrl: url } : null));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle screenshot click
   */
  const handleScreenshotClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!session || !screenshotRef.current) return;

    const rect = screenshotRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 1280;
    const y = ((e.clientY - rect.top) / rect.height) * 720;

    try {
      setLoading(true);

      switch (actionMode) {
        case 'click':
          await fetch(`${apiUrl}/${session.id}/click`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: Math.floor(x), y: Math.floor(y) }),
          });
          break;

        case 'analyze':
          // Get element at position
          const elemResponse = await fetch(
            `${apiUrl}/${session.id}/element-at?x=${Math.floor(x)}&y=${Math.floor(y)}`
          );
          const elemData = await elemResponse.json();
          if (elemData.data) {
            setHoveredElement(elemData.data);
          }
          break;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Type text
   */
  const typeText = async () => {
    if (!session || !typeInput) return;

    try {
      setLoading(true);
      await fetch(`${apiUrl}/${session.id}/type`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: typeInput }),
      });
      setTypeInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Scroll
   */
  const scroll = async (direction: 'up' | 'down') => {
    if (!session) return;

    try {
      await fetch(`${apiUrl}/${session.id}/scroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction, amount: 300 }),
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  /**
   * Analyze screen
   */
  const analyzeScreen = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/${session.id}/analyze`, {
        method: 'POST',
      });

      const data = await response.json();
      setAnalysis(data.data);
      setHighlightedElements(data.data.elements || []);
      setShowAnalysis(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute AI task
   */
  const executeTask = async () => {
    if (!session || !taskInput) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/${session.id}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
      });

      const data = await response.json();
      setActions((prev) => [...prev, ...data.data.steps]);
      setTaskInput('');

      if (data.data.finalScreenshot) {
        setScreenshot(data.data.finalScreenshot);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle recording
   */
  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      console.log('Recorded actions:', recordedActions);
    } else {
      setRecording(true);
      setRecordedActions([]);
    }
  };

  /**
   * Auto-start session on mount
   */
  useEffect(() => {
    if (initialSessionId) {
      // Resume existing session
      setSession({
        id: initialSessionId,
        status: 'active',
        createdAt: new Date(),
      });
      connectWebSocket(initialSessionId);
      takeScreenshot(initialSessionId);
    }
  }, [initialSessionId]);

  /**
   * Record actions
   */
  useEffect(() => {
    if (recording && actions.length > 0) {
      const latestAction = actions[actions.length - 1];
      setRecordedActions((prev) => [...prev, latestAction]);
    }
  }, [actions, recording]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <div
      className={clsx(
        'flex flex-col bg-gray-900 text-white',
        isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Computer Use</h2>
          {session && (
            <span
              className={clsx(
                'px-2 py-1 text-xs rounded-full',
                session.status === 'active'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              )}
            >
              {session.status}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-700 rounded transition"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={endSession}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                End Session
              </button>
            </>
          ) : (
            <button
              onClick={startSession}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start Session
            </button>
          )}
        </div>
      </div>

      {/* URL Bar */}
      {session && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 border-b border-gray-700">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate()}
            placeholder="Enter URL..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={navigate}
            disabled={!url || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            Go
          </button>
          <button
            onClick={() => takeScreenshot()}
            className="p-2 hover:bg-gray-700 rounded transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Actions */}
        {session && (
          <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-2">
            <button
              onClick={() => setActionMode('click')}
              className={clsx(
                'p-3 rounded transition',
                actionMode === 'click'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-400'
              )}
              title="Click Mode"
            >
              <MousePointer className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActionMode('type')}
              className={clsx(
                'p-3 rounded transition',
                actionMode === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-400'
              )}
              title="Type Mode"
            >
              <Type className="w-5 h-5" />
            </button>

            <button
              onClick={() => scroll('up')}
              className="p-3 hover:bg-gray-700 rounded transition text-gray-400"
              title="Scroll Up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            <button
              onClick={() => scroll('down')}
              className="p-3 hover:bg-gray-700 rounded transition text-gray-400"
              title="Scroll Down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>

            <div className="border-t border-gray-700 w-full my-2" />

            <button
              onClick={analyzeScreen}
              className={clsx(
                'p-3 rounded transition',
                actionMode === 'analyze'
                  ? 'bg-purple-600 text-white'
                  : 'hover:bg-gray-700 text-gray-400'
              )}
              title="Analyze Screen"
            >
              <Eye className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActionMode('task')}
              className={clsx(
                'p-3 rounded transition',
                actionMode === 'task'
                  ? 'bg-purple-600 text-white'
                  : 'hover:bg-gray-700 text-gray-400'
              )}
              title="AI Task"
            >
              <Wand2 className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRecording}
              className={clsx(
                'p-3 rounded transition',
                recording ? 'bg-red-600 text-white animate-pulse' : 'hover:bg-gray-700 text-gray-400'
              )}
              title={recording ? 'Stop Recording' : 'Start Recording'}
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Center - Screenshot Display */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {session && screenshot ? (
            <div className="flex-1 flex items-center justify-center bg-gray-900 p-4 overflow-auto">
              <div
                ref={screenshotRef}
                className="relative cursor-crosshair"
                style={{ transform: `scale(${zoom})` }}
                onClick={handleScreenshotClick}
              >
                <img
                  src={screenshot}
                  alt="Browser screenshot"
                  className="max-w-full h-auto shadow-2xl rounded"
                />

                {/* Element Highlights */}
                {highlightedElements.map((element) => (
                  <div
                    key={element.id}
                    className="absolute border-2 border-blue-500 bg-blue-500/10 rounded pointer-events-none"
                    style={{
                      left: `${(element.bounds.x / 1280) * 100}%`,
                      top: `${(element.bounds.y / 720) * 100}%`,
                      width: `${(element.bounds.width / 1280) * 100}%`,
                      height: `${(element.bounds.height / 720) * 100}%`,
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {element.type}: {element.text?.substring(0, 30)}
                    </div>
                  </div>
                ))}

                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-500">
                {!session ? (
                  <>
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Start a session to begin</p>
                  </>
                ) : (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                )}
              </div>
            </div>
          )}

          {/* Bottom Toolbar */}
          {session && (
            <div className="bg-gray-800 border-t border-gray-700 p-3">
              {actionMode === 'type' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={typeInput}
                    onChange={(e) => setTypeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && typeText()}
                    placeholder="Type text..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={typeText}
                    disabled={!typeInput}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                  >
                    Type
                  </button>
                </div>
              )}

              {actionMode === 'task' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeTask()}
                    placeholder="Describe what you want to do (e.g., 'Search for cats on Google')..."
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={executeTask}
                    disabled={!taskInput || loading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition disabled:opacity-50 flex items-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    Execute
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-400">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="px-2 py-1 text-xs hover:bg-gray-700 rounded"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - History & Analysis */}
        {session && showHistory && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="font-semibold flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {actions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No actions yet</p>
              ) : (
                actions.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className={clsx(
                      'p-3 rounded border',
                      action.result?.success
                        ? 'bg-gray-700/50 border-gray-600'
                        : 'bg-red-900/20 border-red-700'
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{action.type}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs text-gray-400 overflow-hidden">
                      {JSON.stringify(action.params, null, 2).substring(0, 100)}
                    </pre>
                  </div>
                ))
              )}
            </div>

            {/* Analysis Panel */}
            {showAnalysis && analysis && (
              <div className="border-t border-gray-700 p-3 max-h-64 overflow-y-auto">
                <h4 className="font-semibold mb-2 text-sm">Screen Analysis</h4>
                <p className="text-xs text-gray-400 mb-3">{analysis.description}</p>

                {analysis.suggestedActions.length > 0 && (
                  <>
                    <h5 className="text-xs font-semibold mb-2">Suggested Actions:</h5>
                    <ul className="text-xs text-gray-400 space-y-1">
                      {analysis.suggestedActions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span>•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <button
                  onClick={() => setShowAnalysis(false)}
                  className="mt-3 w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition"
                >
                  Close Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toggle History Button (when hidden) */}
        {session && !showHistory && (
          <button
            onClick={() => setShowHistory(true)}
            className="absolute right-4 top-20 p-2 bg-gray-800 hover:bg-gray-700 rounded-l border-l border-t border-b border-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded shadow-lg flex items-center gap-3 max-w-md">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

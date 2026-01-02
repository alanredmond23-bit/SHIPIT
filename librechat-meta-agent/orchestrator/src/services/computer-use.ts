// Computer Use Engine - Browser & Desktop Automation
// Features:
// 1. Browser automation with Playwright
// 2. Screenshot capture and analysis
// 3. Element detection and clicking
// 4. Keyboard input
// 5. Scrolling and navigation
// 6. Form filling
// 7. File download/upload
// 8. Multi-tab management
// 9. Session persistence

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { BrowserEngine } from './computer/browser-engine';
import { ScreenAnalyzer } from './computer/screen-analyzer';
import { TaskPlanner } from './computer/task-planner';
import { pool } from '../db';

export interface ComputerSession {
  id: string;
  userId: string;
  type: 'browser' | 'desktop';
  status: 'starting' | 'active' | 'paused' | 'ended';
  currentUrl?: string;
  screenshot?: string;
  browserContext?: any;
  actions: ComputerAction[];
  createdAt: Date;
  endedAt?: Date;
}

export interface ComputerAction {
  id: string;
  type: 'click' | 'type' | 'scroll' | 'navigate' | 'screenshot' | 'wait' | 'select' | 'hover' | 'drag';
  params: Record<string, any>;
  result?: {
    success: boolean;
    screenshot?: string;
    error?: string;
    data?: any;
  };
  timestamp: Date;
}

export interface ScreenAnalysis {
  elements: DetectedElement[];
  text: string;
  description: string;
  suggestedActions: string[];
}

export interface DetectedElement {
  id: string;
  type: 'button' | 'link' | 'input' | 'text' | 'image' | 'dropdown' | 'checkbox';
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  interactable: boolean;
  attributes: Record<string, string>;
  selector?: string;
}

export interface BrowserConfig {
  headless?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
  recordVideo?: boolean;
}

export interface TaskExecution {
  success: boolean;
  steps: ComputerAction[];
  error?: string;
  finalScreenshot?: string;
}

export class ComputerUseEngine extends EventEmitter {
  private sessions: Map<string, ComputerSession> = new Map();
  private browserEngine: BrowserEngine;
  private screenAnalyzer: ScreenAnalyzer;
  private taskPlanner: TaskPlanner;

  constructor() {
    super();
    this.browserEngine = new BrowserEngine();
    this.screenAnalyzer = new ScreenAnalyzer();
    this.taskPlanner = new TaskPlanner(this);
  }

  /**
   * Start a browser session
   */
  async startBrowserSession(
    userId: string,
    config?: BrowserConfig
  ): Promise<ComputerSession> {
    const sessionId = uuidv4();

    const session: ComputerSession = {
      id: sessionId,
      userId,
      type: 'browser',
      status: 'starting',
      actions: [],
      createdAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    try {
      // Launch browser
      const browserContext = await this.browserEngine.launch(sessionId, config);

      session.browserContext = browserContext;
      session.status = 'active';

      // Save to database
      await this.saveSessionToDB(session);

      this.emit('session:started', session);

      return session;
    } catch (error) {
      session.status = 'ended';
      throw new Error(`Failed to start browser session: ${error.message}`);
    }
  }

  /**
   * Navigate to URL
   */
  async navigate(
    sessionId: string,
    url: string
  ): Promise<{ screenshot: string }> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'navigate',
      params: { url },
      timestamp: new Date(),
    };

    try {
      await this.browserEngine.navigate(sessionId, url);

      // Wait for page to load
      await this.browserEngine.waitForLoad(sessionId);

      // Take screenshot
      const screenshot = await this.browserEngine.screenshot(sessionId);

      session.currentUrl = url;
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      this.emit('action:completed', { sessionId, action });

      return { screenshot };
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Click at position or on element
   */
  async click(
    sessionId: string,
    target: { x: number; y: number } | { selector: string }
  ): Promise<{ screenshot: string }> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'click',
      params: target,
      timestamp: new Date(),
    };

    try {
      if ('selector' in target) {
        await this.browserEngine.clickSelector(sessionId, target.selector);
      } else {
        await this.browserEngine.clickCoordinates(sessionId, target.x, target.y);
      }

      // Wait a bit for any transitions
      await this.browserEngine.wait(sessionId, 500);

      const screenshot = await this.browserEngine.screenshot(sessionId);
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      this.emit('action:completed', { sessionId, action });

      return { screenshot };
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Type text
   */
  async type(
    sessionId: string,
    text: string,
    target?: { selector: string }
  ): Promise<{ screenshot: string }> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'type',
      params: { text, target },
      timestamp: new Date(),
    };

    try {
      if (target?.selector) {
        await this.browserEngine.typeInSelector(sessionId, target.selector, text);
      } else {
        await this.browserEngine.typeText(sessionId, text);
      }

      const screenshot = await this.browserEngine.screenshot(sessionId);
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      this.emit('action:completed', { sessionId, action });

      return { screenshot };
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Press key(s)
   */
  async pressKey(sessionId: string, keys: string): Promise<{ screenshot: string }> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'wait',
      params: { keys },
      timestamp: new Date(),
    };

    try {
      await this.browserEngine.pressKey(sessionId, keys);
      await this.browserEngine.wait(sessionId, 300);

      const screenshot = await this.browserEngine.screenshot(sessionId);
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      this.emit('action:completed', { sessionId, action });

      return { screenshot };
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Scroll
   */
  async scroll(
    sessionId: string,
    direction: 'up' | 'down' | 'left' | 'right',
    amount: number
  ): Promise<{ screenshot: string }> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'scroll',
      params: { direction, amount },
      timestamp: new Date(),
    };

    try {
      await this.browserEngine.scroll(sessionId, direction, amount);
      await this.browserEngine.wait(sessionId, 300);

      const screenshot = await this.browserEngine.screenshot(sessionId);
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      this.emit('action:completed', { sessionId, action });

      return { screenshot };
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Take screenshot
   */
  async screenshot(sessionId: string): Promise<string> {
    const session = this.getSession(sessionId);

    const action: ComputerAction = {
      id: uuidv4(),
      type: 'screenshot',
      params: {},
      timestamp: new Date(),
    };

    try {
      const screenshot = await this.browserEngine.screenshot(sessionId);
      session.screenshot = screenshot;

      action.result = {
        success: true,
        screenshot,
      };

      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);

      return screenshot;
    } catch (error) {
      action.result = {
        success: false,
        error: error.message,
      };
      session.actions.push(action);
      await this.saveActionToDB(sessionId, action);
      throw error;
    }
  }

  /**
   * Analyze current screen with vision model
   */
  async analyzeScreen(sessionId: string): Promise<ScreenAnalysis> {
    const session = this.getSession(sessionId);

    // Get current screenshot
    const screenshot = await this.browserEngine.screenshot(sessionId);

    // Get page HTML for context
    const html = await this.browserEngine.getHTML(sessionId);

    // Analyze with vision model
    const analysis = await this.screenAnalyzer.analyze(screenshot, html);

    return analysis;
  }

  /**
   * Execute a high-level task (AI plans and executes steps)
   */
  async executeTask(
    sessionId: string,
    task: string
  ): Promise<TaskExecution> {
    const session = this.getSession(sessionId);

    try {
      // Use task planner to break down and execute the task
      const result = await this.taskPlanner.executeTask(sessionId, task);

      return result;
    } catch (error) {
      return {
        success: false,
        steps: [],
        error: error.message,
      };
    }
  }

  /**
   * Get element at position
   */
  async getElementAt(
    sessionId: string,
    x: number,
    y: number
  ): Promise<DetectedElement | null> {
    try {
      const element = await this.browserEngine.getElementAtPosition(sessionId, x, y);
      return element;
    } catch (error) {
      console.error('Failed to get element at position:', error);
      return null;
    }
  }

  /**
   * Fill form
   */
  async fillForm(
    sessionId: string,
    formData: Record<string, string>
  ): Promise<void> {
    const session = this.getSession(sessionId);

    for (const [field, value] of Object.entries(formData)) {
      // Try to find the field by various selectors
      const selectors = [
        `input[name="${field}"]`,
        `input[id="${field}"]`,
        `textarea[name="${field}"]`,
        `textarea[id="${field}"]`,
        `select[name="${field}"]`,
        `select[id="${field}"]`,
      ];

      let filled = false;
      for (const selector of selectors) {
        try {
          await this.browserEngine.typeInSelector(sessionId, selector, value);
          filled = true;
          break;
        } catch (error) {
          // Try next selector
          continue;
        }
      }

      if (!filled) {
        throw new Error(`Could not find form field: ${field}`);
      }
    }
  }

  /**
   * Download file
   */
  async downloadFile(
    sessionId: string,
    selector: string
  ): Promise<{ path: string }> {
    try {
      const downloadPath = await this.browserEngine.downloadFile(sessionId, selector);
      return { path: downloadPath };
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * End session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);

    try {
      await this.browserEngine.close(sessionId);

      session.status = 'ended';
      session.endedAt = new Date();

      // Update database
      await pool.query(
        'UPDATE computer_sessions SET status = $1, ended_at = $2 WHERE id = $3',
        ['ended', session.endedAt, sessionId]
      );

      this.sessions.delete(sessionId);

      this.emit('session:ended', session);
    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }

  /**
   * Get session
   */
  getSession(sessionId: string): ComputerSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session.status === 'ended') {
      throw new Error(`Session has ended: ${sessionId}`);
    }
    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<ComputerSession[]> {
    const sessions = Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && s.status !== 'ended'
    );
    return sessions;
  }

  /**
   * Save session to database
   */
  private async saveSessionToDB(session: ComputerSession): Promise<void> {
    await pool.query(
      `INSERT INTO computer_sessions (id, user_id, type, status, config, started_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.id,
        session.userId,
        session.type,
        session.status,
        JSON.stringify({}),
        session.createdAt,
        JSON.stringify({ currentUrl: session.currentUrl }),
      ]
    );
  }

  /**
   * Save action to database
   */
  private async saveActionToDB(sessionId: string, action: ComputerAction): Promise<void> {
    await pool.query(
      `INSERT INTO computer_actions (id, session_id, action_type, params, result, screenshot_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        action.id,
        sessionId,
        action.type,
        JSON.stringify(action.params),
        JSON.stringify(action.result),
        action.result?.screenshot || null,
        action.timestamp,
      ]
    );
  }

  /**
   * Pause session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    session.status = 'paused';
    this.emit('session:paused', session);
  }

  /**
   * Resume session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    session.status = 'active';
    this.emit('session:resumed', session);
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string): Promise<ComputerAction[]> {
    const result = await pool.query(
      'SELECT * FROM computer_actions WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      type: row.action_type,
      params: row.params,
      result: row.result,
      timestamp: row.created_at,
    }));
  }
}

// Export singleton instance
export const computerUseEngine = new ComputerUseEngine();

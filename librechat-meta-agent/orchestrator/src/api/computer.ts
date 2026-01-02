// Computer Use API - Browser automation and computer use endpoints
import { Router, Request, Response } from 'express';
import { Logger } from 'pino';
import { computerUseEngine } from '../services/computer-use';
import { WebSocket } from 'ws';

export function createComputerRoutes(logger: Logger): Router {
  const router = Router();

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * POST /api/computer/start - Start browser session
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const { userId, config } = req.body;

      if (!userId) {
        return res.status(400).json({
          error: { message: 'userId is required' },
        });
      }

      const session = await computerUseEngine.startBrowserSession(userId, config);

      logger.info({ sessionId: session.id, userId }, 'Browser session started');

      res.status(201).json({
        data: {
          sessionId: session.id,
          status: session.status,
          type: session.type,
          createdAt: session.createdAt,
        },
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to start browser session');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/end - End session
   */
  router.post('/:sessionId/end', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await computerUseEngine.endSession(sessionId);

      logger.info({ sessionId }, 'Browser session ended');

      res.json({
        data: { success: true },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to end session');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * GET /api/computer/sessions - Get user sessions
   */
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          error: { message: 'userId is required' },
        });
      }

      const sessions = await computerUseEngine.getUserSessions(userId as string);

      res.json({
        data: sessions.map((s) => ({
          id: s.id,
          status: s.status,
          type: s.type,
          currentUrl: s.currentUrl,
          createdAt: s.createdAt,
          actionCount: s.actions.length,
        })),
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to get user sessions');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  // ============================================================================
  // Navigation
  // ============================================================================

  /**
   * POST /api/computer/:sessionId/navigate - Navigate to URL
   */
  router.post('/:sessionId/navigate', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          error: { message: 'url is required' },
        });
      }

      const result = await computerUseEngine.navigate(sessionId, url);

      logger.info({ sessionId, url }, 'Navigated to URL');

      res.json({
        data: {
          screenshot: result.screenshot,
          url,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to navigate');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * POST /api/computer/:sessionId/click - Click
   */
  router.post('/:sessionId/click', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { x, y, selector } = req.body;

      let target;
      if (selector) {
        target = { selector };
      } else if (x !== undefined && y !== undefined) {
        target = { x, y };
      } else {
        return res.status(400).json({
          error: { message: 'Either (x, y) coordinates or selector is required' },
        });
      }

      const result = await computerUseEngine.click(sessionId, target);

      logger.info({ sessionId, target }, 'Clicked element');

      res.json({
        data: {
          screenshot: result.screenshot,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to click');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/type - Type text
   */
  router.post('/:sessionId/type', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { text, selector } = req.body;

      if (!text) {
        return res.status(400).json({
          error: { message: 'text is required' },
        });
      }

      const target = selector ? { selector } : undefined;
      const result = await computerUseEngine.type(sessionId, text, target);

      logger.info({ sessionId, textLength: text.length }, 'Typed text');

      res.json({
        data: {
          screenshot: result.screenshot,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to type');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/key - Press key
   */
  router.post('/:sessionId/key', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { keys } = req.body;

      if (!keys) {
        return res.status(400).json({
          error: { message: 'keys is required' },
        });
      }

      const result = await computerUseEngine.pressKey(sessionId, keys);

      logger.info({ sessionId, keys }, 'Pressed key');

      res.json({
        data: {
          screenshot: result.screenshot,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to press key');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/scroll - Scroll
   */
  router.post('/:sessionId/scroll', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { direction, amount } = req.body;

      if (!direction) {
        return res.status(400).json({
          error: { message: 'direction is required' },
        });
      }

      const scrollAmount = amount || 300;
      const result = await computerUseEngine.scroll(sessionId, direction, scrollAmount);

      logger.info({ sessionId, direction, amount: scrollAmount }, 'Scrolled');

      res.json({
        data: {
          screenshot: result.screenshot,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to scroll');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/fill-form - Fill form
   */
  router.post('/:sessionId/fill-form', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { formData } = req.body;

      if (!formData || typeof formData !== 'object') {
        return res.status(400).json({
          error: { message: 'formData object is required' },
        });
      }

      await computerUseEngine.fillForm(sessionId, formData);

      const screenshot = await computerUseEngine.screenshot(sessionId);

      logger.info({ sessionId, fieldCount: Object.keys(formData).length }, 'Filled form');

      res.json({
        data: {
          screenshot,
          fieldsSet: Object.keys(formData),
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to fill form');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/download - Download file
   */
  router.post('/:sessionId/download', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { selector } = req.body;

      if (!selector) {
        return res.status(400).json({
          error: { message: 'selector is required' },
        });
      }

      const result = await computerUseEngine.downloadFile(sessionId, selector);

      logger.info({ sessionId, path: result.path }, 'Downloaded file');

      res.json({
        data: {
          path: result.path,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to download file');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  // ============================================================================
  // Screen Analysis
  // ============================================================================

  /**
   * GET /api/computer/:sessionId/screenshot - Get screenshot
   */
  router.get('/:sessionId/screenshot', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const screenshot = await computerUseEngine.screenshot(sessionId);

      res.json({
        data: {
          screenshot,
        },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get screenshot');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/analyze - Analyze screen
   */
  router.post('/:sessionId/analyze', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const analysis = await computerUseEngine.analyzeScreen(sessionId);

      logger.info(
        { sessionId, elementCount: analysis.elements.length },
        'Analyzed screen'
      );

      res.json({
        data: analysis,
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to analyze screen');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * GET /api/computer/:sessionId/element-at - Get element at position
   */
  router.get('/:sessionId/element-at', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { x, y } = req.query;

      if (x === undefined || y === undefined) {
        return res.status(400).json({
          error: { message: 'x and y coordinates are required' },
        });
      }

      const element = await computerUseEngine.getElementAt(
        sessionId,
        parseInt(x as string),
        parseInt(y as string)
      );

      res.json({
        data: element,
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get element');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  // ============================================================================
  // Task Execution
  // ============================================================================

  /**
   * POST /api/computer/:sessionId/task - Execute high-level task
   */
  router.post('/:sessionId/task', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { task } = req.body;

      if (!task) {
        return res.status(400).json({
          error: { message: 'task description is required' },
        });
      }

      logger.info({ sessionId, task }, 'Starting task execution');

      const result = await computerUseEngine.executeTask(sessionId, task);

      logger.info(
        { sessionId, success: result.success, stepCount: result.steps.length },
        'Task execution completed'
      );

      res.json({
        data: result,
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to execute task');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  // ============================================================================
  // Session Control
  // ============================================================================

  /**
   * POST /api/computer/:sessionId/pause - Pause session
   */
  router.post('/:sessionId/pause', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await computerUseEngine.pauseSession(sessionId);

      logger.info({ sessionId }, 'Session paused');

      res.json({
        data: { success: true },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to pause session');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * POST /api/computer/:sessionId/resume - Resume session
   */
  router.post('/:sessionId/resume', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      await computerUseEngine.resumeSession(sessionId);

      logger.info({ sessionId }, 'Session resumed');

      res.json({
        data: { success: true },
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to resume session');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  /**
   * GET /api/computer/:sessionId/history - Get session history
   */
  router.get('/:sessionId/history', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const history = await computerUseEngine.getSessionHistory(sessionId);

      res.json({
        data: history,
      });
    } catch (error: any) {
      logger.error({ error, sessionId: req.params.sessionId }, 'Failed to get history');
      res.status(500).json({
        error: { message: error.message },
      });
    }
  });

  return router;
}

// ============================================================================
// WebSocket Handler for Real-time Updates
// ============================================================================

export function setupComputerWebSocket(ws: WebSocket, sessionId: string, logger: Logger) {
  logger.info({ sessionId }, 'WebSocket connected for computer use session');

  // Set up event listeners for real-time updates
  const handleAction = (data: any) => {
    if (data.sessionId === sessionId) {
      ws.send(
        JSON.stringify({
          type: 'action',
          data: {
            action: data.action,
            screenshot: data.action.result?.screenshot,
          },
        })
      );
    }
  };

  const handleSessionUpdate = (session: any) => {
    if (session.id === sessionId) {
      ws.send(
        JSON.stringify({
          type: 'session_update',
          data: {
            status: session.status,
            currentUrl: session.currentUrl,
          },
        })
      );
    }
  };

  computerUseEngine.on('action:completed', handleAction);
  computerUseEngine.on('session:paused', handleSessionUpdate);
  computerUseEngine.on('session:resumed', handleSessionUpdate);
  computerUseEngine.on('session:ended', handleSessionUpdate);

  // Handle incoming messages
  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'get_screenshot':
          const screenshot = await computerUseEngine.screenshot(sessionId);
          ws.send(
            JSON.stringify({
              type: 'screenshot',
              data: { screenshot },
            })
          );
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          logger.warn({ type: data.type }, 'Unknown message type');
      }
    } catch (error: any) {
      logger.error({ error }, 'Failed to handle WebSocket message');
      ws.send(
        JSON.stringify({
          type: 'error',
          error: error.message,
        })
      );
    }
  });

  // Clean up on disconnect
  ws.on('close', () => {
    logger.info({ sessionId }, 'WebSocket disconnected');
    computerUseEngine.off('action:completed', handleAction);
    computerUseEngine.off('session:paused', handleSessionUpdate);
    computerUseEngine.off('session:resumed', handleSessionUpdate);
    computerUseEngine.off('session:ended', handleSessionUpdate);
  });

  // Send initial screenshot
  computerUseEngine
    .screenshot(sessionId)
    .then((screenshot) => {
      ws.send(
        JSON.stringify({
          type: 'screenshot',
          data: { screenshot },
        })
      );
    })
    .catch((error) => {
      logger.error({ error, sessionId }, 'Failed to send initial screenshot');
    });
}

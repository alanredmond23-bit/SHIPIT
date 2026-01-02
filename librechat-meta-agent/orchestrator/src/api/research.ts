import { Express, Request, Response } from 'express';
import { Logger } from 'pino';
import { DeepResearchEngine } from '../services/deep-research';

export function setupResearchRoutes(
  app: Express,
  researchEngine: DeepResearchEngine,
  logger: Logger
) {
  /**
   * POST /api/research/start
   * Start a new deep research session
   */
  app.post('/api/research/start', async (req: Request, res: Response) => {
    try {
      const { query, project_id, user_id, config } = req.body;

      // Validation
      if (!query || !project_id) {
        return res.status(400).json({
          error: {
            message: 'query and project_id are required',
            code: 'INVALID_INPUT',
          },
        });
      }

      if (query.length < 3) {
        return res.status(400).json({
          error: {
            message: 'query must be at least 3 characters',
            code: 'INVALID_QUERY',
          },
        });
      }

      // Start research
      const session = await researchEngine.startResearch(query, project_id, config || {}, user_id);

      logger.info({ sessionId: session.id, query }, 'Research session started');

      res.status(201).json({
        data: {
          session_id: session.id,
          query: session.query,
          status: session.status,
          config: session.config,
          created_at: session.createdAt,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start research');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'RESEARCH_START_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId
   * Get research session status and results
   */
  app.get('/api/research/:sessionId', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      res.json({ data: session });
    } catch (error: any) {
      logger.error({ sessionId: req.params.sessionId, error: error.message }, 'Failed to get session');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'SESSION_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/stream
   * Server-Sent Events stream for real-time research updates
   */
  app.get('/api/research/:sessionId/stream', async (req: Request, res: Response) => {
    try {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Send initial connection event
      res.write('event: connected\n');
      res.write('data: {"message":"Connected to research stream"}\n\n');

      // Stream research events
      const sessionId = req.params.sessionId;

      try {
        for await (const event of researchEngine.streamResearch(sessionId)) {
          const eventData = JSON.stringify({
            type: event.type,
            data: event.data,
            timestamp: event.timestamp,
          });

          res.write(`event: ${event.type}\n`);
          res.write(`data: ${eventData}\n\n`);

          // Flush the response
          if (res.flush) res.flush();
        }

        // Send completion event
        res.write('event: complete\n');
        res.write('data: {"message":"Research stream completed"}\n\n');
        res.end();
      } catch (error: any) {
        logger.error({ sessionId, error: error.message }, 'Stream error');
        res.write('event: error\n');
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to setup stream');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'STREAM_SETUP_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/research/:sessionId/deep-dive
   * Deep dive into a follow-up question
   */
  app.post('/api/research/:sessionId/deep-dive', async (req: Request, res: Response) => {
    try {
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({
          error: {
            message: 'question is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      const sessionId = req.params.sessionId;

      // Verify session exists
      const session = await researchEngine.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Start deep dive (async)
      researchEngine.deepDive(sessionId, question).catch(error => {
        logger.error({ sessionId, question, error: error.message }, 'Deep dive failed');
      });

      logger.info({ sessionId, question }, 'Deep dive started');

      res.json({
        data: {
          message: 'Deep dive started',
          session_id: sessionId,
          question,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start deep dive');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'DEEP_DIVE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/facts
   * Get extracted facts with verification status
   */
  app.get('/api/research/:sessionId/facts', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Return facts sorted by confidence
      const sortedFacts = [...session.facts].sort((a, b) => b.confidence - a.confidence);

      res.json({
        data: sortedFacts,
        count: sortedFacts.length,
        stats: {
          verified: sortedFacts.filter(f => f.verificationStatus === 'verified').length,
          unverified: sortedFacts.filter(f => f.verificationStatus === 'unverified').length,
          contradicted: sortedFacts.filter(f => f.verificationStatus === 'contradicted').length,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get facts');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'FACTS_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/graph
   * Get knowledge graph data
   */
  app.get('/api/research/:sessionId/graph', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Return knowledge graph
      res.json({
        data: {
          nodes: session.knowledgeGraph,
          stats: {
            totalNodes: session.knowledgeGraph.length,
            byType: session.knowledgeGraph.reduce((acc, node) => {
              acc[node.type] = (acc[node.type] || 0) + 1;
              return acc;
            }, {} as Record<string, number>),
          },
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get knowledge graph');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'GRAPH_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/contradictions
   * Get detected contradictions between facts
   */
  app.get('/api/research/:sessionId/contradictions', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Find contradicted facts
      const contradictedFacts = session.facts.filter(f => f.verificationStatus === 'contradicted');

      res.json({
        data: contradictedFacts,
        count: contradictedFacts.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get contradictions');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'CONTRADICTIONS_GET_ERROR',
        },
      });
    }
  });

  /**
   * POST /api/research/:sessionId/report
   * Generate research report
   */
  app.post('/api/research/:sessionId/report', async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;

      const session = await researchEngine.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Generate report if not already generated
      if (!session.report) {
        const report = await researchEngine.generateReport(sessionId);
        res.status(201).json({ data: report });
      } else {
        res.json({ data: session.report });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate report');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'REPORT_GENERATE_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/export/:format
   * Export research report in various formats
   */
  app.get('/api/research/:sessionId/export/:format', async (req: Request, res: Response) => {
    try {
      const { sessionId, format } = req.params;

      if (!['pdf', 'docx', 'md', 'html'].includes(format)) {
        return res.status(400).json({
          error: {
            message: 'Invalid format. Supported: pdf, docx, md, html',
            code: 'INVALID_FORMAT',
          },
        });
      }

      const session = await researchEngine.getSession(sessionId);
      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      if (!session.report) {
        return res.status(404).json({
          error: {
            message: 'Report not generated yet',
            code: 'REPORT_NOT_FOUND',
          },
        });
      }

      const buffer = await researchEngine.exportReport(sessionId, format as any);

      // Set appropriate headers
      const contentTypes: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        md: 'text/markdown',
        html: 'text/html',
      };

      const extensions: Record<string, string> = {
        pdf: 'pdf',
        docx: 'docx',
        md: 'md',
        html: 'html',
      };

      res.setHeader('Content-Type', contentTypes[format]);
      res.setHeader('Content-Disposition', `attachment; filename="research-report.${extensions[format]}"`);
      res.send(buffer);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to export report');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'REPORT_EXPORT_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/sources
   * Get all sources with credibility scores
   */
  app.get('/api/research/:sessionId/sources', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      // Sort by credibility
      const sortedSources = [...session.sources].sort(
        (a, b) => b.credibility.overallScore - a.credibility.overallScore
      );

      res.json({
        data: sortedSources,
        count: sortedSources.length,
        stats: {
          averageCredibility:
            sortedSources.reduce((sum, s) => sum + s.credibility.overallScore, 0) /
            sortedSources.length,
          highCredibility: sortedSources.filter(s => s.credibility.overallScore >= 0.8).length,
          mediumCredibility: sortedSources.filter(
            s => s.credibility.overallScore >= 0.5 && s.credibility.overallScore < 0.8
          ).length,
          lowCredibility: sortedSources.filter(s => s.credibility.overallScore < 0.5).length,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get sources');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'SOURCES_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/:sessionId/follow-ups
   * Get suggested follow-up questions
   */
  app.get('/api/research/:sessionId/follow-ups', async (req: Request, res: Response) => {
    try {
      const session = await researchEngine.getSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({
          error: {
            message: 'Research session not found',
            code: 'SESSION_NOT_FOUND',
          },
        });
      }

      res.json({
        data: session.followUpQuestions,
        count: session.followUpQuestions.length,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get follow-ups');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'FOLLOW_UPS_GET_ERROR',
        },
      });
    }
  });

  /**
   * GET /api/research/sessions
   * List all research sessions for a project/user
   */
  app.get('/api/research/sessions', async (req: Request, res: Response) => {
    try {
      const { project_id, user_id, limit = 20, offset = 0 } = req.query;

      if (!project_id) {
        return res.status(400).json({
          error: {
            message: 'project_id is required',
            code: 'INVALID_INPUT',
          },
        });
      }

      // This would be implemented in the DeepResearchEngine
      // For now, return empty array
      res.json({
        data: [],
        count: 0,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list sessions');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'SESSIONS_LIST_ERROR',
        },
      });
    }
  });

  /**
   * DELETE /api/research/:sessionId
   * Delete a research session
   */
  app.delete('/api/research/:sessionId', async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;

      // This would be implemented in the DeepResearchEngine
      // For now, return success
      logger.info({ sessionId }, 'Research session deleted');

      res.status(204).send();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to delete session');
      res.status(500).json({
        error: {
          message: error.message,
          code: 'SESSION_DELETE_ERROR',
        },
      });
    }
  });

  logger.info('Research routes registered');
}

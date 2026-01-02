import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { VoiceConversationEngine, VoiceConfig } from '../services/voice-conversation';
import { VoiceWebSocketHandler } from '../services/voice/websocket-handler';
import multer from 'multer';

/**
 * Voice API Router
 */
export function createVoiceRouter(
  db: Pool,
  logger: Logger,
  voiceEngine: VoiceConversationEngine,
  httpServer: Server
): Router {
  const router = Router();

  // Setup file upload for voice cloning
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 10,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
  });

  // Setup WebSocket server for voice streams
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

    if (pathname.startsWith('/ws/voice/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, request) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    const sessionId = pathname.split('/').pop();

    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }

    logger.info({ session_id: sessionId }, 'WebSocket connection established');

    const wsHandler = new VoiceWebSocketHandler(ws, sessionId, logger);
    voiceEngine.handleWebSocket(sessionId, wsHandler);
  });

  /**
   * POST /api/voice/start
   * Start a new voice session
   */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId || 'default-user'; // TODO: Get from auth
      const config: VoiceConfig = {
        sttProvider: req.body.sttProvider || 'whisper',
        ttsProvider: req.body.ttsProvider || 'openai',
        voice: req.body.voice || 'alloy',
        language: req.body.language || 'en',
        interruptSensitivity: req.body.interruptSensitivity || 'medium',
        responseStyle: req.body.responseStyle || 'conversational',
        enableEmotionDetection: req.body.enableEmotionDetection || false,
        systemPrompt: req.body.systemPrompt,
      };

      const session = await voiceEngine.startSession(userId, config);

      // Generate WebSocket URL
      const wsUrl = `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/ws/voice/${session.id}`;

      res.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          config: session.config,
          wsUrl,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to start voice session');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start session',
      });
    }
  });

  /**
   * POST /api/voice/:sessionId/end
   * End a voice session
   */
  router.post('/:sessionId/end', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const session = await voiceEngine.endSession(sessionId);

      res.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          stats: session.stats,
          duration: session.stats.duration,
        },
      });
    } catch (error) {
      logger.error({ error, session_id: req.params.sessionId }, 'Failed to end session');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to end session',
      });
    }
  });

  /**
   * GET /api/voice/:sessionId
   * Get session details
   */
  router.get('/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const session = await voiceEngine.getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.json({
        success: true,
        session,
      });
    } catch (error) {
      logger.error({ error, session_id: req.params.sessionId }, 'Failed to get session');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
      });
    }
  });

  /**
   * GET /api/voice/:sessionId/transcript
   * Get session transcript
   */
  router.get('/:sessionId/transcript', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      const transcript = await voiceEngine.getTranscript(sessionId);

      res.json({
        success: true,
        transcript,
        count: transcript.length,
      });
    } catch (error) {
      logger.error({ error, session_id: req.params.sessionId }, 'Failed to get transcript');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transcript',
      });
    }
  });

  /**
   * GET /api/voice/voices/:provider
   * List available voices for a provider
   */
  router.get('/voices/:provider', async (req: Request, res: Response) => {
    try {
      const { provider } = req.params;

      const voices = await voiceEngine.getVoices(provider);

      res.json({
        success: true,
        provider,
        voices,
        count: voices.length,
      });
    } catch (error) {
      logger.error({ error, provider: req.params.provider }, 'Failed to get voices');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get voices',
      });
    }
  });

  /**
   * POST /api/voice/clone
   * Clone a voice (ElevenLabs only)
   */
  router.post('/clone', upload.array('samples', 10), async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId || 'default-user'; // TODO: Get from auth
      const name = req.body.name;
      const description = req.body.description || '';
      const provider = req.body.provider || 'elevenlabs';

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Voice name is required',
        });
      }

      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one audio sample is required',
        });
      }

      if (provider !== 'elevenlabs') {
        return res.status(400).json({
          success: false,
          error: 'Voice cloning is currently only supported for ElevenLabs',
        });
      }

      // Get ElevenLabs provider
      const ttsProvider = (voiceEngine as any).ttsFactory.getProvider('elevenlabs');

      if (!ttsProvider.cloneVoice) {
        return res.status(400).json({
          success: false,
          error: 'Provider does not support voice cloning',
        });
      }

      // Clone the voice
      const audioBuffers = files.map((file) => file.buffer);
      const voiceInfo = await ttsProvider.cloneVoice(name, description, audioBuffers);

      // Save to database
      const { rows } = await db.query(
        `INSERT INTO custom_voices
         (user_id, provider, provider_voice_id, name, description, training_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, provider, voiceInfo.id, name, description, 'completed', true]
      );

      res.json({
        success: true,
        voice: {
          id: rows[0].id,
          name: rows[0].name,
          description: rows[0].description,
          provider: rows[0].provider,
          providerVoiceId: rows[0].provider_voice_id,
          status: rows[0].training_status,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to clone voice');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clone voice',
      });
    }
  });

  /**
   * GET /api/voice/my-voices
   * Get user's custom voices
   */
  router.get('/my-voices', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'default-user'; // TODO: Get from auth

      const { rows } = await db.query(
        `SELECT * FROM custom_voices
         WHERE user_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        voices: rows.map((row) => ({
          id: row.id,
          name: row.name,
          description: row.description,
          provider: row.provider,
          providerVoiceId: row.provider_voice_id,
          previewUrl: row.preview_url,
          language: row.language,
          gender: row.gender,
          age: row.age,
          accent: row.accent,
          useCase: row.use_case,
          status: row.training_status,
          isPublic: row.is_public,
          createdAt: row.created_at,
        })),
        count: rows.length,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get custom voices');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get custom voices',
      });
    }
  });

  /**
   * DELETE /api/voice/my-voices/:voiceId
   * Delete a custom voice
   */
  router.delete('/my-voices/:voiceId', async (req: Request, res: Response) => {
    try {
      const { voiceId } = req.params;
      const userId = req.query.userId as string || 'default-user'; // TODO: Get from auth

      // Soft delete
      const { rowCount } = await db.query(
        `UPDATE custom_voices
         SET is_active = false
         WHERE id = $1 AND user_id = $2`,
        [voiceId, userId]
      );

      if (rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Voice not found',
        });
      }

      res.json({
        success: true,
        message: 'Voice deleted successfully',
      });
    } catch (error) {
      logger.error({ error, voice_id: req.params.voiceId }, 'Failed to delete voice');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete voice',
      });
    }
  });

  /**
   * GET /api/voice/analytics
   * Get voice usage analytics
   */
  router.get('/analytics', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || 'default-user'; // TODO: Get from auth
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      let query = `
        SELECT
          COUNT(*) as total_sessions,
          SUM(characters_transcribed) as total_characters_transcribed,
          SUM(characters_synthesized) as total_characters_synthesized,
          SUM(audio_seconds_processed) as total_audio_seconds_processed,
          SUM(audio_seconds_generated) as total_audio_seconds_generated,
          AVG(estimated_cost_usd) as avg_cost_per_session,
          SUM(estimated_cost_usd) as total_estimated_cost
        FROM voice_analytics
        WHERE user_id = $1
      `;

      const params: any[] = [userId];

      if (startDate) {
        params.push(startDate);
        query += ` AND recorded_at >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND recorded_at <= $${params.length}`;
      }

      const { rows } = await db.query(query, params);

      res.json({
        success: true,
        analytics: rows[0],
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get analytics');
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get analytics',
      });
    }
  });

  return router;
}

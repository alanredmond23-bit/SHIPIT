import { Router, Request, Response } from 'express';
import { Logger } from 'pino';
import { AnthropicClient } from '../../services/ai/anthropic-client';
import { OpenAIClient } from '../../services/ai/openai-client';
import { GoogleAIClient } from '../../services/ai/google-client';
import { WebSearchService } from '../../services/research/web-search';
import { SpeechService } from '../../services/voice/speech-service';
import { VideoGenerationEngine } from '../../services/media/video-generator';

/**
 * AI API Routes
 *
 * Unified endpoints for all AI capabilities:
 * - Chat completions (Claude, GPT, Gemini)
 * - Embeddings (OpenAI)
 * - Image generation (DALL-E, Stability, Replicate)
 * - Video generation (Runway, Replicate, Luma)
 * - Speech (Whisper STT, OpenAI/ElevenLabs TTS)
 * - Web search (Tavily, Exa)
 */

export interface AIRouterConfig {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  googleApiKey?: string;
  tavilyApiKey?: string;
  exaApiKey?: string;
  elevenLabsApiKey?: string;
  deepgramApiKey?: string;
  runwayApiKey?: string;
  replicateApiKey?: string;
  lumaApiKey?: string;
}

export function createAIRouter(logger: Logger, config: AIRouterConfig): Router {
  const router = Router();

  // Initialize AI clients
  let anthropicClient: AnthropicClient | null = null;
  let openaiClient: OpenAIClient | null = null;
  let googleClient: GoogleAIClient | null = null;
  let webSearchService: WebSearchService | null = null;
  let speechService: SpeechService | null = null;
  let videoEngine: VideoGenerationEngine | null = null;

  // Initialize Anthropic
  if (config.anthropicApiKey) {
    try {
      anthropicClient = new AnthropicClient(config.anthropicApiKey, logger);
      logger.info('Anthropic client initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize Anthropic client');
    }
  }

  // Initialize OpenAI
  if (config.openaiApiKey) {
    try {
      openaiClient = new OpenAIClient(config.openaiApiKey, logger);
      logger.info('OpenAI client initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize OpenAI client');
    }
  }

  // Initialize Google AI
  if (config.googleApiKey) {
    try {
      googleClient = new GoogleAIClient(config.googleApiKey, logger);
      logger.info('Google AI client initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize Google AI client');
    }
  }

  // Initialize Web Search
  if (config.tavilyApiKey || config.exaApiKey) {
    try {
      webSearchService = new WebSearchService(logger, {
        tavily: config.tavilyApiKey ? { apiKey: config.tavilyApiKey, enabled: true } : undefined,
        exa: config.exaApiKey ? { apiKey: config.exaApiKey, enabled: true } : undefined,
      });
      logger.info('Web search service initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize web search service');
    }
  }

  // Initialize Speech Service
  if (config.openaiApiKey || config.elevenLabsApiKey) {
    try {
      speechService = new SpeechService(logger, {
        stt: {
          openai: config.openaiApiKey ? { apiKey: config.openaiApiKey } : undefined,
          deepgram: config.deepgramApiKey ? { apiKey: config.deepgramApiKey } : undefined,
        },
        tts: {
          openai: config.openaiApiKey ? { apiKey: config.openaiApiKey } : undefined,
          elevenlabs: config.elevenLabsApiKey ? { apiKey: config.elevenLabsApiKey } : undefined,
        },
      });
      logger.info('Speech service initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize speech service');
    }
  }

  // Initialize Video Generation
  if (config.runwayApiKey || config.replicateApiKey || config.lumaApiKey) {
    try {
      videoEngine = new VideoGenerationEngine(logger, {
        runway: config.runwayApiKey ? { apiKey: config.runwayApiKey, enabled: true } : undefined,
        replicate: config.replicateApiKey ? { apiKey: config.replicateApiKey, enabled: true } : undefined,
        luma: config.lumaApiKey ? { apiKey: config.lumaApiKey, enabled: true } : undefined,
      });
      logger.info('Video generation engine initialized for API routes');
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to initialize video generation engine');
    }
  }

  // ============================================================================
  // Chat Completions
  // ============================================================================

  /**
   * POST /api/ai/chat/completions
   * Unified chat completion endpoint supporting Claude, GPT, and Gemini
   */
  router.post('/chat/completions', async (req: Request, res: Response) => {
    try {
      const { provider, model, messages, ...options } = req.body;

      if (!provider) {
        return res.status(400).json({ error: 'Provider is required (anthropic, openai, google)' });
      }

      let response;

      switch (provider) {
        case 'anthropic':
          if (!anthropicClient) {
            return res.status(503).json({ error: 'Anthropic client not configured' });
          }
          response = await anthropicClient.chat({
            model: model || AnthropicClient.MODELS.SONNET_3_5,
            messages,
            ...options,
          });
          break;

        case 'openai':
          if (!openaiClient) {
            return res.status(503).json({ error: 'OpenAI client not configured' });
          }
          response = await openaiClient.chat({
            model: model || OpenAIClient.MODELS.GPT_4O,
            messages,
            ...options,
          });
          break;

        case 'google':
          if (!googleClient) {
            return res.status(503).json({ error: 'Google AI client not configured' });
          }
          response = await googleClient.chat({
            model: model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
            contents: messages,
            ...options,
          });
          break;

        default:
          return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }

      res.json({ data: response });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Chat completion failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/chat/stream
   * Streaming chat completion
   */
  router.post('/chat/stream', async (req: Request, res: Response) => {
    try {
      const { provider, model, messages, ...options } = req.body;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      switch (provider) {
        case 'anthropic':
          if (!anthropicClient) {
            return res.status(503).json({ error: 'Anthropic client not configured' });
          }

          for await (const chunk of anthropicClient.chatStream({
            model: model || AnthropicClient.MODELS.SONNET_3_5,
            messages,
            ...options,
          })) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          break;

        case 'openai':
          if (!openaiClient) {
            return res.status(503).json({ error: 'OpenAI client not configured' });
          }

          for await (const chunk of openaiClient.chatStream({
            model: model || OpenAIClient.MODELS.GPT_4O,
            messages,
            ...options,
          })) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          break;

        case 'google':
          if (!googleClient) {
            return res.status(503).json({ error: 'Google AI client not configured' });
          }

          for await (const chunk of googleClient.chatStream({
            model: model || GoogleAIClient.MODELS.GEMINI_1_5_FLASH,
            contents: messages,
            ...options,
          })) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
          break;

        default:
          return res.status(400).json({ error: `Unknown provider: ${provider}` });
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error({ error: error.message }, 'Streaming chat failed');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Embeddings
  // ============================================================================

  /**
   * POST /api/ai/embeddings
   * Generate embeddings for text
   */
  router.post('/embeddings', async (req: Request, res: Response) => {
    try {
      if (!openaiClient) {
        return res.status(503).json({ error: 'OpenAI client not configured for embeddings' });
      }

      const { input, model } = req.body;

      const response = await openaiClient.createEmbedding({
        input,
        model: model || OpenAIClient.EMBEDDING_MODELS.SMALL,
      });

      res.json({ data: response });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Embedding generation failed');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Web Search
  // ============================================================================

  /**
   * POST /api/ai/search
   * Search the web with Tavily or Exa
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      if (!webSearchService) {
        return res.status(503).json({ error: 'Web search service not configured' });
      }

      const { query, provider, maxResults, searchDepth, includeDomains, excludeDomains } = req.body;

      const results = await webSearchService.search(
        {
          query,
          maxResults,
          searchDepth,
          includeDomains,
          excludeDomains,
        },
        provider
      );

      res.json({ data: results });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Web search failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/search/deep
   * Deep research with content extraction
   */
  router.post('/search/deep', async (req: Request, res: Response) => {
    try {
      if (!webSearchService) {
        return res.status(503).json({ error: 'Web search service not configured' });
      }

      const { query, maxResults, extractContent, provider } = req.body;

      const results = await webSearchService.deepSearch(query, {
        maxResults,
        extractContent,
        provider,
      });

      res.json({ data: results });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Deep search failed');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Speech (STT/TTS)
  // ============================================================================

  /**
   * POST /api/ai/speech/transcribe
   * Transcribe audio to text
   */
  router.post('/speech/transcribe', async (req: Request, res: Response) => {
    try {
      if (!speechService) {
        return res.status(503).json({ error: 'Speech service not configured' });
      }

      const { audio, language, provider } = req.body;

      // Expect audio as base64
      const audioBuffer = Buffer.from(audio, 'base64');

      const result = await speechService.transcribe({
        audio: audioBuffer,
        language,
        provider,
      });

      res.json({ data: result });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Transcription failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/ai/speech/synthesize
   * Synthesize speech from text
   */
  router.post('/speech/synthesize', async (req: Request, res: Response) => {
    try {
      if (!speechService) {
        return res.status(503).json({ error: 'Speech service not configured' });
      }

      const { text, voice, provider, options } = req.body;

      const result = await speechService.synthesize({
        text,
        voice,
        provider,
        options,
      });

      // Return audio as base64
      res.json({
        data: {
          audio: result.audio.toString('base64'),
          duration: result.duration,
          format: result.format,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Speech synthesis failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai/speech/voices
   * Get available voices for TTS
   */
  router.get('/speech/voices', async (req: Request, res: Response) => {
    try {
      if (!speechService) {
        return res.status(503).json({ error: 'Speech service not configured' });
      }

      const provider = req.query.provider as string | undefined;
      const voices = await speechService.getVoices(provider);

      res.json({ data: voices });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get voices');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Video Generation
  // ============================================================================

  /**
   * POST /api/ai/video/generate
   * Generate video from text or image
   */
  router.post('/video/generate', async (req: Request, res: Response) => {
    try {
      if (!videoEngine) {
        return res.status(503).json({ error: 'Video generation not configured' });
      }

      const videoRequest = req.body;
      const video = await videoEngine.generate(videoRequest);

      res.json({ data: video });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Video generation failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai/video/status/:id
   * Get video generation status
   */
  router.get('/video/status/:id', async (req: Request, res: Response) => {
    try {
      if (!videoEngine) {
        return res.status(503).json({ error: 'Video generation not configured' });
      }

      const { id } = req.params;
      const { provider } = req.query;

      const status = await videoEngine.getStatus(id, provider as string);

      res.json({ data: status });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get video status');
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Health & Status
  // ============================================================================

  /**
   * GET /api/ai/health
   * Health check for all AI services
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health: Record<string, any> = {};

      if (anthropicClient) {
        health.anthropic = await anthropicClient.healthCheck();
      }

      if (openaiClient) {
        health.openai = await openaiClient.healthCheck();
      }

      if (googleClient) {
        health.google = await googleClient.healthCheck();
      }

      if (webSearchService) {
        health.search = await webSearchService.healthCheck();
      }

      if (speechService) {
        health.speech = await speechService.healthCheck();
      }

      if (videoEngine) {
        health.video = await videoEngine.healthCheck();
      }

      res.json({ data: health });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Health check failed');
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/ai/models
   * List available models for all providers
   */
  router.get('/models', async (req: Request, res: Response) => {
    try {
      const models: Record<string, any> = {};

      if (anthropicClient) {
        models.anthropic = anthropicClient.getAvailableModels();
      }

      if (openaiClient) {
        models.openai = {
          chat: Object.values(OpenAIClient.MODELS),
          embeddings: Object.values(OpenAIClient.EMBEDDING_MODELS),
          image: Object.values(OpenAIClient.IMAGE_MODELS),
        };
      }

      if (googleClient) {
        models.google = googleClient.getAvailableModels();
      }

      res.json({ data: models });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to list models');
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

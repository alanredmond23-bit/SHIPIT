import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'pino';
import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { STTProviderFactory, STTResult } from './voice/stt-providers';
import { TTSProviderFactory, TTSResult, VoiceInfo } from './voice/tts-providers';
import { VoiceWebSocketHandler, VoiceWSMessageType } from './voice/websocket-handler';

/**
 * Voice session interface
 */
export interface VoiceSession {
  id: string;
  userId: string;
  status: 'connecting' | 'active' | 'paused' | 'ended' | 'error';
  config: VoiceConfig;
  transcript: TranscriptEntry[];
  stats: {
    duration: number;
    userSpeakTime: number;
    aiSpeakTime: number;
    interruptions: number;
    totalTurns: number;
  };
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Voice configuration interface
 */
export interface VoiceConfig {
  sttProvider: 'whisper' | 'deepgram' | 'assemblyai';
  ttsProvider: 'openai' | 'elevenlabs' | 'playht';
  voice: string;
  language: string;
  interruptSensitivity: 'low' | 'medium' | 'high';
  responseStyle: 'concise' | 'conversational' | 'detailed';
  enableEmotionDetection: boolean;
  systemPrompt?: string;
}

/**
 * Transcript entry interface
 */
export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  duration: number;
  emotion?: string;
  confidence: number;
}

/**
 * Voice Conversation Engine
 * Handles real-time voice conversations with AI
 */
export class VoiceConversationEngine extends EventEmitter {
  private sessions: Map<string, VoiceSessionState> = new Map();
  private sttFactory: STTProviderFactory;
  private ttsFactory: TTSProviderFactory;
  private anthropic: Anthropic;

  constructor(
    private db: Pool,
    private logger: Logger,
    private config: {
      anthropicApiKey: string;
      openaiApiKey?: string;
      deepgramApiKey?: string;
      assemblyaiApiKey?: string;
      elevenlabsApiKey?: string;
      playhtApiKey?: string;
      playhtUserId?: string;
    }
  ) {
    super();

    this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

    // Initialize STT providers
    this.sttFactory = new STTProviderFactory(logger, {
      openai: config.openaiApiKey ? { apiKey: config.openaiApiKey } : undefined,
      deepgram: config.deepgramApiKey ? { apiKey: config.deepgramApiKey } : undefined,
      assemblyai: config.assemblyaiApiKey ? { apiKey: config.assemblyaiApiKey } : undefined,
    });

    // Initialize TTS providers
    this.ttsFactory = new TTSProviderFactory(logger, {
      openai: config.openaiApiKey ? { apiKey: config.openaiApiKey } : undefined,
      elevenlabs: config.elevenlabsApiKey ? { apiKey: config.elevenlabsApiKey } : undefined,
      playht:
        config.playhtApiKey && config.playhtUserId
          ? { apiKey: config.playhtApiKey, userId: config.playhtUserId }
          : undefined,
    });
  }

  /**
   * Start a new voice session
   */
  async startSession(userId: string, voiceConfig: VoiceConfig): Promise<VoiceSession> {
    const sessionId = uuidv4();

    // Validate providers
    if (!this.sttFactory.hasProvider(voiceConfig.sttProvider)) {
      throw new Error(`STT provider '${voiceConfig.sttProvider}' not configured`);
    }
    if (!this.ttsFactory.hasProvider(voiceConfig.ttsProvider)) {
      throw new Error(`TTS provider '${voiceConfig.ttsProvider}' not configured`);
    }

    // Create database record
    const { rows } = await this.db.query(
      `INSERT INTO voice_sessions
       (id, user_id, config, status, started_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [sessionId, userId, JSON.stringify(voiceConfig), 'connecting']
    );

    const session: VoiceSession = {
      id: sessionId,
      userId,
      status: 'active',
      config: voiceConfig,
      transcript: [],
      stats: {
        duration: 0,
        userSpeakTime: 0,
        aiSpeakTime: 0,
        interruptions: 0,
        totalTurns: 0,
      },
      startedAt: new Date(),
    };

    // Initialize session state
    const sessionState: VoiceSessionState = {
      session,
      conversationHistory: [],
    };

    this.sessions.set(sessionId, sessionState);

    this.logger.info(
      {
        session_id: sessionId,
        user_id: userId,
        stt: voiceConfig.sttProvider,
        tts: voiceConfig.ttsProvider,
      },
      'Voice session started'
    );

    // Update status to active
    await this.updateSessionStatus(sessionId, 'active');

    return session;
  }

  /**
   * Handle WebSocket connection for voice session
   */
  handleWebSocket(
    sessionId: string,
    wsHandler: VoiceWebSocketHandler
  ): void {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      wsHandler.sendError('Session not found');
      wsHandler.close();
      return;
    }

    sessionState.wsHandler = wsHandler;

    // Listen for speech events
    wsHandler.on('speech_end', async (audio: Buffer, duration: number) => {
      try {
        await this.processUserSpeech(sessionId, audio, duration);
      } catch (error) {
        this.logger.error({ error, session_id: sessionId }, 'Error processing user speech');
        wsHandler.sendError('Failed to process speech');
      }
    });

    // Listen for interruptions
    wsHandler.on('interrupt', async () => {
      await this.handleInterruption(sessionId);
    });

    // Listen for close
    wsHandler.on('close', async () => {
      await this.endSession(sessionId);
    });

    wsHandler.sendStatus('connected', { sessionId });
  }

  /**
   * Process user speech audio
   */
  private async processUserSpeech(
    sessionId: string,
    audio: Buffer,
    duration: number
  ): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error('Session not found');
    }

    const { session, wsHandler } = sessionState;
    const startTime = Date.now();

    // Step 1: Transcribe audio to text
    wsHandler?.sendStatus('transcribing');
    const transcription = await this.transcribe(sessionId, audio, session.config.language);

    if (!transcription.text.trim()) {
      this.logger.warn({ session_id: sessionId }, 'Empty transcription');
      return;
    }

    // Step 2: Save user transcript
    const userTranscriptId = await this.saveTranscript(sessionId, {
      role: 'user',
      text: transcription.text,
      duration,
      confidence: transcription.confidence,
      language: transcription.language,
      sttProvider: session.config.sttProvider,
    });

    // Send transcript to client
    wsHandler?.sendTranscript('user', transcription.text, {
      confidence: transcription.confidence,
      duration,
    });

    // Update stats
    session.stats.userSpeakTime += duration;
    session.stats.totalTurns += 1;

    // Step 3: Generate AI response
    wsHandler?.sendStatus('thinking');
    const responseText = await this.generateResponse(sessionId, transcription.text);

    // Step 4: Synthesize speech
    wsHandler?.sendStatus('synthesizing');
    const audioResponse = await this.synthesizeSpeech(sessionId, responseText);

    // Step 5: Save AI transcript
    const aiTranscriptId = await this.saveTranscript(sessionId, {
      role: 'assistant',
      text: responseText,
      duration: audioResponse.duration,
      confidence: 1.0,
      ttsProvider: session.config.ttsProvider,
    });

    // Step 6: Send audio to client
    wsHandler?.sendTranscript('assistant', responseText);
    wsHandler?.sendAudioResponse(audioResponse.audio, true, true);

    // Update stats
    session.stats.aiSpeakTime += audioResponse.duration;

    const totalTime = Date.now() - startTime;
    this.logger.info(
      {
        session_id: sessionId,
        total_time_ms: totalTime,
        user_text: transcription.text,
        ai_text: responseText,
      },
      'Voice turn completed'
    );

    // Send metrics
    wsHandler?.sendMetrics({
      totalTurns: session.stats.totalTurns,
      userSpeakTime: session.stats.userSpeakTime,
      aiSpeakTime: session.stats.aiSpeakTime,
      latency: totalTime,
    });

    // Track analytics
    await this.trackAnalytics(sessionId, {
      charactersTranscribed: transcription.text.length,
      charactersSynthesized: responseText.length,
      audioSecondsProcessed: duration / 1000,
      audioSecondsGenerated: audioResponse.duration / 1000,
    });
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(
    sessionId: string,
    audio: Buffer,
    language: string
  ): Promise<STTResult> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error('Session not found');
    }

    const provider = this.sttFactory.getProvider(sessionState.session.config.sttProvider);
    return await provider.transcribe(audio, language);
  }

  /**
   * Generate AI response
   */
  async generateResponse(sessionId: string, userText: string): Promise<string> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error('Session not found');
    }

    const { session, conversationHistory } = sessionState;

    // Build conversation context
    const messages: Anthropic.MessageParam[] = conversationHistory.map((entry) => ({
      role: entry.role,
      content: entry.text,
    }));

    messages.push({
      role: 'user',
      content: userText,
    });

    // Generate system prompt based on response style
    const systemPrompt = this.buildSystemPrompt(session.config);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: session.config.responseStyle === 'concise' ? 150 : 500,
        system: systemPrompt,
        messages,
      });

      const responseText =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Update conversation history
      conversationHistory.push(
        { role: 'user', text: userText },
        { role: 'assistant', text: responseText }
      );

      // Keep only last 20 messages
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, conversationHistory.length - 20);
      }

      return responseText;
    } catch (error) {
      this.logger.error({ error, session_id: sessionId }, 'AI response generation failed');
      throw new Error('Failed to generate response');
    }
  }

  /**
   * Build system prompt based on configuration
   */
  private buildSystemPrompt(config: VoiceConfig): string {
    let prompt = config.systemPrompt || 'You are a helpful AI assistant in a voice conversation.';

    // Add response style instructions
    switch (config.responseStyle) {
      case 'concise':
        prompt +=
          ' Keep your responses brief and to the point, ideally 1-2 sentences. Avoid long explanations.';
        break;
      case 'conversational':
        prompt +=
          ' Respond in a natural, conversational manner. Use a friendly tone and feel free to ask follow-up questions.';
        break;
      case 'detailed':
        prompt +=
          ' Provide comprehensive, detailed responses with examples when appropriate. Take time to thoroughly explain concepts.';
        break;
    }

    prompt +=
      ' Remember this is a voice conversation, so avoid using markdown formatting, code blocks, or lists. Speak naturally as if talking to someone.';

    return prompt;
  }

  /**
   * Convert text to speech
   */
  async synthesizeSpeech(sessionId: string, text: string): Promise<TTSResult> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error('Session not found');
    }

    const { session } = sessionState;
    const provider = this.ttsFactory.getProvider(session.config.ttsProvider);

    return await provider.synthesize(text, session.config.voice, {
      speed: 1.0,
      output_format: 'mp3',
    });
  }

  /**
   * Handle user interruption
   */
  async handleInterruption(sessionId: string): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      return;
    }

    const { session } = sessionState;
    session.stats.interruptions += 1;

    await this.db.query(
      `UPDATE voice_sessions
       SET interruptions_count = interruptions_count + 1
       WHERE id = $1`,
      [sessionId]
    );

    this.logger.info({ session_id: sessionId }, 'Interruption handled');
  }

  /**
   * End a voice session
   */
  async endSession(sessionId: string): Promise<VoiceSession> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      throw new Error('Session not found');
    }

    const { session } = sessionState;
    session.status = 'ended';
    session.endedAt = new Date();
    session.stats.duration =
      session.endedAt.getTime() - session.startedAt.getTime();

    // Update database
    await this.db.query(
      `UPDATE voice_sessions
       SET status = $1,
           ended_at = NOW(),
           user_speak_time_ms = $2,
           ai_speak_time_ms = $3,
           interruptions_count = $4,
           total_turns = $5
       WHERE id = $6`,
      [
        'ended',
        session.stats.userSpeakTime,
        session.stats.aiSpeakTime,
        session.stats.interruptions,
        session.stats.totalTurns,
        sessionId,
      ]
    );

    // Close WebSocket if open
    sessionState.wsHandler?.close();

    // Remove from active sessions
    this.sessions.delete(sessionId);

    this.logger.info(
      {
        session_id: sessionId,
        duration: session.stats.duration,
        turns: session.stats.totalTurns,
      },
      'Voice session ended'
    );

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<VoiceSession | null> {
    const sessionState = this.sessions.get(sessionId);
    if (sessionState) {
      return sessionState.session;
    }

    // Try loading from database
    const { rows } = await this.db.query(
      `SELECT * FROM voice_sessions WHERE id = $1`,
      [sessionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      config: row.config,
      transcript: [], // Would need to load separately
      stats: {
        duration: row.duration_seconds * 1000 || 0,
        userSpeakTime: row.user_speak_time_ms || 0,
        aiSpeakTime: row.ai_speak_time_ms || 0,
        interruptions: row.interruptions_count || 0,
        totalTurns: row.total_turns || 0,
      },
      startedAt: row.started_at,
      endedAt: row.ended_at,
    };
  }

  /**
   * Get transcript for a session
   */
  async getTranscript(sessionId: string): Promise<TranscriptEntry[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM voice_transcripts
       WHERE session_id = $1
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    return rows.map((row) => ({
      id: row.id,
      role: row.role,
      text: row.text,
      audioUrl: row.audio_url,
      timestamp: row.timestamp,
      duration: row.duration_ms,
      emotion: row.emotion,
      confidence: row.confidence,
    }));
  }

  /**
   * Get available voices for a provider
   */
  async getVoices(provider: string): Promise<VoiceInfo[]> {
    const ttsProvider = this.ttsFactory.getProvider(provider);
    return await ttsProvider.getVoices();
  }

  /**
   * Save transcript entry
   */
  private async saveTranscript(
    sessionId: string,
    entry: {
      role: 'user' | 'assistant';
      text: string;
      duration: number;
      confidence: number;
      language?: string;
      sttProvider?: string;
      ttsProvider?: string;
    }
  ): Promise<string> {
    const id = uuidv4();

    await this.db.query(
      `INSERT INTO voice_transcripts
       (id, session_id, role, text, duration_ms, confidence, language, stt_provider, tts_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        sessionId,
        entry.role,
        entry.text,
        entry.duration,
        entry.confidence,
        entry.language || null,
        entry.sttProvider || null,
        entry.ttsProvider || null,
      ]
    );

    return id;
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(
    sessionId: string,
    status: VoiceSession['status']
  ): Promise<void> {
    await this.db.query(
      `UPDATE voice_sessions SET status = $1 WHERE id = $2`,
      [status, sessionId]
    );

    const sessionState = this.sessions.get(sessionId);
    if (sessionState) {
      sessionState.session.status = status;
    }
  }

  /**
   * Track analytics
   */
  private async trackAnalytics(
    sessionId: string,
    data: {
      charactersTranscribed: number;
      charactersSynthesized: number;
      audioSecondsProcessed: number;
      audioSecondsGenerated: number;
    }
  ): Promise<void> {
    const sessionState = this.sessions.get(sessionId);
    if (!sessionState) {
      return;
    }

    const { session } = sessionState;

    await this.db.query(
      `INSERT INTO voice_analytics
       (session_id, user_id, stt_provider, tts_provider,
        characters_transcribed, characters_synthesized,
        audio_seconds_processed, audio_seconds_generated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        sessionId,
        session.userId,
        session.config.sttProvider,
        session.config.ttsProvider,
        data.charactersTranscribed,
        data.charactersSynthesized,
        data.audioSecondsProcessed,
        data.audioSecondsGenerated,
      ]
    );
  }
}

/**
 * Internal session state
 */
interface VoiceSessionState {
  session: VoiceSession;
  conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
  wsHandler?: VoiceWebSocketHandler;
}

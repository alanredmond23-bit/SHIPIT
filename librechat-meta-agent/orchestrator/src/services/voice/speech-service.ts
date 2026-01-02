import { Logger } from 'pino';
import { STTProviderFactory, ISTTProvider, STTResult } from './stt-providers';
import { TTSProviderFactory, ITTSProvider, TTSResult, TTSOptions } from './tts-providers';

/**
 * Unified Speech Service
 *
 * Combines STT (Speech-to-Text) and TTS (Text-to-Speech) capabilities
 * from multiple providers:
 *
 * STT:
 * - OpenAI Whisper
 * - Deepgram
 * - AssemblyAI
 *
 * TTS:
 * - OpenAI TTS
 * - ElevenLabs
 * - PlayHT
 */

// ============================================================================
// Types
// ============================================================================

export interface SpeechServiceConfig {
  stt?: {
    openai?: { apiKey: string };
    deepgram?: { apiKey: string };
    assemblyai?: { apiKey: string };
    defaultProvider?: string;
  };
  tts?: {
    openai?: { apiKey: string };
    elevenlabs?: { apiKey: string };
    playht?: { apiKey: string; userId: string };
    defaultProvider?: string;
  };
}

export interface TranscriptionRequest {
  audio: Buffer;
  language?: string;
  provider?: string;
  options?: {
    enableWordTimestamps?: boolean;
    enableSpeakerDiarization?: boolean;
    customVocabulary?: string[];
  };
}

export interface SynthesisRequest {
  text: string;
  voice: string;
  provider?: string;
  options?: TTSOptions;
}

export interface ConversationTurn {
  speaker: 'user' | 'assistant';
  text: string;
  audio?: Buffer;
  timestamp: Date;
}

export interface VoiceCloneRequest {
  name: string;
  description: string;
  audioSamples: Buffer[];
  provider?: string;
}

// ============================================================================
// Unified Speech Service
// ============================================================================

export class SpeechService {
  private sttFactory: STTProviderFactory;
  private ttsFactory: TTSProviderFactory;
  private logger: Logger;
  private defaultSTTProvider: string;
  private defaultTTSProvider: string;

  constructor(logger: Logger, config: SpeechServiceConfig) {
    this.logger = logger.child({ service: 'speech' });

    // Initialize STT providers
    this.sttFactory = new STTProviderFactory(logger, {
      openai: config.stt?.openai,
      deepgram: config.stt?.deepgram,
      assemblyai: config.stt?.assemblyai,
    });

    // Initialize TTS providers
    this.ttsFactory = new TTSProviderFactory(logger, {
      openai: config.tts?.openai,
      elevenlabs: config.tts?.elevenlabs,
      playht: config.tts?.playht,
    });

    // Set defaults
    this.defaultSTTProvider = config.stt?.defaultProvider || 'whisper';
    this.defaultTTSProvider = config.tts?.defaultProvider || 'openai';

    this.logger.info({
      sttProviders: this.sttFactory.getAvailableProviders(),
      ttsProviders: this.ttsFactory.getAvailableProviders(),
    }, 'Speech service initialized');
  }

  // ============================================================================
  // Speech-to-Text (STT)
  // ============================================================================

  /**
   * Transcribe audio to text
   */
  async transcribe(request: TranscriptionRequest): Promise<STTResult> {
    const startTime = Date.now();

    try {
      const providerName = request.provider || this.defaultSTTProvider;
      const provider = this.sttFactory.getProvider(providerName);

      this.logger.info({
        provider: providerName,
        audioSize: request.audio.length,
        language: request.language,
      }, 'Starting transcription');

      const result = await provider.transcribe(request.audio, request.language);

      const totalTime = Date.now() - startTime;

      this.logger.info({
        provider: providerName,
        textLength: result.text.length,
        confidence: result.confidence,
        duration: totalTime,
      }, 'Transcription completed');

      return result;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        provider: request.provider,
        duration: Date.now() - startTime,
      }, 'Transcription failed');

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio file from a URL or path
   */
  async transcribeUrl(
    audioUrl: string,
    options?: {
      language?: string;
      provider?: string;
    }
  ): Promise<STTResult> {
    try {
      // Download audio
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      return this.transcribe({
        audio: audioBuffer,
        language: options?.language,
        provider: options?.provider,
      });
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        audioUrl,
      }, 'Failed to transcribe URL');

      throw new Error(`Failed to transcribe URL: ${error.message}`);
    }
  }

  // ============================================================================
  // Text-to-Speech (TTS)
  // ============================================================================

  /**
   * Synthesize speech from text
   */
  async synthesize(request: SynthesisRequest): Promise<TTSResult> {
    const startTime = Date.now();

    try {
      const providerName = request.provider || this.defaultTTSProvider;
      const provider = this.ttsFactory.getProvider(providerName);

      this.logger.info({
        provider: providerName,
        textLength: request.text.length,
        voice: request.voice,
      }, 'Starting speech synthesis');

      const result = await provider.synthesize(request.text, request.voice, request.options);

      const totalTime = Date.now() - startTime;

      this.logger.info({
        provider: providerName,
        audioSize: result.audio.length,
        duration: totalTime,
      }, 'Speech synthesis completed');

      return result;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        provider: request.provider,
        duration: Date.now() - startTime,
      }, 'Speech synthesis failed');

      throw new Error(`Speech synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize with automatic voice selection based on content
   */
  async synthesizeAuto(
    text: string,
    options?: {
      gender?: 'male' | 'female' | 'neutral';
      age?: 'young' | 'middle' | 'old';
      style?: 'friendly' | 'authoritative' | 'gentle' | 'energetic';
      provider?: string;
    }
  ): Promise<TTSResult> {
    // Select appropriate voice based on criteria
    const voice = this.selectVoice(options);

    return this.synthesize({
      text,
      voice,
      provider: options?.provider,
    });
  }

  // ============================================================================
  // Voice Management
  // ============================================================================

  /**
   * Get available voices for a provider
   */
  async getVoices(provider?: string): Promise<any[]> {
    try {
      const providerName = provider || this.defaultTTSProvider;
      const ttsProvider = this.ttsFactory.getProvider(providerName);

      return await ttsProvider.getVoices();
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        provider,
      }, 'Failed to get voices');

      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }

  /**
   * Clone a voice (ElevenLabs only)
   */
  async cloneVoice(request: VoiceCloneRequest): Promise<any> {
    try {
      const providerName = request.provider || 'elevenlabs';

      if (providerName !== 'elevenlabs') {
        throw new Error('Voice cloning is only supported by ElevenLabs');
      }

      const provider = this.ttsFactory.getProvider(providerName) as any;

      if (!provider.cloneVoice) {
        throw new Error('Provider does not support voice cloning');
      }

      this.logger.info({
        name: request.name,
        sampleCount: request.audioSamples.length,
      }, 'Cloning voice');

      const result = await provider.cloneVoice(
        request.name,
        request.description,
        request.audioSamples
      );

      this.logger.info({
        voiceId: result.id,
        name: request.name,
      }, 'Voice cloned successfully');

      return result;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        name: request.name,
      }, 'Voice cloning failed');

      throw new Error(`Voice cloning failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Conversation Helpers
  // ============================================================================

  /**
   * Process a conversation turn: transcribe user audio and generate assistant response audio
   */
  async processConversationTurn(
    userAudio: Buffer,
    assistantText: string,
    options?: {
      sttProvider?: string;
      ttsProvider?: string;
      language?: string;
      voice?: string;
    }
  ): Promise<{
    userTranscript: STTResult;
    assistantAudio: TTSResult;
  }> {
    try {
      // Transcribe user audio
      const userTranscript = await this.transcribe({
        audio: userAudio,
        language: options?.language,
        provider: options?.sttProvider,
      });

      // Synthesize assistant response
      const assistantAudio = await this.synthesize({
        text: assistantText,
        voice: options?.voice || 'alloy',
        provider: options?.ttsProvider,
      });

      return {
        userTranscript,
        assistantAudio,
      };
    } catch (error: any) {
      this.logger.error({
        error: error.message,
      }, 'Failed to process conversation turn');

      throw new Error(`Failed to process conversation turn: ${error.message}`);
    }
  }

  /**
   * Batch transcribe multiple audio files
   */
  async batchTranscribe(
    audioFiles: Buffer[],
    options?: {
      language?: string;
      provider?: string;
    }
  ): Promise<STTResult[]> {
    try {
      const results = await Promise.all(
        audioFiles.map(audio =>
          this.transcribe({
            audio,
            language: options?.language,
            provider: options?.provider,
          })
        )
      );

      return results;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        count: audioFiles.length,
      }, 'Batch transcription failed');

      throw new Error(`Batch transcription failed: ${error.message}`);
    }
  }

  /**
   * Batch synthesize multiple texts
   */
  async batchSynthesize(
    texts: string[],
    options?: {
      voice?: string;
      provider?: string;
    }
  ): Promise<TTSResult[]> {
    try {
      const results = await Promise.all(
        texts.map(text =>
          this.synthesize({
            text,
            voice: options?.voice || 'alloy',
            provider: options?.provider,
          })
        )
      );

      return results;
    } catch (error: any) {
      this.logger.error({
        error: error.message,
        count: texts.length,
      }, 'Batch synthesis failed');

      throw new Error(`Batch synthesis failed: ${error.message}`);
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Get available STT providers
   */
  getAvailableSTTProviders(): string[] {
    return this.sttFactory.getAvailableProviders();
  }

  /**
   * Get available TTS providers
   */
  getAvailableTTSProviders(): string[] {
    return this.ttsFactory.getAvailableProviders();
  }

  /**
   * Check if a provider supports streaming
   */
  supportsStreaming(provider: string, type: 'stt' | 'tts'): boolean {
    try {
      if (type === 'stt') {
        const sttProvider = this.sttFactory.getProvider(provider);
        return sttProvider.supportsStreaming();
      } else {
        const ttsProvider = this.ttsFactory.getProvider(provider);
        return ttsProvider.supportsStreaming();
      }
    } catch {
      return false;
    }
  }

  /**
   * Health check for all providers
   */
  async healthCheck(): Promise<{
    stt: Record<string, boolean>;
    tts: Record<string, boolean>;
  }> {
    const sttResults: Record<string, boolean> = {};
    const ttsResults: Record<string, boolean> = {};

    // Check STT providers
    for (const provider of this.getAvailableSTTProviders()) {
      try {
        // Simple test transcription
        const testAudio = Buffer.from(new ArrayBuffer(1024)); // Dummy audio
        await this.transcribe({ audio: testAudio, provider });
        sttResults[provider] = true;
      } catch {
        sttResults[provider] = false;
      }
    }

    // Check TTS providers
    for (const provider of this.getAvailableTTSProviders()) {
      try {
        // Simple test synthesis
        await this.synthesize({ text: 'test', voice: 'alloy', provider });
        ttsResults[provider] = true;
      } catch {
        ttsResults[provider] = false;
      }
    }

    return {
      stt: sttResults,
      tts: ttsResults,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private selectVoice(options?: {
    gender?: 'male' | 'female' | 'neutral';
    age?: 'young' | 'middle' | 'old';
    style?: 'friendly' | 'authoritative' | 'gentle' | 'energetic';
  }): string {
    // OpenAI voices mapping
    const voiceMap: Record<string, string> = {
      'male-authoritative': 'onyx',
      'male-friendly': 'echo',
      'male-storytelling': 'fable',
      'female-young-energetic': 'nova',
      'female-gentle': 'shimmer',
      'neutral': 'alloy',
    };

    // Build key from options
    let key = '';
    if (options?.gender) key += options.gender;
    if (options?.age) key += `-${options.age}`;
    if (options?.style) key += `-${options.style}`;

    // Return matched voice or default
    return voiceMap[key] || 'alloy';
  }

  /**
   * Convert audio format (if needed)
   */
  async convertAudioFormat(
    audio: Buffer,
    targetFormat: 'mp3' | 'wav' | 'ogg' | 'webm'
  ): Promise<Buffer> {
    // This is a placeholder - in production, use FFmpeg or similar
    this.logger.warn('Audio format conversion not implemented, returning original audio');
    return audio;
  }

  /**
   * Estimate audio duration
   */
  estimateAudioDuration(audioBuffer: Buffer, sampleRate: number = 44100): number {
    // Rough estimation based on buffer size
    // This is approximate and should be replaced with proper audio parsing
    return audioBuffer.length / (sampleRate * 2); // Assuming 16-bit audio
  }
}

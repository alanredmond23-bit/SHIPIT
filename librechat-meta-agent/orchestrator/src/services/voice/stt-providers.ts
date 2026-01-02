import OpenAI from 'openai';
import { Logger } from 'pino';

/**
 * Speech-to-Text result interface
 */
export interface STTResult {
  text: string;
  confidence: number;
  language?: string;
  duration?: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

/**
 * STT Provider interface
 */
export interface ISTTProvider {
  transcribe(audio: Buffer, language?: string): Promise<STTResult>;
  getName(): string;
  supportsStreaming(): boolean;
}

/**
 * OpenAI Whisper STT Provider
 */
export class WhisperSTTProvider implements ISTTProvider {
  private openai: OpenAI;

  constructor(
    private logger: Logger,
    apiKey: string
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'whisper';
  }

  supportsStreaming(): boolean {
    return false;
  }

  async transcribe(audio: Buffer, language?: string): Promise<STTResult> {
    try {
      const startTime = Date.now();

      // Create a file-like object from buffer
      const file = new File([audio], 'audio.webm', { type: 'audio/webm' });

      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: language || undefined,
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      });

      const duration = Date.now() - startTime;

      this.logger.info(
        {
          text_length: response.text.length,
          language: response.language,
          duration_ms: duration,
        },
        'Whisper transcription completed'
      );

      // Parse word-level timestamps if available
      const words = (response as any).words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: 1.0, // Whisper doesn't provide word-level confidence
      }));

      return {
        text: response.text,
        confidence: 1.0, // Whisper doesn't provide confidence scores
        language: response.language,
        duration,
        words,
      };
    } catch (error) {
      this.logger.error({ error }, 'Whisper transcription failed');
      throw new Error(
        `Whisper transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Deepgram STT Provider (Real-time capable)
 */
export class DeepgramSTTProvider implements ISTTProvider {
  constructor(
    private logger: Logger,
    private apiKey: string
  ) {}

  getName(): string {
    return 'deepgram';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async transcribe(audio: Buffer, language?: string): Promise<STTResult> {
    try {
      const startTime = Date.now();

      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'audio/webm',
        },
        body: audio,
      });

      if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      const result = data.results?.channels?.[0]?.alternatives?.[0];

      if (!result) {
        throw new Error('No transcription result from Deepgram');
      }

      // Parse word-level timestamps
      const words = result.words?.map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      }));

      this.logger.info(
        {
          text_length: result.transcript.length,
          confidence: result.confidence,
          duration_ms: duration,
        },
        'Deepgram transcription completed'
      );

      return {
        text: result.transcript,
        confidence: result.confidence,
        language: language,
        duration,
        words,
      };
    } catch (error) {
      this.logger.error({ error }, 'Deepgram transcription failed');
      throw new Error(
        `Deepgram transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * AssemblyAI STT Provider
 */
export class AssemblyAISTTProvider implements ISTTProvider {
  constructor(
    private logger: Logger,
    private apiKey: string
  ) {}

  getName(): string {
    return 'assemblyai';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async transcribe(audio: Buffer, language?: string): Promise<STTResult> {
    try {
      const startTime = Date.now();

      // Step 1: Upload audio
      const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/octet-stream',
        },
        body: audio,
      });

      if (!uploadResponse.ok) {
        throw new Error(`AssemblyAI upload error: ${uploadResponse.statusText}`);
      }

      const { upload_url } = await uploadResponse.json();

      // Step 2: Request transcription
      const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: language,
          word_boost: [],
          boost_param: 'default',
        }),
      });

      if (!transcriptResponse.ok) {
        throw new Error(`AssemblyAI transcription error: ${transcriptResponse.statusText}`);
      }

      const { id } = await transcriptResponse.json();

      // Step 3: Poll for completion
      let transcriptData;
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds max wait

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
          headers: {
            'authorization': this.apiKey,
          },
        });

        transcriptData = await statusResponse.json();

        if (transcriptData.status === 'completed') {
          break;
        } else if (transcriptData.status === 'error') {
          throw new Error(`AssemblyAI transcription error: ${transcriptData.error}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      if (transcriptData?.status !== 'completed') {
        throw new Error('AssemblyAI transcription timeout');
      }

      const duration = Date.now() - startTime;

      // Parse word-level timestamps
      const words = transcriptData.words?.map((w: any) => ({
        word: w.text,
        start: w.start / 1000, // Convert ms to seconds
        end: w.end / 1000,
        confidence: w.confidence,
      }));

      this.logger.info(
        {
          text_length: transcriptData.text.length,
          confidence: transcriptData.confidence,
          duration_ms: duration,
        },
        'AssemblyAI transcription completed'
      );

      return {
        text: transcriptData.text,
        confidence: transcriptData.confidence,
        language: transcriptData.language_code,
        duration,
        words,
      };
    } catch (error) {
      this.logger.error({ error }, 'AssemblyAI transcription failed');
      throw new Error(
        `AssemblyAI transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * STT Provider Factory
 */
export class STTProviderFactory {
  private providers: Map<string, ISTTProvider> = new Map();

  constructor(
    private logger: Logger,
    private config: {
      openai?: { apiKey: string };
      deepgram?: { apiKey: string };
      assemblyai?: { apiKey: string };
    }
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (this.config.openai?.apiKey) {
      this.providers.set(
        'whisper',
        new WhisperSTTProvider(this.logger, this.config.openai.apiKey)
      );
    }

    if (this.config.deepgram?.apiKey) {
      this.providers.set(
        'deepgram',
        new DeepgramSTTProvider(this.logger, this.config.deepgram.apiKey)
      );
    }

    if (this.config.assemblyai?.apiKey) {
      this.providers.set(
        'assemblyai',
        new AssemblyAISTTProvider(this.logger, this.config.assemblyai.apiKey)
      );
    }
  }

  getProvider(name: string): ISTTProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`STT provider '${name}' not found or not configured`);
    }
    return provider;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
}

import OpenAI from 'openai';
import { Logger } from 'pino';

/**
 * Voice information interface
 */
export interface VoiceInfo {
  id: string;
  name: string;
  description?: string;
  preview_url?: string;
  language?: string;
  gender?: string;
  age?: string;
  accent?: string;
  use_case?: string;
  labels?: Record<string, string>;
}

/**
 * TTS result interface
 */
export interface TTSResult {
  audio: Buffer;
  duration: number;
  format: string;
  sampleRate?: number;
}

/**
 * TTS Provider interface
 */
export interface ITTSProvider {
  synthesize(text: string, voice: string, options?: TTSOptions): Promise<TTSResult>;
  getVoices(): Promise<VoiceInfo[]>;
  getName(): string;
  supportsStreaming(): boolean;
}

/**
 * TTS synthesis options
 */
export interface TTSOptions {
  speed?: number; // 0.25 to 4.0
  pitch?: number; // Provider-specific
  stability?: number; // ElevenLabs: 0.0 to 1.0
  similarity_boost?: number; // ElevenLabs: 0.0 to 1.0
  style?: number; // ElevenLabs: 0.0 to 1.0
  use_speaker_boost?: boolean; // ElevenLabs
  output_format?: string; // mp3, pcm, etc.
}

/**
 * OpenAI TTS Provider
 */
export class OpenAITTSProvider implements ITTSProvider {
  private openai: OpenAI;

  // OpenAI TTS voices
  private static readonly VOICES: VoiceInfo[] = [
    {
      id: 'alloy',
      name: 'Alloy',
      description: 'Neutral and balanced voice',
      gender: 'neutral',
      use_case: 'general',
    },
    {
      id: 'echo',
      name: 'Echo',
      description: 'Male voice with clear pronunciation',
      gender: 'male',
      use_case: 'general',
    },
    {
      id: 'fable',
      name: 'Fable',
      description: 'British male voice with expressive tone',
      gender: 'male',
      accent: 'british',
      use_case: 'storytelling',
    },
    {
      id: 'onyx',
      name: 'Onyx',
      description: 'Deep male voice',
      gender: 'male',
      use_case: 'authoritative',
    },
    {
      id: 'nova',
      name: 'Nova',
      description: 'Young female voice with energy',
      gender: 'female',
      age: 'young',
      use_case: 'friendly',
    },
    {
      id: 'shimmer',
      name: 'Shimmer',
      description: 'Soft female voice',
      gender: 'female',
      use_case: 'gentle',
    },
  ];

  constructor(
    private logger: Logger,
    apiKey: string
  ) {
    this.openai = new OpenAI({ apiKey });
  }

  getName(): string {
    return 'openai';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async synthesize(text: string, voice: string, options?: TTSOptions): Promise<TTSResult> {
    try {
      const startTime = Date.now();

      const response = await this.openai.audio.speech.create({
        model: 'tts-1-hd', // or 'tts-1' for faster, lower quality
        voice: voice as any,
        input: text,
        speed: options?.speed || 1.0,
        response_format: (options?.output_format as any) || 'mp3',
      });

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      this.logger.info(
        {
          text_length: text.length,
          voice,
          audio_size: audioBuffer.length,
          duration_ms: duration,
        },
        'OpenAI TTS synthesis completed'
      );

      return {
        audio: audioBuffer,
        duration,
        format: options?.output_format || 'mp3',
      };
    } catch (error) {
      this.logger.error({ error }, 'OpenAI TTS synthesis failed');
      throw new Error(
        `OpenAI TTS synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getVoices(): Promise<VoiceInfo[]> {
    return OpenAITTSProvider.VOICES;
  }
}

/**
 * ElevenLabs TTS Provider
 */
export class ElevenLabsTTSProvider implements ITTSProvider {
  constructor(
    private logger: Logger,
    private apiKey: string
  ) {}

  getName(): string {
    return 'elevenlabs';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async synthesize(text: string, voice: string, options?: TTSOptions): Promise<TTSResult> {
    try {
      const startTime = Date.now();

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2', // Fast, low-latency model
            voice_settings: {
              stability: options?.stability ?? 0.5,
              similarity_boost: options?.similarity_boost ?? 0.75,
              style: options?.style ?? 0.0,
              use_speaker_boost: options?.use_speaker_boost ?? true,
            },
            output_format: options?.output_format || 'mp3_44100_128',
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      this.logger.info(
        {
          text_length: text.length,
          voice,
          audio_size: audioBuffer.length,
          duration_ms: duration,
        },
        'ElevenLabs TTS synthesis completed'
      );

      return {
        audio: audioBuffer,
        duration,
        format: options?.output_format || 'mp3_44100_128',
      };
    } catch (error) {
      this.logger.error({ error }, 'ElevenLabs TTS synthesis failed');
      throw new Error(
        `ElevenLabs TTS synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const data = await response.json();

      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        description: voice.description,
        preview_url: voice.preview_url,
        language: voice.labels?.language,
        gender: voice.labels?.gender,
        age: voice.labels?.age,
        accent: voice.labels?.accent,
        use_case: voice.labels?.use_case,
        labels: voice.labels,
      }));
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch ElevenLabs voices');
      throw new Error(
        `Failed to fetch ElevenLabs voices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clone a voice from audio samples
   */
  async cloneVoice(
    name: string,
    description: string,
    audioFiles: Buffer[]
  ): Promise<VoiceInfo> {
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);

      audioFiles.forEach((audioBuffer, index) => {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        formData.append('files', blob, `sample_${index}.mp3`);
      });

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      this.logger.info({ voice_id: data.voice_id, name }, 'Voice cloned successfully');

      return {
        id: data.voice_id,
        name,
        description,
      };
    } catch (error) {
      this.logger.error({ error }, 'Voice cloning failed');
      throw new Error(
        `Voice cloning failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * PlayHT TTS Provider
 */
export class PlayHTTTSProvider implements ITTSProvider {
  constructor(
    private logger: Logger,
    private apiKey: string,
    private userId: string
  ) {}

  getName(): string {
    return 'playht';
  }

  supportsStreaming(): boolean {
    return true;
  }

  async synthesize(text: string, voice: string, options?: TTSOptions): Promise<TTSResult> {
    try {
      const startTime = Date.now();

      const response = await fetch('https://api.play.ht/api/v2/tts', {
        method: 'POST',
        headers: {
          'AUTHORIZATION': this.apiKey,
          'X-USER-ID': this.userId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          output_format: options?.output_format || 'mp3',
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PlayHT API error: ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      this.logger.info(
        {
          text_length: text.length,
          voice,
          audio_size: audioBuffer.length,
          duration_ms: duration,
        },
        'PlayHT TTS synthesis completed'
      );

      return {
        audio: audioBuffer,
        duration,
        format: options?.output_format || 'mp3',
      };
    } catch (error) {
      this.logger.error({ error }, 'PlayHT TTS synthesis failed');
      throw new Error(
        `PlayHT TTS synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async getVoices(): Promise<VoiceInfo[]> {
    try {
      const response = await fetch('https://api.play.ht/api/v2/voices', {
        headers: {
          'AUTHORIZATION': this.apiKey,
          'X-USER-ID': this.userId,
        },
      });

      if (!response.ok) {
        throw new Error(`PlayHT API error: ${response.statusText}`);
      }

      const data = await response.json();

      return data.map((voice: any) => ({
        id: voice.id,
        name: voice.name,
        language: voice.language,
        gender: voice.gender,
        age: voice.age,
        accent: voice.accent,
      }));
    } catch (error) {
      this.logger.error({ error }, 'Failed to fetch PlayHT voices');
      throw new Error(
        `Failed to fetch PlayHT voices: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * TTS Provider Factory
 */
export class TTSProviderFactory {
  private providers: Map<string, ITTSProvider> = new Map();

  constructor(
    private logger: Logger,
    private config: {
      openai?: { apiKey: string };
      elevenlabs?: { apiKey: string };
      playht?: { apiKey: string; userId: string };
    }
  ) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (this.config.openai?.apiKey) {
      this.providers.set(
        'openai',
        new OpenAITTSProvider(this.logger, this.config.openai.apiKey)
      );
    }

    if (this.config.elevenlabs?.apiKey) {
      this.providers.set(
        'elevenlabs',
        new ElevenLabsTTSProvider(this.logger, this.config.elevenlabs.apiKey)
      );
    }

    if (this.config.playht?.apiKey && this.config.playht?.userId) {
      this.providers.set(
        'playht',
        new PlayHTTTSProvider(
          this.logger,
          this.config.playht.apiKey,
          this.config.playht.userId
        )
      );
    }
  }

  getProvider(name: string): ITTSProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`TTS provider '${name}' not found or not configured`);
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

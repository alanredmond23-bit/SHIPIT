import { WebSocket } from 'ws';
import { Logger } from 'pino';
import { EventEmitter } from 'events';

/**
 * WebSocket message types for voice communication
 */
export enum VoiceWSMessageType {
  // Client -> Server
  AUDIO_CHUNK = 'audio_chunk',
  START_SPEAKING = 'start_speaking',
  STOP_SPEAKING = 'stop_speaking',
  INTERRUPT = 'interrupt',
  CONFIG_UPDATE = 'config_update',

  // Server -> Client
  TRANSCRIPT = 'transcript',
  AUDIO_RESPONSE = 'audio_response',
  AUDIO_START = 'audio_start',
  AUDIO_END = 'audio_end',
  STATUS = 'status',
  ERROR = 'error',
  METRICS = 'metrics',
}

/**
 * WebSocket message interface
 */
export interface VoiceWSMessage {
  type: VoiceWSMessageType;
  data: any;
  timestamp: number;
}

/**
 * Audio chunk buffer for managing incoming audio
 */
class AudioChunkBuffer {
  private chunks: Buffer[] = [];
  private totalSize = 0;
  private readonly maxSize: number;

  constructor(maxSize = 1024 * 1024) {
    // 1MB default
    this.maxSize = maxSize;
  }

  add(chunk: Buffer): void {
    if (this.totalSize + chunk.length > this.maxSize) {
      // Remove oldest chunks to make room
      while (this.totalSize + chunk.length > this.maxSize && this.chunks.length > 0) {
        const removed = this.chunks.shift();
        if (removed) {
          this.totalSize -= removed.length;
        }
      }
    }

    this.chunks.push(chunk);
    this.totalSize += chunk.length;
  }

  getAll(): Buffer {
    return Buffer.concat(this.chunks);
  }

  clear(): void {
    this.chunks = [];
    this.totalSize = 0;
  }

  size(): number {
    return this.totalSize;
  }

  isEmpty(): boolean {
    return this.chunks.length === 0;
  }
}

/**
 * Voice activity detection state
 */
interface VADState {
  isSpeaking: boolean;
  silenceStart: number | null;
  speechStart: number | null;
  silenceThreshold: number; // ms of silence before considering speech ended
}

/**
 * WebSocket handler for voice conversations
 */
export class VoiceWebSocketHandler extends EventEmitter {
  private audioBuffer: AudioChunkBuffer;
  private vadState: VADState;
  private sessionId: string;
  private isAISpeaking = false;
  private lastActivityTime: number;

  constructor(
    private ws: WebSocket,
    sessionId: string,
    private logger: Logger,
    private config: {
      silenceThreshold?: number; // ms
      maxBufferSize?: number; // bytes
      heartbeatInterval?: number; // ms
    } = {}
  ) {
    super();

    this.sessionId = sessionId;
    this.audioBuffer = new AudioChunkBuffer(config.maxBufferSize);
    this.vadState = {
      isSpeaking: false,
      silenceStart: null,
      speechStart: null,
      silenceThreshold: config.silenceThreshold || 1000, // 1 second default
    };
    this.lastActivityTime = Date.now();

    this.setupWebSocket();
    this.startHeartbeat();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocket(): void {
    this.ws.on('message', (data: Buffer) => {
      this.handleMessage(data);
    });

    this.ws.on('close', () => {
      this.logger.info({ session_id: this.sessionId }, 'WebSocket closed');
      this.emit('close');
    });

    this.ws.on('error', (error) => {
      this.logger.error({ session_id: this.sessionId, error }, 'WebSocket error');
      this.emit('error', error);
    });

    this.ws.on('pong', () => {
      this.lastActivityTime = Date.now();
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: Buffer): void {
    try {
      // Check if message is JSON (text) or binary (audio)
      if (this.isJSON(data)) {
        const message = JSON.parse(data.toString()) as VoiceWSMessage;
        this.handleTextMessage(message);
      } else {
        // Binary audio data
        this.handleAudioChunk(data);
      }

      this.lastActivityTime = Date.now();
    } catch (error) {
      this.logger.error({ error }, 'Error handling WebSocket message');
      this.sendError('Invalid message format');
    }
  }

  /**
   * Check if data is JSON
   */
  private isJSON(data: Buffer): boolean {
    try {
      const str = data.toString();
      return str.startsWith('{') || str.startsWith('[');
    } catch {
      return false;
    }
  }

  /**
   * Handle text (JSON) messages
   */
  private handleTextMessage(message: VoiceWSMessage): void {
    this.logger.debug(
      { type: message.type, session_id: this.sessionId },
      'Received text message'
    );

    switch (message.type) {
      case VoiceWSMessageType.START_SPEAKING:
        this.handleStartSpeaking();
        break;

      case VoiceWSMessageType.STOP_SPEAKING:
        this.handleStopSpeaking();
        break;

      case VoiceWSMessageType.INTERRUPT:
        this.handleInterrupt();
        break;

      case VoiceWSMessageType.CONFIG_UPDATE:
        this.handleConfigUpdate(message.data);
        break;

      default:
        this.logger.warn({ type: message.type }, 'Unknown message type');
    }
  }

  /**
   * Handle incoming audio chunk
   */
  private handleAudioChunk(chunk: Buffer): void {
    if (this.isAISpeaking) {
      // User is interrupting AI
      this.handleInterrupt();
    }

    this.audioBuffer.add(chunk);
    this.emit('audio_chunk', chunk);

    // Update VAD state
    if (!this.vadState.isSpeaking) {
      this.vadState.isSpeaking = true;
      this.vadState.speechStart = Date.now();
      this.vadState.silenceStart = null;
      this.emit('speech_start');
    }

    // Reset silence timer
    this.vadState.silenceStart = Date.now();
  }

  /**
   * Handle start speaking event
   */
  private handleStartSpeaking(): void {
    this.vadState.isSpeaking = true;
    this.vadState.speechStart = Date.now();
    this.vadState.silenceStart = null;
    this.emit('speech_start');
  }

  /**
   * Handle stop speaking event
   */
  private handleStopSpeaking(): void {
    if (this.vadState.isSpeaking) {
      this.finalizeUserSpeech();
    }
  }

  /**
   * Handle interrupt event (user starts speaking while AI is talking)
   */
  private handleInterrupt(): void {
    if (this.isAISpeaking) {
      this.logger.info({ session_id: this.sessionId }, 'User interrupted AI');
      this.isAISpeaking = false;
      this.emit('interrupt');
    }
  }

  /**
   * Handle config update
   */
  private handleConfigUpdate(config: any): void {
    if (config.silenceThreshold) {
      this.vadState.silenceThreshold = config.silenceThreshold;
    }
    this.emit('config_update', config);
  }

  /**
   * Finalize user speech and emit complete audio
   */
  private finalizeUserSpeech(): void {
    if (this.audioBuffer.isEmpty()) {
      return;
    }

    const audio = this.audioBuffer.getAll();
    const duration = this.vadState.speechStart
      ? Date.now() - this.vadState.speechStart
      : 0;

    this.logger.info(
      {
        session_id: this.sessionId,
        audio_size: audio.length,
        duration_ms: duration,
      },
      'User speech completed'
    );

    this.emit('speech_end', audio, duration);

    // Reset state
    this.vadState.isSpeaking = false;
    this.vadState.speechStart = null;
    this.vadState.silenceStart = null;
    this.audioBuffer.clear();
  }

  /**
   * Check for speech end based on silence threshold
   */
  private checkSilenceThreshold(): void {
    if (
      this.vadState.isSpeaking &&
      this.vadState.silenceStart &&
      Date.now() - this.vadState.silenceStart > this.vadState.silenceThreshold
    ) {
      this.finalizeUserSpeech();
    }
  }

  /**
   * Send message to client
   */
  public sendMessage(type: VoiceWSMessageType, data: any): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn({ type }, 'Cannot send message: WebSocket not open');
      return;
    }

    const message: VoiceWSMessage = {
      type,
      data,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Send audio response to client
   */
  public sendAudioResponse(audio: Buffer, isStart = false, isEnd = false): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (isStart) {
      this.isAISpeaking = true;
      this.sendMessage(VoiceWSMessageType.AUDIO_START, {});
    }

    // Send binary audio data
    this.ws.send(audio);

    if (isEnd) {
      this.isAISpeaking = false;
      this.sendMessage(VoiceWSMessageType.AUDIO_END, {});
    }
  }

  /**
   * Send transcript update
   */
  public sendTranscript(role: 'user' | 'assistant', text: string, metadata?: any): void {
    this.sendMessage(VoiceWSMessageType.TRANSCRIPT, {
      role,
      text,
      ...metadata,
    });
  }

  /**
   * Send status update
   */
  public sendStatus(status: string, details?: any): void {
    this.sendMessage(VoiceWSMessageType.STATUS, {
      status,
      ...details,
    });
  }

  /**
   * Send error message
   */
  public sendError(message: string, code?: string): void {
    this.sendMessage(VoiceWSMessageType.ERROR, {
      message,
      code,
    });
  }

  /**
   * Send metrics update
   */
  public sendMetrics(metrics: any): void {
    this.sendMessage(VoiceWSMessageType.METRICS, metrics);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeatInterval || 30000; // 30 seconds

    const heartbeat = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();

        // Check for silence threshold
        this.checkSilenceThreshold();

        // Check for inactive connection
        if (Date.now() - this.lastActivityTime > 300000) {
          // 5 minutes
          this.logger.warn({ session_id: this.sessionId }, 'Inactive connection, closing');
          this.close();
        }
      } else {
        clearInterval(heartbeat);
      }
    }, interval);
  }

  /**
   * Get current buffer size
   */
  public getBufferSize(): number {
    return this.audioBuffer.size();
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if AI is currently speaking
   */
  public isAICurrentlySpeaking(): boolean {
    return this.isAISpeaking;
  }

  /**
   * Close the WebSocket connection
   */
  public close(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

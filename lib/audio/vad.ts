import { resampleMono } from "./resample";

export interface SpeechChunk {
  audio: Float32Array;
  startedAt: string;
  endedAt: string;
}

export interface VoiceActivityDetector {
  start(track: MediaStreamTrack): Promise<void>;
  stop(flush?: boolean): void;
  onSpeechStart(callback: () => void): void;
  onSpeechEnd(callback: (chunk: SpeechChunk) => void): void;
}

const RMS_THRESHOLD = 0.018;
const SILENCE_MS = 700;
const MIN_SPEECH_MS = 350;
const MAX_SPEECH_MS = 25_000;

export class WebAudioVAD implements VoiceActivityDetector {
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;
  private buffers: Float32Array[] = [];
  private speaking = false;
  private speechStartedAt = 0;
  private lastVoiceAt = 0;
  private sampleRate = 48_000;
  private speechStartCallback: () => void = () => {};
  private speechEndCallback: (chunk: SpeechChunk) => void = () => {};

  onSpeechStart(callback: () => void) { this.speechStartCallback = callback; }
  onSpeechEnd(callback: (chunk: SpeechChunk) => void) { this.speechEndCallback = callback; }

  async start(track: MediaStreamTrack) {
    this.stop(false);
    const context = new AudioContext({ latencyHint: "interactive" });
    await context.resume();
    this.context = context;
    this.sampleRate = context.sampleRate;
    this.source = context.createMediaStreamSource(new MediaStream([track]));
    this.processor = context.createScriptProcessor(4096, 1, 1);
    this.sink = context.createGain();
    this.sink.gain.value = 0;
    this.processor.onaudioprocess = (event) => this.process(event.inputBuffer.getChannelData(0));
    this.source.connect(this.processor);
    this.processor.connect(this.sink);
    this.sink.connect(context.destination);
  }

  private process(samples: Float32Array) {
    if (!this.context) return;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    const voiced = Math.sqrt(sum / samples.length) >= RMS_THRESHOLD;
    const now = performance.now();
    if (voiced && !this.speaking) {
      this.speaking = true;
      this.speechStartedAt = Date.now();
      this.speechStartCallback();
    }
    if (!this.speaking) return;
    this.buffers.push(new Float32Array(samples));
    if (voiced) this.lastVoiceAt = now;
    const elapsed = Date.now() - this.speechStartedAt;
    if ((!voiced && now - this.lastVoiceAt >= SILENCE_MS) || elapsed >= MAX_SPEECH_MS) {
      this.finish(elapsed >= MIN_SPEECH_MS);
    }
  }

  private finish(emit: boolean) {
    if (!this.speaking) return;
    const startedAt = new Date(this.speechStartedAt).toISOString();
    const endedAt = new Date().toISOString();
    const length = this.buffers.reduce((total, buffer) => total + buffer.length, 0);
    const combined = new Float32Array(length);
    let offset = 0;
    for (const buffer of this.buffers) { combined.set(buffer, offset); offset += buffer.length; }
    this.buffers = [];
    this.speaking = false;
    if (emit) this.speechEndCallback({ audio: resampleMono(combined, this.sampleRate), startedAt, endedAt });
  }

  stop(flush = true) {
    if (flush) this.finish(true);
    this.processor?.disconnect();
    this.source?.disconnect();
    this.sink?.disconnect();
    if (this.processor) this.processor.onaudioprocess = null;
    void this.context?.close();
    this.context = null;
    this.processor = null;
    this.source = null;
    this.sink = null;
    this.buffers = [];
    this.speaking = false;
  }
}

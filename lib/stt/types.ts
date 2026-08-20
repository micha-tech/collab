export type STTCapability = "webgpu" | "wasm" | "unsupported";

export type TranscriptionState =
  | "disabled"
  | "initializing"
  | "loading-model"
  | "ready"
  | "listening"
  | "processing"
  | "error";

export interface TranscriptSegment {
  id: string;
  meetingId: string;
  speakerId: string;
  livekitIdentity: string;
  speakerName: string | null;
  text: string;
  startedAt: string;
  endedAt: string;
  sequence: number;
  isFinal: boolean;
  source: "local-asr";
  createdAt: string;
}

export type STTWorkerRequest =
  | { type: "INITIALIZE"; model: string; device: "webgpu" | "wasm" }
  | { type: "TRANSCRIBE"; requestId: string; audio: Float32Array; sampleRate: 16000 }
  | { type: "DISPOSE" };

export type STTWorkerResponse =
  | { type: "READY" }
  | { type: "PROGRESS"; progress: number; status?: string }
  | { type: "RESULT"; requestId: string; text: string }
  | { type: "ERROR"; requestId?: string; error: string };

import type { STTWorkerRequest, STTWorkerResponse } from "./types";

interface PendingRequest {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

export class STTWorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<string, PendingRequest>();

  async initialize(
    model: string,
    device: "webgpu" | "wasm",
    onProgress: (progress: number, status?: string) => void,
  ): Promise<void> {
    const worker = new Worker(new URL("../../workers/stt.worker.ts", import.meta.url), { type: "module" });
    this.worker = worker;
    await new Promise<void>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<STTWorkerResponse>) => {
        const message = event.data;
        if (message.type === "PROGRESS") onProgress(message.progress, message.status);
        if (message.type === "READY") resolve();
        if (message.type === "ERROR" && !message.requestId) reject(new Error(message.error));
        if (message.type === "RESULT") {
          this.pending.get(message.requestId)?.resolve(message.text);
          this.pending.delete(message.requestId);
        }
        if (message.type === "ERROR" && message.requestId) {
          this.pending.get(message.requestId)?.reject(new Error(message.error));
          this.pending.delete(message.requestId);
        }
      };
      worker.onerror = () => reject(new Error("The local speech worker stopped unexpectedly."));
      const request: STTWorkerRequest = { type: "INITIALIZE", model, device };
      worker.postMessage(request);
    });
  }

  transcribe(audio: Float32Array): Promise<string> {
    if (!this.worker) return Promise.reject(new Error("Speech model is not ready."));
    const requestId = crypto.randomUUID();
    const request: STTWorkerRequest = { type: "TRANSCRIBE", requestId, audio, sampleRate: 16_000 };
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.worker?.postMessage(request, [audio.buffer]);
    });
  }

  dispose() {
    if (this.worker) {
      const request: STTWorkerRequest = { type: "DISPOSE" };
      this.worker.postMessage(request);
      this.worker.terminate();
    }
    for (const request of this.pending.values()) request.reject(new Error("Transcription stopped."));
    this.pending.clear();
    this.worker = null;
  }
}

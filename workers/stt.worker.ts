/// <reference lib="webworker" />

import { env, pipeline } from "@huggingface/transformers";
import type { STTWorkerRequest, STTWorkerResponse } from "@/lib/stt/types";

env.allowLocalModels = false;
env.useBrowserCache = true;

type ASROutput = { text: string };
type ASRPipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<ASROutput | ASROutput[]>;

let transcriber: ASRPipeline | null = null;

function send(message: STTWorkerResponse) {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<STTWorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "INITIALIZE") {
      send({ type: "PROGRESS", progress: 0, status: "Downloading speech model…" });
      transcriber = (await pipeline("automatic-speech-recognition", message.model, {
        device: message.device,
        dtype: message.device === "webgpu" ? "q4" : "q8",
        progress_callback: (progress: { progress?: number; status?: string }) => {
          send({
            type: "PROGRESS",
            progress: Math.round(progress.progress ?? 0),
            status: progress.status,
          });
        },
      })) as unknown as ASRPipeline;
      send({ type: "READY" });
      return;
    }
    if (message.type === "DISPOSE") {
      transcriber = null;
      self.close();
      return;
    }
    if (!transcriber) throw new Error("Speech model is not ready.");
    const result = await transcriber(message.audio, {
      language: "english",
      task: "transcribe",
      return_timestamps: false,
    });
    const text = (Array.isArray(result) ? result[0]?.text : result.text) ?? "";
    send({ type: "RESULT", requestId: message.requestId, text: text.trim() });
  } catch (error) {
    send({
      type: "ERROR",
      requestId: message.type === "TRANSCRIBE" ? message.requestId : undefined,
      error: error instanceof Error ? error.message : "Local transcription failed.",
    });
  }
};

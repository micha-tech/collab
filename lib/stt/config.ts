import type { STTCapability } from "./types";

export const STT_MODELS = {
  default: "onnx-community/distil-small.en",
  lightweight: "onnx-community/whisper-tiny.en",
} as const;

export const STT_SAMPLE_RATE = 16_000 as const;

export function modelForCapability(capability: STTCapability): string | null {
  if (capability === "webgpu") return STT_MODELS.default;
  if (capability === "wasm") return STT_MODELS.lightweight;
  return null;
}

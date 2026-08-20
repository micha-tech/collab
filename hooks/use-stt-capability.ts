"use client";

import { useSyncExternalStore } from "react";
import type { STTCapability } from "@/lib/stt/types";

export function detectSTTCapability(): STTCapability {
  if (typeof window === "undefined" || typeof Worker === "undefined" || typeof AudioContext === "undefined") return "unsupported";
  // ONNX Runtime's current WebGPU loader imports a generated blob module.
  // Our production CSP deliberately disallows blob scripts, so use the
  // quantized WASM backend until WebGPU can be bundled without weakening CSP.
  return typeof WebAssembly === "object" ? "wasm" : "unsupported";
}

export function useSTTCapability() {
  return useSyncExternalStore<STTCapability>(
    () => () => {},
    detectSTTCapability,
    () => "unsupported" as STTCapability,
  );
}

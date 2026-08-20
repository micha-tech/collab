"use client";

import { useSyncExternalStore } from "react";
import type { STTCapability } from "@/lib/stt/types";

export function detectSTTCapability(): STTCapability {
  if (typeof window === "undefined" || typeof Worker === "undefined" || typeof AudioContext === "undefined") return "unsupported";
  if ("gpu" in navigator) return "webgpu";
  return typeof WebAssembly === "object" ? "wasm" : "unsupported";
}

export function useSTTCapability() {
  return useSyncExternalStore<STTCapability>(
    () => () => {},
    detectSTTCapability,
    () => "unsupported" as STTCapability,
  );
}

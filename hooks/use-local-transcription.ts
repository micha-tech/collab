"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalParticipant } from "livekit-client";
import { Track } from "livekit-client";
import { WebAudioVAD, type SpeechChunk } from "@/lib/audio/vad";
import { modelForCapability } from "@/lib/stt/config";
import { STTWorkerClient } from "@/lib/stt/worker-client";
import type { TranscriptionState } from "@/lib/stt/types";
import { useSTTCapability } from "./use-stt-capability";

interface PendingSegment { text: string; startedAt: string; endedAt: string; attempts: number }
const MAX_PENDING = 25;

export function useLocalTranscription(options: {
  meetingId: string;
  livekitIdentity: string;
  localParticipant: LocalParticipant;
  onActiveChange?: (active: boolean) => void;
}) {
  const { meetingId, livekitIdentity, localParticipant, onActiveChange } = options;
  const capability = useSTTCapability();
  const [state, setState] = useState<TranscriptionState>("disabled");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const workerRef = useRef<STTWorkerClient | null>(null);
  const vadRef = useRef<WebAudioVAD | null>(null);
  const queueRef = useRef<PendingSegment[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(false);

  const persist = useCallback(async (segment: PendingSegment) => {
    const response = await fetch("/api/transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId,
        livekitIdentity,
        text: segment.text,
        startedAt: segment.startedAt,
        endedAt: segment.endedAt,
      }),
    });
    if (!response.ok) throw new Error("Transcript sync failed.");
  }, [livekitIdentity, meetingId]);

  const drainQueue = useCallback(async function drain() {
    if (!enabledRef.current || queueRef.current.length === 0) return;
    const segment = queueRef.current[0];
    try {
      await persist(segment);
      queueRef.current.shift();
      if (queueRef.current.length) void drain();
    } catch {
      segment.attempts += 1;
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(segment.attempts, 5));
      retryRef.current = setTimeout(() => void drain(), delay);
    }
  }, [persist]);

  const processSpeech = useCallback(async (chunk: SpeechChunk) => {
    const worker = workerRef.current;
    if (!worker || !enabledRef.current) return;
    setState("processing");
    try {
      const text = (await worker.transcribe(chunk.audio)).trim();
      if (text) {
        queueRef.current.push({ text, startedAt: chunk.startedAt, endedAt: chunk.endedAt, attempts: 0 });
        if (queueRef.current.length > MAX_PENDING) queueRef.current.shift();
        void drainQueue();
      }
      setState("listening");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Local transcription failed.");
      setState("error");
    }
  }, [drainQueue]);

  const attachMicrophone = useCallback(async () => {
    const publication = localParticipant.getTrackPublication(Track.Source.Microphone);
    const mediaTrack = publication?.track?.mediaStreamTrack;
    if (!mediaTrack || publication?.isMuted) throw new Error("Turn on your microphone before starting transcription.");
    const vad = new WebAudioVAD();
    vad.onSpeechStart(() => setState("listening"));
    vad.onSpeechEnd((chunk) => void processSpeech(chunk));
    await vad.start(mediaTrack);
    vadRef.current = vad;
  }, [localParticipant, processSpeech]);

  const disable = useCallback(() => {
    enabledRef.current = false;
    if (retryRef.current) clearTimeout(retryRef.current);
    vadRef.current?.stop(true);
    workerRef.current?.dispose();
    vadRef.current = null;
    workerRef.current = null;
    setState("disabled");
    setStatus(undefined);
    setProgress(0);
    onActiveChange?.(false);
  }, [onActiveChange]);

  const enable = useCallback(async () => {
    const model = modelForCapability(capability);
    if (!model) {
      setError("This browser cannot run local speech recognition.");
      setState("error");
      return;
    }
    disable();
    enabledRef.current = true;
    onActiveChange?.(true);
    setError(undefined);
    setState("initializing");
    setStatus("Preparing transcription…");
    try {
      setState("loading-model");
      const initializeWorker = async (
        selectedModel: string,
        device: "webgpu" | "wasm",
      ) => {
        const worker = new STTWorkerClient();
        workerRef.current = worker;
        await worker.initialize(selectedModel, device, (nextProgress, nextStatus) => {
          setProgress(nextProgress);
          setStatus(nextStatus || "Downloading speech model…");
        });
      };

      try {
        await initializeWorker(
          model,
          capability === "webgpu" ? "webgpu" : "wasm",
        );
      } catch (webgpuError) {
        if (capability !== "webgpu") throw webgpuError;
        workerRef.current?.dispose();
        workerRef.current = null;
        setProgress(0);
        setStatus("WebGPU unavailable. Loading lightweight fallback…");
        const fallbackModel = modelForCapability("wasm");
        if (!fallbackModel) throw webgpuError;
        await initializeWorker(fallbackModel, "wasm");
      }
      setState("ready");
      setStatus("Transcription ready");
      await attachMicrophone();
      setState("listening");
    } catch (cause) {
      workerRef.current?.dispose();
      workerRef.current = null;
      enabledRef.current = false;
      onActiveChange?.(false);
      setError(cause instanceof Error ? cause.message : "Transcription unavailable.");
      setState("error");
    }
  }, [attachMicrophone, capability, disable, onActiveChange]);

  useEffect(() => {
    const participant = localParticipant;
    const onMuted = () => { vadRef.current?.stop(false); vadRef.current = null; };
    const onUnmuted = () => { if (enabledRef.current) void attachMicrophone(); };
    participant.on("trackMuted", onMuted).on("trackUnmuted", onUnmuted);
    return () => { participant.off("trackMuted", onMuted).off("trackUnmuted", onUnmuted); disable(); };
  }, [attachMicrophone, disable, localParticipant]);

  return { state, enable, disable, error, progress, status, capability };
}

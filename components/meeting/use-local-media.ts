"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  MediaDeviceFailure,
  Room,
  Track,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";

export type MediaIssue =
  | "permission-denied"
  | "not-found"
  | "in-use"
  | "error";

function classifyMediaError(error: unknown): MediaIssue {
  const failure = MediaDeviceFailure.getFailure(error);
  if (!failure) return "error";
  switch (failure) {
    case MediaDeviceFailure.PermissionDenied:
      return "permission-denied";
    case MediaDeviceFailure.NotFound:
      return "not-found";
    case MediaDeviceFailure.DeviceInUse:
      return "in-use";
    default:
      return "error";
  }
}

const AUDIO_OPTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
} as const;

export interface UseLocalMedia {
  cameraEnabled: boolean;
  micEnabled: boolean;
  cameraTrack: LocalVideoTrack | null;
  audioTrack: LocalAudioTrack | null;
  cameraDeviceId: string | undefined;
  microphoneDeviceId: string | undefined;
  cameraDevices: MediaDeviceInfo[];
  micDevices: MediaDeviceInfo[];
  cameraIssue: MediaIssue | null;
  micIssue: MediaIssue | null;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  setCameraDevice: (deviceId: string) => Promise<void>;
  setMicDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  cleanUp: () => void;
}

const AUDIO_PUBLISH_OPTS = {
  source: Track.Source.Microphone,
} as const;

export function useLocalMedia(): UseLocalMedia {
  const audioTrackRef = useRef<LocalAudioTrack | null>(null);
  const videoTrackRef = useRef<LocalVideoTrack | null>(null);
  const audioDeviceRef = useRef<string | undefined>(undefined);
  const videoDeviceRef = useRef<string | undefined>(undefined);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [cameraTrack, setCameraTrack] = useState<LocalVideoTrack | null>(null);
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDeviceId, setCameraDeviceId] = useState<string>();
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState<string>();
  const [cameraIssue, setCameraIssue] = useState<MediaIssue | null>(null);
  const [micIssue, setMicIssue] = useState<MediaIssue | null>(null);

  const refreshDevices = useCallback(async () => {
    try {
      const [videoDevices, audioDevices] = await Promise.all([
        Room.getLocalDevices("videoinput", false),
        Room.getLocalDevices("audioinput", false),
      ]);
      setCameraDevices(videoDevices);
      setMicDevices(audioDevices);
    } catch {
      // Device enumeration can fail without permission or on unsupported engines.
      setCameraDevices([]);
      setMicDevices([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) void refreshDevices();
    });

    const onPermissionChange = async () => {
      if (!cancelled && document.visibilityState === "visible") {
        await refreshDevices();
      }
    };

    const watch = async (kind: PermissionName) => {
      if (!("permissions" in navigator)) return;
      try {
        const status = await navigator.permissions.query({ name: kind });
        status.addEventListener("change", onPermissionChange);
      } catch {
        // query() can reject for unknown permission names on some engines.
      }
    };

    void watch("camera");
    void watch("microphone");
    return () => {
      cancelled = true;
    };
  }, [refreshDevices]);

  const toggleCamera = useCallback(async () => {
    setCameraIssue(null);
    if (cameraTrack) {
      videoTrackRef.current = null;
      cameraTrack.stop();
      setCameraTrack(null);
      setCameraEnabled(false);
      return;
    }
    try {
      const track = await createLocalVideoTrack({
        deviceId: videoDeviceRef.current,
        resolution: { width: 1280, height: 720 },
      });
      videoTrackRef.current = track;
      setCameraTrack(track);
      setCameraEnabled(true);
      setCameraDeviceId(track.mediaStreamTrack.getSettings().deviceId);
      await refreshDevices();
    } catch (error) {
      setCameraIssue(classifyMediaError(error));
    }
  }, [cameraTrack, refreshDevices]);

  const toggleMic = useCallback(async () => {
    setMicIssue(null);
    if (audioTrack) {
      audioTrackRef.current = null;
      audioTrack.stop();
      setAudioTrack(null);
      setMicEnabled(false);
      return;
    }
    try {
      const track = await createLocalAudioTrack({
        ...AUDIO_OPTS,
        deviceId: audioDeviceRef.current,
      });
      audioTrackRef.current = track;
      setAudioTrack(track);
      setMicEnabled(true);
      setMicrophoneDeviceId(track.mediaStreamTrack.getSettings().deviceId);
      await refreshDevices();
    } catch (error) {
      setMicIssue(classifyMediaError(error));
    }
  }, [audioTrack, refreshDevices]);

  const setCameraDevice = useCallback(
    async (deviceId: string) => {
      videoDeviceRef.current = deviceId;
      if (!cameraTrack) return;
      try {
        const track = await createLocalVideoTrack({
          deviceId,
          resolution: { width: 1280, height: 720 },
        });
        videoTrackRef.current = track;
        cameraTrack.stop();
        setCameraTrack(track);
        setCameraDeviceId(track.mediaStreamTrack.getSettings().deviceId);
      } catch (error) {
        setCameraIssue(classifyMediaError(error));
      }
    },
    [cameraTrack],
  );

  const setMicDevice = useCallback(
    async (deviceId: string) => {
      audioDeviceRef.current = deviceId;
      if (!audioTrack) return;
      try {
        const track = await createLocalAudioTrack({
          ...AUDIO_OPTS,
          deviceId,
        });
        audioTrackRef.current = track;
        audioTrack.stop();
        setAudioTrack(track);
        setMicrophoneDeviceId(track.mediaStreamTrack.getSettings().deviceId);
      } catch (error) {
        setMicIssue(classifyMediaError(error));
      }
    },
    [audioTrack],
  );

  const cleanUp = useCallback(() => {
    audioTrackRef.current?.stop();
    videoTrackRef.current?.stop();
    audioTrackRef.current = null;
    videoTrackRef.current = null;
    setAudioTrack(null);
    setCameraTrack(null);
    setCameraEnabled(false);
    setMicEnabled(false);
    setCameraIssue(null);
    setMicIssue(null);
  }, []);

  return {
    cameraEnabled,
    micEnabled,
    cameraTrack,
    audioTrack,
    cameraDeviceId,
    microphoneDeviceId,
    cameraDevices,
    micDevices,
    cameraIssue,
    micIssue,
    toggleCamera,
    toggleMic,
    setCameraDevice,
    setMicDevice,
    refreshDevices,
    cleanUp,
  };
}

export function publishPrejoinTracks(
  room: Room,
  cameraTrack: LocalVideoTrack | null,
  audioTrack: LocalAudioTrack | null,
) {
  const lp = room.localParticipant;
  const publish = async () => {
    if (audioTrack) {
      await lp.publishTrack(audioTrack, AUDIO_PUBLISH_OPTS);
    }
    if (cameraTrack) {
      await lp.publishTrack(cameraTrack, {
        source: Track.Source.Camera,
      });
    }
  };
  return publish().catch((error) => {
    console.error("publishPrejoinTracks failed", error);
  });
}
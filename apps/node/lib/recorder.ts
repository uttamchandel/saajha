"use client";

// MediaRecorder wrapper for the voice auto-detect flow.
// Records mono audio/webm;codecs=opus (verified working with Gemini inline audio —
// see research/languages-voice.json). Permission denial degrades gracefully.

export type RecordingResult = {
  base64: string; // no data: prefix
  mimeType: string; // e.g. "audio/webm;codecs=opus"
  durationMs: number;
};

let recorder: MediaRecorder | null = null;
let stream: MediaStream | null = null;
let chunks: Blob[] = [];
let startedAt = 0;

function cleanup() {
  stream?.getTracks().forEach((tr) => tr.stop());
  stream = null;
  recorder = null;
}

/** Ask for the mic and start recording. Returns false if permission is denied / unsupported. */
export async function startRecording(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    return false;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    // permission denied or no mic
    cleanup();
    return false;
  }
  try {
    const preferred = "audio/webm;codecs=opus";
    recorder = MediaRecorder.isTypeSupported?.(preferred)
      ? new MediaRecorder(stream, { mimeType: preferred })
      : new MediaRecorder(stream);
    chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start();
    startedAt = Date.now();
    return true;
  } catch {
    cleanup();
    return false;
  }
}

/** Stop and return the clip as base64 (no data: prefix). Null if nothing was recorded. */
export function stopRecording(): Promise<RecordingResult | null> {
  return new Promise((resolve) => {
    const rec = recorder;
    if (!rec || rec.state === "inactive") {
      cleanup();
      resolve(null);
      return;
    }
    rec.onstop = () => {
      const mimeType = rec.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: mimeType });
      const durationMs = Date.now() - startedAt;
      chunks = [];
      cleanup();
      if (blob.size === 0) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve(base64 ? { base64, mimeType, durationMs } : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    };
    try {
      rec.stop();
    } catch {
      cleanup();
      resolve(null);
    }
  });
}

export function isRecording(): boolean {
  return recorder?.state === "recording";
}

"use client";

// Browser TTS wrapper. In production this maps to Bhashini / Google Cloud TTS
// delivered over the IVR line — the browser voice here simulates that channel.

// Holds the live utterance so it isn't garbage-collected mid-speech (some browsers
// then never fire onend).
let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string, bcp47: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = bcp47;
  u.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const exact = voices.find((v) => v.lang === bcp47);
  const prefix = voices.find((v) => v.lang.startsWith(bcp47.split("-")[0]));
  if (exact) u.voice = exact;
  else if (prefix) u.voice = prefix;
  const done = () => {
    if (current === u) current = null;
    onEnd?.();
  };
  u.onend = done;
  u.onerror = done;
  current = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  current = null;
}

export function isSpeaking(): boolean {
  return typeof window !== "undefined" && !!window.speechSynthesis?.speaking;
}

// The slice of the Web Speech API recognizer this app uses (not in TypeScript's DOM lib).
type Recognizer = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// Browser speech recognition (Chrome supports hi-IN etc.). Graceful null if unsupported.
export function createRecognizer(bcp47: string, onResult: (text: string) => void, onEnd: () => void) {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, (new () => Recognizer) | undefined>;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = bcp47;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript;
    if (text) onResult(text);
  };
  rec.onend = onEnd;
  rec.onerror = onEnd;
  return rec as Pick<Recognizer, "start" | "stop">;
}

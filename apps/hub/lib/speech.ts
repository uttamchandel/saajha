"use client";

// Adapted from the state node's code (apps/node/lib/speech.ts); see NOTICE.
// Browser TTS wrapper (speechSynthesis). Speech recognition from the original is dropped.

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

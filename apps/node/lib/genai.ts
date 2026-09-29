import type { GoogleGenAI } from "@google/genai";

// Resilient Gemini call. Retryable failures come in two shapes:
//  - 429 / RESOURCE_EXHAUSTED / quota  → this key's bucket for the model is spent
//  - 503 / UNAVAILABLE / "high demand" → transient Google-side load spike
// Strategy: primary → (brief pause, primary again — 503s are spiky) → fallback model.
type GenParams = Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">;

const RETRYABLE = /429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|high demand|overloaded/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Defaults match apps/hub: the 2.5 models return 404 "no longer available to new users" for new keys (tested 29 Sep 2026).
export async function generateContentResilient(ai: GoogleGenAI, params: GenParams) {
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const fallback = process.env.GEMINI_MODEL_FALLBACK || "gemini-3.1-flash-lite";
  try {
    return await ai.models.generateContent({ model: primary, ...params });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!RETRYABLE.test(msg)) throw err;
    console.error(`gemini ${primary} retryable failure — pausing and retrying primary`);
    await sleep(1500);
    try {
      return await ai.models.generateContent({ model: primary, ...params });
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      if (!RETRYABLE.test(msg2) || fallback === primary) throw err2;
      console.error(`gemini ${primary} still failing — retrying on ${fallback}`);
      return await ai.models.generateContent({ model: fallback, ...params });
    }
  }
}

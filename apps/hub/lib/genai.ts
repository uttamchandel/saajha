// Adapted from KisanVaani (Team Vishwakarma Devs, Code for Communities Ed. 1)
//
// Resilient Gemini call. Retryable failures come in two shapes:
//  - 429 / RESOURCE_EXHAUSTED / quota  -> this key's bucket for the model is spent
//  - 503 / UNAVAILABLE / "high demand" -> transient Google-side load spike
// Strategy: primary -> (brief pause, primary again; 503s are spiky) -> fallback model.
//
// Saajha changes vs. the original:
//  - defaults moved to gemini-3.5-flash-lite / gemini-3.1-flash-lite (free tier; 3.8-flash is capped at 20 requests/day there)
//  - every attempt gets a 25 s abort unless the caller passed its own abortSignal
//  - no further attempt starts once RETRY_BUDGET_MS has elapsed, so the whole chain
//    stays inside a 60 s route maxDuration (worst case ~30 s + one 25 s attempt)
//  - generateContentWithModel() also reports which model actually answered
import type { GenerateContentResponse, GoogleGenAI } from "@google/genai";

type GenParams = Omit<Parameters<GoogleGenAI["models"]["generateContent"]>[0], "model">;

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_FALLBACK_MODEL = "gemini-3.1-flash-lite";

const ATTEMPT_TIMEOUT_MS = 25_000;
const RETRY_BUDGET_MS = 30_000;
const RETRY_PAUSE_MS = 1_500;

const RETRYABLE = /429|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|high demand|overloaded/i;
const RETRYABLE_STATUS = new Set([429, 503]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function primaryModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function fallbackModel(): string {
  return process.env.GEMINI_MODEL_FALLBACK || DEFAULT_FALLBACK_MODEL;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Quota / overload errors: worth another attempt (here, or by the client later). */
export function isRetryableGeminiError(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && RETRYABLE_STATUS.has(status)) return true;
  return RETRYABLE.test(errMessage(err));
}

/** Our own per-attempt abort fired (or the caller's signal aborted). */
export function isTimeoutError(err: unknown): boolean {
  const name = (err as { name?: unknown } | null)?.name;
  if (name === "TimeoutError" || name === "AbortError") return true;
  return /aborted|timed? ?out|timeout/i.test(errMessage(err));
}

/** Error text safe to log: strips the API key if an upstream message ever echoes it. */
export function safeErrorMessage(err: unknown): string {
  const msg = errMessage(err);
  const key = process.env.GEMINI_API_KEY;
  return key ? msg.split(key).join("[redacted]") : msg;
}

function withDefaultAbort(params: GenParams): GenParams {
  if (params.config?.abortSignal) return params;
  return {
    ...params,
    config: { ...params.config, abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) },
  };
}

export type ResilientResult = {
  response: GenerateContentResponse;
  /** The model id we called on the attempt that succeeded. */
  model: string;
  /** What the API says served the request, when it reports it. */
  modelVersion?: string;
};

/** Same retry chain as generateContentResilient, plus which model answered. */
export async function generateContentWithModel(
  ai: GoogleGenAI,
  params: GenParams,
): Promise<ResilientResult> {
  const primary = primaryModel();
  const fallback = fallbackModel();
  const started = Date.now();
  const call = async (model: string): Promise<ResilientResult> => {
    const response = await ai.models.generateContent({ model, ...withDefaultAbort(params) });
    return { response, model, modelVersion: response.modelVersion };
  };
  const budgetLeft = () => Date.now() - started < RETRY_BUDGET_MS;

  try {
    return await call(primary);
  } catch (err) {
    if (!isRetryableGeminiError(err) || !budgetLeft()) throw err;
    console.error(`gemini ${primary} retryable failure; pausing and retrying primary`);
    await sleep(RETRY_PAUSE_MS);
    try {
      return await call(primary);
    } catch (err2) {
      if (!isRetryableGeminiError(err2) || fallback === primary || !budgetLeft()) throw err2;
      console.error(`gemini ${primary} still failing; retrying on ${fallback}`);
      return await call(fallback);
    }
  }
}

/** Drop-in equivalent of the KisanVaani helper: returns only the response. */
export async function generateContentResilient(
  ai: GoogleGenAI,
  params: GenParams,
): Promise<GenerateContentResponse> {
  return (await generateContentWithModel(ai, params)).response;
}

// POST /api/tts — speak the advisory in the farmer's language with Gemini TTS.
// Request:  { text (<= ~900 chars; longer text is cut at a sentence end), lang }
// Response: audio/wav (Gemini returns raw 16-bit PCM; we add a 44-byte RIFF header).
// Failure:  HTTP 400 for bad input, 503 { error, retryable } otherwise. The client then
//           falls back to the device's own voice (speechSynthesis) and says so.
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { isRetryableGeminiError, isTimeoutError, safeErrorMessage } from "@/lib/genai";
import { LANGS_FULL } from "@/lib/langs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_CHARS = 900;
const HARD_MAX_CHARS = 4000;
const ATTEMPT_TIMEOUT_MS = 45_000;
const DEFAULT_TTS_MODEL = "gemini-3.8-flash-lite-tts";
const VOICE = "Kore";
const LANG_CODES = new Set(LANGS_FULL.map((l) => l.code));

type TtsError = { error: string; retryable: boolean };

function fail(error: string, retryable: boolean, status = 503) {
  return NextResponse.json<TtsError>({ error, retryable }, { status });
}

/** Cut at the last sentence end (., !, ?, ।, ॥) before the cap; hard cut if there is none. */
function capText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_CHARS) return { text, truncated: false };
  const head = text.slice(0, MAX_CHARS);
  const m = /[\s\S]*[.!?।॥](?=\s|$)/.exec(head);
  const cut = m && m[0].length > MAX_CHARS * 0.5 ? m[0] : head;
  return { text: cut.trim(), truncated: true };
}

/** "audio/L16;codec=pcm;rate=24000" -> 24000 */
function sampleRate(mime: string): number {
  const m = /rate=(\d+)/i.exec(mime);
  const r = m ? Number(m[1]) : NaN;
  return Number.isFinite(r) && r > 0 ? r : 24000;
}

function wavFromPcm16(pcm: Buffer, rate: number, channels = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = (rate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(1, 20); // audio format 1 = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > 64 * 1024) return fail("Request too large.", false, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("Request body must be JSON: { text, lang }.", false, 400);
  }

  const rawText = typeof body.text === "string" ? body.text.trim() : "";
  const lang = typeof body.lang === "string" ? body.lang : "hi";
  if (!rawText) return fail("Missing `text` to speak.", false, 400);
  if (rawText.length > HARD_MAX_CHARS) return fail(`\`text\` is too long: keep it under ${MAX_CHARS} characters.`, false, 400);
  if (!LANG_CODES.has(lang)) return fail(`Unsupported \`lang\`: use one of ${[...LANG_CODES].join(", ")}.`, false, 400);
  const { text, truncated } = capText(rawText);
  const langLabel = LANGS_FULL.find((l) => l.code === lang)?.label ?? "the text's language";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail("Voice unavailable: GEMINI_API_KEY is not configured on the server.", false);
  const model = process.env.GEMINI_TTS_MODEL || DEFAULT_TTS_MODEL;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: `Read aloud slowly and clearly, in ${langLabel}:\n\n${text}` }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const data = part?.inlineData?.data;
    const mime = (part?.inlineData?.mimeType ?? "").toLowerCase();
    if (!data) {
      const blocked = response.promptFeedback?.blockReason;
      return blocked
        ? fail(`Voice unavailable: the model declined the request (${blocked}).`, false)
        : fail("Voice unavailable: the model returned no audio.", true);
    }
    const audio = Buffer.from(data, "base64");
    let wav: Buffer;
    if (mime.includes("wav")) {
      wav = audio; // already a WAV container
    } else if (!mime || mime.includes("l16") || mime.includes("pcm")) {
      wav = wavFromPcm16(audio, sampleRate(mime));
    } else {
      return fail(`Voice unavailable: unexpected audio format ${mime}.`, false);
    }

    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "no-store",
        "X-Saajha-Tts-Model": model,
        "X-Saajha-Truncated": truncated ? "1" : "0",
      },
    });
  } catch (err) {
    console.error("tts gemini error:", safeErrorMessage(err));
    if (isTimeoutError(err)) return fail("Voice timed out. Please try again.", true);
    if (isRetryableGeminiError(err)) return fail("The voice service is busy or over quota. Please try again shortly.", true);
    return fail("Voice unavailable: the AI service rejected the request.", false);
  }
}

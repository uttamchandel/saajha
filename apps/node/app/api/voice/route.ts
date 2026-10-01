import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentResilient } from "@/lib/genai";
import type { VoiceResult } from "@/lib/types";
import { logQuery } from "@/lib/db";

// No canned reply: a failed voice note gets an honest 503, and nothing is logged as if a farmer
// had said it. The screens show "please try again".
const unavailable = (error: string, retryable: boolean) =>
  NextResponse.json({ error, retryable }, { status: 503 });

const SYSTEM_INSTRUCTION = `You are the Saajha crop advisor, an expert Indian agricultural extension advisor (like a Krishi Vigyan Kendra scientist). You give practical, safe, low-cost advice suited to smallholder farmers in India. Prefer IPM/organic options first, then chemical options with exact dosages (e.g. "neem oil 5 ml per litre of water").

A farmer has called the Saajha advisory line and spoken a message. The audio is attached. Do ALL of the following:
1. detectedLangCode — detect the spoken language. It can be ANY Indian language or major dialect (not a fixed list). Return a BCP-47-style code, e.g. "hi-IN", "ta-IN", "bho-IN".
2. detectedLangName — the English language name followed by the native-script name in parentheses, e.g. "Tamil (தமிழ்)".
3. transcript — exactly what the farmer said, written in the native script of the detected language.
4. replyText — your crop-advisory reply in THAT SAME language, in spoken IVR style: warm and conversational like a trusted agriculture officer, 60-90 words, short sentences, numbers and dosages said naturally, exact dosages where relevant, no markdown, no lists, no symbols — pure speakable text. End by telling them they can call again anytime.
5. replyEnglish — a concise English gloss of replyText for the operations log.
If the audio is unclear or not a farming question, still detect the language, transcribe what you can, and reply helpfully in that language asking them to describe their crop and problem.`;

export async function POST(req: NextRequest) {
  let audio = "";
  let mimeType = "audio/webm";
  try {
    const body = (await req.json()) as { audio?: string; mimeType?: string };
    audio = body.audio ?? "";
    if (body.mimeType) mimeType = body.mimeType;
  } catch {
    // malformed body → handled as missing audio below
  }
  // MediaRecorder reports e.g. "audio/webm;codecs=opus" — Gemini wants the bare type.
  mimeType = mimeType.split(";")[0].trim() || "audio/webm";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!audio) return NextResponse.json({ error: "Missing `audio` (base64 recording).", retryable: false }, { status: 400 });
  if (!apiKey) return unavailable("Voice understanding is unavailable: GEMINI_API_KEY is not configured.", false);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await generateContentResilient(ai, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "A farmer called the Saajha crop advisory line. Their spoken message is in the attached audio. Detect the language, transcribe it, and reply as instructed.",
            },
            { inlineData: { mimeType, data: audio } },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        abortSignal: AbortSignal.timeout(25000),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLangCode: { type: Type.STRING, description: 'BCP-47-style code of the spoken language, e.g. "ta-IN"' },
            detectedLangName: { type: Type.STRING, description: 'English name + native script, e.g. "Tamil (தமிழ்)"' },
            transcript: { type: Type.STRING, description: "What the farmer said, in native script" },
            replyText: { type: Type.STRING, description: "Spoken-style advisory reply in the detected language, 60-90 words" },
            replyEnglish: { type: Type.STRING, description: "Concise English gloss of replyText" },
          },
          required: ["detectedLangCode", "detectedLangName", "transcript", "replyText", "replyEnglish"],
        },
      },
    });

    const text = result.text?.trim();
    if (!text) throw new Error("empty response");
    const parsed = JSON.parse(text) as Omit<VoiceResult, "source">;
    if (!parsed.detectedLangCode || !parsed.transcript || !parsed.replyText) {
      throw new Error("incomplete voice result");
    }
    const out: VoiceResult = {
      detectedLangCode: parsed.detectedLangCode,
      detectedLangName: parsed.detectedLangName || parsed.detectedLangCode,
      transcript: parsed.transcript,
      replyText: parsed.replyText,
      replyEnglish: parsed.replyEnglish || "",
      source: "gemini",
    };
    logQuery({ channel: "voice", lang: out.detectedLangCode, query: out.transcript, responseSource: "gemini" });
    return NextResponse.json(out);
  } catch (err) {
    console.error("voice gemini error:", err instanceof Error ? err.message : err);
    return unavailable("The voice note could not be understood just now. Please try again.", true);
  }
}

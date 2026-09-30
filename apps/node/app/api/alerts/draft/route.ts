// POST /api/alerts/draft — Gemini rewrites an officer's alert draft in the district's language.
// Body: { message, from, to } (language names). The officer reads the draft before anything is sent.
// Guards: known languages only, a length cap, the reply must be in the target script, and it may not
// add advice the source did not give. On any failure the composer keeps the source text and says so.
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { generateContentResilient } from "@/lib/genai";

export const dynamic = "force-dynamic";

// Unicode block of each language's script. Hindi and Marathi share Devanagari.
const SCRIPT: Record<string, RegExp | null> = {
  Hindi: /[\u0900-\u097F]/,
  Marathi: /[\u0900-\u097F]/,
  Telugu: /[\u0C00-\u0C7F]/,
  Tamil: /[\u0B80-\u0BFF]/,
  Kannada: /[\u0C80-\u0CFF]/,
  Malayalam: /[\u0D00-\u0D7F]/,
  Bengali: /[\u0980-\u09FF]/,
  Assamese: /[\u0980-\u09FF]/,
  Gujarati: /[\u0A80-\u0AFF]/,
  Punjabi: /[\u0A00-\u0A7F]/,
  Odia: /[\u0B00-\u0B7F]/,
  English: null,
};

const HELPLINE = "1800-180-1551"; // Kisan Call Centre
const MAX_CHARS = 700;

const fail = (error: string, status: number, retryable: boolean) => NextResponse.json({ error, retryable }, { status });

export async function POST(req: NextRequest) {
  let body: { message?: unknown; from?: unknown; to?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail("invalid JSON body", 400, false);
  }
  const { message, from, to } = body;
  if (typeof message !== "string" || !message.trim() || message.length > MAX_CHARS) return fail(`\`message\` must be 1-${MAX_CHARS} characters.`, 400, false);
  if (typeof from !== "string" || !Object.hasOwn(SCRIPT, from) || typeof to !== "string" || !Object.hasOwn(SCRIPT, to)) return fail("`from` and `to` must be supported language names.", 400, false);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail("Gemini is not configured on this node.", 503, false);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await generateContentResilient(ai, {
      contents: `Officer's draft (${from}):\n${message.trim()}`,
      config: {
        systemInstruction: `You write alerts that a district agriculture office sends to farmers by voice call and SMS. Rewrite the officer's draft in ${to}, in its native script, in plain words a farmer uses. Keep every number, date, place name and the helpline ${HELPLINE} exactly as written, in the same digits. Say only what the draft says: do not add any advice, pesticide, chemical or dose that is not in it. About the same length as the draft. Reply with the message text only: no title, no quotes, no markdown.`,
        temperature: 0.2,
      },
    });
    let text = result.text?.trim() ?? "";
    if (!text) throw new Error("empty response");
    const script = SCRIPT[to];
    if (script && !script.test(text)) return fail(`Gemini's reply was not in ${to}.`, 502, true);
    if (message.includes(HELPLINE) && !text.includes(HELPLINE)) text = `${text}\n${HELPLINE}`;
    return NextResponse.json({ text, from, to, source: "gemini" });
  } catch (err) {
    console.error("alert draft gemini error:", err instanceof Error ? err.message : err);
    return fail("Gemini could not write the message just now.", 503, true);
  }
}

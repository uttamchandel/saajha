// POST /api/advisory — the farmer's advisory, written by Gemini in the farmer's language
// from ONE verified reference card (lib/knowledge.json) and nothing else.
// Request:  { class_key, decided_by: "agreement"|"federated"|"gemini", fed_conf, gem_conf, state_id?, lang }
// Response: AdvisoryResponse (below). Chemical lines keep the card's product and dose; any line
//           whose numbers drift from the card is replaced by the card's own English line.
// Failure:  HTTP 400 for bad input, 503 { error, retryable } when Gemini fails — never a canned advisory.
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import {
  generateContentWithModel,
  isRetryableGeminiError,
  isTimeoutError,
  safeErrorMessage,
} from "@/lib/genai";
import { CLASS_KEYS, isClassKey, type ClassKey } from "@/lib/classes";
import { LANGS_FULL, LANG_NAME_FOR_PROMPT } from "@/lib/langs";
import knowledge from "@/lib/knowledge.json";

export const runtime = "nodejs";
export const maxDuration = 60;

export type CardSource = { publisher: string; title: string; url: string };
export type Card = {
  class_key: ClassKey;
  name_en: string;
  cause: string;
  symptoms: string[];
  ipm: string[];
  chemical: { text: string; source: number }[];
  prevention: string[];
  sources: CardSource[];
  notes?: string;
};

export type DecidedBy = "agreement" | "federated" | "gemini";

export type AdvisoryChemical = {
  /** In the requested language (or the card's English line if the translation changed a number). */
  text: string;
  /** The card's line, verbatim. */
  text_en: string;
  source: CardSource | null;
  /** true when `text` is the card's English line because the translation could not be trusted. */
  verbatim: boolean;
};

export type AdvisoryResponse = {
  class_key: ClassKey;
  lang: string;
  decided_by: DecidedBy;
  title_local: string;
  spoken_summary: string;
  ipm: string[];
  chemical: AdvisoryChemical[];
  /** The card lists no chemical option for this problem. */
  no_chemical: boolean;
  prevention: string[];
  sources: CardSource[];
  model: string;
  generated_at: string;
};
export type AdvisoryError = { error: string; retryable: boolean };

const CARDS = knowledge as unknown as Record<ClassKey, Card>;
const LANG_CODES = new Set(LANGS_FULL.map((l) => l.code));
const DECIDED_BY = new Set<DecidedBy>(["agreement", "federated", "gemini"]);
const STATE_IDS = new Set(["A", "B", "C", "D"]);

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title_local: { type: Type.STRING, description: "Short name of the problem in the requested language" },
    spoken_summary: {
      type: Type.STRING,
      description: "60-90 words in the requested language, plain speech to be read aloud to a farmer",
    },
    ipm: { type: Type.ARRAY, items: { type: Type.STRING }, description: "The card's IPM lines, translated, same order" },
    chemical: {
      type: Type.ARRAY,
      description: "One entry per chemical line in the card; empty if the card has none",
      items: {
        type: Type.OBJECT,
        properties: {
          card_line: { type: Type.INTEGER, description: "Index of the card's chemical line" },
          text: { type: Type.STRING, description: "That line translated; product, strength, dose and unit unchanged" },
        },
        required: ["card_line", "text"],
        propertyOrdering: ["card_line", "text"],
      },
    },
    prevention: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The card's prevention lines, translated, same order",
    },
  },
  required: ["title_local", "spoken_summary", "ipm", "chemical", "prevention"],
  propertyOrdering: ["title_local", "spoken_summary", "ipm", "chemical", "prevention"],
};

const SYSTEM_INSTRUCTION =
  "You write short, practical crop advisories for paddy farmers in India. " +
  "You translate and simplify one verified reference card. You never add facts, products, doses, timings or claims that are not in the card.";

function fail(error: string, retryable: boolean, status = 503) {
  return NextResponse.json<AdvisoryError>({ error, retryable }, { status });
}

// Indic digit blocks -> ASCII, so a dose written in native numerals still compares.
const DIGIT_ZEROS = [0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];
function asciiDigits(s: string): string {
  return s.replace(/[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (ch) => {
    const cp = ch.codePointAt(0)!;
    const zero = DIGIT_ZEROS.find((z) => cp >= z && cp <= z + 9)!;
    return String(cp - zero);
  });
}
function numbersIn(s: string): string[] {
  return (asciiDigits(s).match(/\d+(?:\.\d+)?/g) ?? []).sort();
}
/** Same multiset of numbers: the translation kept every dose, strength and count. */
function sameNumbers(a: string, b: string): boolean {
  const x = numbersIn(a), y = numbersIn(b);
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

function strList(v: unknown, max: number): string[] {
  return Array.isArray(v)
    ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()).slice(0, max)
    : [];
}

// Advisories depend only on the card, the language and who decided; cache them to spare quota.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: AdvisoryResponse }>();

function promptFor(card: Card, langName: string, decidedBy: DecidedBy): string {
  const cardForPrompt = {
    problem: card.name_en,
    cause: card.cause,
    symptoms: card.symptoms,
    ipm: card.ipm,
    chemical: card.chemical.map((c, i) => ({ card_line: i, text: c.text })),
    prevention: card.prevention,
  };
  const confirm =
    decidedBy === "agreement"
      ? "End the spoken summary by telling the farmer to confirm with the local agriculture officer or Krishi Vigyan Kendra before spraying anything."
      : "This diagnosis was made by one model only. End the spoken summary by telling the farmer to show the crop to the local agriculture officer or Krishi Vigyan Kendra to confirm it before spraying anything.";
  return [
    `Write the advisory in ${langName}.`,
    "Use ONLY the card below. Do not add products or doses not in the card. If the card has no chemical options, say so.",
    "Write the way an extension worker talks to a farmer in that language: use the everyday farming words farmers use " +
      "(for insect larvae, the common word for caterpillar or grub, e.g. Hindi 'सूंडी'), not literal dictionary translations. " +
      "Keep pest and disease names recognisable; if unsure, add the English name in brackets.",
    "",
    "Rules:",
    `- title_local: the problem's short name in ${langName}.`,
    "- spoken_summary: 60 to 90 words of plain speech to be read aloud: what the problem is and how to recognise it, then the two or three most important steps from the card. " +
      "No lists, symbols, URLs or abbreviations a listener cannot follow. Write numbers with the digits 0-9.",
    card.chemical.length > 0
      ? "- If the spoken summary mentions a chemical, it must say to use it only when the card's condition is met (for example, when the pest crosses its ETL), and give the dose exactly as in the card."
      : "- The card lists NO chemical option: return an empty chemical list and say in the spoken summary that no chemical spray is listed for this problem.",
    `- ${confirm}`,
    "- ipm: every IPM line of the card, translated, in the same order, one or two short sentences each.",
    "- chemical: one entry per chemical line of the card with its card_line index. Translate the sentence but keep every product name, strength, dose, unit and number exactly as written in the card, using the digits 0-9.",
    "- prevention: every prevention line of the card, translated, in the same order.",
    "",
    `CARD: ${JSON.stringify(cardForPrompt)}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > 16 * 1024) return fail("Request too large.", false, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return fail("Request body must be JSON: { class_key, decided_by, fed_conf, gem_conf, state_id, lang }.", false, 400);
  }

  const { class_key, decided_by, fed_conf, gem_conf, state_id } = body;
  const lang = typeof body.lang === "string" ? body.lang : "hi";
  if (!isClassKey(class_key)) {
    return fail(`\`class_key\` must be one of: ${CLASS_KEYS.join(", ")}.`, false, 400);
  }
  if (typeof decided_by !== "string" || !DECIDED_BY.has(decided_by as DecidedBy)) {
    return fail('`decided_by` must be "agreement", "federated" or "gemini".', false, 400);
  }
  if (fed_conf != null && (typeof fed_conf !== "number" || !(fed_conf >= 0 && fed_conf <= 1))) {
    return fail("`fed_conf` must be a probability between 0 and 1, or null.", false, 400);
  }
  if (gem_conf != null && (typeof gem_conf !== "number" || !(gem_conf >= 0 && gem_conf <= 100))) {
    return fail("`gem_conf` must be a confidence between 0 and 100, or null.", false, 400);
  }
  // Optional: the hub's own demo sends A–D; a state node asking for a card's advice sends none.
  if (state_id != null && (typeof state_id !== "string" || !STATE_IDS.has(state_id))) {
    return fail("`state_id`, when given, must be one of A, B, C, D.", false, 400);
  }
  if (!LANG_CODES.has(lang) || !LANG_NAME_FOR_PROMPT[lang]) {
    return fail(`Unsupported \`lang\`: use one of ${[...LANG_CODES].join(", ")}.`, false, 400);
  }

  const card = CARDS[class_key];
  if (!card) return fail(`No reference card for ${class_key}.`, false, 400);
  const decidedBy = decided_by as DecidedBy;

  const cacheKey = `${class_key}|${lang}|${decidedBy === "agreement" ? "agreement" : "single"}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json<AdvisoryResponse>({ ...hit.value, decided_by: decidedBy }, { headers: { "Cache-Control": "no-store" } });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail("Advisory unavailable: GEMINI_API_KEY is not configured on the server.", false);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { response, model } = await generateContentWithModel(ai, {
      contents: [{ role: "user", parts: [{ text: promptFor(card, LANG_NAME_FOR_PROMPT[lang], decidedBy) }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.3,
      },
    });

    const text = response.text;
    if (!text) {
      const blocked = response.promptFeedback?.blockReason;
      return blocked
        ? fail(`Advisory unavailable: the model declined the request (${blocked}).`, false)
        : fail("Advisory unavailable: the model returned an empty response.", true);
    }
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return fail("Advisory unavailable: the model returned malformed JSON.", true);
    }

    const title_local = typeof raw.title_local === "string" ? raw.title_local.trim().slice(0, 120) : "";
    const spoken_summary = typeof raw.spoken_summary === "string" ? raw.spoken_summary.trim().slice(0, 1500) : "";
    if (!title_local || !spoken_summary) {
      return fail("Advisory unavailable: the model's answer had an unexpected shape.", true);
    }

    // Chemical lines: one per card line, keyed by index. The card's line is the authority.
    const byLine = new Map<number, string>();
    if (Array.isArray(raw.chemical)) {
      for (const c of raw.chemical) {
        const o = (c ?? {}) as Record<string, unknown>;
        if (typeof o.card_line === "number" && typeof o.text === "string" && o.text.trim()) {
          byLine.set(o.card_line, o.text.trim());
        }
      }
    }
    const chemical: AdvisoryChemical[] = card.chemical.map((c, i) => {
      const local = byLine.get(i);
      const trusted = local !== undefined && sameNumbers(local, c.text);
      return {
        text: trusted ? local : c.text,
        text_en: c.text,
        source: card.sources[c.source] ?? null,
        verbatim: !trusted,
      };
    });

    const value: AdvisoryResponse = {
      class_key,
      lang,
      decided_by: decidedBy,
      title_local,
      spoken_summary,
      ipm: strList(raw.ipm, card.ipm.length),
      chemical,
      no_chemical: card.chemical.length === 0,
      prevention: strList(raw.prevention, card.prevention.length),
      sources: card.sources,
      model,
      generated_at: new Date().toISOString(),
    };
    if (cache.size > 200) cache.clear();
    cache.set(cacheKey, { at: Date.now(), value });
    return NextResponse.json<AdvisoryResponse>(value, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("advisory gemini error:", safeErrorMessage(err));
    if (isTimeoutError(err)) return fail("The advisory timed out. Please try again.", true);
    if (isRetryableGeminiError(err)) return fail("The advisory service is busy or over quota. Please try again shortly.", true);
    return fail("Advisory unavailable: the AI service rejected the request.", false);
  }
}

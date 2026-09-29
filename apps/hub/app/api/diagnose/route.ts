// POST /api/diagnose — Gemini first-pass diagnosis of a paddy photo onto Saajha's label set.
// Request:  { image: base64 (no data: prefix), mimeType: "image/jpeg" | ..., lang: "hi" | ... }
// Response: { is_plant, is_rice, class_key, confidence, alternatives, visible_symptoms, model }
// Failure:  HTTP 503 { error, retryable } — never a canned diagnosis.
// (Route shape modelled on KisanVaani's diagnose route, Team Vishwakarma Devs, Ed. 1.)
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import {
  generateContentWithModel,
  isRetryableGeminiError,
  isTimeoutError,
  safeErrorMessage,
} from "@/lib/genai";
import { CLASSES, DIAGNOSIS_KEYS, UNSURE_KEY, isDiagnosisKey, type DiagnosisKey } from "@/lib/classes";

export const runtime = "nodejs";
// Seconds. lib/genai caps the retry chain at ~55 s worst case.
export const maxDuration = 60;

// ~4 MB of base64 (~3 MB image). Vercel caps function request bodies at 4.5 MB.
const MAX_IMAGE_B64_CHARS = 4 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_IMAGE_B64_CHARS + 64 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export type DiagnoseAlternative = { class_key: DiagnosisKey; confidence: number };
export type DiagnoseResponse = {
  is_plant: boolean;
  is_rice: boolean;
  class_key: DiagnosisKey;
  confidence: number;
  alternatives: DiagnoseAlternative[];
  visible_symptoms: string[];
  model: string;
};
export type DiagnoseError = { error: string; retryable: boolean };

const LABEL_ENUM = [...DIAGNOSIS_KEYS];

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    is_plant: { type: Type.BOOLEAN, description: "Is the photo actually of a plant?" },
    is_rice: { type: Type.BOOLEAN, description: "Is the plant rice (paddy)?" },
    class_key: {
      type: Type.STRING,
      enum: LABEL_ENUM,
      description: "Single most likely label from the allowed set",
    },
    confidence: {
      type: Type.INTEGER,
      minimum: 0,
      maximum: 100,
      description: "Honest confidence in class_key, percent 0-100",
    },
    alternatives: {
      type: Type.ARRAY,
      maxItems: "3",
      description: "Up to 3 next most likely labels, most likely first",
      items: {
        type: Type.OBJECT,
        properties: {
          class_key: { type: Type.STRING, enum: LABEL_ENUM },
          confidence: { type: Type.INTEGER, minimum: 0, maximum: 100 },
        },
        required: ["class_key", "confidence"],
        propertyOrdering: ["class_key", "confidence"],
      },
    },
    visible_symptoms: {
      type: Type.ARRAY,
      description: "Short English phrases naming what is visible in the photo",
      items: { type: Type.STRING },
    },
  },
  required: ["is_plant", "is_rice", "class_key", "confidence", "alternatives", "visible_symptoms"],
  propertyOrdering: ["is_plant", "is_rice", "class_key", "confidence", "alternatives", "visible_symptoms"],
};

const SYSTEM_INSTRUCTION =
  "You are an expert plant pathologist at an Indian agricultural university, advising paddy (rice) farmers across India. " +
  "Classify the photo into exactly one label from the allowed set: pick the single most likely label. " +
  "Reflect uncertainty honestly in the confidence score; do not inflate it. " +
  "If the photo is not a plant, set is_plant=false, is_rice=false and class_key=\"other_or_unsure\". " +
  "If it is a plant but not rice, set is_rice=false and class_key=\"other_or_unsure\". " +
  "If it is rice but matches none of the labels, or you cannot tell, use class_key=\"other_or_unsure\". " +
  "visible_symptoms must be short English phrases describing only what is visible.";

const LABEL_LIST = [
  ...CLASSES.map((c) => `${c.key} (${c.label}${c.isPest ? ", insect pest damage" : ""})`),
  `${UNSURE_KEY} (not rice, not one of these, or cannot tell)`,
].join("; ");

function fail(error: string, retryable: boolean, status = 503) {
  return NextResponse.json<DiagnoseError>({ error, retryable }, { status });
}

const pct = (n: unknown) =>
  typeof n === "number" && Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : null;

/** Validate Gemini's JSON against our contract. Returns null if the shape is wrong. */
function normalize(raw: unknown): Omit<DiagnoseResponse, "model"> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.is_plant !== "boolean" || typeof r.is_rice !== "boolean") return null;
  if (!isDiagnosisKey(r.class_key)) return null;
  const confidence = pct(r.confidence);
  if (confidence === null) return null;

  const is_plant = r.is_plant;
  const is_rice = is_plant && r.is_rice;
  // Enforce the contract: off-target photos never carry a disease label.
  const class_key: DiagnosisKey = is_rice ? r.class_key : UNSURE_KEY;

  const alternatives: DiagnoseAlternative[] = Array.isArray(r.alternatives)
    ? r.alternatives
        .map((a) => {
          const alt = (a ?? {}) as Record<string, unknown>;
          const c = pct(alt.confidence);
          return isDiagnosisKey(alt.class_key) && c !== null && alt.class_key !== class_key
            ? { class_key: alt.class_key, confidence: c }
            : null;
        })
        .filter((a): a is DiagnoseAlternative => a !== null)
        .slice(0, 3)
    : [];

  const visible_symptoms = Array.isArray(r.visible_symptoms)
    ? r.visible_symptoms
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
        .slice(0, 8)
    : [];

  return { is_plant, is_rice, class_key, confidence, alternatives, visible_symptoms };
}

export async function POST(req: NextRequest) {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return fail("Image too large: keep the photo under ~3 MB.", false, 413);
  }

  let body: { image?: unknown; mimeType?: unknown; lang?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return fail("Request body must be JSON: { image, mimeType, lang }.", false, 400);
  }

  let image = typeof body.image === "string" ? body.image.trim() : "";
  let mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : "";
  // Tolerate a data: URL even though the contract says raw base64.
  const dataUrl = /^data:([^;,]*);base64,/.exec(image);
  if (dataUrl) {
    image = image.slice(dataUrl[0].length);
    mimeType ||= dataUrl[1].toLowerCase();
  }
  mimeType ||= "image/jpeg";
  // `lang` is part of the request contract; the diagnosis itself is language-neutral
  // (label keys + English symptoms). Localisation happens in the advisory step.

  if (!image) return fail("Missing `image` (base64-encoded photo).", false, 400);
  if (image.length > MAX_IMAGE_B64_CHARS) {
    return fail("Image too large: keep the photo under ~3 MB.", false, 413);
  }
  if (!BASE64_RE.test(image)) return fail("`image` is not valid base64.", false, 400);
  if (!ALLOWED_MIME.has(mimeType)) {
    return fail(`Unsupported mimeType ${mimeType}: use JPEG, PNG, WebP or HEIC.`, false, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail("Diagnosis unavailable: GEMINI_API_KEY is not configured on the server.", false);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { response, model } = await generateContentWithModel(ai, {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: image, mimeType } },
            {
              text:
                "Diagnose this paddy photo sent by an Indian farmer. " +
                `Allowed labels: ${LABEL_LIST}.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) {
      const blocked = response.promptFeedback?.blockReason;
      return blocked
        ? fail(`Diagnosis unavailable: the model declined this image (${blocked}).`, false)
        : fail("Diagnosis unavailable: the model returned an empty response.", true);
    }
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail("Diagnosis unavailable: the model returned malformed JSON.", true);
    }
    const result = normalize(raw);
    if (!result) return fail("Diagnosis unavailable: the model's answer had an unexpected shape.", true);

    return NextResponse.json<DiagnoseResponse>(
      { ...result, model },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("diagnose gemini error:", safeErrorMessage(err));
    if (isTimeoutError(err)) return fail("Diagnosis timed out. Please try again.", true);
    if (isRetryableGeminiError(err)) {
      return fail("Diagnosis service is busy or over quota. Please try again shortly.", true);
    }
    return fail("Diagnosis unavailable: the AI service rejected the request.", false);
  }
}

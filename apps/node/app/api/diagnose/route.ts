// POST /api/diagnose — who decides a photo diagnosis on a Saajha state node (step 2).
// Request:  { image: base64 (no data: prefix), mimeType?, lang, channel?: "photo"|"whatsapp",
//             federated?: { top, p, round, sha256 } | null }  — the shared model's verdict, computed
//             in the farmer's browser (lib/fed/federated.ts); null when it could not run there.
// Rule (lib/fed/decide.ts): paddy -> the federated model decides; at or above the hub's calibrated
// threshold the farmer gets advice from the approved card, below it a state expert decides. Gemini
// checks the photo, gives an independent second opinion (a differing one is logged for audit) and,
// for crops with no federated model yet, a reading marked "not yet verified" with safe first steps
// only. The photo stays on this node: only the label and language go to the hub for the card.
// Never a canned diagnosis: when a step fails, a person decides.
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { generateContentResilient } from "@/lib/genai";
import { LANG_NAME_FOR_PROMPT } from "@/lib/i18n-full";
import { createTicket, logQuery } from "@/lib/db";
import { DISTRICTS } from "@/lib/districts";
import { CLASSES, DIAGNOSIS_KEYS, UNSURE_KEY, classLabel, isClassKey, isDiagnosisKey, type ClassKey } from "@/lib/fed/classes";
import { decide, type Decision, type FedVerdict, type GeminiCheck } from "@/lib/fed/decide";

export const runtime = "nodejs";
export const maxDuration = 60;

const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL ?? "https://saajha-hub.vercel.app").replace(/\/+$/, "");
const MAX_IMAGE_B64_CHARS = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// ---- the hub's release: the threshold and the fingerprint the verdict must come from ----

type ReleaseInfo = { tauFed: number; round: number; sha256: string };
let releaseCache: { value: ReleaseInfo; expires: number } | null = null;

async function hubRelease(): Promise<ReleaseInfo | null> {
  if (releaseCache && Date.now() < releaseCache.expires) return releaseCache.value;
  try {
    const r = await fetch(`${HUB_URL}/fl/run.json`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!r.ok) return null;
    const run = (await r.json()) as { gate: { tau_fed: number }; rounds: { round: number; weights_sha256: string }[] };
    const last = run.rounds[run.rounds.length - 1];
    const value = { tauFed: run.gate.tau_fed, round: last.round, sha256: last.weights_sha256 };
    releaseCache = { value, expires: Date.now() + 10 * 60 * 1000 };
    return value;
  } catch {
    return null;
  }
}

// ---- Gemini: paddy check, independent second opinion, and a reading for other crops ----

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    is_plant: { type: Type.BOOLEAN, description: "Is the photo actually of a plant?" },
    is_rice: { type: Type.BOOLEAN, description: "Is the plant rice (paddy)?" },
    class_key: { type: Type.STRING, enum: [...DIAGNOSIS_KEYS], description: "Single most likely paddy label from the allowed set" },
    confidence: { type: Type.INTEGER, minimum: 0, maximum: 100, description: "Honest confidence in class_key, percent 0-100" },
    visible_symptoms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Short English phrases naming what is visible" },
    crop_en: { type: Type.STRING, description: "The crop's common English name; empty if not a plant" },
    crop_local: { type: Type.STRING, description: "The crop's name in the requested language; empty if not a plant" },
    problem_en: { type: Type.STRING, description: "Not rice only: the most likely problem, in English; otherwise empty" },
    problem_local: { type: Type.STRING, description: "Not rice only: the same, in the requested language; otherwise empty" },
    safe_steps_local: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Not rice only: 2-4 low-risk first steps in the requested language (field hygiene, removing affected parts, water and spacing). Never a pesticide, fungicide, insecticide, herbicide, product name or dose.",
    },
    voice_summary_local: {
      type: Type.STRING,
      description:
        "Not rice only: 40-60 words in the requested language to read aloud: the likely problem, said to be not yet verified, the safe first steps, and that an agriculture expert will check. Otherwise empty.",
    },
  },
  required: [
    "is_plant", "is_rice", "class_key", "confidence", "visible_symptoms", "crop_en", "crop_local",
    "problem_en", "problem_local", "safe_steps_local", "voice_summary_local",
  ],
};

const LABEL_LIST = [
  ...CLASSES.map((c) => `${c.key} (${c.label}${c.isPest ? ", insect pest damage" : ""})`),
  `${UNSURE_KEY} (not rice, not one of these, or cannot tell)`,
].join("; ");

type GeminiReading = GeminiCheck & {
  visible_symptoms: string[];
  crop_en: string;
  crop_local: string;
  problem_en: string;
  problem_local: string;
  safe_steps_local: string[];
  voice_summary_local: string;
  model: string;
};

// A dose or a product never reaches the farmer on the unverified path, whatever the model wrote.
const DIGITS = /[०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g;
const DOSE_RE = /\d+(\.\d+)?\s*(ml|mL|g|gm|gram|kg|l|litre|liter|%|ppm)\b/i;
const CHEMICAL_RE = /pesticide|fungicide|insecticide|herbicide|bactericide|mancozeb|carbendazim|chlorpyrifos|imidacloprid|tricyclazole|copper oxychloride|streptocycline/i;
const isSafe = (s: string) => !DOSE_RE.test(s.replace(DIGITS, "0")) && !CHEMICAL_RE.test(s);

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown, n: number) =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()).slice(0, n) : [];

async function geminiCheck(image: string, mimeType: string, lang: string): Promise<GeminiReading | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const langName = LANG_NAME_FOR_PROMPT[lang] || LANG_NAME_FOR_PROMPT.hi;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await generateContentResilient(ai, {
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: image, mimeType } },
            {
              text:
                `A farmer in India sent this crop photo. Allowed paddy labels: ${LABEL_LIST}. ` +
                `Write every *_local field in ${langName}, in the everyday words farmers use.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          "You are an expert plant pathologist at an Indian agricultural university. " +
          "First say whether the photo shows a plant and whether it is rice (paddy). For rice, classify into exactly one allowed label, " +
          "with an honest confidence; leave problem_*, safe_steps_local and voice_summary_local empty. " +
          "If it is a plant but not rice, set class_key=\"other_or_unsure\" and fill crop, problem, safe first steps and the voice summary. " +
          "Safe first steps never name any pesticide, fungicide, insecticide, herbicide, product or dose. " +
          "If it is not a plant, set is_plant=false, is_rice=false, class_key=\"other_or_unsure\" and leave the rest empty.",
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.2,
      },
    });
    const raw = JSON.parse(res.text || "{}") as Record<string, unknown>;
    if (typeof raw.is_plant !== "boolean" || typeof raw.is_rice !== "boolean" || !isDiagnosisKey(raw.class_key)) return null;
    const is_plant = raw.is_plant;
    const is_rice = is_plant && raw.is_rice;
    const confidence = Math.round(Math.min(100, Math.max(0, Number(raw.confidence) || 0)));
    return {
      is_plant,
      is_rice,
      class_key: is_rice ? raw.class_key : UNSURE_KEY,
      confidence,
      visible_symptoms: strs(raw.visible_symptoms, 6),
      crop_en: str(raw.crop_en),
      crop_local: str(raw.crop_local),
      problem_en: str(raw.problem_en),
      problem_local: str(raw.problem_local),
      safe_steps_local: strs(raw.safe_steps_local, 4).filter(isSafe),
      voice_summary_local: isSafe(str(raw.voice_summary_local)) ? str(raw.voice_summary_local) : "",
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
    };
  } catch (err) {
    console.error("diagnose gemini error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ---- advice: the approved card for the decided condition, from the hub's shared library ----

type CardSource = { publisher: string; title: string; url: string };
type Advisory = {
  title_local: string;
  spoken_summary: string;
  ipm: string[];
  chemical: { text: string; source: CardSource | null }[];
  prevention: string[];
  sources: CardSource[];
};

async function cardAdvice(classKey: ClassKey, decidedBy: Decision["decidedBy"], fedP: number, gemConf: number, lang: string): Promise<Advisory | null> {
  try {
    const r = await fetch(`${HUB_URL}/api/advisory`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Only the label, who decided, the two confidences and the language cross; never the photo.
      body: JSON.stringify({ class_key: classKey, decided_by: decidedBy === "agreement" ? "agreement" : "federated", fed_conf: fedP, gem_conf: gemConf, lang }),
      signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) return null;
    return (await r.json()) as Advisory;
  } catch {
    return null;
  }
}

// ---- the route ----

export type DiagnoseResponse = {
  // The fields the demo screens already read.
  is_plant: boolean;
  plant: string;
  disease_en: string;
  disease_local: string;
  disease_scientific: string;
  confidence: number;
  severity: "low" | "medium" | "high";
  symptoms: string[];
  treatment_organic: string[];
  treatment_chemical: string[];
  prevention: string[];
  urgency: string;
  voice_summary: string;
  source: "federated" | "expert" | "gemini-unverified" | "not-plant";
  decision: {
    outcome: Decision["outcome"];
    decidedBy: Decision["decidedBy"];
    reason: string;
    audit: boolean;
    verified: boolean;
    federated: { top: ClassKey; label: string; p: number; tau: number; round: number; sha256: string } | null;
    federatedNote: string | null;
    secondOpinion: { key: string; label: string; confidence: number; agrees: boolean | null } | null;
    ticket: { id: string; kendra: string } | null;
    sources: CardSource[];
  };
};

const pct = (p: number) => `${Math.round(p * 100)}%`;

export async function POST(req: NextRequest) {
  let body: { image?: unknown; mimeType?: unknown; lang?: unknown; channel?: unknown; federated?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON: { image, lang, federated }." }, { status: 400 });
  }
  let image = typeof body.image === "string" ? body.image.trim() : "";
  const dataUrl = /^data:[^;,]*;base64,/.exec(image);
  if (dataUrl) image = image.slice(dataUrl[0].length);
  if (!image || !BASE64_RE.test(image)) return NextResponse.json({ error: "`image` must be a base64 JPEG." }, { status: 400 });
  if (image.length > MAX_IMAGE_B64_CHARS) return NextResponse.json({ error: "Photo too large: keep it under ~3 MB." }, { status: 413 });
  const lang = typeof body.lang === "string" && LANG_NAME_FOR_PROMPT[body.lang] ? body.lang : "hi";
  const channel = body.channel === "whatsapp" ? "whatsapp" : "photo";
  const mimeType = typeof body.mimeType === "string" && ALLOWED_MIME.has(body.mimeType) ? body.mimeType : "image/jpeg";

  const release = await hubRelease();
  // Use the browser's verdict only if it came from the model the hub released.
  let fed: (FedVerdict & { round: number; sha256: string }) | null = null;
  let federatedNote: string | null = null;
  const f = (body.federated ?? null) as Record<string, unknown> | null;
  if (f && isClassKey(f.top) && typeof f.p === "number" && f.p >= 0 && f.p <= 1 && typeof f.sha256 === "string") {
    if (release && f.sha256 === release.sha256) fed = { top: f.top, p: f.p, round: release.round, sha256: release.sha256 };
    else federatedNote = release ? "The verdict came from a different model version than the hub's latest release, so it was not used." : "The hub's release could not be checked, so the model's verdict was not used.";
  } else if (!f) {
    federatedNote = channel === "whatsapp" ? "The shared model runs in the web app; photos on the WhatsApp line go to an expert." : "The shared model could not run on this device.";
  }

  const gemini = await geminiCheck(image, mimeType, lang);
  const decision = decide(release?.tauFed ?? 0.58, fed, gemini);

  const home = DISTRICTS[0];
  const who = channel === "whatsapp" ? "WhatsApp farmer" : "Demo farmer";
  const gemLabel = gemini ? classLabel(gemini.class_key) : "";
  let ticket: { id: string; kendra: string } | null = null;
  const openTicket = async (crop: string, aiDiagnosis: string, confidence: number, severity: "low" | "medium" | "high") => {
    try {
      const t = await createTicket({
        farmer: who,
        village: home?.blocks[0],
        district: home?.district,
        state: home?.state,
        channel: channel === "whatsapp" ? "whatsapp" : "photo",
        crop,
        aiDiagnosis,
        confidence,
        severity,
      });
      ticket = { id: t.id, kendra: t.kendra };
    } catch (err) {
      console.error("diagnose ticket error:", err instanceof Error ? err.message : err);
    }
  };

  const base = {
    is_plant: gemini ? gemini.is_plant : true,
    plant: gemini?.crop_en || (gemini?.is_rice ? "Paddy (rice)" : ""),
    disease_scientific: "",
    symptoms: gemini?.visible_symptoms ?? [],
    treatment_organic: [] as string[],
    treatment_chemical: [] as string[],
    prevention: [] as string[],
  };
  let out: Omit<DiagnoseResponse, "decision"> & { sources?: CardSource[] };

  if (decision.outcome === "not_plant") {
    out = { ...base, is_plant: false, disease_en: "", disease_local: "", confidence: 0, severity: "low", urgency: "", voice_summary: "", source: "not-plant" };
  } else if (decision.outcome === "unverified" && gemini) {
    await openTicket(gemini.crop_en || "Unknown crop", `${gemini.crop_en || "Crop"}: Gemini reads "${gemini.problem_en || "unclear"}" (not verified: no federated model for this crop). Expert to decide.`, gemini.confidence, "medium");
    out = {
      ...base,
      disease_en: gemini.problem_en,
      disease_local: gemini.problem_local,
      confidence: gemini.confidence,
      severity: "medium",
      treatment_organic: gemini.safe_steps_local,
      urgency: "Not yet verified. An agriculture expert will check this case.",
      voice_summary: gemini.voice_summary_local,
      source: "gemini-unverified",
    };
  } else if (decision.outcome === "advise" && decision.classKey && fed) {
    const advice = await cardAdvice(decision.classKey, decision.decidedBy, fed.p, gemini?.confidence ?? 0, lang);
    if (decision.audit) {
      await openTicket("Paddy", `Audit: advice given for ${classLabel(decision.classKey)} (federated ${pct(fed.p)}); Gemini's second opinion differs: ${gemLabel} (${gemini?.confidence ?? 0}%).`, Math.round(fed.p * 100), "low");
    }
    if (advice) {
      out = {
        ...base,
        plant: "Paddy (rice)",
        disease_en: classLabel(decision.classKey),
        disease_local: advice.title_local,
        confidence: Math.round(fed.p * 100),
        severity: "medium",
        treatment_organic: advice.ipm,
        treatment_chemical: advice.chemical.map((c) => c.text),
        prevention: advice.prevention,
        urgency: "",
        voice_summary: advice.spoken_summary,
        source: "federated",
        sources: advice.sources,
      };
    } else {
      // The diagnosis is known but the approved card could not be fetched: an expert follows up.
      if (!decision.audit) await openTicket("Paddy", `Federated model: ${classLabel(decision.classKey)} (${pct(fed.p)}); the approved card could not be fetched from the hub. Expert to advise.`, Math.round(fed.p * 100), "medium");
      out = {
        ...base,
        plant: "Paddy (rice)",
        disease_en: classLabel(decision.classKey),
        disease_local: "",
        confidence: Math.round(fed.p * 100),
        severity: "medium",
        urgency: "The approved advice could not be loaded just now. An agriculture expert will send it.",
        voice_summary: "",
        source: "federated",
      };
    }
  } else {
    // A state expert decides: below the threshold, Gemini unavailable, or the model unavailable.
    const fedText = fed ? `federated model ${classLabel(fed.top)} (${pct(fed.p)}, below the ${pct(release?.tauFed ?? 0.58)} threshold)` : "federated model unavailable";
    await openTicket("Paddy", `Paddy photo: ${fedText}; Gemini: ${gemini ? `${gemLabel} (${gemini.confidence}%)` : "unavailable"}. Expert to decide.`, fed ? Math.round(fed.p * 100) : gemini?.confidence ?? 0, "medium");
    out = {
      ...base,
      plant: gemini?.is_rice ? "Paddy (rice)" : base.plant,
      disease_en: "",
      disease_local: "",
      confidence: fed ? Math.round(fed.p * 100) : 0,
      severity: "medium",
      urgency: "Sent to an agriculture expert, who will reply within 48 hours.",
      voice_summary: "",
      source: "expert",
    };
  }

  logQuery({ channel: "photo", lang, query: `photo diagnosis: ${decision.outcome}${decision.classKey ? ` ${decision.classKey}` : ""}`, responseSource: out.source });

  const { sources = [], ...fields } = out;
  const response: DiagnoseResponse = {
    ...fields,
    decision: {
      outcome: decision.outcome,
      decidedBy: decision.decidedBy,
      reason: decision.reason,
      audit: decision.audit,
      verified: decision.outcome === "advise",
      federated: fed && release ? { top: fed.top, label: classLabel(fed.top), p: fed.p, tau: release.tauFed, round: fed.round, sha256: fed.sha256 } : null,
      federatedNote,
      secondOpinion: gemini && gemini.is_rice ? { key: gemini.class_key, label: gemLabel, confidence: gemini.confidence, agrees: fed ? gemini.class_key === fed.top : null } : null,
      ticket,
      sources,
    },
  };
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

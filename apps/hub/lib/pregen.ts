// Saved Gemini answers for the held-out gallery photos, written by scripts/pregen_gallery.mjs.
// They make the demo path work when Gemini is busy or out of quota; every one is a real
// Gemini response, dated, and the page offers to ask Gemini again live. Uploaded photos
// never use them.
import type { AdvisoryResponse } from "@/app/api/advisory/route";
import type { DiagnoseResponse } from "@/app/api/diagnose/route";

export interface PregenFile {
  generated_at: string;
  /** gallery item id -> Gemini's diagnosis of that photo */
  diagnose: Record<string, DiagnoseResponse>;
  /** `${class_key}|${lang}|${decided_by}` -> advisory */
  advisory: Record<string, AdvisoryResponse>;
  /** same key -> URL of the spoken advisory (WAV) */
  audio: Record<string, string>;
}

let p: Promise<PregenFile | null> | null = null;

export function fetchPregen(): Promise<PregenFile | null> {
  p ??= fetch("/pregen/pregen.json")
    .then((r) => (r.ok ? (r.json() as Promise<PregenFile>) : null))
    .catch(() => null);
  return p;
}

export const advisoryKey = (classKey: string, lang: string, decidedBy: string) => `${classKey}|${lang}|${decidedBy}`;

export const savedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

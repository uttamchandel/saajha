// Copied from apps/hub/lib/classes.ts — the federated head's label order. Keep the two identical.
// The federated model's label set. ORDER MATTERS: this is the classifier head's
// output order (index i of the logits = CLASS_KEYS[i]). Keep in sync with saajha/fl.

export const CLASS_KEYS = [
  "bacterial_leaf_blight",
  "bacterial_leaf_streak",
  "bacterial_panicle_blight",
  "blast",
  "brown_spot",
  "dead_heart",
  "downy_mildew",
  "hispa",
  "normal",
  "tungro",
] as const;

export type ClassKey = (typeof CLASS_KEYS)[number];

/** Gemini may also answer "not one of ours / can't tell". The FL head never does. */
export const UNSURE_KEY = "other_or_unsure" as const;
export type DiagnosisKey = ClassKey | typeof UNSURE_KEY;

export const DIAGNOSIS_KEYS: readonly DiagnosisKey[] = [...CLASS_KEYS, UNSURE_KEY];

export type ClassInfo = {
  key: ClassKey;
  label: string;
  /** Insect damage rather than a pathogen. */
  isPest: boolean;
};

const META: Record<ClassKey, { label: string; isPest: boolean }> = {
  bacterial_leaf_blight: { label: "Bacterial leaf blight", isPest: false },
  bacterial_leaf_streak: { label: "Bacterial leaf streak", isPest: false },
  bacterial_panicle_blight: { label: "Bacterial panicle blight", isPest: false },
  blast: { label: "Blast", isPest: false },
  brown_spot: { label: "Brown spot", isPest: false },
  dead_heart: { label: "Dead heart (stem borer)", isPest: true },
  downy_mildew: { label: "Downy mildew", isPest: false },
  hispa: { label: "Rice hispa", isPest: true },
  normal: { label: "Healthy", isPest: false },
  tungro: { label: "Tungro", isPest: false },
};

/** Same order as CLASS_KEYS (derived from it, so the two cannot drift). */
export const CLASSES: readonly ClassInfo[] = CLASS_KEYS.map((key) => ({ key, ...META[key] }));

export function isClassKey(x: unknown): x is ClassKey {
  return typeof x === "string" && (CLASS_KEYS as readonly string[]).includes(x);
}

export function isDiagnosisKey(x: unknown): x is DiagnosisKey {
  return x === UNSURE_KEY || isClassKey(x);
}

export function classLabel(key: DiagnosisKey): string {
  return key === UNSURE_KEY ? "Other / unsure" : META[key].label;
}

// Regenerative crop planning (Saajha step 6): every recommendation gets two scores, how well the crop
// suits this plot this season (Gemini, grounded on the plot's numbers) and what it does to the soil over
// the next seasons (this file). The soil score is a transparent rule-based heuristic built from the plot's
// soil numbers and standard agronomy (legumes fix nitrogen, residue feeds soil carbon, thirsty crops strain
// rainfed land); it is not a yield or carbon prediction, and the screen says so.
//
// Soil-test ratings follow the limits printed on India's Soil Health Cards:
//   organic carbon  low < 0.5 %, medium 0.5–0.75 %, high > 0.75 %
//   available N     low < 280 kg/ha, medium 280–560, high > 560
//   available P     low < 10 kg/ha, medium 10–25, high > 25
//   available K     low < 110 kg/ha, medium 110–280, high > 280
// Satellite nitrogen (SoilGrids) is total N, not available N, so nitrogen is rated only from the farmer's
// card or, as a hint, the district's Soil Health Card statistics.
import type { SoilSnapshot, WeatherSnapshot } from "@/lib/types";

export type Rating = "low" | "medium" | "high";

export type SoilStatus = {
  ocPct: number | null;
  oc: Rating | null;
  n: Rating | null;
  nFrom: "card" | "district" | null;
  p: Rating | null;
  k: Rating | null;
  ph: number | null;
  waterShort: boolean;
  districtNote: string | null;
};

export type Practice = { id: string; title: string; why: string };

type CropTraits = { legume?: boolean; millet?: boolean; thirsty?: boolean; puddled?: boolean; heavyFeeder?: boolean; residue?: boolean };

// Keyed by the crop names in lib/agronomy.ts.
const TRAITS: Record<string, CropTraits> = {
  "Rice (Paddy)": { thirsty: true, puddled: true },
  Wheat: { residue: true },
  Maize: { residue: true },
  Cotton: { heavyFeeder: true },
  Soybean: { legume: true },
  Tomato: { heavyFeeder: true },
  Chilli: { heavyFeeder: true },
  Groundnut: { legume: true },
  Mustard: {},
  "Gram (Chickpea)": { legume: true },
  Onion: { heavyFeeder: true },
  Potato: { heavyFeeder: true },
  Sugarcane: { thirsty: true, heavyFeeder: true, residue: true },
  "Bajra (Pearl Millet)": { millet: true, residue: true },
};

const rate = (v: number, low: number, high: number): Rating => (v < low ? "low" : v > high ? "high" : "medium");

export function soilStatus(
  soil: SoilSnapshot,
  weather: WeatherSnapshot,
  waterSource: string,
  card: { n?: number; p?: number; k?: number } | undefined,
  districtNote: string | undefined,
): SoilStatus {
  const ocPct = soil.soc != null ? Math.round(soil.soc) / 10 : null; // g/kg -> %
  const nDistrict = districtNote ? Number(/(\d+)% (?:of samples )?are low in nitrogen/.exec(districtNote)?.[1] ?? NaN) : NaN;
  const n: Rating | null = card?.n != null ? rate(card.n, 280, 560) : Number.isFinite(nDistrict) && nDistrict >= 50 ? "low" : null;
  const waterShort =
    waterSource === "rainfed" && ((weather.next16dRainMm ?? Infinity) < 30 || (weather.soilMoisture ?? Infinity) < 0.15);
  return {
    ocPct,
    oc: ocPct != null ? rate(ocPct, 0.5, 0.75) : null,
    n,
    nFrom: card?.n != null ? "card" : n ? "district" : null,
    p: card?.p != null ? rate(card.p, 10, 25) : null,
    k: card?.k != null ? rate(card.k, 110, 280) : null,
    ph: soil.ph,
    waterShort,
    districtNote: districtNote ?? null,
  };
}

/** 0-100: what growing this crop does to this plot's soil over the next seasons, with the reasons. */
export function soilScore(crop: string, s: SoilStatus): { score: number; reasons: string[] } {
  const t = TRAITS[crop] ?? {};
  let score = 55;
  const reasons: string[] = [];
  if (t.legume) {
    score += s.n === "low" ? 30 : 20;
    reasons.push(s.n === "low" ? "A legume: fixes nitrogen for the next crop, and this soil is low in nitrogen." : "A legume: fixes nitrogen for the next crop.");
  }
  if (t.millet) {
    score += s.waterShort ? 15 : 8;
    reasons.push(s.waterShort ? "Drought-tolerant millet: suits the dry spell ahead with little irrigation." : "Hardy millet with low input needs.");
  }
  if (t.thirsty) {
    score -= s.waterShort ? 25 : 8;
    reasons.push(s.waterShort ? "Needs a lot of water while little rain is forecast: strains the land and the aquifer." : "A water-hungry crop.");
  }
  if (t.puddled) {
    score -= 7;
    reasons.push("Puddled paddy harms soil structure; direct seeding or alternate wetting and drying reduce this.");
  }
  if (t.heavyFeeder) {
    score -= s.oc === "low" ? 12 : 6;
    reasons.push(s.oc === "low" ? "Draws heavily on nutrients from a soil already low in organic carbon." : "Draws heavily on soil nutrients.");
  }
  if (t.residue) {
    score += s.oc === "low" ? 8 : 4;
    reasons.push("Leaves plenty of residue: kept in the field (not burned), it rebuilds soil carbon.");
  }
  if (reasons.length === 0) reasons.push("Neutral for the soil when grown in rotation.");
  return { score: Math.max(5, Math.min(95, score)), reasons };
}

/** Practices triggered by this plot's numbers; each says why. */
export function practices(s: SoilStatus, recommendedCrops: string[]): Practice[] {
  const out: Practice[] = [];
  if (s.n === "low") {
    out.push({
      id: "pulse-rotation",
      title: "Put a pulse in the rotation instead of more urea",
      why:
        s.nFrom === "card"
          ? "Your Soil Health Card rates nitrogen low. Moong, urad, chana or arhar fix nitrogen for the next crop."
          : "Most soil samples in your district are low in nitrogen (Soil Health Card data). Moong, urad, chana or arhar fix nitrogen for the next crop; test your own field to confirm.",
    });
  } else if (s.nFrom === null) {
    out.push({
      id: "shc-test",
      title: "Get a Soil Health Card test before deciding fertiliser",
      why: "Satellite data gives total nitrogen, not the available nitrogen your crop can use. A free card test tells you what to add and what to skip.",
    });
  }
  if (s.oc === "low") {
    out.push({
      id: "green-manure",
      title: "Grow green manure and keep the residue",
      why: `Organic carbon is ${s.ocPct}%, below the 0.5% low mark. A green-manure crop such as dhaincha or sunhemp, ploughed in at flowering, and crop residue left in the field rebuild it.`,
    });
  }
  out.push({
    id: "no-burning",
    title: "Do not burn crop residue",
    why: "Burning destroys the organic matter and soil life the next crop needs; mulch it or plough it in.",
  });
  if (s.waterShort) {
    const paddy = recommendedCrops.includes("Rice (Paddy)");
    out.push({
      id: "save-water",
      title: paddy ? "Save water on paddy: direct seeding or alternate wetting and drying" : "Save water: prefer millets and pulses, and mulch",
      why: paddy
        ? "Little rain is forecast for rainfed land. Direct-seeded rice or letting the field dry between irrigations cuts water use without losing the crop."
        : "Little rain is forecast for rainfed land. Hardy crops and mulch keep moisture in the soil.",
    });
  }
  if (s.ph != null && s.ph < 5.5) {
    out.push({ id: "lime", title: "Correct the acidity", why: `pH ${s.ph} is strongly acidic. Agricultural lime, in the amount a soil test advises, frees up nutrients.` });
  } else if (s.ph != null && s.ph > 8.5) {
    out.push({ id: "gypsum", title: "Correct the alkalinity", why: `pH ${s.ph} is strongly alkaline. Gypsum, in the amount a soil test advises, improves the soil.` });
  }
  if (s.p || s.k || s.nFrom === "card") {
    const parts = [s.nFrom === "card" && s.n ? `nitrogen ${s.n}` : null, s.p ? `phosphorus ${s.p}` : null, s.k ? `potassium ${s.k}` : null].filter(Boolean);
    out.push({
      id: "card-doses",
      title: "Fertilise to your card, not a blanket dose",
      why: `Your card rates ${parts.join(", ")}: add what is rated low, cut what is rated high, and save money.`,
    });
  }
  out.push({
    id: "ipm",
    title: "Control pests in IPM order",
    why: "Field hygiene and resistant varieties first, then biological control, and chemicals only as a last step, at label doses.",
  });
  return out;
}

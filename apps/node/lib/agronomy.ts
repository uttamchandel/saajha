// Agronomy knowledge base — the 14-crop ICAR/SAU Package-of-Practices table,
// Indian soil taxonomy + WRB→Indian crosswalk, and a deterministic crop scorer.
// Embedded from research/crop-agronomy.json + research/soil-satellite.json
// (water needs verified against FAO Irrigation Water Management Manual Table 14).
// Pure data/logic — server- and client-safe; no React, no fetch.

import type { CropRecommendation, SoilSnapshot, WeatherSnapshot } from "./types";

export type WaterSource = "rainfed" | "canal" | "borewell" | "drip";
export type SeasonName = "Kharif" | "Rabi" | "Zaid";

// ---------------------------------------------------------------------------
// Indian soil types (farmer-facing names hi+en) + WRB crosswalk
// ---------------------------------------------------------------------------

export type IndianSoilKey =
  | "alluvial"
  | "black_regur"
  | "red"
  | "laterite"
  | "arid_desert"
  | "saline_alkaline_usar"
  | "peaty_marshy"
  | "forest_mountain";

export type IndianSoilType = {
  nameEn: string;
  nameHi: string;
  states: string[];
  traits: string;
  crops: string[];
};

export const INDIAN_SOIL_TYPES: Record<IndianSoilKey, IndianSoilType> = {
  alluvial: {
    nameEn: "Alluvial soil",
    nameHi: "जलोढ़ मिट्टी (काँप)",
    states: ["Punjab", "Haryana", "Uttar Pradesh", "Bihar", "West Bengal", "Assam", "coastal deltas of AP/TN/Odisha"],
    traits: "pH 6.5-7.8, deep, fertile, variable texture; rich in K, often low N & OC",
    crops: ["rice", "wheat", "sugarcane", "maize", "pulses", "mustard", "jute", "potato"],
  },
  black_regur: {
    nameEn: "Black cotton soil (Regur)",
    nameHi: "काली मिट्टी (रेगुर)",
    states: ["Maharashtra", "Madhya Pradesh", "Gujarat", "Telangana", "N Karnataka", "W Andhra Pradesh"],
    traits: "WRB Vertisols; clay 30-60%, high CEC (30-50), pH 7.2-8.5, moisture-retentive, self-ploughing cracks; low N/P/OC",
    crops: ["cotton", "soybean", "sorghum (jowar)", "pigeon pea (tur)", "chickpea", "wheat", "sunflower", "citrus"],
  },
  red: {
    nameEn: "Red soil",
    nameHi: "लाल मिट्टी",
    states: ["Tamil Nadu", "S Karnataka", "Andhra Pradesh", "Odisha", "Jharkhand", "Chhattisgarh", "E Madhya Pradesh"],
    traits: "pH 5.5-7.0, sandy-loam, iron-rich, low N/P/humus, drains fast",
    crops: ["groundnut", "ragi (finger millet)", "bajra", "pulses", "potato", "castor", "tobacco"],
  },
  laterite: {
    nameEn: "Laterite soil",
    nameHi: "लैटेराइट मिट्टी",
    states: ["Kerala", "coastal Karnataka", "Goa", "E Odisha", "parts of WB/Assam/Meghalaya"],
    traits: "pH 4.5-6.0 acidic, heavily leached, low fertility, rich Fe/Al; needs liming+manure",
    crops: ["tea", "coffee", "rubber", "cashew", "coconut", "tapioca", "pineapple"],
  },
  arid_desert: {
    nameEn: "Arid / desert soil",
    nameHi: "रेतीली मरुस्थलीय मिट्टी",
    states: ["Rajasthan", "Kutch (Gujarat)", "SW Haryana", "SW Punjab"],
    traits: "sandy, pH 7.6-8.5, saline patches, very low OC (<0.3%), high infiltration",
    crops: ["bajra (pearl millet)", "guar (cluster bean)", "moth bean", "mustard (irrigated)", "date palm"],
  },
  saline_alkaline_usar: {
    nameEn: "Saline-alkaline soil (Usar)",
    nameHi: "ऊसर (क्षारीय) मिट्टी",
    states: ["pockets of UP/Haryana/Punjab (Indo-Gangetic)", "coastal AP/TN/Gujarat"],
    traits: "pH >8.5 or EC >4 dS/m; needs gypsum/drainage reclamation",
    crops: ["salt-tolerant rice varieties", "barley", "dhaincha (green manure)", "sugar beet"],
  },
  peaty_marshy: {
    nameEn: "Peaty / marshy soil",
    nameHi: "दलदली (पीट) मिट्टी",
    states: ["Kuttanad (Kerala)", "Sundarbans (WB)", "coastal Odisha"],
    traits: "high organic matter, waterlogged, acidic",
    crops: ["rice (below-sea-level paddy)", "coconut"],
  },
  forest_mountain: {
    nameEn: "Forest / mountain soil",
    nameHi: "पहाड़ी वन मिट्टी",
    states: ["Himachal Pradesh", "Uttarakhand", "J&K/Ladakh valleys", "NE hill states"],
    traits: "acidic, humus-rich top layer, shallow on slopes",
    crops: ["apple", "stone fruits", "tea", "maize", "off-season vegetables", "spices (large cardamom, ginger)"],
  },
};

/** WRB reference-group → Indian soil type crosswalk (research/soil-satellite.json embed_data). */
export const WRB_TO_INDIAN_SOIL: Record<string, IndianSoilKey> = {
  Vertisols: "black_regur",
  Fluvisols: "alluvial",
  Cambisols: "alluvial",
  Luvisols: "red",
  Lixisols: "red",
  Nitisols: "red",
  Ferralsols: "laterite",
  Plinthosols: "laterite",
  Acrisols: "laterite",
  Arenosols: "arid_desert",
  Calcisols: "arid_desert",
  Solonchaks: "saline_alkaline_usar",
  Solonetz: "saline_alkaline_usar",
  Gleysols: "peaty_marshy",
  Histosols: "peaty_marshy",
  Leptosols: "forest_mountain",
  Umbrisols: "forest_mountain",
};

export function indianSoilFromWrb(wrbClassName: string | null | undefined): IndianSoilKey | null {
  if (!wrbClassName) return null;
  return WRB_TO_INDIAN_SOIL[wrbClassName.trim()] ?? null;
}

/** Dominant soil type per registry state — fallback when SoilGrids returns nodata. */
export const STATE_DEFAULT_SOIL: Record<string, IndianSoilKey> = {
  "Madhya Pradesh": "black_regur",
  Maharashtra: "black_regur",
  Gujarat: "black_regur",
  Telangana: "black_regur",
  "Andhra Pradesh": "red",
  Karnataka: "red",
  "Tamil Nadu": "red",
  Odisha: "red",
  Jharkhand: "red",
  Chhattisgarh: "red",
  Punjab: "alluvial",
  Haryana: "alluvial",
  "Uttar Pradesh": "alluvial",
  Bihar: "alluvial",
  "West Bengal": "alluvial",
  Assam: "alluvial",
  Kerala: "laterite",
  Rajasthan: "arid_desert",
};

/** Representative topsoil properties per soil type (district-default fallback values). */
export const SOIL_DEFAULTS: Record<
  IndianSoilKey,
  { ph: number; clayPct: number; sandPct: number; soc: number; nitrogen: number }
> = {
  alluvial: { ph: 7.2, clayPct: 22, sandPct: 40, soc: 5.2, nitrogen: 0.7 },
  black_regur: { ph: 7.8, clayPct: 44, sandPct: 18, soc: 6.0, nitrogen: 0.6 },
  red: { ph: 6.4, clayPct: 18, sandPct: 55, soc: 4.0, nitrogen: 0.5 },
  laterite: { ph: 5.4, clayPct: 25, sandPct: 48, soc: 7.5, nitrogen: 0.8 },
  arid_desert: { ph: 8.1, clayPct: 8, sandPct: 78, soc: 2.0, nitrogen: 0.3 },
  saline_alkaline_usar: { ph: 8.8, clayPct: 24, sandPct: 38, soc: 3.0, nitrogen: 0.4 },
  peaty_marshy: { ph: 5.5, clayPct: 30, sandPct: 25, soc: 15.0, nitrogen: 1.5 },
  forest_mountain: { ph: 5.8, clayPct: 20, sandPct: 45, soc: 12.0, nitrogen: 1.2 },
};

/** Simplified USDA texture-triangle classification from clay/sand percentages. */
export function deriveTexture(clayPct: number | null, sandPct: number | null): string | null {
  if (clayPct == null || sandPct == null) return null;
  const clay = clayPct;
  const sand = sandPct;
  const silt = Math.max(0, 100 - clay - sand);
  if (clay >= 40) {
    if (sand >= 45) return "sandy clay";
    if (silt >= 40) return "silty clay";
    return "clay";
  }
  if (clay >= 27) {
    if (sand >= 45) return "sandy clay loam";
    if (silt >= 40) return "silty clay loam";
    return "clay loam";
  }
  if (sand >= 85) return "loamy sand";
  if (sand >= 70) return "sandy loam";
  if (silt >= 50) return "silt loam";
  if (clay >= 7 && sand <= 52) return "loam";
  return "sandy loam";
}

// ---------------------------------------------------------------------------
// The 14-crop agronomy table (ICAR/SAU Package of Practices + FAO-56/Table 14)
// ---------------------------------------------------------------------------

export type CropAgronomy = {
  crop: string; // canonical English name
  localNameHi: string;
  seasons: string[];
  soilTypes: string[];
  phRange: [number, number];
  waterNeedMm: [number, number]; // field-level, per season
  durationDays: [number, number];
  typicalYieldQPerAcre: number; // well-managed farmer yield
  notes: string;
  marketOutlook: string;
  risks: string[];
  inputs: { seed: string; fertilizer: string; irrigation: string };
};

export const AGRONOMY_TABLE: CropAgronomy[] = [
  {
    crop: "Rice (Paddy)",
    localNameHi: "धान",
    seasons: ["kharif", "rabi (S. India)"],
    soilTypes: ["clay", "clay loam", "alluvial"],
    phRange: [5.5, 7.5],
    waterNeedMm: [1100, 1250],
    durationDays: [110, 150],
    typicalYieldQPerAcre: 22,
    notes:
      "Puddled transplanted; crop ET is 450-700mm (FAO) but field duty with puddling/percolation is ~1100-1250mm. Needs standing water at tillering.",
    marketOutlook: "Steady MSP procurement (₹2,300/q common) keeps the floor firm; demand stable year-round.",
    risks: ["High water bill — unviable without assured irrigation or strong monsoon", "Blast and BPH pressure in humid spells"],
    inputs: {
      seed: "8-10 kg/acre (transplanted nursery), certified seed",
      fertilizer: "50:25:25 NPK kg/acre + 10 kg ZnSO₄, N in 3 splits",
      irrigation: "2-5 cm standing water at tillering; AWD wet-dry cycles save ~25% water",
    },
  },
  {
    crop: "Wheat",
    localNameHi: "गेहूं",
    seasons: ["rabi"],
    soilTypes: ["loam", "clay loam", "alluvial"],
    phRange: [6.0, 7.5],
    waterNeedMm: [450, 650],
    durationDays: [120, 150],
    typicalYieldQPerAcre: 18,
    notes: "4-6 irrigations; CRI stage (21 DAS) irrigation is critical. Sow by mid-Nov; terminal heat cuts yield.",
    marketOutlook: "MSP ₹2,425/q with active govt procurement in MP/Punjab/Haryana; flour-mill demand steady.",
    risks: ["Terminal heat in late March clips grain filling if sown late", "Yellow rust in cool humid pockets"],
    inputs: {
      seed: "40 kg/acre, treated with fungicide",
      fertilizer: "50:24:16 NPK kg/acre, half N basal + half at CRI",
      irrigation: "5 irrigations — CRI (21 days), tillering, jointing, flowering, grain fill",
    },
  },
  {
    crop: "Maize",
    localNameHi: "मक्का",
    seasons: ["kharif", "rabi", "zaid"],
    soilTypes: ["sandy loam", "loam", "clay loam (drained)"],
    phRange: [5.5, 7.5],
    waterNeedMm: [500, 800],
    durationDays: [90, 120],
    typicalYieldQPerAcre: 20,
    notes: "Very sensitive to waterlogging; tasseling-silking is the critical water stage. Rabi/spring maize yields highest.",
    marketOutlook: "Poultry-feed and ethanol demand keep prices above MSP most months.",
    risks: ["Waterlogging kills stands — needs drained fields", "Fall armyworm scouting essential from whorl stage"],
    inputs: {
      seed: "8 kg/acre single-cross hybrid",
      fertilizer: "48:24:16 NPK kg/acre, N in 3 splits (basal, knee-high, tasseling)",
      irrigation: "Critical at tasseling-silking; 4-5 irrigations if rain fails",
    },
  },
  {
    crop: "Cotton",
    localNameHi: "कपास",
    seasons: ["kharif"],
    soilTypes: ["black cotton (regur)", "deep alluvial"],
    phRange: [6.0, 8.0],
    waterNeedMm: [700, 1300],
    durationDays: [150, 180],
    typicalYieldQPerAcre: 8,
    notes: "Yield = seed cotton (kapas). Long season; pink bollworm scouting essential; avoid waterlogged fields.",
    marketOutlook: "Kapas trading near ₹7,000/q; CCI procurement supports the floor in black-soil belts.",
    risks: ["Pink bollworm — pheromone traps + refuge rows are non-negotiable", "180-day season ties up the field till Dec-Jan"],
    inputs: {
      seed: "2 packets (900 g) Bt hybrid/acre + 20% refuge",
      fertilizer: "60:30:30 NPK kg/acre in 3 splits + MgSO₄ on black soils",
      irrigation: "Protective irrigation at flowering and boll development",
    },
  },
  {
    crop: "Soybean",
    localNameHi: "सोयाबीन",
    seasons: ["kharif"],
    soilTypes: ["black (vertisol)", "clay loam", "loam"],
    phRange: [6.0, 7.5],
    waterNeedMm: [450, 700],
    durationDays: [90, 110],
    typicalYieldQPerAcre: 7,
    notes: "MP/Maharashtra belt; mostly rainfed (needs 600-1000mm rainfall); seed inoculation with Rhizobium recommended.",
    marketOutlook: "Solvent-plant demand in the MP belt holds ₹4,500-5,000/q; tracks global soy oil.",
    risks: ["Yellow mosaic virus via whitefly in warm dry spells", "Waterlogging in flat black-soil fields after heavy rain"],
    inputs: {
      seed: "30-35 kg/acre, Rhizobium + PSB inoculated",
      fertilizer: "12:32:16 NPK kg/acre basal (pulse — light N only)",
      irrigation: "Rainfed; one protective irrigation at pod fill if dry spell",
    },
  },
  {
    crop: "Tomato",
    localNameHi: "टमाटर",
    seasons: ["kharif", "rabi", "zaid (irrigated)"],
    soilTypes: ["sandy loam", "loam, well-drained, organic-rich"],
    phRange: [6.0, 7.0],
    waterNeedMm: [400, 800],
    durationDays: [110, 140],
    typicalYieldQPerAcre: 130,
    notes: "Transplanted at 25-30 days; staking + drip raises yield sharply; very price-volatile crop.",
    marketOutlook: "Highly volatile — ₹400 to ₹4,000/q within a season; stagger planting to spread price risk.",
    risks: ["Price crashes at peak arrivals — do not plant the whole holding", "Leaf curl virus (whitefly) and late blight in humid weather"],
    inputs: {
      seed: "60-80 g/acre hybrid (nursery, 25-30 day transplant)",
      fertilizer: "40:50:50 NPK kg/acre + FYM 8 t/acre; stake with bamboo",
      irrigation: "Drip at 2-3 day interval; never flood after fruit set",
    },
  },
  {
    crop: "Chilli",
    localNameHi: "मिर्च",
    seasons: ["kharif", "rabi (irrigated)"],
    soilTypes: ["loam", "black", "sandy loam, well-drained"],
    phRange: [6.0, 7.0],
    waterNeedMm: [600, 900],
    durationDays: [150, 180],
    typicalYieldQPerAcre: 8,
    notes: "Yield = dry red chilli (green chilli ~4-5x more). Thrips/mites drive leaf curl; Guntur/Khammam belt.",
    marketOutlook: "Guntur dry-chilli benchmark ₹12,000-18,000/q; export demand (China, Bangladesh) firm.",
    risks: ["Thrips/mite leaf-curl can halve yield — monitor from day 20", "150-180 day season needs sustained water and labour"],
    inputs: {
      seed: "200 g/acre (nursery), virus-free seedlings",
      fertilizer: "40:24:24 NPK kg/acre in splits + micronutrient spray",
      irrigation: "Every 7-10 days; critical at flowering and fruit set",
    },
  },
  {
    crop: "Groundnut",
    localNameHi: "मूंगफली",
    seasons: ["kharif", "rabi/summer (S. India)"],
    soilTypes: ["sandy loam", "light red", "calcareous"],
    phRange: [6.0, 7.5],
    waterNeedMm: [500, 700],
    durationDays: [100, 130],
    typicalYieldQPerAcre: 9,
    notes: "Yield = unshelled pods. Needs loose soil for pegging; gypsum at flowering; pegging-to-pod-fill is critical for water.",
    marketOutlook: "Oil-mill demand steady at ₹6,000-6,800/q; Gujarat/Rajasthan arrivals set the tone.",
    risks: ["Pegging fails in tight clay — needs loose topsoil", "White grub and leaf spot in continuous-groundnut fields"],
    inputs: {
      seed: "50-55 kg kernels/acre, treated",
      fertilizer: "10:16:20 NPK kg/acre + 200 kg gypsum at flowering",
      irrigation: "Critical from pegging to pod fill; avoid stress at flowering",
    },
  },
  {
    crop: "Mustard",
    localNameHi: "सरसों",
    seasons: ["rabi"],
    soilTypes: ["loam", "sandy loam", "alluvial"],
    phRange: [6.0, 7.5],
    waterNeedMm: [240, 400],
    durationDays: [110, 140],
    typicalYieldQPerAcre: 6,
    notes: "Low water need, 1-2 irrigations (flowering + siliqua fill); tolerates mild salinity/alkalinity; Rajasthan-UP-Haryana belt.",
    marketOutlook: "Edible-oil demand keeps mustard near ₹5,400/q (above MSP most years).",
    risks: ["Aphid attack in cloudy January weather", "Frost damage at flowering in north-west plains"],
    inputs: {
      seed: "2 kg/acre, line sown",
      fertilizer: "32:16:0 NPK kg/acre + 8 kg sulphur (boosts oil %)",
      irrigation: "1-2 irrigations — flowering and siliqua fill",
    },
  },
  {
    crop: "Gram (Chickpea)",
    localNameHi: "चना",
    seasons: ["rabi"],
    soilTypes: ["loam", "clay loam", "black (residual moisture)"],
    phRange: [6.0, 7.5],
    waterNeedMm: [250, 400],
    durationDays: [100, 120],
    typicalYieldQPerAcre: 6,
    notes:
      "Often grown on conserved soil moisture; excess irrigation/N causes vegetative overgrowth; wilt-resistant varieties in continuous-gram fields.",
    marketOutlook: "Dal-mill demand firm; MSP ₹5,650/q with NAFED procurement support.",
    risks: ["Pod borer (Helicoverpa) — pheromone traps from flowering", "Wilt in fields cropped to gram year after year"],
    inputs: {
      seed: "30-32 kg/acre, Rhizobium treated",
      fertilizer: "8:16:0 NPK kg/acre basal only",
      irrigation: "Grows on residual moisture; at most 1 light irrigation at pod fill",
    },
  },
  {
    crop: "Onion",
    localNameHi: "प्याज",
    seasons: ["kharif", "late kharif", "rabi"],
    soilTypes: ["loam", "alluvial", "medium black, friable"],
    phRange: [6.0, 7.0],
    waterNeedMm: [350, 550],
    durationDays: [100, 140],
    typicalYieldQPerAcre: 120,
    notes: "Rabi crop stores best; stop irrigation 10-15 days before harvest; Nashik/Maharashtra dominates supply.",
    marketOutlook: "Lasalgaon benchmark swings ₹800-3,500/q; rabi harvest stores 4-6 months for better exits.",
    risks: ["Price collapse at peak rabi arrivals — storage decides profit", "Purple blotch and thrips in humid weather"],
    inputs: {
      seed: "3-4 kg seed/acre (nursery, 45-day transplant)",
      fertilizer: "40:20:24 NPK kg/acre + 8 kg sulphur (pungency + keeping)",
      irrigation: "Light irrigation every 10-12 days; stop 10-15 days pre-harvest",
    },
  },
  {
    crop: "Potato",
    localNameHi: "आलू",
    seasons: ["rabi (plains)", "summer (hills)"],
    soilTypes: ["sandy loam", "loam, well-drained, K-rich"],
    phRange: [5.2, 6.5],
    waterNeedMm: [500, 700],
    durationDays: [90, 120],
    typicalYieldQPerAcre: 100,
    notes: "Prefers slightly acidic soil (scab risk above pH 7); earthing-up at 30 DAS; late blight in cool-humid spells; UP/WB/Bihar belt.",
    marketOutlook: "Cold-storage arbitrage drives returns; ₹1,000-1,800/q at harvest, higher off-season.",
    risks: ["Late blight in cool humid spells — prophylactic sprays needed", "Common scab if soil pH is above 7"],
    inputs: {
      seed: "800-1000 kg certified tubers/acre",
      fertilizer: "48:32:48 NPK kg/acre — potash-hungry crop",
      irrigation: "5-6 light irrigations; earthing-up at 30 days",
    },
  },
  {
    crop: "Sugarcane",
    localNameHi: "गन्ना",
    seasons: ["annual (spring/adsali planting)"],
    soilTypes: ["deep loam", "clay loam", "medium black"],
    phRange: [6.5, 7.5],
    waterNeedMm: [1500, 2500],
    durationDays: [300, 365],
    typicalYieldQPerAcre: 350,
    notes: "Highest water user (FAO 1500-2500mm); formative phase (0-120d) irrigation critical; ratoon crops cut cost ~30%.",
    marketOutlook: "Mill FRP ₹340/q assured but payments lag; nearby mill contract is essential.",
    risks: ["Extreme water demand — only with canal/borewell certainty", "Mill payment delays; 12-month capital lock-in"],
    inputs: {
      seed: "14,000-16,000 three-bud setts/acre",
      fertilizer: "100:50:50 NPK kg/acre in 3 splits + FYM 10 t",
      irrigation: "Every 7-10 days in formative phase (first 120 days)",
    },
  },
  {
    crop: "Bajra (Pearl Millet)",
    localNameHi: "बाजरा",
    seasons: ["kharif", "zaid (summer)"],
    soilTypes: ["sandy", "sandy loam, light"],
    phRange: [6.5, 7.8],
    waterNeedMm: [350, 500],
    durationDays: [75, 90],
    typicalYieldQPerAcre: 7,
    notes: "Most drought-hardy cereal; viable at 250-400mm rainfall; tolerates salinity better than most crops; Rajasthan/Gujarat belt.",
    marketOutlook: "Shree Anna (millet mission) demand rising; ₹2,300-2,600/q with MSP backstop.",
    risks: ["Downy mildew — use resistant hybrids", "Bird damage near harvest in small plots"],
    inputs: {
      seed: "1.5-2 kg/acre hybrid",
      fertilizer: "16:16:0 NPK kg/acre (low-input crop)",
      irrigation: "Mostly rainfed; 1 protective irrigation at ear emergence if dry",
    },
  },
];

// ---------------------------------------------------------------------------
// Deterministic fallback scorer — must look excellent without Gemini
// ---------------------------------------------------------------------------

const IRRIGATION_CAPACITY_MM: Record<WaterSource, number> = {
  rainfed: 0,
  drip: 500,
  borewell: 650,
  canal: 850,
};

const round = (n: number) => Math.round(n);

function waterNeedLevel(crop: CropAgronomy): "low" | "medium" | "high" {
  const mid = (crop.waterNeedMm[0] + crop.waterNeedMm[1]) / 2;
  if (mid < 450) return "low";
  if (mid > 900) return "high";
  return "medium";
}

const SOIL_KEYWORDS: Record<IndianSoilKey, string[]> = {
  black_regur: ["black", "regur", "vertisol"],
  alluvial: ["alluvial"],
  red: ["red"],
  laterite: ["laterite"],
  arid_desert: ["sandy", "light"],
  saline_alkaline_usar: ["saline", "alkaline"],
  peaty_marshy: ["marshy", "peaty"],
  forest_mountain: ["mountain", "forest"],
};

function soilFitScore(crop: CropAgronomy, texture: string | null, soilKey: IndianSoilKey | null): 20 | 12 | 4 {
  const tokens = crop.soilTypes.map((t) => t.toLowerCase());
  const tex = (texture ?? "").toLowerCase();
  const keyWords = soilKey ? SOIL_KEYWORDS[soilKey] : [];
  const full =
    (tex.length > 0 && tokens.some((t) => t.includes(tex) || tex.split(" ").every((w) => t.includes(w)))) ||
    tokens.some((t) => keyWords.some((w) => t.includes(w)));
  if (full) return 20;
  const partial = tex.includes("loam") && tokens.some((t) => t.includes("loam"));
  return partial ? 12 : 4;
}

/**
 * Deterministic crop scorer — the cached fallback for /api/recommend.
 * Grounds every "why" bullet in the actual soil/weather numbers passed in.
 *
 * @param soilTypeName optional Indian soil type display name (e.g. "Black cotton soil (Regur)")
 */
export function scoreCrops(
  soil: SoilSnapshot,
  weather: WeatherSnapshot,
  season: string,
  waterSource: WaterSource,
  soilTypeName?: string,
  soilKey?: IndianSoilKey | null,
): CropRecommendation[] {
  const key = season.trim().toLowerCase();
  const seasonOut: SeasonName = key.startsWith("rabi") ? "Rabi" : key.startsWith("zaid") ? "Zaid" : "Kharif";
  const rain16 = weather.next16dRainMm ?? 60;
  const tmax = weather.avgTmaxC;

  const scored = AGRONOMY_TABLE.map((crop) => {
    // 1. Season fit (0-30) — "summer (hills)" does not count as plains Zaid
    const seasonTokens = crop.seasons.join(" ").toLowerCase();
    const seasonMatch =
      seasonTokens.includes(key) ||
      (key === "zaid" && seasonTokens.includes("summer") && !seasonTokens.includes("summer (hills)"));
    const sSeason = seasonMatch ? 30 : seasonTokens.includes("annual") ? 22 : 0;

    // 2. pH fit (0-25) — continuous: distance from the ideal-range CENTER also
    // differentiates crops the pH merely "fits", so ranks don't flatten.
    const [phLo, phHi] = crop.phRange;
    let sPh = 15; // neutral assumption when no reading
    let phDist = 0;
    if (soil.ph != null) {
      phDist = soil.ph < phLo ? phLo - soil.ph : soil.ph > phHi ? soil.ph - phHi : 0;
      if (phDist === 0) {
        const center = (phLo + phHi) / 2;
        const halfWidth = Math.max(0.25, (phHi - phLo) / 2);
        sPh = 25 - (Math.abs(soil.ph - center) / halfWidth) * 4;
      } else {
        sPh = Math.max(0, 25 - phDist * 20);
      }
    }

    // 3. Water fit (0-25): projected season rain + irrigation capacity vs crop need
    const durMid = (crop.durationDays[0] + crop.durationDays[1]) / 2;
    const projectedRain = Math.min(1100, rain16 * (durMid / 16));
    const supply = projectedRain + IRRIGATION_CAPACITY_MM[waterSource];
    const needMid = (crop.waterNeedMm[0] + crop.waterNeedMm[1]) / 2;
    const ratio = supply / needMid;
    let sWater = ratio >= 1 ? 25 : 25 * Math.pow(ratio, 1.5);
    // Drought-hardy / residual-moisture crops stay viable rainfed
    if (waterSource === "rainfed" && crop.waterNeedMm[1] <= 500) sWater = Math.max(sWater, 18);
    // Thirsty crops on pure rainfed carry real failure risk even in a good monsoon
    if (waterSource === "rainfed" && needMid > 900) sWater -= 6;

    // 4. Soil/texture fit (0-20)
    const sSoil = soilFitScore(crop, soil.texture, soilKey ?? null);

    const raw = sSeason + sPh + sWater + sSoil;
    const score = Math.max(25, Math.min(96, Math.round(raw * 0.97)));

    // --- Grounded reasons with the real numbers ---
    const why: string[] = [];
    if (soil.ph != null) {
      why.push(
        phDist === 0
          ? `Your soil pH ${soil.ph} sits inside ${crop.crop}'s ideal ${phLo}–${phHi} window`
          : phDist <= 0.3
            ? `Soil pH ${soil.ph} is just ${soil.ph < phLo ? "below" : "above"} the ideal ${phLo}–${phHi} — acceptable for ${crop.crop}`
            : `Soil pH ${soil.ph} is ${soil.ph < phLo ? "below" : "above"} the ideal ${phLo}–${phHi} — manageable with ${soil.ph < phLo ? "liming" : "gypsum + organic matter"}`,
      );
    }
    if (soil.clayPct != null && soil.texture) {
      // Avoid "44% clay clay" when the texture class itself is "clay"
      const textureWord = soil.texture === "clay" ? "" : `${soil.texture} `;
      const soilLabel = soilTypeName ? `${soilTypeName} ` : "";
      why.push(
        sSoil === 20
          ? `${round(soil.clayPct)}% clay ${textureWord}${soilLabel}— a listed ${crop.crop} soil (${crop.soilTypes[0]})`
          : `${round(soil.clayPct)}% clay ${textureWord}${soilLabel}is workable for ${crop.crop} with good drainage`,
      );
    }
    why.push(
      `Needs ${crop.waterNeedMm[0]}–${crop.waterNeedMm[1]} mm for the season vs ~${round(projectedRain)} mm projected rain${
        IRRIGATION_CAPACITY_MM[waterSource] > 0 ? ` + ${waterSource} irrigation` : " (rainfed)"
      }`,
    );
    if (tmax != null) {
      why.push(
        `16-day outlook: ${round(rain16)} mm rain, avg max ${Math.round(tmax * 10) / 10}°C — ${
          seasonMatch ? `right in the ${seasonOut} window` : `off its main season; take only with assured irrigation`
        }`,
      );
    }

    const risks = [...crop.risks];
    if (ratio < 0.7) {
      risks.push(
        `Water gap: supply ~${round(supply)} mm vs need ~${round(needMid)} mm — plan protective irrigation or drop rank`,
      );
    }

    const y = crop.typicalYieldQPerAcre;
    const rec: CropRecommendation = {
      crop: crop.crop,
      localName: crop.localNameHi,
      suitabilityScore: score,
      season: seasonOut,
      waterNeed: waterNeedLevel(crop),
      durationDays: `${crop.durationDays[0]}-${crop.durationDays[1]}`,
      expectedYield: `${round(y * 0.85)}-${round(y * 1.15)} quintal/acre`,
      marketOutlook: crop.marketOutlook,
      why: why.slice(0, 4),
      risks,
      inputs: crop.inputs,
    };
    return { rec, raw, yieldQ: y };
  });

  // Sort on the un-rounded raw score so genuinely close crops still rank on
  // real signal (not on a quintal-units yield artifact that favours vegetables).
  const top = scored
    .sort((a, b) => b.raw - a.raw || b.yieldQ - a.yieldQ)
    .slice(0, 5)
    .map((s) => s.rec);
  // Break display ties (rounding artifacts) so the ranking reads as a ranking.
  for (let i = 1; i < top.length; i++) {
    top[i].suitabilityScore = Math.max(25, Math.min(top[i].suitabilityScore, top[i - 1].suitabilityScore - 1));
  }
  return top;
}

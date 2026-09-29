// Irrigation advisory — deterministic satellite/model soil-moisture logic.
// Server-compatible pure logic; no React, no 'use client'.
//
// India has NO open real-time ground sensor feeds (WINDS is procurement-gated,
// IMD AWS portal locked May 2025 — verified in research/sensors-irrigation.json),
// so this uses the validated fallback: Open-Meteo model-assimilated volumetric
// soil moisture (soil_moisture_0_to_7cm, m3/m3) + FAO-56 ET0 + forecast rain.
//
// Rule (from sensors research): irrigate when soil moisture < PWP + 0.5*(FC-PWP)
// (50% management-allowed depletion). Crop water need mm/day = ET0 x Kc.

export type IrrigationAdvice = {
  shouldIrrigate: boolean;
  advice: string; // Hindi, farmer-facing, actionable
  reasoning: string; // English, ops/dashboard explanation with the real numbers
};

// Loam reference water constants, volumetric m3/m3 (alluvial loam — the widest
// Indian cropland soil class; matches Open-Meteo soil moisture units).
export const SOIL_WATER = {
  fieldCapacity: 0.31,
  wiltingPoint: 0.13,
  /** Refill point: 50% depletion between PWP and FC -> irrigate below this. */
  refillPoint: 0.13 + 0.5 * (0.31 - 0.13), // 0.22 m3/m3
  /** Near/above field capacity — soil effectively full, skip irrigation. */
  saturated: 0.3,
} as const;

// FAO-56 mid-season crop coefficients (peak demand — kharif season default).
export const KC_MID: Record<string, number> = {
  rice: 1.2,
  wheat: 1.15,
  cotton: 1.18,
  sugarcane: 1.25,
  maize: 1.2,
  soybean: 1.15,
  "pearl millet": 1.0,
  tomato: 1.15,
  onion: 1.05,
  groundnut: 1.15,
  chilli: 1.05,
  mustard: 1.15,
  gram: 1.0,
  ragi: 1.0,
  potato: 1.15,
  banana: 1.1,
  grapes: 0.85,
  jute: 1.15,
  blackgram: 1.05,
  moong: 1.05,
};

const CROP_ALIASES: Record<string, string> = {
  paddy: "rice",
  dhan: "rice",
  bajra: "pearl millet",
  makka: "maize",
  corn: "maize",
  kapas: "cotton",
  redgram: "gram",
  arhar: "gram",
  tur: "gram",
  moongfali: "groundnut",
  peanut: "groundnut",
  ganna: "sugarcane",
  tamatar: "tomato",
  pyaz: "onion",
  urad: "blackgram",
  mirch: "chilli",
};

const DEFAULT_KC = 1.0;
const DEFAULT_ET0_MM = 4.5; // typical Indian kharif daily ET0 when data missing

function lookupKc(crop: string): { kc: number; matched: string } {
  const key = crop.trim().toLowerCase();
  const canonical = CROP_ALIASES[key] ?? key;
  if (canonical in KC_MID) return { kc: KC_MID[canonical], matched: canonical };
  // Loose match: "Paddy (Dhan)" / "Cotton - kharif" style inputs.
  for (const name of Object.keys(KC_MID)) {
    if (key.includes(name)) return { kc: KC_MID[name], matched: name };
  }
  for (const [alias, target] of Object.entries(CROP_ALIASES)) {
    if (key.includes(alias)) return { kc: KC_MID[target], matched: target };
  }
  return { kc: DEFAULT_KC, matched: "generic crop" };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Deterministic irrigation decision from model soil moisture + water balance.
 *
 * @param soilMoisture topsoil volumetric moisture, m3/m3 (Open-Meteo soil_moisture_0_to_7cm); null if unavailable
 * @param et0 daily FAO-56 reference evapotranspiration, mm; null if unavailable
 * @param next7dRain total forecast rainfall next 7 days, mm; null if unavailable
 * @param crop crop name (English or common Hindi transliteration)
 */
export function irrigationAdvice(
  soilMoisture: number | null,
  et0: number | null,
  next7dRain: number | null,
  crop: string,
): IrrigationAdvice {
  const { kc, matched } = lookupKc(crop);
  const dailyEt0 = et0 ?? DEFAULT_ET0_MM;
  const weeklyNeed = dailyEt0 * kc * 7; // mm over next 7 days
  const rain = next7dRain ?? 0;
  const deficit = weeklyNeed - rain;

  const balanceEn =
    `weekly crop water need ~${r1(weeklyNeed)} mm (ET0 ${r1(dailyEt0)} mm/day x Kc ${kc} for ${matched}` +
    `${et0 == null ? ", ET0 defaulted" : ""}) vs ${r1(rain)} mm forecast rain (7d)`;

  // 1. Soil already at/above field capacity — irrigation wasteful; drainage if a wet week is coming.
  if (soilMoisture != null && soilMoisture >= SOIL_WATER.saturated) {
    const wetWeek = rain >= 50;
    return {
      shouldIrrigate: false,
      advice: wetWeek
        ? `सिंचाई बिल्कुल न करें — मिट्टी पहले से पानी से भरी है और इस हफ्ते लगभग ${Math.round(rain)} मिमी बारिश का अनुमान है। खेत में जल निकासी की नालियां साफ करें ताकि जड़ें न सड़ें।`
        : `अभी सिंचाई की जरूरत नहीं — मिट्टी में भरपूर नमी है। 4-5 दिन बाद खेत की नमी दोबारा जांचें।`,
      reasoning: `Topsoil moisture ${r2(soilMoisture)} m3/m3 is at/above field capacity band (>=${SOIL_WATER.saturated}); ${balanceEn}. Irrigation would risk waterlogging${wetWeek ? "; heavy rain incoming — drainage advised" : ""}.`,
    };
  }

  // 2. Forecast rain alone covers the crop's weekly demand — let the rain do it.
  if (rain >= weeklyNeed) {
    return {
      shouldIrrigate: false,
      advice: `सिंचाई रोकें — अगले 7 दिनों में लगभग ${Math.round(rain)} मिमी बारिश का अनुमान है, जो फसल की जरूरत पूरी कर देगी। बारिश के बाद खेत में पानी जमा न होने दें।`,
      reasoning: `Forecast rain ${r1(rain)} mm (7d) meets or exceeds weekly crop water need ~${r1(weeklyNeed)} mm (ET0 ${r1(dailyEt0)} mm/day x Kc ${kc} for ${matched}). Skip irrigation; watch for waterlogging after the spell.`,
    };
  }

  // 3. Moisture below the 50%-depletion refill point and a real deficit ahead — irrigate.
  if (soilMoisture != null && soilMoisture < SOIL_WATER.refillPoint && deficit > 0) {
    const depthMm = Math.min(60, Math.max(20, Math.round(deficit / 5) * 5));
    return {
      shouldIrrigate: true,
      advice: `सिंचाई करें — मिट्टी में नमी कम हो गई है और इस हफ्ते सिर्फ ${Math.round(rain)} मिमी बारिश का अनुमान है। शाम के समय लगभग ${depthMm} मिमी (एक हल्की सिंचाई) पानी दें। क्यारी में पानी जमा न करें।`,
      reasoning: `Topsoil moisture ${r2(soilMoisture)} m3/m3 < refill point ${r2(SOIL_WATER.refillPoint)} (50% depletion between PWP ${SOIL_WATER.wiltingPoint} and FC ${SOIL_WATER.fieldCapacity}, loam); ${balanceEn} -> deficit ~${r1(deficit)} mm. Recommend ~${depthMm} mm evening irrigation.`,
    };
  }

  // 4. No soil-moisture reading — decide on water balance alone (conservative).
  if (soilMoisture == null) {
    if (rain < 0.5 * weeklyNeed) {
      const depthMm = Math.min(60, Math.max(20, Math.round(deficit / 5) * 5));
      return {
        shouldIrrigate: true,
        advice: `इस हफ्ते बारिश कम (लगभग ${Math.round(rain)} मिमी) रहने का अनुमान है। खेत की मिट्टी मुट्ठी में दबाकर देखें — अगर भुरभुरी है तो शाम को लगभग ${depthMm} मिमी हल्की सिंचाई करें।`,
        reasoning: `No soil-moisture reading available; water balance alone: ${balanceEn} -> forecast rain under 50% of need (deficit ~${r1(deficit)} mm). Advise irrigation with a field squeeze-test check.`,
      };
    }
    return {
      shouldIrrigate: false,
      advice: `अगले 7 दिनों में लगभग ${Math.round(rain)} मिमी बारिश का अनुमान है — अभी सिंचाई रोकें। 3 दिन बाद खेत की नमी देखकर फैसला करें।`,
      reasoning: `No soil-moisture reading available; ${balanceEn} — rain covers over half the need. Hold irrigation and re-check in 3 days.`,
    };
  }

  // 5. Moisture adequate (between refill point and saturation) — hold and re-check.
  return {
    shouldIrrigate: false,
    advice: `अभी सिंचाई की जरूरत नहीं — मिट्टी में पर्याप्त नमी है। 3-4 दिन बाद दोबारा जांचें, खासकर अगर बारिश न हो।`,
    reasoning: `Topsoil moisture ${r2(soilMoisture)} m3/m3 is above refill point ${r2(SOIL_WATER.refillPoint)} (adequate zone below FC ${SOIL_WATER.fieldCapacity}); ${balanceEn}. No irrigation needed yet; re-check in 3-4 days.`,
  };
}

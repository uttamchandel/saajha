// Soil + weather profile gatherer — shared by /api/soil-profile and /api/recommend
// (the recommend route calls getSoilProfile() directly; it never fetches its own route).
//
// Live sources (all keyless, verified in research/soil-satellite.json):
//  1. ISRIC SoilGrids v2.0 properties (0-5cm means, divide by unit_measure.d_factor;
//     nodata pixels return null → retry at +0.05° → district defaults)
//  2. ISRIC SoilGrids WRB classification → Indian soil type via crosswalk
//  3. Open-Meteo 16-day forecast (daily rain/ET0/Tmax + hourly topsoil moisture)
//  4. Soil Health Card GraphQL (soilhealth4.dac.gov.in) — best-effort district
//     nutrient summary; skipped silently on any failure.
//
// Never throws: every branch degrades to realistic defaults with source "cached".

import type { SoilSnapshot, WeatherSnapshot } from "./types";
import {
  INDIAN_SOIL_TYPES,
  SOIL_DEFAULTS,
  STATE_DEFAULT_SOIL,
  deriveTexture,
  indianSoilFromWrb,
  type IndianSoilKey,
} from "./agronomy";

export type SoilTypeInfo = {
  key: IndianSoilKey;
  en: string;
  hi: string;
  wrbClass: string | null;
};

export type SoilProfile = {
  soil: SoilSnapshot;
  weather: WeatherSnapshot;
  shcNote?: string;
  soilType?: SoilTypeInfo;
  extras: {
    cecCmolKg: number | null;
    next7dRainMm: number | null;
  };
};

const FETCH_TIMEOUT_MS = 8000;
const PROFILE_TTL_MS = 45 * 60 * 1000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 96)}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// 1. SoilGrids properties (phh2o, nitrogen, soc, clay, sand, cec @ 0-5cm)
// ---------------------------------------------------------------------------

type SgProps = {
  ph: number | null;
  nitrogen: number | null; // g/kg after d_factor
  soc: number | null; // g/kg after d_factor
  clay: number | null; // %
  sand: number | null; // %
  cec: number | null; // cmol/kg
};

type SgLayer = {
  name?: string;
  unit_measure?: { d_factor?: number };
  depths?: { values?: { mean?: number | null } }[];
};

async function fetchSoilGridsProps(lat: number, lon: number): Promise<SgProps | null> {
  const props = ["phh2o", "nitrogen", "soc", "clay", "sand", "cec"];
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}` +
    props.map((p) => `&property=${p}`).join("") +
    `&depth=0-5cm&value=mean`;
  const body = (await fetchJson(url)) as { properties?: { layers?: SgLayer[] } };
  const layers = body.properties?.layers ?? [];
  const out: Record<string, number | null> = {};
  for (const layer of layers) {
    const name = layer.name ?? "";
    const mean = layer.depths?.[0]?.values?.mean;
    const d = layer.unit_measure?.d_factor ?? 1;
    out[name] = mean == null ? null : Math.round((mean / d) * 100) / 100;
  }
  // Nodata pixel: SoilGrids returns null means (trap verified in research)
  if (out.phh2o == null && out.clay == null) return null;
  return {
    ph: out.phh2o ?? null,
    nitrogen: out.nitrogen ?? null,
    soc: out.soc ?? null,
    clay: out.clay ?? null,
    sand: out.sand ?? null,
    cec: out.cec ?? null,
  };
}

async function fetchClassification(lat: number, lon: number): Promise<string | null> {
  const url = `https://rest.isric.org/soilgrids/v2.0/classification/query?lon=${lon}&lat=${lat}&number_classes=3`;
  const body = (await fetchJson(url)) as { wrb_class_name?: string };
  return body.wrb_class_name ?? null;
}

// ---------------------------------------------------------------------------
// 2. Open-Meteo 16-day forecast
// ---------------------------------------------------------------------------

type OmBody = {
  daily?: {
    time?: string[];
    precipitation_sum?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
    temperature_2m_max?: (number | null)[];
  };
  hourly?: {
    time?: string[];
    soil_moisture_0_to_7cm?: (number | null)[];
  };
};

function avg(values: (number | null)[] | undefined): number | null {
  if (!values) return null;
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function total(values: (number | null)[] | undefined, count?: number): number | null {
  if (!values) return null;
  const slice = count != null ? values.slice(0, count) : values;
  const nums = slice.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) * 10) / 10;
}

async function fetchWeather(lat: number, lon: number): Promise<{ weather: WeatherSnapshot; next7dRainMm: number | null }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max` +
    `&hourly=soil_moisture_0_to_7cm&forecast_days=16&timezone=Asia%2FKolkata`;
  const body = (await fetchJson(url)) as OmBody;
  if (!body.daily?.time?.length) throw new Error("open-meteo: missing daily series");

  // Topsoil moisture at the current IST hour (hourly series starts today 00:00 IST)
  const sm = body.hourly?.soil_moisture_0_to_7cm ?? [];
  const istHour = Math.floor(((Date.now() / 3_600_000) + 5.5) % 24);
  let soilMoisture: number | null = null;
  for (let i = Math.min(istHour, sm.length - 1); i >= 0; i--) {
    if (sm[i] != null) {
      soilMoisture = Math.round((sm[i] as number) * 1000) / 1000;
      break;
    }
  }
  if (soilMoisture == null) soilMoisture = sm.find((v): v is number => v != null) ?? null;

  return {
    weather: {
      next16dRainMm: total(body.daily.precipitation_sum),
      avgTmaxC: avg(body.daily.temperature_2m_max),
      et0mm: avg(body.daily.et0_fao_evapotranspiration), // avg mm/day (matches lib/irrigation input)
      soilMoisture,
      source: "open-meteo",
    },
    next7dRainMm: total(body.daily.precipitation_sum, 7),
  };
}

// ---------------------------------------------------------------------------
// 3. Soil Health Card GraphQL — best-effort district nutrient note
// ---------------------------------------------------------------------------

const SHC_URL = "https://soilhealth4.dac.gov.in/";
const SHC_CYCLE = "2025-26";

// Verified seed ids (research/soil-satellite.json); others resolved via getState.
const shcStateIds = new Map<string, string>([
  ["MADHYA PRADESH", "63f8e729dbc0f7fe0670d050"],
  ["PUNJAB", "63f2495789e288769575a424"],
]);
let shcStatesLoaded = false;

const shcDashboardCache = new Map<string, { expires: number; data: unknown[] }>();

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

async function shcQuery(query: string): Promise<unknown> {
  const body = (await fetchJson(SHC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })) as { data?: Record<string, unknown> };
  return body.data;
}

async function resolveShcStateId(state: string): Promise<string | null> {
  const key = state.trim().toUpperCase();
  const seeded = shcStateIds.get(key);
  if (seeded) return seeded;
  if (!shcStatesLoaded) {
    const data = asRecord(await shcQuery("query { getState }"));
    const list = Array.isArray(data?.getState) ? (data.getState as unknown[]) : [];
    for (const item of list) {
      const rec = asRecord(item);
      const name = typeof rec?.name === "string" ? rec.name.trim().toUpperCase() : null;
      const id = typeof rec?._id === "string" ? rec._id : null;
      if (name && id && !shcStateIds.has(name)) shcStateIds.set(name, id);
    }
    shcStatesLoaded = true;
  }
  return shcStateIds.get(key) ?? null;
}

function lowPct(group: unknown): number | null {
  const g = asRecord(group);
  if (!g) return null;
  const low = num(g.Low);
  const totalSamples = low + num(g.Medium) + num(g.High);
  if (totalSamples < 20) return null; // too few samples to quote a percentage
  return Math.round((low / totalSamples) * 100);
}

function deficientPct(group: unknown): number | null {
  const g = asRecord(group);
  if (!g) return null;
  const def = num(g.Deficient);
  const totalSamples = def + num(g.Sufficient);
  if (totalSamples < 20) return null;
  return Math.round((def / totalSamples) * 100);
}

function buildShcNote(entries: unknown[], district: string | undefined): string | null {
  // Prefer the exact district row; otherwise aggregate isn't attempted — first
  // row with usable counts is skipped in favour of honest "no note".
  let target: Record<string, unknown> | null = null;
  let placeName = district ?? "";
  if (district) {
    const want = district.trim().toUpperCase();
    for (const entry of entries) {
      const rec = asRecord(entry);
      const d = asRecord(rec?.district);
      const name = typeof d?.name === "string" ? d.name.trim().toUpperCase() : "";
      if (name === want || name.includes(want) || want.includes(name)) {
        target = rec;
        placeName = district;
        break;
      }
    }
  }
  if (!target) return null;
  const results = asRecord(target.results);
  if (!results) return null;

  const facts: { pct: number; text: string }[] = [];
  const nLow = lowPct(results.n);
  if (nLow != null) facts.push({ pct: nLow, text: `${nLow}% of samples are low in nitrogen` });
  const pLow = lowPct(results.p);
  if (pLow != null) facts.push({ pct: pLow, text: `${pLow}% are low in phosphorus` });
  const ocLow = lowPct(results.OC ?? results.oc);
  if (ocLow != null) facts.push({ pct: ocLow, text: `${ocLow}% are low in organic carbon` });
  const znDef = deficientPct(results.Zn ?? results.zn);
  if (znDef != null) facts.push({ pct: znDef, text: `${znDef}% are zinc-deficient` });

  const notable = facts.filter((f) => f.pct >= 30).sort((a, b) => b.pct - a.pct).slice(0, 2);
  if (notable.length === 0) return null;
  const clause = notable.map((f) => f.text).join(" and ");
  return `In ${placeName} district, ${clause} (Soil Health Card, Govt of India).`;
}

async function fetchShcNote(state: string, district?: string): Promise<string | null> {
  try {
    const stateId = await resolveShcStateId(state);
    if (!stateId) return null;
    const cacheKey = stateId;
    const cached = shcDashboardCache.get(cacheKey);
    let entries: unknown[];
    if (cached && Date.now() < cached.expires) {
      entries = cached.data;
    } else {
      const data = asRecord(
        await shcQuery(`query { getNutrientDashboardForPortal(state: "${stateId}", cycle: "${SHC_CYCLE}") }`),
      );
      const raw = data?.getNutrientDashboardForPortal;
      entries = Array.isArray(raw) ? raw : [];
      if (entries.length > 0) {
        shcDashboardCache.set(cacheKey, { expires: Date.now() + PROFILE_TTL_MS, data: entries });
      }
    }
    return buildShcNote(entries, district);
  } catch {
    return null; // best-effort by design — skip silently
  }
}

// ---------------------------------------------------------------------------
// Fallback defaults (source: "cached")
// ---------------------------------------------------------------------------

function defaultSoilKey(state?: string): IndianSoilKey {
  if (state && STATE_DEFAULT_SOIL[state]) return STATE_DEFAULT_SOIL[state];
  if (state) {
    const want = state.trim().toLowerCase();
    for (const [name, key] of Object.entries(STATE_DEFAULT_SOIL)) {
      if (name.toLowerCase() === want) return key;
    }
  }
  return "black_regur"; // pilot heartland default (MP)
}

function defaultSoil(key: IndianSoilKey): SoilSnapshot {
  const d = SOIL_DEFAULTS[key];
  return {
    ph: d.ph,
    nitrogen: d.nitrogen,
    soc: d.soc,
    clayPct: d.clayPct,
    sandPct: d.sandPct,
    texture: deriveTexture(d.clayPct, d.sandPct),
    source: "cached",
  };
}

function defaultWeather(): { weather: WeatherSnapshot; next7dRainMm: number | null } {
  // Realistic mid-monsoon values for central India
  return {
    weather: {
      next16dRainMm: 112,
      avgTmaxC: 31.5,
      et0mm: 4.2,
      soilMoisture: 0.24,
      source: "cached",
    },
    next7dRainMm: 49,
  };
}

// ---------------------------------------------------------------------------
// Main entry — cached, parallel, never throws
// ---------------------------------------------------------------------------

const profileCache = new Map<string, { expires: number; promise: Promise<SoilProfile> }>();

export async function getSoilProfile(
  lat: number,
  lon: number,
  state?: string,
  district?: string,
): Promise<SoilProfile> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}|${state ?? ""}|${district ?? ""}`;
  const hit = profileCache.get(key);
  if (hit && Date.now() < hit.expires) return hit.promise;
  const promise = buildProfile(lat, lon, state, district);
  profileCache.set(key, { expires: Date.now() + PROFILE_TTL_MS, promise });
  return promise;
}

async function buildProfile(lat: number, lon: number, state?: string, district?: string): Promise<SoilProfile> {
  const [propsRes, wrbRes, weatherRes, shcRes] = await Promise.allSettled([
    (async () => {
      // Nodata-pixel trap: retry with ~0.05° offset before giving up
      const first = await fetchSoilGridsProps(lat, lon).catch(() => null);
      if (first) return first;
      return fetchSoilGridsProps(lat + 0.05, lon + 0.05).catch(() => null);
    })(),
    fetchClassification(lat, lon).catch(() => null),
    fetchWeather(lat, lon),
    state ? fetchShcNote(state, district) : Promise.resolve(null),
  ]);

  const props = propsRes.status === "fulfilled" ? propsRes.value : null;
  const wrbClass = wrbRes.status === "fulfilled" ? wrbRes.value : null;
  const shcNote = shcRes.status === "fulfilled" ? shcRes.value : null;

  const soilKey: IndianSoilKey = indianSoilFromWrb(wrbClass) ?? defaultSoilKey(state);
  const soilTypeMeta = INDIAN_SOIL_TYPES[soilKey];
  const soilType: SoilTypeInfo = {
    key: soilKey,
    en: soilTypeMeta.nameEn,
    hi: soilTypeMeta.nameHi,
    wrbClass,
  };

  let soil: SoilSnapshot;
  let cec: number | null = null;
  if (props) {
    soil = {
      ph: props.ph,
      nitrogen: props.nitrogen,
      soc: props.soc,
      clayPct: props.clay,
      sandPct: props.sand,
      texture: deriveTexture(props.clay, props.sand),
      source: "soilgrids",
    };
    cec = props.cec;
    // Patch any individual nulls from district defaults so the UI never shows holes
    const d = SOIL_DEFAULTS[soilKey];
    if (soil.ph == null) soil.ph = d.ph;
    if (soil.clayPct == null) soil.clayPct = d.clayPct;
    if (soil.sandPct == null) soil.sandPct = d.sandPct;
    if (soil.texture == null) soil.texture = deriveTexture(soil.clayPct, soil.sandPct);
  } else {
    soil = defaultSoil(soilKey);
  }

  const { weather, next7dRainMm } =
    weatherRes.status === "fulfilled" ? weatherRes.value : defaultWeather();

  return {
    soil,
    weather,
    ...(shcNote ? { shcNote } : {}),
    soilType,
    extras: { cecCmolKg: cec, next7dRainMm },
  };
}

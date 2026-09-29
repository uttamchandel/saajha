// GET /api/soil-profile?lat=&lon=&state=&district=
// Merged land snapshot: SoilGrids properties + WRB→Indian soil type +
// Open-Meteo 16-day forecast + best-effort Soil Health Card district note.
// All gathering lives in lib/soil-profile (shared with /api/recommend).
// Never returns an error payload — every branch degrades to source "cached".

import { NextRequest, NextResponse } from "next/server";
import { DISTRICTS } from "@/lib/districts";
import { getSoilProfile } from "@/lib/soil-profile";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  let lat = Number.parseFloat(sp.get("lat") ?? "");
  let lon = Number.parseFloat(sp.get("lon") ?? "");
  const state = sp.get("state") ?? undefined;
  const district = sp.get("district") ?? undefined;

  // Missing/garbled coordinates: fall back to the named district's registry
  // coordinates, then to the pilot's first district. Never an error UI.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const match =
      (district && DISTRICTS.find((d) => d.district.toLowerCase() === district.toLowerCase())) ||
      DISTRICTS[0];
    lat = match.lat;
    lon = match.lon;
  }

  try {
    const profile = await getSoilProfile(lat, lon, state, district);
    return NextResponse.json(profile);
  } catch (err) {
    // getSoilProfile is designed never to throw; this is a last-resort belt.
    console.error("soil-profile error:", err instanceof Error ? err.message : err);
    return NextResponse.json({
      soil: {
        ph: 7.4,
        nitrogen: 0.6,
        soc: 6.0,
        clayPct: 44,
        sandPct: 18,
        texture: "clay",
        source: "cached",
      },
      weather: {
        next16dRainMm: 112,
        avgTmaxC: 31.5,
        et0mm: 4.2,
        soilMoisture: 0.24,
        source: "cached",
      },
      soilType: { key: "black_regur", en: "Black cotton soil (Regur)", hi: "काली मिट्टी (रेगुर)", wrbClass: null },
      extras: { cecCmolKg: null, next7dRainMm: 49 },
    });
  }
}

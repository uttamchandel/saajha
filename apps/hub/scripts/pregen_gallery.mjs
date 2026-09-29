// Save real Gemini answers for the held-out gallery photos, so the demo path keeps working
// when Gemini is busy or out of quota. Calls this app's own API routes (start the dev
// server first), applies the same gate as the page, and writes:
//   public/pregen/pregen.json        diagnoses, advisories (per language), audio URLs
//   public/pregen/audio/<id>-<lang>.wav
//
//   node scripts/pregen_gallery.mjs [http://localhost:3200]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const base = (process.argv[2] || "http://localhost:3200").replace(/\/$/, "");
const root = path.resolve(import.meta.dirname, "..", "public");
const PRIMARY = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const HERO_LANGS = ["hi", "ta", "te", "mr", "kn", "en"];
const OTHER_LANGS = ["hi", "en"];
const AUDIO_LANGS = ["hi", "ta", "en"]; // hero only

const run = JSON.parse(readFileSync(path.join(root, "fl", "run.json"), "utf8"));
const gallery = JSON.parse(readFileSync(path.join(root, "fl", "gallery.json"), "utf8"));
const finalId = `global_r${String(run.rounds.at(-1).round).padStart(2, "0")}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(route, body, { tries = 4, wantPrimary = false } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    const r = await fetch(base + route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      if (route === "/api/tts") return Buffer.from(await r.arrayBuffer());
      const j = await r.json();
      if (!wantPrimary || j.model === PRIMARY || i === tries - 1) return j;
      last = `answered by fallback ${j.model}`;
    } else {
      last = `HTTP ${r.status} ${(await r.text()).slice(0, 160)}`;
    }
    console.log(`    retry ${route} (${last})`);
    await sleep(6000 * (i + 1));
  }
  throw new Error(`${route}: ${last}`);
}

// Reuse answers already saved (pass --fresh to ask Gemini again): quota is scarce.
const outPath = path.join(root, "pregen", "pregen.json");
const prev = !process.argv.includes("--fresh") && existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : null;
const out = { generated_at: prev?.generated_at ?? new Date().toISOString(), diagnose: {}, advisory: prev?.advisory ?? {}, audio: prev?.audio ?? {} };
mkdirSync(path.join(root, "pregen", "audio"), { recursive: true });

for (const item of gallery) {
  const image = readFileSync(path.join(root, item.image_url.replace(/^\//, ""))).toString("base64");
  const d = prev?.diagnose?.[item.id] ?? (await post("/api/diagnose", { image, mimeType: "image/jpeg", lang: "en" }, { wantPrimary: true }));
  out.diagnose[item.id] = d;
  const [fedTop, fedP] = item.python_topk[finalId][0];
  // Same rule as lib/gate.ts: the federated model decides; Gemini confirms paddy and gives a second opinion.
  const advise = d.is_plant && d.is_rice && fedP >= run.gate.tau_fed;
  const decidedBy = d.class_key === fedTop ? "agreement" : "federated";
  console.log(
    `${item.true_key.padEnd(18)} gemini ${d.class_key} ${d.confidence}% (${d.model}) | fed ${fedTop} ${(fedP * 100).toFixed(1)}% -> ${advise ? `advise (${decidedBy})` : "expert"}`,
  );
  if (!advise) continue;

  for (const lang of item.hero ? HERO_LANGS : OTHER_LANGS) {
    const key = `${fedTop}|${lang}|${decidedBy}`;
    if (out.advisory[key]) {
      if (!(item.hero && AUDIO_LANGS.includes(lang)) || out.audio[key]) continue;
    }
    const a = out.advisory[key] ?? await post("/api/advisory", {
      class_key: fedTop, decided_by: decidedBy, fed_conf: Math.round(fedP * 10000) / 10000,
      gem_conf: d.confidence, state_id: run.hero.state, lang,
    });
    out.advisory[key] = a;
    console.log(`    advisory ${lang} ok`);
    if (item.hero && AUDIO_LANGS.includes(lang)) {
      const wav = await post("/api/tts", { text: a.spoken_summary, lang });
      const file = `audio/${item.id}-${lang}.wav`;
      writeFileSync(path.join(root, "pregen", file), wav);
      out.audio[key] = `/pregen/${file}`;
      console.log(`    audio ${lang} ${(wav.length / 1e6).toFixed(1)} MB`);
    }
    await sleep(1500);
  }
}

writeFileSync(path.join(root, "pregen", "pregen.json"), JSON.stringify(out, null, 1));
console.log(`saved ${Object.keys(out.diagnose).length} diagnoses, ${Object.keys(out.advisory).length} advisories, ${Object.keys(out.audio).length} audio files`);

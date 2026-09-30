// Check a deployed state node end to end. Exits non-zero on any failure.
//   node scripts/verify_deploy.mjs https://<app>.vercel.app [--skip-gemini] [--photo <file.jpg>]
// Run it against a production build (a deployment, or `next start`): pages load, the
// Gemini routes answer live (source "gemini", not the cached fallback), the keyless data
// routes answer, and the telephony webhooks refuse requests without Twilio's signature.
import { readFileSync } from "node:fs";

// Retry transient network errors (connection resets) up to 3 times; HTTP errors are never retried.
const rawFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await rawFetch(url, init);
    } catch (e) {
      if (attempt >= 3 || e?.name === "TimeoutError" || e?.name === "AbortError") throw e;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
};

const base = (process.argv[2] || "http://localhost:3100").replace(/\/$/, "");
const skipGemini = process.argv.includes("--skip-gemini");
const photoAt = process.argv.indexOf("--photo");
// Default photo: the hub's hero gallery image (rice hispa, Paddy Doctor, attributed in the README).
const photo =
  photoAt > 0 ? process.argv[photoAt + 1] : new URL("../../hub/public/gallery/3d5a3dc3c50fffde08d4b8f8518f6b349b8a62ee.jpg", import.meta.url);
const failures = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
};
const expect = (cond, okMsg, badMsg = okMsg) => (cond ? ok(okMsg) : bad(badMsg));

async function call(path, body, form = false) {
  const init = body
    ? {
        method: "POST",
        headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" },
        body: form ? new URLSearchParams(body) : JSON.stringify(body),
      }
    : {};
  const started = Date.now();
  const r = await fetch(base + path, { ...init, signal: AbortSignal.timeout(120_000) });
  const text = await r.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* TwiML or HTML */
  }
  return { status: r.status, json, secs: ((Date.now() - started) / 1000).toFixed(1) };
}

console.log(`Verifying ${base}`);
for (const page of ["/", "/demo", "/whatsapp", "/recommend", "/command"]) {
  try {
    const r = await fetch(base + page);
    expect(r.ok, `page ${page} ${r.status}`, `page ${page} ${r.status}`);
  } catch (e) {
    bad(`page ${page}: ${e.message}`);
  }
}

// Unsigned webhooks must be refused, or anyone could post fake calls that spend the Gemini quota.
for (const hook of ["sms", "voice", "whatsapp"]) {
  const r = await call(`/api/telephony/${hook}`, { Body: "test", From: "+919999999999" }, true);
  expect(r.status === 403, `/api/telephony/${hook} refuses unsigned requests (403)`, `/api/telephony/${hook} unsigned -> HTTP ${r.status}`);
}

// Keyless live data: these answer with a live source or an honest "cached" one, never an error.
const alerts = await call("/api/alerts");
expect(alerts.status === 200 && Array.isArray(alerts.json.alerts), `/api/alerts -> ${alerts.json.alerts?.length} alerts (source ${alerts.json.source})`, `/api/alerts -> HTTP ${alerts.status}`);
const mandi = await call("/api/mandi?crop=Wheat");
expect(mandi.status === 200 && Array.isArray(mandi.json.rows), `/api/mandi -> ${mandi.json.rows?.length} rows (source ${mandi.json.source})`, `/api/mandi -> HTTP ${mandi.status}`);
const soil = await call("/api/soil-profile");
expect(soil.status === 200, `/api/soil-profile 200`, `/api/soil-profile -> HTTP ${soil.status}`);

// What this node publishes to the hub: district-week counts of at least k, and nothing else.
const pub = await call("/api/exchange/counts");
const fields = new Set((pub.json.counts ?? []).flatMap((c) => Object.keys(c)));
expect(
  pub.status === 200 && pub.json.schema === "saajha.outbreak_counts.v1" && pub.json.k >= 5 && pub.json.counts.every((c) => c.count >= pub.json.k) && [...fields].every((f) => ["district", "iso_week", "condition", "count"].includes(f)),
  `/api/exchange/counts -> ${pub.json.state}: ${pub.json.counts?.length} counts >= ${pub.json.k}, ${pub.json.withheld} held back, only district/week/condition/count`,
  `/api/exchange/counts -> HTTP ${pub.status} ${JSON.stringify(pub.json).slice(0, 160)}`,
);

if (!skipGemini) {
  const adv = await call("/api/advisory", { query: "KAPAS PILA PATTA", lang: "hi", channel: "sms" });
  expect(adv.status === 200 && adv.json.source === "gemini", `/api/advisory -> live Gemini in ${adv.secs}s`, `/api/advisory -> HTTP ${adv.status}, source ${adv.json.source}`);

  // Saajha's decision rule (lib/fed/decide.ts). The default photo is rice hispa; the browser's
  // verdict is simulated here with the hub's latest release fingerprint, as the demo page sends it.
  const image = readFileSync(photo).toString("base64");
  const hub = (process.env.HUB_URL || "https://saajha-hub.vercel.app").replace(/\/$/, "");
  const run = await (await fetch(`${hub}/fl/run.json`)).json();
  const last = run.rounds[run.rounds.length - 1];
  const withModel = await call("/api/diagnose", {
    image, mimeType: "image/jpeg", lang: "hi", channel: "photo",
    federated: { top: "hispa", p: 0.9999, round: last.round, sha256: last.weights_sha256 },
  });
  const d1 = withModel.json.decision ?? {};
  expect(
    withModel.status === 200 && d1.outcome === "advise" && d1.federated?.top === "hispa" && withModel.json.treatment_organic?.length > 0,
    `/api/diagnose + model verdict -> advice for ${withModel.json.disease_en}, decided by ${d1.decidedBy}, Gemini ${d1.secondOpinion?.label} (${d1.secondOpinion?.agrees ? "agrees" : "differs, audit ticket " + d1.ticket?.id}) in ${withModel.secs}s`,
    `/api/diagnose + model verdict -> HTTP ${withModel.status}, outcome ${d1.outcome}`,
  );
  const noModel = await call("/api/diagnose", { image, mimeType: "image/jpeg", lang: "hi", channel: "photo", federated: null });
  const d2 = noModel.json.decision ?? {};
  expect(
    noModel.status === 200 && d2.outcome === "expert" && Boolean(d2.ticket?.id) && !noModel.json.treatment_chemical?.length,
    `/api/diagnose without a model verdict -> expert decides, ticket ${d2.ticket?.id}, no advice guessed`,
    `/api/diagnose without a model verdict -> HTTP ${noModel.status}, outcome ${d2.outcome}`,
  );

  // The officer's alert, drafted by Gemini in the district's language (the officer reads it before sending).
  const draft = await call("/api/alerts/draft", {
    message: "Pink bollworm (cotton) is rising in Yavatmal district of Maharashtra, just across the Penganga river. Check green cotton bolls for pink larvae this week and set pheromone traps. Ask your RSK or KVK before spraying anything. Helpline: 1800-180-1551",
    from: "English",
    to: "Telugu",
  });
  expect(
    draft.status === 200 && /[\u0C00-\u0C7F]/.test(draft.json.text ?? "") && draft.json.text.includes("1800-180-1551"),
    `/api/alerts/draft -> Telugu alert, helpline kept, in ${draft.secs}s`,
    `/api/alerts/draft -> HTTP ${draft.status} ${JSON.stringify(draft.json).slice(0, 160)}`,
  );

  const rec = await call("/api/recommend", { lang: "hi" });
  expect(
    rec.status === 200 && rec.json.source === "gemini" && rec.json.recommendations?.length > 0,
    `/api/recommend -> live Gemini, ${rec.json.recommendations?.length} crops in ${rec.secs}s`,
    `/api/recommend -> HTTP ${rec.status}, source ${rec.json.source} after ${rec.secs}s`,
  );
}

console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
process.exit(failures.length ? 1 : 0);

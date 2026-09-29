// Check a deployed Saajha site end to end. Exits non-zero on any failure.
//   node scripts/verify_deploy.mjs https://<app>.vercel.app [--skip-gemini]
// Checks the claims the site makes (records moved 0, every head's sha256, the ONNX
// hash) and that the Gemini routes answer (or fail honestly with 503).
import { createHash } from "node:crypto";

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

const base = (process.argv[2] || "http://localhost:3200").replace(/\/$/, "");
const skipGemini = process.argv.includes("--skip-gemini");
const failures = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => {
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
};
const expect = (cond, okMsg, badMsg = okMsg) => (cond ? ok(okMsg) : bad(badMsg));

async function get(path, as = "json") {
  const r = await fetch(base + path);
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return as === "json" ? r.json() : Buffer.from(await r.arrayBuffer());
}

function headSha(head) {
  const h = createHash("sha256");
  for (const t of [...head.tensors].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    h.update(Buffer.from(t.name, "utf8"));
    h.update(Buffer.from(t.b64, "base64"));
  }
  return h.digest("hex");
}

console.log(`Verifying ${base}`);
for (const page of ["/", "/diagnose", "/federation", "/method"]) {
  try {
    const r = await fetch(base + page);
    expect(r.ok, `page ${page} ${r.status}`, `page ${page} ${r.status}`);
  } catch (e) {
    bad(`page ${page}: ${e.message}`);
  }
}

const run = await get("/fl/run.json");
expect(run.totals.records_moved === 0, "records moved = 0", `records moved = ${run.totals.records_moved}`);
const leaks = run.rounds.filter((r) => r.raw_rows_transmitted !== 0);
expect(leaks.length === 0, `all ${run.rounds.length} rounds raw_rows_transmitted = 0`, `rounds with raw rows: ${leaks.map((r) => r.round)}`);

const onnx = await get(run.backbone.onnx_url, "buf");
expect(createHash("sha256").update(onnx).digest("hex") === run.backbone.onnx_sha256, `backbone.onnx sha256 (${(onnx.length / 1e6).toFixed(1)} MB)`, "backbone.onnx sha256 mismatch");

const heads = [
  ...Object.values(run.local_models).map((m) => [m.head_url, m.sha256]),
  ...run.rounds.map((r) => [r.head_url, r.weights_sha256]),
];
let headFails = 0;
for (const [url, sha] of heads) {
  const h = await get(url);
  if (headSha(h) !== sha || h.sha256 !== sha) {
    headFails++;
    bad(`head ${url} sha256 mismatch`);
  }
}
if (!headFails) ok(`${heads.length} head files recompute to their recorded sha256`);

const gallery = await get("/fl/gallery.json");
expect(gallery.some((g) => g.hero), `gallery (${gallery.length} images, hero present)`, "no hero in gallery");

if (!skipGemini) {
  const hero = gallery.find((g) => g.hero);
  const img = (await get(hero.image_url, "buf")).toString("base64");
  const d = await fetch(base + "/api/diagnose", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image: img, mimeType: "image/jpeg", lang: "hi" }),
  });
  const dj = await d.json().catch(() => ({}));
  if (d.status === 200 && dj.class_key) ok(`/api/diagnose -> ${dj.class_key} (${dj.confidence}%) via ${dj.model}`);
  else bad(`/api/diagnose -> HTTP ${d.status} ${JSON.stringify(dj).slice(0, 160)}`);

  for (const lang of ["hi", "ta"]) {
    const a = await fetch(base + "/api/advisory", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ class_key: "hispa", decided_by: "agreement", fed_conf: 0.99, gem_conf: 80, state_id: "C", lang }),
    });
    expect(a.status === 200, `/api/advisory ${lang} 200`, `/api/advisory ${lang} HTTP ${a.status}`);
  }
  const t = await fetch(base + "/api/tts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "नमस्ते", lang: "hi" }),
  });
  const tb = Buffer.from(await t.arrayBuffer());
  expect(t.status === 200 && tb.length > 44 && (t.headers.get("content-type") || "").includes("audio"), `/api/tts audio ${tb.length} bytes`, `/api/tts HTTP ${t.status} (${t.headers.get("content-type")})`);
}

console.log(failures.length ? `\n${failures.length} FAILED` : "\nALL CHECKS PASSED");
process.exit(failures.length ? 1 : 0);

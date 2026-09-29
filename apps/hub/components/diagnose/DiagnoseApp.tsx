"use client";

// The live golden path after the flip:
//   photo -> image features (browser ONNX, or the recorded Python features for test photos)
//         -> State C own-data-only head vs State C after federation (browser maths, real weights)
//         -> Gemini first pass (/api/diagnose)
//         -> gate (lib/gate.ts): advice (/api/advisory, /api/tts) or a ticket for a State C expert.
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { DiagnoseResponse } from "@/app/api/diagnose/route";
import type { Card } from "@/app/api/advisory/route";
import { CLASS_KEYS, classLabel, type ClassKey } from "@/lib/classes";
import type { GalleryItem, RunFile, StateId } from "@/lib/contract";
import { cosine, decodeImage, embedImage, loadBackbone, toJpegBase64, type LoadProgress } from "@/lib/embed";
import { fetchGallery, fetchRun } from "@/lib/fl";
import { decide, type FedVerdict, type GateDecision, type GeminiVerdict } from "@/lib/gate";
import { decodeFloat32, fetchHead, runHead, topK, verifyHeadSha, type LoadedHead } from "@/lib/heads";
import { fetchPregen, type PregenFile } from "@/lib/pregen";
import { addTicket, type Ticket } from "@/lib/tickets";
import Advisory from "./Advisory";
import GatePanel from "./GatePanel";
import GeminiPanel, { type GeminiState } from "./GeminiPanel";
import ModelProgress from "./ModelProgress";
import PhotoPicker from "./PhotoPicker";
import TicketQueue from "./TicketQueue";
import Verdicts, { type Top3 } from "./Verdicts";

type NewPhoto = { kind: "gallery"; item: GalleryItem; url: string } | { kind: "upload"; name: string; url: string };
type Photo = NewPhoto & { id: number };

type Heads = { local: LoadedHead; fed: LoadedHead; shaOk: boolean };

type Features = { vec: Float32Array; source: "cached" | "live"; cosVsCached: number | null; ms: number | null };

type Result = { id: number; features: Features; local: Top3; fed: Top3 };

type EmbedJob =
  | { id: number; status: "loading"; progress: LoadProgress | null }
  | { id: number; status: "error"; error: string };

type Decision = { id: number; decision: GateDecision; ticket: { ticket: Ticket; stored: boolean } | null };

let headsP: Promise<Heads> | null = null;
function loadHeads(run: RunFile): Promise<Heads> {
  if (!headsP) {
    const st = run.hero.state;
    const last = run.rounds[run.rounds.length - 1];
    headsP = Promise.all([fetchHead(run.local_models[st].head_url), fetchHead(last.head_url)]).then(
      async ([local, fed]) => {
        const [a, b] = await Promise.all([verifyHeadSha(local), verifyHeadSha(fed)]);
        return { local, fed, shaOk: a && b };
      },
    );
    headsP.catch(() => {
      headsP = null;
    });
  }
  return headsP;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function DiagnoseApp({ cards }: { cards: Record<ClassKey, Card> }) {
  const [run, setRun] = useState<RunFile | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [heads, setHeads] = useState<Heads | null>(null);
  const [pregen, setPregen] = useState<PregenFile | null>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [dims, setDims] = useState<{ id: number; w: number; h: number } | null>(null);
  const [photoError, setPhotoError] = useState<{ id: number; error: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [embedJob, setEmbedJob] = useState<EmbedJob | null>(null);
  const [gemini, setGemini] = useState<GeminiState>({ status: "idle" });
  const [decision, setDecision] = useState<Decision | null>(null);

  // Latest pipeline values, read by async callbacks (never during render).
  const idRef = useRef(0);
  const fedRef = useRef<FedVerdict | null>(null);
  const gemRef = useRef<GeminiVerdict | null | undefined>(undefined); // undefined = still waiting
  const jpegRef = useRef<string | null>(null);
  const cachedRef = useRef<Float32Array | null>(null);
  const uploadUrlRef = useRef<string | null>(null);
  const ticketsRef = useRef(new Map<string, { ticket: Ticket; stored: boolean }>());

  useEffect(() => {
    Promise.all([fetchRun(), fetchGallery(), fetchPregen()])
      .then(([r, g, saved]) => {
        setRun(r);
        setGallery(g);
        setPregen(saved);
        return loadHeads(r).then(setHeads);
      })
      .catch((e) => setLoadError(errText(e)));
  }, []);

  useEffect(
    () => () => {
      if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    },
    [],
  );

  if (loadError) {
    return (
      <p className="mt-8 border-l-[3px] border-ink pl-3">
        The federation record could not be loaded: {loadError}. Reload the page to try again.
      </p>
    );
  }
  if (!run) {
    return <div className="mt-8 h-64 animate-pulse rounded-md bg-sheet" aria-label="Loading the federation record" />;
  }

  const stateId: StateId = run.hero.state;
  const stateInfo = run.states.find((s) => s.id === stateId);
  const lastRound = run.rounds[run.rounds.length - 1].round;
  const others = run.states.filter((s) => s.id !== stateId).map((s) => s.id);

  // ---- pipeline -------------------------------------------------------------------------

  const settle = (id: number) => {
    if (id !== idRef.current) return;
    const fed = fedRef.current;
    const gem = gemRef.current;
    if (!fed || gem === undefined) return;
    const d = decide(run.gate, fed, gem, run.gemini_benchmark?.acc ?? null);
    let ticket: Decision["ticket"] = null;
    // An expert gets the case when the federated model is unsure (review), or when Gemini's
    // second opinion differs from advice already given (audit).
    const ticketReason = d.outcome === "escalate" ? d.reason : d.outcome === "advise" ? d.auditReason : undefined;
    if (ticketReason) {
      const key = `${id}|${d.outcome}|${fed.top}|${gem?.class_key ?? "none"}`;
      ticket = ticketsRef.current.get(key) ?? null;
      if (!ticket) {
        ticket = addTicket({
          stateId,
          geminiLabel: gem?.class_key ?? null,
          geminiConfidence: gem?.confidence ?? null,
          fedLabel: fed.top,
          fedConfidence: Math.round(fed.p * 100),
          reason: ticketReason,
        });
        ticketsRef.current.set(key, ticket);
      }
    }
    setDecision({ id, decision: d, ticket });
  };

  const applyFeatures = async (id: number, features: Features) => {
    const h = await loadHeads(run);
    if (id !== idRef.current) return;
    const local = topK(runHead(h.local, features.vec), CLASS_KEYS, 3) as Top3;
    const fedP = runHead(h.fed, features.vec);
    const fed = topK(fedP, CLASS_KEYS, 3) as Top3;
    fedRef.current = { top: fed[0][0], p: fed[0][1] };
    setResult({ id, features, local, fed });
    setEmbedJob(null);
    settle(id);
  };

  const askGemini = async (id: number, b64: string) => {
    gemRef.current = undefined;
    setGemini({ status: "loading" });
    setDecision(null); // the gate re-decides when Gemini answers
    let next: GeminiState;
    try {
      const r = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, mimeType: "image/jpeg", lang: "en" }),
      });
      const j = (await r.json().catch(() => null)) as (DiagnoseResponse & { error?: string; retryable?: boolean }) | null;
      if (r.ok && j && typeof j.class_key === "string") {
        next = { status: "ok", data: j };
      } else {
        next = { status: "error", error: j?.error ?? `The server answered ${r.status}.`, retryable: j?.retryable ?? r.status >= 500 };
      }
    } catch {
      next = { status: "error", error: "the request did not reach the server; check your connection", retryable: true };
    }
    if (id !== idRef.current) return;
    gemRef.current = next.status === "ok" ? next.data : null;
    setGemini(next);
    settle(id);
  };

  const computeLive = async (id: number, src: string | Blob, cached: Float32Array | null) => {
    setEmbedJob({ id, status: "loading", progress: null });
    try {
      const bb = await loadBackbone(run.backbone, (p) => {
        if (id === idRef.current) setEmbedJob({ id, status: "loading", progress: p });
      });
      const bmp = await decodeImage(src);
      const t0 = performance.now();
      const vec = await embedImage(bb, bmp);
      const ms = Math.round(performance.now() - t0);
      bmp.close();
      await applyFeatures(id, { vec, source: "live", cosVsCached: cached ? cosine(vec, cached) : null, ms });
    } catch (e) {
      if (id === idRef.current) setEmbedJob({ id, status: "error", error: errText(e) });
    }
  };

  const begin = (p: NewPhoto): number => {
    const id = ++idRef.current;
    fedRef.current = null;
    gemRef.current = undefined;
    jpegRef.current = null;
    cachedRef.current = null;
    if (uploadUrlRef.current && p.url !== uploadUrlRef.current) {
      URL.revokeObjectURL(uploadUrlRef.current);
      uploadUrlRef.current = null;
    }
    setPhoto({ ...p, id });
    setDims(null);
    setPhotoError(null);
    setResult(null);
    setEmbedJob(null);
    setDecision(null);
    setGemini({ status: "loading" });
    return id;
  };

  const prepareForGemini = async (id: number, src: string | Blob, ask = true) => {
    try {
      const bmp = await decodeImage(src);
      if (id === idRef.current) setDims({ id, w: bmp.width, h: bmp.height });
      const jpeg = await toJpegBase64(bmp);
      bmp.close();
      if (id !== idRef.current) return;
      jpegRef.current = jpeg.b64;
      if (ask) await askGemini(id, jpeg.b64);
    } catch (e) {
      if (id !== idRef.current) return;
      setPhotoError({ id, error: errText(e) });
      gemRef.current = null;
      setGemini({ status: "error", error: "the photo could not be prepared for Gemini", retryable: false });
    }
  };

  const onGallery = (item: GalleryItem) => {
    const id = begin({ kind: "gallery", item, url: item.image_url });
    const cached = decodeFloat32(item.embedding_b64);
    cachedRef.current = cached;
    void applyFeatures(id, { vec: cached, source: "cached", cosVsCached: null, ms: null }).catch((e) => {
      if (id === idRef.current) setEmbedJob({ id, status: "error", error: errText(e) });
    });
    const saved = pregen?.diagnose[item.id];
    if (saved) {
      // A real Gemini answer for this held-out photo, saved so the demo works when Gemini is busy.
      gemRef.current = saved;
      setGemini({ status: "ok", data: saved, savedAt: pregen.generated_at });
      settle(id);
      void prepareForGemini(id, item.image_url, false);
    } else {
      void prepareForGemini(id, item.image_url);
    }
  };

  const onFile = (file: File) => {
    if (file.type && !file.type.startsWith("image/")) {
      const id = begin({ kind: "upload", name: file.name, url: "" });
      setPhotoError({ id, error: "That file is not an image. Choose a JPEG or PNG photo." });
      setGemini({ status: "idle" });
      return;
    }
    const url = URL.createObjectURL(file);
    const id = begin({ kind: "upload", name: file.name, url });
    uploadUrlRef.current = url;
    void computeLive(id, file, null);
    void prepareForGemini(id, file);
  };

  const onRetryGemini = () => {
    const id = idRef.current;
    const b64 = jpegRef.current;
    if (b64) void askGemini(id, b64);
  };

  const onComputeLive = () => {
    if (!photo || photo.kind !== "gallery") return;
    void computeLive(photo.id, photo.item.image_url, cachedRef.current);
  };

  // ---- render ---------------------------------------------------------------------------

  const current = photo ? photo.id : -1;
  const res = result && result.id === current ? result : null;
  const job = embedJob && embedJob.id === current ? embedJob : null;
  const dec = decision && decision.id === current ? decision.decision : null;
  const ticket = decision && decision.id === current ? decision.ticket : null;
  const pErr = photoError && photoError.id === current ? photoError.error : null;
  const size = dims && dims.id === current ? dims : null;
  const trueKey = photo?.kind === "gallery" ? photo.item.true_key : null;
  const notRice = dec?.outcome === "not_rice";
  const fedTop = res ? res.fed[0][0] : null;
  const taughtBy = fedTop ? run.states.filter((s) => s.id !== stateId && s.seen.includes(fedTop)).map((s) => s.id) : [];

  const verdicts = res ? (
    <Verdicts
      stateId={stateId}
      local={res.local}
      fed={res.fed}
      trueKey={trueKey}
      unseen={stateInfo?.unseen ?? []}
      nLocalTrain={run.local_models[stateId].n_train}
      rounds={lastRound}
      others={others}
      taughtBy={taughtBy}
    />
  ) : null;

  return (
    <>
      <div className="mt-10">
        <PhotoPicker
          gallery={gallery}
          selectedId={photo?.kind === "gallery" ? photo.item.id : null}
          busy={false}
          onFile={onFile}
          onGallery={onGallery}
        />
      </div>

      {photo && (
        <div className="mt-10 grid gap-8 border-t border-rule pt-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
          <figure className="lg:sticky lg:top-6 lg:self-start">
            {photo.url ? (
              <div
                className="relative w-full overflow-hidden rounded-md border border-rule bg-sheet"
                style={{ aspectRatio: size ? `${size.w} / ${size.h}` : "3 / 4" }}
              >
                <Image
                  src={photo.url}
                  alt={
                    photo.kind === "gallery"
                      ? `Held-out paddy photo from the Paddy Doctor dataset; expert label ${classLabel(photo.item.true_key).toLowerCase()}`
                      : "Your photo"
                  }
                  fill
                  unoptimized={photo.kind === "upload"}
                  sizes="(min-width: 1024px) 380px, 100vw"
                  className="object-contain"
                />
              </div>
            ) : null}
            <figcaption className="mt-2 space-y-2 text-sm text-muted">
              {photo.kind === "gallery" ? (
                <span className="block">
                  Held out from training in every state. Photo: Paddy Doctor, CC BY 4.0.
                </span>
              ) : (
                <span className="block break-words">Your photo{photo.name ? `: ${photo.name}` : ""}. Not stored by Saajha.</span>
              )}
              {res && (
                <span className="block">
                  {res.features.source === "cached"
                    ? "Image features: the ones Python computed for the recorded run."
                    : `Image features: computed in this browser${res.features.ms != null ? ` in ${res.features.ms} ms` : ""}.`}
                  {res.features.cosVsCached != null &&
                    ` Match with Python's features: cosine ${res.features.cosVsCached.toFixed(4)}.`}
                </span>
              )}
              {photo.kind === "gallery" && res?.features.source === "cached" && job?.status !== "loading" && (
                <button
                  type="button"
                  onClick={onComputeLive}
                  className="inline-flex items-center rounded-md border border-ink bg-sheet px-3 py-1.5 text-sm font-semibold text-ink hover:bg-carbon-wash"
                >
                  Compute them in this browser instead
                </button>
              )}
              {heads && (
                <span className="block">
                  {heads.shaOk
                    ? "Both models' weights match their recorded sha256 fingerprints."
                    : "Warning: the weights do not match their recorded fingerprints."}
                </span>
              )}
            </figcaption>
          </figure>

          <div className="min-w-0 space-y-8">
            {pErr && <p className="border-l-[3px] border-ink pl-3 font-semibold">{pErr}</p>}
            {job?.status === "loading" && <ModelProgress progress={job.progress} />}
            {job?.status === "error" && (
              <div className="border-l-[3px] border-ink pl-3">
                <p>The image model could not run in this browser: {job.error}</p>
                {!res && (
                  <p className="mt-1 text-muted">
                    Without it there is no federated verdict, so this page cannot decide between advice and an expert for
                    this photo. Gemini&apos;s first pass below is shown for reference only.
                  </p>
                )}
              </div>
            )}

            {notRice ? (
              <section aria-labelledby="notrice-h" aria-live="polite">
                <h2 id="notrice-h" className="display text-[clamp(1.4rem,3vw,1.9rem)]">
                  Saajha&apos;s model covers paddy only
                </h2>
                <p className="mt-2 max-w-[62ch]">
                  {dec.reason} State {stateId}&apos;s model always answers with one of its {CLASS_KEYS.length} paddy
                  problems, so its verdict means nothing for this photo and no advice is given. Try a close photo of paddy
                  leaves.
                </p>
                {verdicts && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-carbon underline underline-offset-4">
                      Show the model&apos;s output anyway
                    </summary>
                    <div className="mt-4">{verdicts}</div>
                  </details>
                )}
              </section>
            ) : (
              verdicts ??
              (!job && !pErr ? (
                <div className="h-48 animate-pulse rounded-md bg-sheet" aria-label="Scoring the photo" />
              ) : null)
            )}

            <GeminiPanel state={gemini} onRetry={onRetryGemini} />

            {!pErr && !notRice && !(job?.status === "error" && !res) && (
              <GatePanel
                decision={dec}
                pendingGemini={gemini.status === "loading"}
                stateId={stateId}
                gate={run.gate}
                ticket={ticket}
              />
            )}

            {dec?.outcome === "advise" && (
              <Advisory
                key={`${current}-${dec.classKey}`}
                classKey={dec.classKey}
                decidedBy={dec.decidedBy}
                fedConf={res ? Math.round(res.fed[0][1] * 10000) / 10000 : null}
                gemConf={gemini.status === "ok" ? gemini.data.confidence : null}
                stateId={stateId}
                card={cards[dec.classKey]}
                saved={photo?.kind === "gallery" && gemini.status === "ok" && gemini.savedAt ? pregen : null}
              />
            )}
          </div>
        </div>
      )}

      <div className="mt-12">
        <TicketQueue />
      </div>
    </>
  );
}

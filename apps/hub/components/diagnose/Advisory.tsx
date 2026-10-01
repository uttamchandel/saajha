"use client";

// Step 5: the advice, in the farmer's language. Gemini writes it from one cited reference
// card (lib/knowledge.json) and nothing else. If Gemini cannot write it, the card itself is
// shown in English: real, cited content, clearly labelled — never a canned advisory.
import { useEffect, useRef, useState } from "react";
import type { AdvisoryResponse, Card, DecidedBy } from "@/app/api/advisory/route";
import type { ClassKey } from "@/lib/classes";
import { LANGS_FULL } from "@/lib/langs";
import { advisoryKey, savedOn, type PregenFile } from "@/lib/pregen";
import { speak, stopSpeaking } from "@/lib/speech";
// `card` is aliased: Advisory and ReferenceCard take a `card` prop that would shadow the recipe.
import { btnPrimarySm, btnSecondarySm, card as cardSurface, link, slip } from "@/lib/ui";

type Result = { ok: true; data: AdvisoryResponse; saved?: boolean } | { ok: false; error: string; retryable: boolean };

type Audio =
  | { key: string; status: "loading" }
  | { key: string; status: "gemini"; url: string }
  | { key: string; status: "device"; reason: string; speaking: boolean };

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) {
    const j = (await r.json().catch(() => null)) as { error?: string; retryable?: boolean } | null;
    const err = new Error(j?.error ?? `The server answered ${r.status}.`) as Error & { retryable?: boolean };
    err.retryable = j?.retryable ?? r.status >= 500;
    throw err;
  }
  return (await r.json()) as T;
}

export default function Advisory({
  classKey,
  decidedBy,
  fedConf,
  gemConf,
  stateId,
  card,
  saved = null,
}: {
  classKey: ClassKey;
  decidedBy: DecidedBy;
  fedConf: number | null;
  gemConf: number | null;
  stateId: string;
  card: Card;
  /** Saved Gemini advisories and audio for the gallery photos (see lib/pregen.ts). */
  saved?: PregenFile | null;
}) {
  const [lang, setLang] = useState("hi");
  const [results, setResults] = useState<Record<string, Result>>({});
  const [audio, setAudio] = useState<Audio | null>(null);
  const inflight = useRef(new Set<string>());
  const live = useRef(new Set<string>()); // keys the visitor asked to rewrite live
  const lastUrl = useRef<string | null>(null);

  const key = `${classKey}|${lang}|${decidedBy}`;
  const result = results[key];
  const langInfo = LANGS_FULL.find((l) => l.code === lang) ?? LANGS_FULL[0];

  useEffect(() => {
    if (results[key] || inflight.current.has(key)) return;
    const savedAdvice = saved?.advisory[advisoryKey(classKey, lang, decidedBy)];
    if (savedAdvice && !live.current.has(key)) {
      setResults((prev) => ({ ...prev, [key]: { ok: true, data: savedAdvice, saved: true } }));
      return;
    }
    inflight.current.add(key);
    postJson<AdvisoryResponse>("/api/advisory", {
      class_key: classKey,
      decided_by: decidedBy,
      fed_conf: fedConf,
      gem_conf: gemConf,
      state_id: stateId,
      lang,
    })
      .then((data) => setResults((prev) => ({ ...prev, [key]: { ok: true, data } })))
      .catch((e: Error & { retryable?: boolean }) =>
        setResults((prev) => ({ ...prev, [key]: { ok: false, error: e.message, retryable: e.retryable ?? false } })),
      )
      .finally(() => inflight.current.delete(key));
  }, [key, results, classKey, decidedBy, fedConf, gemConf, stateId, lang, saved]);

  useEffect(() => () => stopSpeaking(), []);

  const retry = () => {
    live.current.add(key);
    setResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const listen = async (text: string) => {
    stopSpeaking();
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = null;
    const savedAudio = results[key]?.ok && (results[key] as { saved?: boolean }).saved
      ? saved?.audio[advisoryKey(classKey, lang, decidedBy)]
      : undefined;
    if (savedAudio) {
      setAudio({ key, status: "gemini", url: savedAudio });
      return;
    }
    setAudio({ key, status: "loading" });
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(j?.error ?? `The voice service answered ${r.status}.`);
      }
      const url = URL.createObjectURL(await r.blob());
      lastUrl.current = url;
      setAudio({ key, status: "gemini", url });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      setAudio({ key, status: "device", reason, speaking: true });
      speak(text, langInfo.bcp47, () =>
        setAudio((a) => (a && a.key === key && a.status === "device" ? { ...a, speaking: false } : a)),
      );
    }
  };

  const myAudio = audio && audio.key === key ? audio : null;

  return (
    <section aria-labelledby="advice-h" className={`${cardSurface} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="advice-h" className="text-lg font-semibold">
          Advice for the farmer
        </h2>
        <label className="text-sm text-muted">
          Language{" "}
          <select
            value={lang}
            onChange={(e) => {
              stopSpeaking();
              setLang(e.target.value);
            }}
            className="ml-1 rounded-xl border border-forest/20 bg-paper px-2 py-1.5 text-base text-ink focus:border-forest"
          >
            {LANGS_FULL.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native === l.label ? l.label : `${l.native} (${l.label})`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!result && (
        <p className="mt-4 text-muted" aria-live="polite">
          <span className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-leaf align-middle" aria-hidden="true" />
          Gemini is writing the advice in {langInfo.label} from the reference card.
        </p>
      )}

      {result && !result.ok && (
        <div className="mt-4" aria-live="polite">
          <p>
            The advice in {langInfo.label} could not be written right now ({result.error.replace(/\.$/, "")}). Below is the
            cited reference card it is written from.
          </p>
          {result.retryable && (
            <button type="button" onClick={retry} className={`${btnSecondarySm} mt-3`}>
              Try writing it again
            </button>
          )}
          <ReferenceCard card={card} className="mt-5" />
        </div>
      )}

      {result && result.ok && (
        <div className="mt-4" lang={result.data.lang}>
          <p className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">{result.data.title_local}</p>
          <p className="mt-3 max-w-[66ch] text-lg leading-relaxed">{result.data.spoken_summary}</p>
          {result.saved && saved && (
            <p className="mt-2 text-sm text-muted" lang="en">
              Written by Gemini on {savedOn(saved.generated_at)} and saved for this test photo.{" "}
              <button type="button" onClick={retry} className={link}>
                Write it again, live
              </button>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3" lang="en">
            <button
              type="button"
              className={btnPrimarySm}
              disabled={myAudio?.status === "loading"}
              onClick={() => listen(result.data.spoken_summary)}
            >
              {myAudio?.status === "loading" ? "Preparing the voice" : `Listen in ${langInfo.label}`}
            </button>
            {myAudio?.status === "device" && myAudio.speaking && (
              <button
                type="button"
                className={btnSecondarySm}
                onClick={() => {
                  stopSpeaking();
                  setAudio({ ...myAudio, speaking: false });
                }}
              >
                Stop
              </button>
            )}
          </div>
          {myAudio?.status === "gemini" && (
            <audio src={myAudio.url} controls autoPlay className="mt-3 w-full max-w-md" aria-label={`Advice read aloud in ${langInfo.label}`} />
          )}
          {myAudio?.status === "device" && (
            <p className="mt-2 text-sm text-muted" lang="en">
              Using your device&apos;s voice: Gemini&apos;s voice is unavailable ({myAudio.reason.replace(/\.$/, "")}).
              {!langInfo.ttsLikely && ` Many devices have no ${langInfo.label} voice, so it may be silent or read in another accent.`}
            </p>
          )}

          <AdviceList title="What to do" items={result.data.ipm} />
          <div className="mt-6">
            <h3 className="text-base font-semibold" lang="en">
              Chemical control
            </h3>
            {result.data.no_chemical ? (
              <p className="mt-1 text-[15px]" lang="en">
                The reference card lists no chemical spray for this problem.
              </p>
            ) : (
              <ul className="mt-1 space-y-3">
                {result.data.chemical.map((c) => (
                  <li key={c.text_en} className="border-l-[3px] border-rule pl-3 text-[15px]">
                    <span>{c.text}</span>
                    <span className="mt-0.5 block text-sm text-muted" lang="en">
                      {c.verbatim
                        ? "Shown as written in the card: the translation changed a number, so it was not used."
                        : `As written in the card: ${c.text_en}`}
                      {c.source && ` Source: ${c.source.publisher}.`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <AdviceList title="Prevention" items={result.data.prevention} />
          <Sources sources={result.data.sources} />
          <p className="mt-5 text-sm text-muted" lang="en">
            Written by {result.data.model} using only the reference card, which cites public sources above. The cards have
            not yet been reviewed by an agronomist.
          </p>
          <details className="mt-4" lang="en">
            <summary className={`cursor-pointer ${link}`}>Compare with the English reference card</summary>
            <ReferenceCard card={card} className="mt-4" />
          </details>
        </div>
      )}
    </section>
  );
}

function AdviceList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold" lang="en">
        {title}
      </h3>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function Sources({ sources }: { sources: Card["sources"] }) {
  return (
    <div className="mt-6" lang="en">
      <h3 className="text-base font-semibold">Sources</h3>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
        {sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={link}>
              {s.title}
            </a>{" "}
            <span className="text-muted">({s.publisher})</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ReferenceCard({ card, className = "" }: { card: Card; className?: string }) {
  return (
    <div className={`${slip} p-4 sm:p-5 ${className}`} lang="en">
      <p className="text-sm font-semibold text-forest">Reference card (English)</p>
      <p className="mt-1 text-xl font-semibold">{card.name_en}</p>
      <p className="text-sm text-muted">Cause: {card.cause}</p>
      <AdviceList title="Symptoms" items={card.symptoms} />
      <AdviceList title="What to do" items={card.ipm} />
      <div className="mt-6">
        <h3 className="text-base font-semibold">Chemical control</h3>
        {card.chemical.length === 0 ? (
          <p className="mt-1 text-[15px]">This card lists no chemical spray for this problem.</p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">
            {card.chemical.map((c) => (
              <li key={c.text}>
                {c.text}
                {card.sources[c.source] && <span className="text-muted"> ({card.sources[c.source].publisher})</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <AdviceList title="Prevention" items={card.prevention} />
      <Sources sources={card.sources} />
      <p className="mt-4 text-sm text-muted">Cited from public sources; not yet reviewed by an agronomist.</p>
    </div>
  );
}

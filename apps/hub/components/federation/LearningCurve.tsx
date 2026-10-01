"use client";

// Section 4: the learning curve, drawn in pixel space so labels stay legible at any width.
// Series: the hero state's accuracy on classes it has never recorded, and overall accuracy,
// per recorded round; reference line: that state's own-data-only score on the same classes.
import { useEffect, useMemo, useRef, useState } from "react";
import { classLabel, isClassKey } from "@/lib/classes";
import type { RunFile } from "@/lib/contract";
import { pct } from "@/lib/fl";
import { card } from "@/lib/ui";

const M = { top: 14, right: 16, bottom: 44, left: 48 };

export default function LearningCurve({ run }: { run: RunFile }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const rounds = run.rounds;
  const lastIdx = rounds.length - 1;
  const [idx, setIdx] = useState(lastIdx);
  const S = run.hero.state;
  const ref = run.local_models[S]?.acc_unseen ?? null;
  const nUnseen = run.states.find((s) => s.id === S)?.unseen.length ?? 0;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw) setW(Math.max(280, Math.round(cw)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = w < 480 ? 240 : 300;
  const r0 = rounds[0].round;
  const rN = rounds[lastIdx].round;
  const x = (r: number) => M.left + ((r - r0) / Math.max(1, rN - r0)) * (w - M.left - M.right);
  const y = (v: number) => M.top + (1 - v) * (H - M.top - M.bottom);

  const paths = useMemo(() => {
    const line = (get: (i: number) => number | null) => {
      let d = "";
      let pen = false;
      rounds.forEach((r, i) => {
        const v = get(i);
        if (v == null) {
          pen = false;
          return;
        }
        d += `${pen ? "L" : "M"}${x(r.round).toFixed(1)} ${y(v).toFixed(1)} `;
        pen = true;
      });
      return d.trim();
    };
    return {
      hero: line((i) => rounds[i].per_state[S]?.acc_unseen ?? null),
      all: line((i) => rounds[i].global.acc_all),
    };
    // x and y depend only on w, H and the rounds, which are listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, S, w, H]);

  const xTicks = useMemo(() => {
    const span = rN - r0;
    const step = span <= 10 ? 1 : span <= 25 ? 5 : 10;
    const out: number[] = [];
    for (let t = Math.ceil(r0 / step) * step; t <= rN; t += step) out.push(t);
    return out;
  }, [r0, rN]);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const cur = rounds[idx];
  const heroV = cur.per_state[S]?.acc_unseen ?? null;
  const allV = cur.global.acc_all;

  function pick(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * w;
    const r = r0 + ((px - M.left) / (w - M.left - M.right)) * (rN - r0);
    let best = 0;
    rounds.forEach((rr, i) => {
      if (Math.abs(rr.round - r) < Math.abs(rounds[best].round - r)) best = i;
    });
    setIdx(best);
  }

  function onKey(e: React.KeyboardEvent<SVGSVGElement>) {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowRight") setIdx((i) => Math.min(lastIdx, i + step));
    else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - step));
    else if (e.key === "Home") setIdx(0);
    else if (e.key === "End") setIdx(lastIdx);
    else return;
    e.preventDefault();
  }

  // Round 0 is the untrained starting model: say plainly what it does, from its per-class scores.
  const start = rounds[0];
  const startTop = Object.entries(start.global.per_class_acc)
    .filter((e): e is [string, number] => e[1] != null)
    .sort((a, b) => b[1] - a[1]);
  const guesser = start.round === 0 && startTop.length > 1 && startTop[0][1] >= 0.8 && startTop[1][1] <= 0.2;
  const guessKey = startTop[0] && isClassKey(startTop[0][0]) ? startTop[0][0] : undefined;
  const guessUnseen = guessKey ? (run.states.find((s) => s.id === S)?.unseen.includes(guessKey) ?? false) : false;
  const heroFirst = rounds.find((r) => r.round === 1)?.per_state[S]?.acc_unseen ?? null;

  const summary =
    `Line chart of accuracy over rounds ${r0} to ${rN}. State ${S} on the ${nUnseen} classes it has never recorded: ` +
    `${pct(heroFirst)} after round 1, ${pct(rounds[lastIdx].per_state[S]?.acc_unseen)} after round ${rN}. ` +
    `All states, all classes: ${pct(rounds.find((r) => r.round === 1)?.global.acc_all)} after round 1, ` +
    `${pct(rounds[lastIdx].global.acc_all, 1)} after round ${rN}. State ${S}'s own model on those classes: ${pct(ref)}.`;

  return (
    <div className={`${card} mt-6 max-w-4xl p-4 sm:p-6`}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]" aria-label="Chart key">
        <li className="inline-flex items-center gap-2">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke="var(--ink)" strokeWidth="3" />
          </svg>
          State {S}, on the {nUnseen} classes it has never recorded
        </li>
        <li className="inline-flex items-center gap-2">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke="var(--leaf-bright)" strokeWidth="2" />
          </svg>
          All states, all classes
        </li>
        <li className="inline-flex items-center gap-2">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          State {S}&apos;s own data only, same classes
        </li>
      </ul>

      <p className="mt-4 min-h-[3rem] text-[15px]" aria-live="polite">
        <span className="font-semibold">{cur.round === 0 ? "Round 0, untrained starting model" : `After round ${cur.round}`}:</span>{" "}
        State {S} on classes it has never recorded{" "}
        <span className="condensed text-xl font-semibold">{pct(heroV)}</span>; all states{" "}
        <span className="condensed text-xl font-semibold">{pct(allV, 1)}</span>
      </p>

      <div ref={box} className="mt-2 w-full">
        <svg
          width={w}
          height={H}
          viewBox={`0 0 ${w} ${H}`}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setIdx(lastIdx)}
          className="block max-w-full touch-pan-y select-none"
          style={{ fontFamily: "inherit" }}
        >
          {/* Grid and y axis */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={w - M.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
              <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          {/* x axis */}
          <line x1={M.left} x2={w - M.right} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeWidth={1} />
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={y(0)} y2={y(0) + 5} stroke="var(--muted)" />
              <text x={x(t)} y={y(0) + 18} textAnchor="middle" fontSize={12} fill="var(--muted)">
                {t}
              </text>
            </g>
          ))}
          <text x={M.left + (w - M.left - M.right) / 2} y={H - 6} textAnchor="middle" fontSize={13} fill="var(--muted)">
            Federation round
          </text>
          <text
            transform={`translate(12 ${M.top + (H - M.top - M.bottom) / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={13}
            fill="var(--muted)"
          >
            Accuracy, held-out photos
          </text>

          {/* Reference: own data only */}
          {ref != null && (
            <g>
              <line
                x1={M.left}
                x2={w - M.right}
                y1={y(ref) - (ref === 0 ? 1.5 : 0)}
                y2={y(ref) - (ref === 0 ? 1.5 : 0)}
                stroke="var(--muted)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text x={w - M.right} y={y(ref) - 8} textAnchor="end" fontSize={12} fill="var(--muted)">
                State {S}, own data only: {pct(ref)}
              </text>
            </g>
          )}

          {/* Series */}
          <path d={paths.all} fill="none" stroke="var(--leaf-bright)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={paths.hero} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair */}
          <line x1={x(cur.round)} x2={x(cur.round)} y1={M.top} y2={y(0)} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={1} />
          <circle cx={x(cur.round)} cy={y(allV)} r={4.5} fill="var(--leaf-bright)" stroke="var(--sheet)" strokeWidth={2} />
          {heroV != null && <circle cx={x(cur.round)} cy={y(heroV)} r={5} fill="var(--ink)" stroke="var(--sheet)" strokeWidth={2} />}
        </svg>
      </div>
      <p className="mt-2 text-sm text-muted">
        Point at the chart, or focus it and use the arrow keys, to read any round. The round log below lists the same
        figures.
      </p>
      {guesser && guessKey && (
        <p className="mt-3 max-w-[64ch] text-[15px] text-muted">
          Round 0 is the untrained starting model, before any state has trained. It gets{" "}
          {pct(startTop[0][1])} of {classLabel(guessKey).toLowerCase()} photos right and almost nothing else
          {guessUnseen ? `; ${classLabel(guessKey).toLowerCase()} is one of State ${S}'s never-recorded classes, which is why it scores ${pct(start.per_state[S]?.acc_unseen)} there` : ""}{" "}
          and {pct(start.global.acc_all)} overall. It is not a usable model.
        </p>
      )}
    </div>
  );
}

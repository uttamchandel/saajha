// Section 2: the topology as an abstract diagram. States are nodes, never shapes on a map.
import { classLabel } from "@/lib/classes";
import type { RunFile } from "@/lib/contract";
import { grouped } from "@/lib/fl";
import { card } from "@/lib/ui";
import { andList, capitalize, casesHeld, countWord, plural } from "./shared";

type Pt = [number, number];
type Layout = {
  key: string;
  vw: number;
  vh: number;
  node: { w: number; h: number; pad: number; title: number; text: number; cell: number; gap: number; wrapCounts: boolean };
  slots: Pt[]; // top-left, top-right, bottom-left, bottom-right
  links: [Pt, Pt][]; // node edge -> aggregator edge, per slot
  agg: { x: number; y: number; w: number; h: number; title: number; text: number };
  pill: { w: number; h: number; text: number };
};

const WIDE: Layout = {
  key: "wide",
  vw: 1000,
  vh: 400,
  node: { w: 260, h: 150, pad: 20, title: 20, text: 14, cell: 18, gap: 4, wrapCounts: false },
  slots: [
    [0, 0],
    [740, 0],
    [0, 250],
    [740, 250],
  ],
  links: [
    [[260, 75], [380, 172]],
    [[740, 75], [620, 172]],
    [[260, 325], [380, 228]],
    [[740, 325], [620, 228]],
  ],
  agg: { x: 380, y: 140, w: 240, h: 120, title: 18, text: 14 },
  pill: { w: 104, h: 26, text: 13 },
};

const NARROW: Layout = {
  key: "narrow",
  vw: 340,
  vh: 600,
  node: { w: 160, h: 150, pad: 12, title: 18, text: 13, cell: 11, gap: 2.6, wrapCounts: true },
  slots: [
    [0, 0],
    [180, 0],
    [0, 450],
    [180, 450],
  ],
  links: [
    [[80, 150], [130, 245]],
    [[260, 150], [210, 245]],
    [[80, 450], [130, 355]],
    [[260, 450], [210, 355]],
  ],
  agg: { x: 50, y: 245, w: 240, h: 110, title: 17, text: 13 },
  pill: { w: 94, h: 24, text: 12 },
};

function Diagram({ run, L, label, className }: { run: RunFile; L: Layout; label: string; className: string }) {
  const states = run.states.slice(0, L.slots.length);
  const classKeys = run.classes.map((c) => c.key);
  const arrow = `fed-arrow-${L.key}`;
  const { node: N, agg: G, pill: P } = L;
  return (
    <svg
      viewBox={`-2 -2 ${L.vw + 4} ${L.vh + 4}`}
      role="img"
      aria-label={label}
      className={className}
      style={{ fontFamily: "inherit" }}
    >
      <defs>
        <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--ink)" />
        </marker>
      </defs>

      {/* Links first, so boxes sit on top of their ends. */}
      {states.map((s, i) => {
        const [[x1, y1], [x2, y2]] = L.links[i];
        return (
          <line
            key={`l-${s.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--ink)"
            strokeWidth={1.5}
            markerStart={`url(#${arrow})`}
            markerEnd={`url(#${arrow})`}
          />
        );
      })}
      {states.map((s, i) => {
        const [[x1, y1], [x2, y2]] = L.links[i];
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        return (
          <g key={`p-${s.id}`}>
            <rect
              x={cx - P.w / 2}
              y={cy - P.h / 2}
              width={P.w}
              height={P.h}
              rx={P.h / 2}
              fill="var(--straw-wash)"
              stroke="var(--straw)"
            />
            <text x={cx} y={cy + P.text * 0.36} textAnchor="middle" fontSize={P.text} fill="var(--ink)" fontWeight={600}>
              weights only
            </text>
          </g>
        );
      })}

      {/* National aggregator */}
      <rect x={G.x} y={G.y} width={G.w} height={G.h} rx={12} fill="var(--carbon-wash)" stroke="var(--ink)" strokeWidth={1.5} />
      <text x={G.x + G.w / 2} y={G.y + G.h * 0.34} textAnchor="middle" fontSize={G.title} fontWeight={700} fill="var(--ink)">
        National aggregator
      </text>
      <text x={G.x + G.w / 2} y={G.y + G.h * 0.34 + G.text * 1.6} textAnchor="middle" fontSize={G.text} fill="var(--ink)">
        Averages the weights ({run.strategy.name})
      </text>
      <text x={G.x + G.w / 2} y={G.y + G.h * 0.34 + G.text * 3.1} textAnchor="middle" fontSize={G.text} fill="var(--muted)">
        Holds no photos, no records
      </text>

      {/* State nodes */}
      {states.map((s, i) => {
        const [x, y] = L.slots[i];
        const cases = casesHeld(run, s.id);
        const tx = x + N.pad;
        const stripY = y + N.title + N.text * 2.9;
        const afterStrip = stripY + N.cell + N.text * 1.8;
        return (
          <g key={`n-${s.id}`}>
            <rect x={x} y={y} width={N.w} height={N.h} rx={12} fill="var(--sheet)" stroke="var(--ink)" strokeWidth={1.5} />
            <text x={tx} y={y + N.title + N.pad * 0.5} fontSize={N.title} fontWeight={700} fill="var(--ink)">
              State {s.id}
            </text>
            <text x={tx} y={y + N.title + N.pad * 0.5 + N.text * 1.5} fontSize={N.text} fill="var(--ink)">
              {grouped(cases)} verified cases
            </text>
            {classKeys.map((k, ci) => {
              const held = s.seen.includes(k);
              return (
                <rect
                  key={k}
                  x={tx + ci * (N.cell + N.gap)}
                  y={stripY}
                  width={N.cell}
                  height={N.cell}
                  rx={2}
                  fill={held ? "var(--ink)" : "var(--sheet)"}
                  stroke="var(--ink)"
                  strokeWidth={held ? 0 : 1.25}
                />
              );
            })}
            {N.wrapCounts ? (
              <>
                <text x={tx} y={afterStrip} fontSize={N.text} fill="var(--ink)">
                  Holds {s.seen.length} {plural(s.seen.length, "class", "classes")},
                </text>
                <text x={tx} y={afterStrip + N.text * 1.35} fontSize={N.text} fill="var(--ink)">
                  never recorded {s.unseen.length}
                </text>
              </>
            ) : (
              <text x={tx} y={afterStrip} fontSize={N.text} fill="var(--ink)">
                Holds {s.seen.length} {plural(s.seen.length, "class", "classes")}, never recorded {s.unseen.length}
              </text>
            )}
            <text x={tx} y={y + N.h - N.pad * 0.8} fontSize={N.text - 1} fill="var(--muted)">
              {N.wrapCounts ? "Records stay here" : "Photos and records stay in the state"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Topology({ run }: { run: RunFile }) {
  const states = run.states;
  const nClasses = run.classes.length;
  const label =
    `Diagram: ${countWord(states.length)} state nodes, each joined to a national aggregator by a link that carries model weights only. ` +
    states
      .map(
        (s) =>
          `State ${s.id} holds ${grouped(casesHeld(run, s.id))} verified cases in ${s.seen.length} classes and has never recorded ${s.unseen.length}.`,
      )
      .join(" ") +
    " The aggregator averages the weights and holds no photos and no records.";

  return (
    <div>
      <p className="mt-4 max-w-[64ch] text-[17px] text-muted">
        Each state keeps its photos and farmer records. Every round it sends only its model&apos;s weights to the national
        aggregator, which averages them ({run.strategy.name}) and sends the average back to every state. The states are
        abstract nodes, not places on a map.
      </p>

      <figure className={`${card} mt-8 max-w-5xl p-3 sm:p-6`}>
        <Diagram run={run} L={WIDE} label={label} className="hidden h-auto w-full max-w-5xl lg:block" />
        <Diagram run={run} L={NARROW} label={label} className="mx-auto block h-auto w-full max-w-[420px] lg:hidden" />
        <figcaption className="mt-4 max-w-[64ch] text-sm text-muted">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" aria-hidden="true">
                <rect x="0" y="0" width="14" height="14" rx="2" fill="var(--ink)" />
              </svg>
              Holds expert-verified cases of this class
            </span>
            <span className="inline-flex items-center gap-2">
              <svg width="14" height="14" aria-hidden="true">
                <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="2" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.25" />
              </svg>
              Has never recorded it
            </span>
          </span>
          <span className="mt-2 block">
            The {nClasses} squares, left to right: {run.classes.map((c) => classLabel(c.key)).join(", ")}.
          </span>
        </figcaption>
      </figure>

      <dl className="mt-8 grid gap-x-8 gap-y-6 border-t border-rule pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {states.map((s) => (
          <div key={s.id}>
            <dt className="font-semibold">
              State {s.id}{" "}
              <span className="font-normal text-muted">{grouped(casesHeld(run, s.id))} verified cases</span>
            </dt>
            <dd className="mt-2 text-[15px]">
              <span className="text-muted">Holds: </span>
              {andList(s.seen.map((k) => `${classLabel(k)} (${grouped(s.n_train[k] ?? 0)})`))}
            </dd>
            <dd className="mt-1 text-[15px]">
              <span className="text-muted">Never recorded: </span>
              {s.unseen.length ? andList(s.unseen.map((k) => classLabel(k))) : "none"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-[64ch] text-sm text-muted">
        {capitalize(countWord(states.length))} simulated states: label-skewed slices of one Tamil Nadu dataset, chosen so
        that each state is missing some classes. They say nothing about which pests occur in which real state.
      </p>
    </div>
  );
}

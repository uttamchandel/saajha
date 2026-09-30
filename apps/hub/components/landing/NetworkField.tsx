"use client";

// The hook: an abstract constellation of state nodes (never a map). Each live state node keeps its farmers,
// the starlight dots, orbiting inside its own halo; they never leave it. Gold packets (model weights) travel
// node → hub, the hub averages them and flashes, and the released model travels hub → every node, including
// states that have not joined yet. On the first of every two cycles a signal-blue packet (outbreak counts)
// crosses Maharashtra → hub (border check) → Telangana.
// Motion is SVG SMIL only: no requestAnimationFrame, no canvas. With prefers-reduced-motion the timeline is
// paused on a frame with the packets mid-path. Every coordinate is computed at module scope from fixed
// numbers, so the server and the browser render the same markup.
import { useEffect, useId, useRef } from "react";
import s from "./hero.module.css";

type Pt = { x: number; y: number };
type Circle = Pt & { r: number };
type Quad = readonly [Pt, Pt, Pt];
type Win = readonly [number, number];

// Night tokens (mirror app/globals.css; SMIL colour animation needs literal values).
const NIGHT = "#0a0f2c";
const STAR = "#eef0fb";
const HAZE = "#aab1d8";
const GOLD = "#f0c542";
const SIGNAL = "#7fb0ff";

// ---------------------------------------------------------------- geometry (viewBox units)
const VB = { x: 0, y: 56, w: 600, h: 396 };
const HUB: Circle = { x: 300, y: 247, r: 48 };
const MH: Circle = { x: 108, y: 298, r: 62 };
const TG: Circle = { x: 492, y: 196, r: 62 }; // the hub is the midpoint of MH and TG: the counts lane is a clean S
const FUTURE: Circle[] = [
  { x: 112, y: 120, r: 19 },
  { x: 462, y: 84, r: 15 },
  { x: 540, y: 372, r: 19 },
  { x: 352, y: 424, r: 16 },
  { x: 38, y: 176, r: 13 },
];
const LANE_BEND = 0.12; // gold lanes arc gently, all the same way round
const COUNTS_BEND = -0.2; // the counts lane arcs the other way, so it reads as its own channel

// ---------------------------------------------------------------- timeline (seconds)
const CYCLE = 8; // one round: weights in, averaged, released to every node
const PERIOD = 16; // outbreak counts cross on the first of every two cycles
const PREP: Win = [0.1, 0.85];
const IN_TG: Win = [0.45, 2.05];
const IN_MH: Win = [0.55, 2.15];
const FLASH = 2.15;
const OUT: Win = [2.55, 4.45];
const BLUE_IN: Win = [5.2, 6.2];
const CHECK = 6.2;
const BLUE_OUT: Win = [6.65, 7.65];
const STILL_T = 3.45; // the reduced-motion frame: the released model mid-way to every node
const EASE = "0.45 0 0.55 1";

// ---------------------------------------------------------------- helpers
const n1 = (v: number) => Math.round(v * 10) / 10;
const k4 = (v: number) => Math.round(v * 10000) / 10000;
/** A keyTimes list: 0, each time as a fraction of the period, 1. */
const times = (period: number, ...t: number[]) => [0, ...t.map((x) => k4(x / period)), 1].join(";");

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const at = (q: Quad, t: number): Pt => lerp(lerp(q[0], q[1], t), lerp(q[1], q[2], t), t);
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** A quadratic from `a` to `b`, its control pushed sideways by `k` of the lane's length. */
function bend(a: Pt, b: Pt, k: number): Quad {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return [a, { x: (a.x + b.x) / 2 + dy * k, y: (a.y + b.y) / 2 - dx * k }, b];
}
/** Where the curve crosses the circle's edge (the curve starts on one side of it and ends on the other). */
function crossing(q: Quad, c: Circle): number {
  const startsOutside = dist(at(q, 0), c) > c.r;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (dist(at(q, mid), c) > c.r === startsOutside) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
/** The part of the curve before t, and after t (de Casteljau). */
const before = (q: Quad, t: number): Quad => [q[0], lerp(q[0], q[1], t), at(q, t)];
const after = (q: Quad, t: number): Quad => [at(q, t), lerp(q[1], q[2], t), q[2]];
const reverse = (q: Quad): Quad => [q[2], q[1], q[0]];
const pathD = (q: Quad) => `M${n1(q[0].x)} ${n1(q[0].y)}Q${n1(q[1].x)} ${n1(q[1].y)} ${n1(q[2].x)} ${n1(q[2].y)}`;

/** A lane from a node to the hub's ring; from the node's edge when `fromEdge`, else from its centre. */
function lane(node: Circle, fromEdge: boolean): Quad {
  const full = bend(node, HUB, LANE_BEND);
  const toRing = before(full, crossing(full, HUB));
  return fromEdge ? after(toRing, crossing(toRing, node)) : toRing;
}

/** Deterministic pseudo-random numbers (mulberry32), so server and browser draw identical stars and farmers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- precomputed scene
const LIVE_IN = { mh: lane(MH, false), tg: lane(TG, false) };
const FUTURE_LANES = FUTURE.map((f) => lane(f, true));
const COUNTS_1 = bend(MH, HUB, COUNTS_BEND);
const COUNTS_2: Quad = [HUB, { x: 2 * HUB.x - COUNTS_1[1].x, y: 2 * HUB.y - COUNTS_1[1].y }, TG];
const BLUE_LEG_IN = before(COUNTS_1, crossing(COUNTS_1, HUB));
const BLUE_LEG_OUT = after(COUNTS_2, crossing(COUNTS_2, HUB));

// The still frame's blue packet: part-way along Maharashtra's counts lane, pointing the way it travels.
const STILL_BLUE = (() => {
  const t = 0.55;
  const p = at(BLUE_LEG_IN, t);
  const [p0, c, p2] = BLUE_LEG_IN;
  const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p2.x - c.x);
  const dy = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p2.y - c.y);
  return { x: n1(p.x), y: n1(p.y), angle: n1((Math.atan2(dy, dx) * 180) / Math.PI) };
})();

const STARS = (() => {
  const rnd = rng(20260930);
  return Array.from({ length: 74 }, () => {
    const x = rnd() * VB.w + VB.x;
    const y = rnd() * VB.h + VB.y;
    const edge = Math.min(x - VB.x, VB.x + VB.w - x, y - VB.y, VB.y + VB.h - y);
    const fade = Math.min(1, edge / 70); // no hard edge where the drawing ends
    return { x: n1(x), y: n1(y), r: n1(0.45 + rnd() * 0.75), o: k4((0.1 + rnd() * 0.32) * fade) };
  });
})();

type Ring = { radius: number; count: number; secs: number; clockwise: boolean };
const RINGS: Ring[] = [
  { radius: 21, count: 4, secs: 34, clockwise: true },
  { radius: 34, count: 6, secs: 52, clockwise: false },
  { radius: 48, count: 7, secs: 76, clockwise: true },
]; // 17 farmers per node

function farmers(seed: number, pace: number) {
  const rnd = rng(seed);
  return RINGS.map((ring) => ({
    secs: n1(ring.secs * pace),
    clockwise: ring.clockwise,
    dots: Array.from({ length: ring.count }, (_, i) => {
      const angle = ((i + 0.5 + (rnd() - 0.5) * 0.7) / ring.count) * Math.PI * 2;
      const radius = ring.radius + (rnd() - 0.5) * 7;
      return {
        x: n1(Math.cos(angle) * radius),
        y: n1(Math.sin(angle) * radius),
        r: n1(1.55 + rnd() * 0.85),
        o: k4(0.55 + rnd() * 0.45),
      };
    }),
  }));
}
const FARMERS = { mh: farmers(11, 1), tg: farmers(29, 1.13) };

// ---------------------------------------------------------------- pieces

/** Opacity that is `lo` outside the window and `hi` inside it, ramping in and out. */
function windowed(win: Win, period: number, hi: number, rampIn = 0.16, rampOut = 0.2, lo = 0) {
  const [a, b] = win;
  return { values: [lo, lo, hi, hi, lo, lo].join(";"), keyTimes: times(period, a, a + rampIn, b - rampOut, b) };
}

function Packet({ q, win, period, color, glow, tail }: { q: Quad; win: Win; period: number; color: string; glow: string; tail: string }) {
  const [a, b] = win;
  const dur = `${period}s`;
  const body = windowed(win, period, 1);
  // The comet tail shows while the packet is fast, mid-path, and fades as it eases into its stop.
  const trail = times(period, a, a + (b - a) * 0.28, a + (b - a) * 0.62, b - 0.06);
  return (
    <g opacity={0}>
      <animate attributeName="opacity" dur={dur} repeatCount="indefinite" values={body.values} keyTimes={body.keyTimes} />
      <animateMotion
        dur={dur}
        repeatCount="indefinite"
        path={pathD(q)}
        rotate="auto"
        calcMode="spline"
        keyPoints="0;0;1;1"
        keyTimes={times(period, a, b)}
        keySplines={`0 0 1 1;${EASE};0 0 1 1`}
      />
      <path d="M0 -2.4L-28 0L0 2.4Z" fill={`url(#${tail})`} opacity={0}>
        <animate attributeName="opacity" dur={dur} repeatCount="indefinite" values="0;0;0.95;0.95;0;0" keyTimes={trail} />
      </path>
      <circle r={11} fill={`url(#${glow})`} />
      <circle r={3.4} fill={color} />
    </g>
  );
}

function Ping({ c, from, to, start, len, period, color, width = 1.4, peak = 0.9 }: { c: Pt; from: number; to: number; start: number; len: number; period: number; color: string; width?: number; peak?: number }) {
  const dur = `${period}s`;
  return (
    <circle cx={c.x} cy={c.y} r={from} fill="none" stroke={color} strokeWidth={width} opacity={0}>
      <animate
        attributeName="r"
        dur={dur}
        repeatCount="indefinite"
        calcMode="spline"
        values={`${from};${from};${to};${to}`}
        keyTimes={times(period, start, start + len)}
        keySplines="0 0 1 1;0.15 0.6 0.35 1;0 0 1 1"
      />
      <animate attributeName="opacity" dur={dur} repeatCount="indefinite" values={`0;0;${peak};0;0`} keyTimes={times(period, start, start + 0.05, start + len)} />
    </circle>
  );
}

function LiveNode({ node, name, dots, ids }: { node: Circle; name: string; dots: ReturnType<typeof farmers>; ids: Ids }) {
  const arrive = OUT[1];
  return (
    <g>
      <circle cx={node.x} cy={node.y} r={node.r} fill={NIGHT} />
      <circle cx={node.x} cy={node.y} r={node.r} fill={`url(#${ids.nodeGlow})`} />
      {/* The halo's edge is the state's border: the farmers orbit inside it and never cross it. */}
      <circle cx={node.x} cy={node.y} r={node.r} fill="none" stroke={STAR} strokeWidth={1.1} strokeOpacity={0.42}>
        <animate
          attributeName="stroke-opacity"
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
          values="0.42;0.42;0.9;0.42;0.42"
          keyTimes={times(CYCLE, arrive - 0.05, arrive + 0.12, arrive + 1.1)}
        />
      </circle>
      <g transform={`translate(${node.x} ${node.y})`}>
        {dots.map((ring, i) => (
          <g key={i}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={ring.clockwise ? "0" : "360"}
              to={ring.clockwise ? "360" : "0"}
              dur={`${ring.secs}s`}
              repeatCount="indefinite"
            />
            {ring.dots.map((d, j) => (
              <circle key={j} cx={d.x} cy={d.y} r={d.r} fill={STAR} opacity={d.o} />
            ))}
          </g>
        ))}
      </g>
      <circle cx={node.x} cy={node.y} r={20} fill={`url(#${ids.coreGlow})`} />
      {/* Weights ready: a gold glow at the node's core just before the packet leaves. */}
      <circle cx={node.x} cy={node.y} r={22} fill={`url(#${ids.goldGlow})`} opacity={0}>
        <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" {...windowed(PREP, CYCLE, 0.95, 0.35, 0.3)} />
      </circle>
      <circle cx={node.x} cy={node.y} r={5.5} fill={STAR} />
      <text x={node.x} y={node.y + node.r} textAnchor="middle" className={s.halo}>
        <tspan x={node.x} dy="1.3em" className={s.nodeName}>
          {name}
        </tspan>
        <tspan x={node.x} dy="1.4em" className={s.nodeSub}>
          live node
        </tspan>
      </text>
    </g>
  );
}

type Ids = { goldGlow: string; blueGlow: string; goldTail: string; blueTail: string; nodeGlow: string; coreGlow: string; hubGlow: string };

// ---------------------------------------------------------------- component

export default function NetworkField({ round }: { round: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids: Ids = {
    goldGlow: `${uid}-gg`,
    blueGlow: `${uid}-bg`,
    goldTail: `${uid}-gt`,
    blueTail: `${uid}-bt`,
    nodeGlow: `${uid}-ng`,
    coreGlow: `${uid}-cg`,
    hubGlow: `${uid}-hg`,
  };

  // prefers-reduced-motion: hold one frame with the released model mid-way to every node.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) {
        svg.pauseAnimations();
        svg.setCurrentTime(STILL_T);
      } else {
        svg.unpauseAnimations();
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const label =
    `The Saajha network, animated. Two live state nodes, Telangana and Maharashtra, keep their farmers' records, ` +
    `shown as dots, inside their own circles. Gold packets of model weights travel from each node to the Saajha hub, ` +
    `which averages them into model round ${round} and sends it back to every state, including states not yet ` +
    `connected. A blue packet of outbreak counts crosses from Maharashtra, through the hub's border check, to Telangana.`;

  return (
    <svg
      ref={svgRef}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      role="img"
      aria-label={label}
      className="block h-auto w-full select-none"
      style={{ aspectRatio: `${VB.w} / ${VB.h}` }}
    >
      <defs>
        <radialGradient id={ids.goldGlow}>
          <stop offset="0" stopColor={GOLD} stopOpacity={0.75} />
          <stop offset="0.45" stopColor={GOLD} stopOpacity={0.22} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={ids.blueGlow}>
          <stop offset="0" stopColor={SIGNAL} stopOpacity={0.75} />
          <stop offset="0.45" stopColor={SIGNAL} stopOpacity={0.22} />
          <stop offset="1" stopColor={SIGNAL} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={ids.goldTail} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity={0.8} />
          <stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={ids.blueTail} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor={SIGNAL} stopOpacity={0.8} />
          <stop offset="1" stopColor={SIGNAL} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={ids.nodeGlow}>
          <stop offset="0" stopColor={STAR} stopOpacity={0.13} />
          <stop offset="0.6" stopColor={STAR} stopOpacity={0.05} />
          <stop offset="1" stopColor={STAR} stopOpacity={0.02} />
        </radialGradient>
        <radialGradient id={ids.coreGlow}>
          <stop offset="0" stopColor={STAR} stopOpacity={0.55} />
          <stop offset="1" stopColor={STAR} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={ids.hubGlow}>
          <stop offset="0.5" stopColor={STAR} stopOpacity={0.09} />
          <stop offset="1" stopColor={STAR} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* A faint, fixed star speckle. */}
      <g>
        {STARS.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} fill={STAR} opacity={st.o} />
        ))}
      </g>

      {/* Lanes: gold channels to the hub (dashed for states not yet connected), and the dotted counts lane. */}
      <g fill="none">
        <path d={pathD(LIVE_IN.mh)} stroke={HAZE} strokeOpacity={0.34} strokeWidth={1} />
        <path d={pathD(LIVE_IN.tg)} stroke={HAZE} strokeOpacity={0.34} strokeWidth={1} />
        {FUTURE_LANES.map((q, i) => (
          <path key={i} d={pathD(q)} stroke={HAZE} strokeOpacity={0.17} strokeWidth={1} strokeDasharray="2 5" />
        ))}
        <path d={pathD(BLUE_LEG_IN)} stroke={SIGNAL} strokeOpacity={0.4} strokeWidth={1.3} strokeDasharray="0.1 5" strokeLinecap="round" />
        <path d={pathD(BLUE_LEG_OUT)} stroke={SIGNAL} strokeOpacity={0.4} strokeWidth={1.3} strokeDasharray="0.1 5" strokeLinecap="round" />
      </g>

      {/* States not yet connected: dim, dashed, breathing slowly. */}
      {FUTURE.map((f, i) => (
        <g key={i}>
          <circle cx={f.x} cy={f.y} r={f.r} fill={NIGHT} stroke={HAZE} strokeWidth={1} strokeDasharray="2.5 4" strokeOpacity={0.36}>
            <animate
              attributeName="stroke-opacity"
              values="0.3;0.56;0.3"
              dur={`${5 + i * 0.9}s`}
              begin={`-${n1(i * 1.7)}s`}
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={f.x} cy={f.y} r={2} fill={HAZE} opacity={0.55} />
        </g>
      ))}

      <LiveNode node={MH} name="Maharashtra" dots={FARMERS.mh} ids={ids} />
      <LiveNode node={TG} name="Telangana" dots={FARMERS.tg} ids={ids} />

      {/* The hub. */}
      <circle cx={HUB.x} cy={HUB.y} r={96} fill={`url(#${ids.hubGlow})`} />
      <circle cx={HUB.x} cy={HUB.y} r={80} fill={`url(#${ids.goldGlow})`} opacity={0}>
        <animate attributeName="opacity" dur={`${CYCLE}s`} repeatCount="indefinite" {...windowed([FLASH - 0.05, FLASH + 1.05], CYCLE, 0.5, 0.12, 0.8)} />
      </circle>
      <circle cx={HUB.x} cy={HUB.y} r={HUB.r} fill={NIGHT} stroke={STAR} strokeWidth={1.3} strokeOpacity={0.8}>
        <animate
          attributeName="stroke"
          dur={`${CYCLE}s`}
          repeatCount="indefinite"
          values={`${STAR};${STAR};${GOLD};${GOLD};${STAR};${STAR}`}
          keyTimes={times(CYCLE, FLASH - 0.08, FLASH + 0.06, FLASH + 0.5, FLASH + 1.2)}
        />
      </circle>
      <circle cx={HUB.x} cy={HUB.y} r={40} fill="none" stroke={HAZE} strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="1.2 6.1">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${HUB.x} ${HUB.y}`}
          to={`360 ${HUB.x} ${HUB.y}`}
          dur="120s"
          repeatCount="indefinite"
        />
      </circle>
      <text x={HUB.x} y={HUB.y} dy="-0.8em" textAnchor="middle" className={s.hubSmall}>
        round
      </text>
      <text x={HUB.x} y={HUB.y} dy="0.74em" textAnchor="middle" className={`condensed ${s.hubNum}`}>
        {round}
      </text>
      <text x={HUB.x} y={HUB.y - HUB.r} dy="-0.62em" textAnchor="middle" className={`${s.nodeName} ${s.halo}`}>
        Saajha hub
      </text>

      {/* Moments: the hub averages (gold ring), every node receives the model, the hub checks the counts,
          Telangana is warned. */}
      <Ping c={HUB} from={HUB.r} to={HUB.r + 54} start={FLASH} len={0.95} period={CYCLE} color={GOLD} width={1.6} />
      <Ping c={MH} from={7} to={30} start={OUT[1]} len={0.75} period={CYCLE} color={GOLD} />
      <Ping c={TG} from={7} to={30} start={OUT[1]} len={0.75} period={CYCLE} color={GOLD} />
      {FUTURE.map((f, i) => (
        <Ping key={i} c={f} from={f.r} to={f.r + 11} start={OUT[1]} len={0.8} period={CYCLE} color={GOLD} width={1.2} peak={0.75} />
      ))}
      <Ping c={HUB} from={HUB.r} to={HUB.r + 16} start={CHECK} len={0.6} period={PERIOD} color={SIGNAL} width={1.6} />
      <Ping c={TG} from={TG.r} to={TG.r + 15} start={BLUE_OUT[1]} len={0.7} period={PERIOD} color={SIGNAL} width={1.6} />

      {/* Packets: weights in, the released model out to every node, and the counts crossing. */}
      <Packet q={LIVE_IN.tg} win={IN_TG} period={CYCLE} color={GOLD} glow={ids.goldGlow} tail={ids.goldTail} />
      <Packet q={LIVE_IN.mh} win={IN_MH} period={CYCLE} color={GOLD} glow={ids.goldGlow} tail={ids.goldTail} />
      <Packet q={reverse(LIVE_IN.tg)} win={OUT} period={CYCLE} color={GOLD} glow={ids.goldGlow} tail={ids.goldTail} />
      <Packet q={reverse(LIVE_IN.mh)} win={OUT} period={CYCLE} color={GOLD} glow={ids.goldGlow} tail={ids.goldTail} />
      {FUTURE_LANES.map((q, i) => (
        <Packet key={i} q={reverse(q)} win={OUT} period={CYCLE} color={GOLD} glow={ids.goldGlow} tail={ids.goldTail} />
      ))}
      <Packet q={BLUE_LEG_IN} win={BLUE_IN} period={PERIOD} color={SIGNAL} glow={ids.blueGlow} tail={ids.blueTail} />
      <Packet q={BLUE_LEG_OUT} win={BLUE_OUT} period={PERIOD} color={SIGNAL} glow={ids.blueGlow} tail={ids.blueTail} />

      {/* Still frame only (reduced motion): the counts part-way from Maharashtra. */}
      <g className={s.stillOnly} transform={`translate(${STILL_BLUE.x} ${STILL_BLUE.y}) rotate(${STILL_BLUE.angle})`}>
        <path d="M0 -2.4L-28 0L0 2.4Z" fill={`url(#${ids.blueTail})`} opacity={0.9} />
        <circle r={11} fill={`url(#${ids.blueGlow})`} />
        <circle r={3.4} fill={SIGNAL} />
      </g>
    </svg>
  );
}

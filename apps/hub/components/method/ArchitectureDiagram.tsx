// Section 2: the architecture as an abstract diagram. States are nodes, never a map.
// Straw marks the only thing that crosses a state border: model weights, in both directions.
import { bytesLabel, grouped, pct } from "@/lib/fl";
import type { MethodFigures } from "./figures";
import { andList } from "./figures";
import Section from "./Section";

const INK = "var(--ink)";
const MUTED = "var(--muted)";
const RULE = "var(--rule)";
const SHEET = "var(--sheet)";
const PAPER = "var(--paper)";
const STRAW = "var(--straw)";
const CARBON_WASH = "var(--carbon-wash)";

function Box({
  x,
  y,
  w,
  h,
  title,
  lines,
  fill = SHEET,
  stroke = RULE,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  fill?: string;
  stroke?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill={fill} stroke={stroke} strokeWidth={1.25} />
      <text x={x + 14} y={y + 23} fontSize={15} fontWeight={600} fill={INK}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={l} x={x + 14} y={y + 42 + i * 18} fontSize={13} fill={MUTED}>
          {l}
        </text>
      ))}
    </g>
  );
}

/** A plain ink arrow. */
function Arrow({ d }: { d: string }) {
  return <path d={d} fill="none" stroke={INK} strokeWidth={1.5} markerEnd="url(#method-arrow)" />;
}

/** An arrow for something that crosses the border: a straw highlight under an ink line. */
function CrossingArrow({ d }: { d: string }) {
  return (
    <g>
      <path d={d} fill="none" stroke={STRAW} strokeWidth={10} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" markerEnd="url(#method-arrow)" />
    </g>
  );
}

export default function ArchitectureDiagram({ f }: { f: MethodFigures }) {
  const states = f.stateIds;
  const summary =
    `Inside each of ${states.length} states (${andList(states)}), verified cases feed a frozen MobileNetV3-Large backbone ` +
    `and a Flower client that trains a small head. Only the head's weights, ${grouped(f.updateBytes)} bytes, cross the ` +
    `state border to a border inspector, which lets through only weights and scalar metrics. A Flower ServerApp averages ` +
    `them with ${f.strategyName} into a national model, which is sent back to every state. On this site, your browser runs ` +
    `the backbone and the national head, which decides the diagnosis. Gemini, in a server route, checks the photo shows ` +
    `paddy, writes and speaks the advice, and gives a second opinion that is logged for expert audit when it differs. ` +
    `Advice is shown when the national head is at least ${pct(f.tauFed)} sure and the photo is paddy; below that, a human ` +
    `expert in the state decides.`;

  return (
    <Section
      id="architecture"
      title="The architecture"
      lede="What runs where. The dashed line is a state border: photos, labels and embeddings stay above it."
    >
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
        <figure className="mx-auto w-full max-w-md lg:mx-0">
          <svg
            viewBox="0 0 400 960"
            role="img"
            aria-labelledby="method-arch-title method-arch-desc"
            className="h-auto w-full"
          >
            <title id="method-arch-title">Saajha architecture</title>
            <desc id="method-arch-desc">{summary}</desc>
            <defs>
              <marker
                id="method-arrow"
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={INK} />
              </marker>
            </defs>

            {/* The state node, run by each state */}
            <text x={12} y={20} fontSize={16} fontWeight={700} fill={INK}>
              Inside each state
            </text>
            {states.map((s, i) => (
              <g key={s}>
                <rect x={12 + i * 34} y={32} width={28} height={24} rx={4} fill={CARBON_WASH} stroke={RULE} />
                <text x={26 + i * 34} y={49} fontSize={14} fontWeight={600} fill={INK} textAnchor="middle">
                  {s}
                </text>
              </g>
            ))}
            <text x={20 + states.length * 34} y={49} fontSize={13} fill={MUTED}>
              the same node, run by each state
            </text>

            <rect x={12} y={70} width={376} height={222} rx={6} fill={SHEET} stroke={RULE} strokeWidth={1.25} />
            <Box x={24} y={84} w={352} h={52} title="Expert-verified cases" lines={["photo and confirmed label, kept in the state"]} fill={PAPER} />
            <Arrow d="M 48 136 V 154" />
            <Box
              x={24}
              y={156}
              w={352}
              h={52}
              title="Frozen MobileNetV3-Large"
              lines={[`turns a photo into ${grouped(f.embeddingDim)} numbers; never trains`]}
              fill={PAPER}
            />
            <Arrow d="M 48 208 V 226" />
            <Box
              x={24}
              y={228}
              w={352}
              h={52}
              title="Flower ClientApp"
              lines={[`trains the small head: ${grouped(f.params)} weights`]}
              fill={PAPER}
            />

            {/* The border and what crosses it */}
            <CrossingArrow d="M 64 292 V 420" />
            <text x={84} y={318} fontSize={13} fontWeight={600} fill={INK}>
              weights only: {grouped(f.updateBytes)} bytes
            </text>
            <text x={84} y={335} fontSize={13} fill={MUTED}>
              from each state, each round
            </text>

            <line x1={0} y1={356} x2={400} y2={356} stroke={INK} strokeWidth={1.5} strokeDasharray="7 5" />
            <rect x={146} y={344} width={108} height={24} fill={PAPER} />
            <text x={200} y={361} fontSize={14} fontWeight={700} fill={INK} textAnchor="middle">
              State border
            </text>

            <CrossingArrow d="M 332 581 H 360 V 296" />
            <text x={346} y={388} fontSize={13} fontWeight={600} fill={INK} textAnchor="end">
              averaged weights back
            </text>
            <text x={346} y={405} fontSize={13} fill={MUTED} textAnchor="end">
              to every state
            </text>

            {/* National side */}
            <Box
              x={12}
              y={424}
              w={320}
              h={96}
              title="Border inspector"
              lines={["only weights and scalar metrics pass;", "anything else stops the round;", "logs bytes and a sha256 per round"]}
              stroke={INK}
            />
            <Arrow d="M 64 520 V 546" />
            <Box
              x={12}
              y={548}
              w={320}
              h={66}
              title={`Flower ServerApp: ${f.strategyName}`}
              lines={[`averages the heads, ${f.trainingRounds} rounds`]}
            />
            <Arrow d="M 64 614 V 640" />
            <Box
              x={12}
              y={642}
              w={320}
              h={66}
              title={`National model, round ${f.finalRound}`}
              lines={[`scored on ${grouped(f.nTest)} held-out photos`]}
            />

            {/* This site */}
            <Arrow d="M 64 708 V 746" />
            <text x={84} y={733} fontSize={13} fill={MUTED}>
              served as static files to this site
            </text>
            <Box x={12} y={748} w={182} h={84} title="Your browser" lines={["ONNX backbone and", "the national head"]} />
            <Box x={206} y={748} w={182} h={84} title="Gemini 3.5 Flash-Lite" lines={["paddy check, advice,", "voice, second opinion"]} />
            <Arrow d="M 103 832 V 854" />
            <Arrow d="M 297 832 V 854" />
            <Box
              x={12}
              y={856}
              w={376}
              h={98}
              title={`Federated model at least ${pct(f.tauFed)} sure?`}
              lines={[
                "yes, and paddy: advice in the farmer's language",
                "no: an expert in the state decides",
                "a differing Gemini label is logged for audit",
              ]}
              stroke={INK}
            />
          </svg>
        </figure>

        <dl className="max-w-[60ch] space-y-6 text-[17px] leading-relaxed">
          <div>
            <dt className="font-semibold">State node</dt>
            <dd className="mt-1">
              Runs inside each state. The frozen backbone turns a photo into {grouped(f.embeddingDim)} numbers on the
              state&apos;s own machine; only the small head on top of those numbers trains. In this prototype the{" "}
              {states.length} nodes are separate Flower SuperNode processes on one machine.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">State border</dt>
            <dd className="mt-1">
              <mark className="bg-straw-wash px-1 text-ink">Weights cross it, in both directions</mark>:{" "}
              {grouped(f.updateBytes)} bytes from each state per round, and the averaged head back. Photos, labels and
              embeddings do not.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Border inspector</dt>
            <dd className="mt-1">
              Checks every reply before it is averaged. Anything other than model weights and scalar metrics (an image,
              an embedding matrix, a list of labels) stops the round. It measures the bytes and records a sha256
              fingerprint of each round&apos;s weights.
              {f.payloadTypes.length > 0 && <> Payload types logged in this run: {andList(f.payloadTypes)}.</>}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">National aggregator</dt>
            <dd className="mt-1">
              A Flower ServerApp averages the heads with {f.strategyName} over {f.trainingRounds} rounds and scores every
              round&apos;s model on {grouped(f.nTest)} held-out photos that no state trained on.
            </dd>
          </div>
          <div>
            <dt className="font-semibold">This site</dt>
            <dd className="mt-1">
              Your browser runs the same backbone file the states used
              {f.backboneBytes != null && <> (ONNX, {bytesLabel(f.backboneBytes)})</>} with the national head. Every
              head file carries its sha256, which can be recomputed from its weights. The national head decides the
              diagnosis. Gemini runs in a server route: it checks the photo shows paddy, writes and speaks the advice, and
              gives a second opinion that is logged for audit when it differs. When the head is below{" "}
              {pct(f.tauFed)} confidence, a human decides.
            </dd>
          </div>
        </dl>
      </div>
    </Section>
  );
}

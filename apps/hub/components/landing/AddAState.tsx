// Deployability, on night-2: two live state nodes running the same code, and the empty slot for the
// next state, which is one deploy with one setting. The node glyphs echo the hero's network: a halo
// with farmer dots that stay inside it.
import { cardNight, chipNight, labelNight, pillNight } from "@/lib/ui";
import { ArrowUpRight, LiveDot } from "./sectionIcons";

const NODE_URL = (process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app").replace(/\/+$/, "");
const MH_URL = "https://saajha-node-mh.vercel.app";

const host = (url: string) => url.replace(/^https?:\/\//, "");

const LIVE_NODES = [
  { state: "Telangana", language: "Telugu", url: NODE_URL },
  { state: "Maharashtra", language: "Marathi", url: MH_URL },
];

const BUILT_WITH = [
  "Gemini · Google AI",
  "Flower federated learning",
  "Model runs in the farmer's browser (ONNX)",
  "Next.js on Vercel, Mumbai",
  "Postgres per state",
];

export default function AddAState() {
  return (
    <section aria-labelledby="add-h" className="bg-night-2 text-starlight">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-6">
            <p className={pillNight}>Deployability</p>
            <h2 id="add-h" className="display mt-4 text-balance text-[clamp(2rem,4.4vw,3.4rem)]">
              Adding a state is one deploy.
            </h2>
          </div>
          <p className="max-w-[62ch] text-pretty text-lg leading-relaxed text-haze lg:col-span-6">
            Telangana and Maharashtra run the same node code, each with its own database. One setting tells a node which state
            it serves. It pulls the model from the hub, and the hub pulls its outbreak counts.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 sm:mt-16 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr]">
          {LIVE_NODES.map((n) => (
            <li key={n.state}>
              <a
                href={n.url}
                className={`${cardNight} group flex h-full flex-col p-6 text-starlight no-underline transition-colors hover:border-white/25 hover:bg-white/10 sm:p-7`}
              >
                <div className="flex items-start justify-between gap-4">
                  <NodeGlyph live />
                  <span className={pillNight}>
                    <LiveDot />
                    Live
                  </span>
                </div>
                <h3 className="display mt-8 text-[1.9rem]">{n.state}</h3>
                <p className="mt-1 text-base text-haze">{n.language}</p>
                <div className="mt-auto pt-8">
                  <p className="flex items-center justify-between gap-3 border-t border-night-line pt-4 text-[15px]">
                    <span className="min-w-0 truncate">{host(n.url)}</span>
                    <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                </div>
              </a>
            </li>
          ))}

          <li className="flex flex-col rounded-2xl border border-dashed border-white/25 p-6 sm:p-7 md:col-span-2 lg:col-span-1">
            <NodeGlyph />
            <h3 className="display mt-8 text-[1.9rem]">Your state</h3>
            <p className="mt-1 text-base text-haze">One more deploy</p>
            <p className="mt-auto pt-6">
              <code className="block break-all rounded-lg bg-black/25 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-starlight sm:text-[13px]">
                NEXT_PUBLIC_NODE_STATE=&quot;Karnataka&quot;
              </code>
            </p>
          </li>
        </ul>

        <div className="mt-14 grid gap-6 border-t border-night-line pt-10 sm:mt-16 lg:grid-cols-12 lg:gap-10">
          <h3 className={`${labelNight} lg:col-span-2 lg:pt-2`}>Built with</h3>
          <div className="lg:col-span-10">
            <ul className="flex flex-wrap gap-2.5">
              {BUILT_WITH.map((b) => (
                <li key={b} className={chipNight}>
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-7 text-lg text-haze">Next: federated rounds as Flower jobs on Google Cloud.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Farmer dots, in a loose ring inside the node's halo (never outside it).
const FARMERS = [
  [13, 19],
  [22, 10.5],
  [32, 13],
  [37, 25],
  [31, 35],
  [19, 36],
  [11, 28],
] as const;

/** A state node: a halo with farmer dots inside it. A future node is a dashed ring with a plus. */
function NodeGlyph({ live = false }: { live?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-14" fill="none">
      {live ? (
        <>
          <circle cx="24" cy="24" r="21" fill="var(--starlight)" fillOpacity="0.06" />
          <circle cx="24" cy="24" r="21" stroke="var(--starlight)" strokeOpacity="0.55" strokeWidth="1.5" />
          <circle cx="24" cy="24" r="3.2" fill="var(--starlight)" />
          {FARMERS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="var(--starlight)" fillOpacity="0.8" />
          ))}
        </>
      ) : (
        <>
          <circle cx="24" cy="24" r="21" stroke="var(--haze)" strokeOpacity="0.8" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M24 18v12M18 24h12" stroke="var(--haze)" strokeWidth="1.75" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// The network, live: where a visitor goes next after the flip. The state node (KisanVaani) is a
// separate deployment that downloads this hub's model release, checks its fingerprint and lets it
// decide every paddy photo; the hub serves releases and the advice-card library, never farmer data.
const NODE_URL = (process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app").replace(/\/+$/, "");

const CROSSINGS = [
  { what: "Model releases", how: "Weights and fingerprints for every round. State nodes download them and refuse a file that does not match.", live: true },
  { what: "Approved advice", how: "A node asks for a condition's card in a language; only the label and the language cross, never the photo.", live: true },
  { what: "Outbreak counts", how: "District, week, pest and a count of at least 5, so a neighbouring state is warned first. The hub checks every count at the border.", live: true, href: "/exchange", cta: "See counts cross" },
];

export default function NetworkLive({ round, sha256 }: { round: number; sha256: string }) {
  return (
    <section aria-labelledby="network-h" className="mt-16 border-t border-rule pt-10">
      <h2 id="network-h" className="display text-[clamp(1.6rem,3.6vw,2.4rem)]">
        The network, live
      </h2>
      <p className="mt-3 max-w-[70ch] text-lg text-muted">
        Farmers never visit this site. They reach their state&apos;s own node by voice call, SMS, WhatsApp or the web, in their
        own language, and their records stay there. This hub is the shared layer between the nodes. One rule: raw farmer data
        never leaves its state.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-md border border-rule bg-sheet p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">State nodes · Telangana and Maharashtra, live</p>
          <h3 className="display mt-1 text-2xl">KisanVaani</h3>
          <p className="mt-2 text-[15px]">
            The farmer layer: voice, SMS and WhatsApp in 12+ languages, expert tickets and the district officer&apos;s console.
            Its paddy photos are decided by this hub&apos;s national model, round {round} (fingerprint{" "}
            <span className="condensed">{sha256.slice(0, 12)}…</span>), run on the farmer&apos;s own device. Gemini checks the photo
            and gives a second opinion; it never decides.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href={`${NODE_URL}/demo`} className="rounded-md bg-ink px-5 py-3 text-base font-semibold text-white no-underline hover:bg-[#2a3888]">
              Try it as a farmer
            </a>
            <a href={`${NODE_URL}/whatsapp`} className="rounded-md border border-ink px-5 py-3 text-base font-semibold text-ink no-underline">
              WhatsApp
            </a>
            <a href={`${NODE_URL}/dev/model-check`} className="rounded-md border border-ink px-5 py-3 text-base font-semibold text-ink no-underline">
              Check it runs our model
            </a>
          </div>
        </div>

        <div className="rounded-md border border-rule p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">What may cross a state border</p>
          <ul className="mt-3 space-y-4">
            {CROSSINGS.map((c) => (
              <li key={c.what}>
                <p className="font-semibold">
                  {c.what}{" "}
                  <span className={`ml-1 text-sm font-semibold ${c.live ? "text-shoot" : "text-muted"}`}>
                    {c.live ? "· live" : "· being built"}
                  </span>
                </p>
                <p className="text-[15px] text-muted">
                  {c.how}
                  {c.href && (
                    <>
                      {" "}
                      <a href={c.href} className="text-carbon underline underline-offset-4">
                        {c.cta}
                      </a>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

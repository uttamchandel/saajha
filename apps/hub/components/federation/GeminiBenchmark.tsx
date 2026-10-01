// Section 6: Gemini measured on the same held-out photos as the federated model. Every number is read from
// run.gemini_benchmark and run.gate (the 90% is the precision target tau_fed was calibrated to, per gate.calibrated_on);
// these numbers are why the federated model, not Gemini, decides (lib/gate.ts).
import type { RunFile } from "@/lib/contract";
import { grouped, pct } from "@/lib/fl";
import { card } from "@/lib/ui";
import { formatIST } from "./shared";

/** Gemini reports confidence as a percentage (0-100); tolerate a 0-1 value too. */
const conf = (v: number | null) => (v == null ? "—" : v > 1 ? `${Math.round(v)}%` : pct(v));

export default function GeminiBenchmark({ run }: { run: RunFile }) {
  const g = run.gemini_benchmark;
  if (!g) {
    return (
      <p className="mt-4 max-w-[64ch] text-[17px]">
        Gemini benchmark pending — measured on held-out photos before submission.
        <span className="mt-2 block text-[15px] text-muted">
          Until it is measured, this site makes no claim about how Gemini&apos;s accuracy compares with the federated
          model&apos;s.
        </span>
      </p>
    );
  }
  const others = g.models_used.filter((m) => m !== g.model);
  // The third entry marks a figure (set in the display face); names and dates stay in the text face.
  const items: [string, React.ReactNode, boolean][] = [
    ["Photos scored", grouped(g.n), true],
    ["Gemini accuracy", pct(g.acc, 1), true],
    ["Federated model, same photos", pct(g.fed_acc_same_images, 1), true],
    ["Gemini's self-reported confidence when right (mean)", conf(g.mean_conf_correct), true],
    ["Gemini's self-reported confidence when wrong (mean)", conf(g.mean_conf_wrong), true],
    ["Model", others.length ? `${g.model} (also answered by ${others.join(", ")})` : g.model, false],
    ["Measured", formatIST(g.measured_at), false],
  ];
  return (
    <div>
      <p className="mt-4 max-w-[64ch] text-[17px] text-muted">
        Gemini ({g.model}, zero-shot, limited to the {run.classes.length} labels) and the federated model were scored on
        the same {grouped(g.n)} held-out photos. Gemini named the right condition {pct(g.acc)} of the time and the
        federated model {pct(g.fed_acc_same_images)}, and Gemini&apos;s stated confidence averaged{" "}
        {conf(g.mean_conf_correct)} when right and {conf(g.mean_conf_wrong)} when wrong. It is not reliable at telling
        these field conditions apart, so on this site it does not decide. The federated model decides: advice is shown
        when it is at least {pct(run.gate.tau_fed)} sure, the threshold at which 90% or more of its answers were right on
        validation photos no state trained on. Gemini checks the photo shows paddy, writes and speaks the advice, and
        gives a second opinion; when that differs, the case is logged for a state expert to audit.
      </p>
      <dl className={`${card} mt-6 grid max-w-4xl gap-x-8 gap-y-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3`}>
        {items.map(([k, v, isFigure]) => (
          <div key={k}>
            <dt className="text-[15px] text-muted">{k}</dt>
            <dd
              className={
                isFigure
                  ? "font-display mt-1 text-2xl font-semibold leading-tight text-forest"
                  : "mt-1.5 text-[17px] font-semibold leading-snug text-ink"
              }
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

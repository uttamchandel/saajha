// Section 3: the core evidence. Each state's accuracy on the classes it holds and on the classes it
// has never recorded, trained on its own data only versus after federation. All values from run.json.
import type { PerStateAcc, RunFile, StateId } from "@/lib/contract";
import { grouped, pct } from "@/lib/fl";
import { card, figure } from "@/lib/ui";
import { andList, finalRound, localOnHardSubset, moveTone, pointsDelta } from "./shared";

type Row = { id: StateId; seen: number; unseen: number; before?: PerStateAcc; after: PerStateAcc };

function Before({ v }: { v: number | null | undefined }) {
  if (v === undefined) {
    return (
      <td className="px-3 py-3 align-top text-muted sm:px-4">
        <span aria-hidden="true">—</span>
        <span className="sr-only">not scored</span>
      </td>
    );
  }
  return <td className="condensed px-3 py-3 align-top text-2xl sm:px-4">{pct(v)}</td>;
}

function After({ before, after }: { before: number | null | undefined; after: number | null }) {
  const d = pointsDelta(before ?? null, after);
  return (
    <td className="px-3 py-3 align-top sm:px-4">
      <span className={`condensed block text-2xl font-semibold ${moveTone(before, after)}`}>{pct(after)}</span>
      {d && <span className="block text-sm text-muted">{d.text}</span>}
    </td>
  );
}

function Rows({ rows, heading }: { rows: Row[]; heading: string }) {
  return (
    <tbody>
      <tr>
        <th colSpan={5} scope="rowgroup" className="bg-carbon-wash px-3 py-2 text-left text-[15px] font-semibold sm:px-4">
          {heading}
        </th>
      </tr>
      {rows.map((r) => (
        <tr key={r.id} className="border-t border-rule">
          <th scope="row" className="px-3 py-3 text-left align-top font-normal sm:px-4">
            <span className="block font-semibold">State {r.id}</span>
            <span className="block text-sm text-muted">
              holds {r.seen}, never recorded {r.unseen}
            </span>
          </th>
          <Before v={r.before ? r.before.acc_seen : undefined} />
          <After before={r.before?.acc_seen} after={r.after.acc_seen} />
          <Before v={r.before ? r.before.acc_unseen : undefined} />
          <After before={r.before?.acc_unseen} after={r.after.acc_unseen} />
        </tr>
      ))}
    </tbody>
  );
}

export default function AccuracyMatrix({ run }: { run: RunFile }) {
  const last = finalRound(run);
  const hs = run.hard_subset;
  const nTest = run.provenance.dataset.n_test;

  const main: Row[] = run.states.map((s) => ({
    id: s.id,
    seen: s.seen.length,
    unseen: s.unseen.length,
    before: run.local_models[s.id],
    after: last.per_state[s.id],
  }));
  const hard: Row[] = run.states.map((s) => ({
    id: s.id,
    seen: s.seen.length,
    unseen: s.unseen.length,
    before: localOnHardSubset(run, s.id),
    after: hs.fed_per_state[s.id],
  }));
  const hardLocalIds = hard.filter((r) => r.before).map((r) => r.id);
  const pooled = run.centralized_upper_bound.acc_all;
  const fed = last.global.acc_all;

  const th = "px-3 py-2 text-left align-bottom text-sm font-normal text-ink-soft sm:px-4";

  return (
    <div>
      <p className="mt-4 max-w-[64ch] text-[17px] text-muted">
        <strong className="font-semibold text-ink">Own data only</strong> is the model a state trains on its own verified
        cases. <strong className="font-semibold text-ink">After federation</strong> is the averaged model after round{" "}
        {last.round}, scored on the same state&apos;s held-out photos. Every photo scored here was held out of training in
        every state.
      </p>

      <div
        className={`${card} mt-6 max-w-5xl relative overflow-x-auto`}
        role="region"
        aria-labelledby="matrix-caption"
        tabIndex={0}
      >
        <table className="w-full min-w-[560px] border-collapse">
          <caption id="matrix-caption" className="sr-only">
            Accuracy of each state&apos;s model on held-out photos, own data only versus after federation, for the classes
            the state holds and the classes it has never recorded
          </caption>
          <thead className="bg-paper-warm">
            <tr>
              <th rowSpan={2} scope="col" className={th}>
                State
              </th>
              <th colSpan={2} scope="colgroup" className="border-b border-l border-rule px-3 pt-3 pb-1 text-left text-[15px] font-semibold sm:px-4">
                Classes it holds
              </th>
              <th colSpan={2} scope="colgroup" className="border-b border-l border-rule px-3 pt-3 pb-1 text-left text-[15px] font-semibold sm:px-4">
                Classes it has never recorded
              </th>
            </tr>
            <tr className="border-b border-rule">
              <th scope="col" className={`${th} border-l border-rule`}>
                Own data only
              </th>
              <th scope="col" className={th}>
                After federation
              </th>
              <th scope="col" className={`${th} border-l border-rule`}>
                Own data only
              </th>
              <th scope="col" className={th}>
                After federation
              </th>
            </tr>
          </thead>
          <Rows rows={main} heading={`All ${grouped(nTest)} held-out photos`} />
          <Rows rows={hard} heading={`Hard subset: ${grouped(hs.n)} of ${grouped(hs.n_test)} held-out photos with no near-twin in training`} />
        </table>
      </div>
      <p className="mt-3 max-w-[64ch] text-sm text-muted">
        Green: better than the state&apos;s own model. Rust: worse. The change is written under each figure.
        {hardLocalIds.length < run.states.length &&
          (hardLocalIds.length === 0
            ? " On the hard subset, own-data-only models were not scored; a dash means not scored."
            : ` On the hard subset, own-data-only models were scored for ${hardLocalIds.length === 1 ? "State" : "States"} ${andList(hardLocalIds)} only; a dash means not scored.`)}
      </p>

      <div className="mt-10 grid max-w-5xl gap-x-10 gap-y-8 border-t border-rule pt-8 md:grid-cols-2">
        <div>
          <p className="text-[15px] text-muted">Federated model, all states and classes</p>
          <p className={`${figure} mt-1 text-5xl text-forest`}>{pct(fed, 1)}</p>
          <p className="mt-2 text-[15px] text-muted">
            Pooled upper bound: <span className="condensed text-xl font-semibold text-ink">{pct(pooled, 1)}</span>
            {pooled > fed && <> ({((pooled - fed) * 100).toFixed(1)} points higher)</>}
          </p>
          <p className="mt-3 max-w-[52ch] text-[15px]">
            The pooled model is what you would get if every state handed its photos to one place and trained there.
            Federation reached {pct(fed, 1)} without any state handing over a single photo or record.
          </p>
        </div>
        <div>
          <p className="text-[15px] text-muted">Federated model on the hard subset</p>
          <p className={`${figure} mt-1 text-5xl text-forest`}>{pct(hs.fed_acc_all, 1)}</p>
          <p className="mt-2 text-[15px] text-muted">
            {grouped(hs.n)} of {grouped(hs.n_test)} held-out photos
          </p>
          <p className="mt-3 max-w-[52ch] text-[15px]">
            Paddy Doctor photographs the same plants repeatedly, so a held-out photo can have a near-twin in training. We
            also score only held-out photos with no near-twin in any state&apos;s training data. Rule, as recorded:{" "}
            <span className="text-muted">&ldquo;{hs.rule}&rdquo;</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Section 7: where the numbers on this page come from.
import type { RunFile } from "@/lib/contract";
import { grouped } from "@/lib/fl";
import { formatIST, link } from "./shared";

export default function Provenance({ run }: { run: RunFile }) {
  const p = run.provenance;
  const d = p.dataset;
  const st = run.strategy;
  const h = run.head;
  const items: [string, React.ReactNode][] = [
    ["Run", run.run_id],
    ["Recorded", formatIST(run.created_at)],
    [
      "Runtime",
      <>
        Flower {p.runtime}. All processes ran on one machine; the state topology is simulated.
      </>,
    ],
    ["Software", `Flower ${p.flwr}, PyTorch ${p.torch}`],
    ["Random seed", String(p.seed)],
    ...(p.git_commit ? ([["Code commit", p.git_commit]] as [string, React.ReactNode][]) : []),
    [
      "Training",
      `${st.name}, ${st.rounds} rounds, ${st.local_epochs} local ${st.local_epochs === 1 ? "epoch" : "epochs"} per round, learning rate ${st.lr}${
        st.mask_absent ? ", classes missing from a state's data masked out of its local training" : ""
      }${st.dp ? ", with differential privacy" : ", no differential privacy"}`,
    ],
    [
      "Model",
      `${run.backbone.name}, then a ${h.arch === "mlp1" ? `one-hidden-layer head (${grouped(run.backbone.embedding_dim)} inputs, ${h.hidden} hidden units, ${run.classes.length} classes)` : "linear head"}: ${grouped(h.params)} parameters, ${grouped(h.bytes_fp32)} bytes. Only the head is federated.`,
    ],
    [
      "Dataset",
      <>
        {d.name}, by {d.authors}. {d.origin}. {grouped(d.n_train)} training photos, {grouped(d.n_test)} held out. Licence:{" "}
        {d.licence}.{" "}
        <a href={d.paper} className={link} target="_blank" rel="noreferrer">
          Paper (arXiv)
        </a>
        ,{" "}
        <a href={d.url} className={link} target="_blank" rel="noreferrer">
          data (Kaggle)
        </a>
        .
      </>,
    ],
    [
      "Raw record",
      <>
        <a href="/fl/run.json" className={link}>
          Open run.json
        </a>{" "}
        <span className="text-muted">
          (every figure on this page is read from it)
        </span>
      </>,
    ],
  ];

  return (
    <div>
      <dl className="mt-6 grid max-w-5xl border-t border-rule">
        {items.map(([k, v]) => (
          <div key={k} className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
            <dt className="text-[15px] text-muted">{k}</dt>
            <dd className="min-w-0 break-words text-[15px]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

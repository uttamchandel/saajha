// Every figure the /method page quotes, derived from run.json in one place.
// Nothing here is typed in by hand: change the run, and the page changes with it.
import type { PerStateAcc, RunFile, StateId } from "@/lib/contract";
import { classLabel, isClassKey } from "@/lib/classes";

export interface MethodFigures {
  runId: string;
  createdLabel: string;
  nStates: number;
  stateIds: StateId[];
  trainingRounds: number;
  finalRound: number;
  roundsServed: number;
  params: number;
  embeddingDim: number;
  updateBytes: number;
  backboneBytes: number | null;
  fedAcc: number;
  pooledAcc: number;
  heroState: StateId;
  heroClassLabel: string;
  heroUnseenLabels: string[];
  heroUnseenBefore: number | null;
  heroUnseenAfter: number | null;
  hard: {
    n: number;
    nTest: number;
    rule: string;
    fedAcc: number;
    heroUnseenBefore: number | null;
    heroUnseenAfter: number | null;
  };
  nTest: number;
  nTrain: number;
  nClasses: number;
  finalTemperature: number;
  tauFed: number;
  tauGem: number;
  medianRoundSeconds: number | null;
  payloadTypes: string[];
  recordsMoved: number;
  roundsWithRecords: number;
  strategyName: string;
  maskAbsent: boolean;
  dp: RunFile["strategy"]["dp"];
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function methodFigures(run: RunFile): MethodFigures {
  const training = run.rounds.filter((r) => r.round > 0);
  const final = run.rounds[run.rounds.length - 1];
  const hero = run.hero.state;
  const sizes = training.flatMap((r) =>
    Object.values(r.update_bytes).filter((v): v is number => typeof v === "number"),
  );
  const heroState = run.states.find((s) => s.id === hero);
  const hardLocal = (run.hard_subset as unknown as Record<string, PerStateAcc | undefined>)[`local_${hero}_per_state`];

  return {
    runId: run.run_id,
    createdLabel: formatDate(run.created_at),
    nStates: run.states.length,
    stateIds: run.states.map((s) => s.id),
    trainingRounds: training.length,
    finalRound: final.round,
    roundsServed: run.rounds.length,
    params: run.head.params,
    embeddingDim: run.backbone.embedding_dim,
    updateBytes: sizes.length ? Math.max(...sizes) : run.head.bytes_fp32,
    backboneBytes: run.backbone.onnx_bytes,
    fedAcc: final.global.acc_all,
    pooledAcc: run.centralized_upper_bound.acc_all,
    heroState: hero,
    heroClassLabel: isClassKey(run.hero.class) ? classLabel(run.hero.class) : run.hero.class,
    heroUnseenLabels: (heroState?.unseen ?? []).map((k) => (isClassKey(k) ? classLabel(k) : k)),
    heroUnseenBefore: run.local_models[hero]?.acc_unseen ?? null,
    heroUnseenAfter: final.per_state[hero]?.acc_unseen ?? null,
    hard: {
      n: run.hard_subset.n,
      nTest: run.hard_subset.n_test,
      rule: run.hard_subset.rule,
      fedAcc: run.hard_subset.fed_acc_all,
      heroUnseenBefore: hardLocal?.acc_unseen ?? null,
      heroUnseenAfter: run.hard_subset.fed_per_state[hero]?.acc_unseen ?? null,
    },
    nTest: run.provenance.dataset.n_test,
    nTrain: run.provenance.dataset.n_train,
    nClasses: run.classes.length,
    finalTemperature: final.temperature,
    tauFed: run.gate.tau_fed,
    tauGem: run.gate.tau_gem,
    medianRoundSeconds: median(training.map((r) => r.duration_s)),
    payloadTypes: Array.from(new Set(training.flatMap((r) => r.payload_types))),
    recordsMoved: run.totals.records_moved,
    roundsWithRecords: training.filter((r) => r.raw_rows_transmitted > 0).length,
    strategyName: run.strategy.name,
    maskAbsent: run.strategy.mask_absent,
    dp: run.strategy.dp,
  };
}

/** "A, B and C" */
export function andList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "A, B or C" */
export function orList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** Absolute difference in percentage points, one decimal: "4.3". */
export function pointsBetween(a: number, b: number): string {
  return Math.abs((a - b) * 100).toFixed(1);
}

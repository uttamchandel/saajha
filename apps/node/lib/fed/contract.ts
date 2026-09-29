// Copied from apps/hub/lib/contract.ts — the node runs the hub's released model with the same code. Keep identical.
// Types for the static files written by fl/scripts/export_web.py (schema_version 1).
// Every number the site shows comes from these files; nothing is typed in by hand.
import type { ClassKey } from "./classes";

export type StateId = "A" | "B" | "C" | "D";

export interface PerStateAcc {
  acc_seen: number | null;
  acc_unseen: number | null;
}

export interface RoundEntry {
  round: number;
  duration_s: number;
  head_url: string;
  temperature: number;
  weights_sha256: string;
  tensor_shapes: Record<string, number[]>;
  update_bytes: Partial<Record<StateId, number>>;
  broadcast_bytes: number;
  bytes_on_wire_total: number;
  raw_rows_transmitted: number;
  payload_types: string[];
  clients: Partial<Record<StateId, { n_examples: number; train_loss: number }>>;
  global: { acc_all: number; per_class_acc: Record<ClassKey, number | null> };
  per_state: Record<StateId, PerStateAcc>;
}

export interface LocalModel extends PerStateAcc {
  head_url: string;
  sha256: string;
  temperature: number;
  n_train: number;
  acc_all: number;
  per_class_acc: Record<ClassKey, number | null>;
}

export interface GeminiBenchmark {
  model: string;
  n: number;
  acc: number;
  per_class_acc: Record<ClassKey, number>;
  mean_conf_correct: number | null;
  mean_conf_wrong: number | null;
  models_used: string[];
  measured_at: string;
  fed_acc_same_images: number;
}

export interface RunFile {
  schema_version: 1;
  run_id: string;
  created_at: string;
  provenance: {
    git_commit: string | null;
    flwr: string;
    torch: string;
    seed: number;
    runtime: string;
    dataset: { name: string; authors: string; paper: string; url: string; licence: string; origin: string; source: string; n_train: number; n_test: number };
    disclosure: string;
  };
  classes: { idx: number; key: ClassKey; name_en: string; is_pest: boolean }[];
  states: { id: StateId; partition_id: number; seen: ClassKey[]; unseen: ClassKey[]; n_train: Partial<Record<ClassKey, number>> }[];
  hero: { state: StateId; class: ClassKey };
  backbone: {
    name: string;
    onnx_url: string;
    onnx_sha256: string | null;
    onnx_bytes: number | null;
    embedding_dim: number;
    input: { w: number; h: number; resize: string; mean: number[]; std: number[]; layout: "NCHW"; input_name: string; output_name: string };
  };
  head: { arch: "linear" | "mlp1"; hidden: number; input_norm: "l2"; params: number; bytes_fp32: number };
  strategy: { name: string; rounds: number; local_epochs: number; lr: number; mask_absent: boolean; dp: null | Record<string, number> };
  gate: { tau_fed: number; tau_gem: number; calibrated_on: string };
  local_models: Record<StateId, LocalModel>;
  rounds: RoundEntry[];
  totals: { records_moved: number; bytes_on_wire: number };
  centralized_upper_bound: { acc_all: number };
  hard_subset: {
    rule: string;
    n: number;
    n_test: number;
    fed_acc_all: number;
    fed_per_class_acc: Record<ClassKey, number | null>;
    fed_per_state: Record<StateId, PerStateAcc>;
    [k: `local_${string}_per_state`]: PerStateAcc;
  };
  gemini_benchmark: GeminiBenchmark | null;
}

export interface HeadTensor {
  name: string;
  shape: number[];
  dtype: "float32-le";
  b64: string;
}

export interface HeadFile {
  id: string;
  kind: "local" | "global";
  state: StateId | null;
  round: number | null;
  arch: "linear" | "mlp1";
  temperature: number;
  tensors: HeadTensor[];
  sha256: string;
}

export interface TrajectoryPoint {
  round: number;
  top: ClassKey;
  top_p: number;
  true_p: number;
}

export interface GalleryItem {
  id: string;
  image_url: string;
  true_key: ClassKey;
  hero: boolean;
  source: string;
  embedding_b64: string;
  python_topk: Record<string, [ClassKey, number][]>;
  trajectory: TrajectoryPoint[];
}

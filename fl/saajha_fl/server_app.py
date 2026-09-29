"""Saajha national aggregator.

Broadcasts the shared head, collects weight updates from the state nodes,
inspects every reply at the border, averages them with Flower's own FedAvg,
and scores the result on a held-out benchmark no state trained on — per state,
on the classes it holds (seen) and the classes it has never recorded (unseen).

Every round's evidence and aggregated head is written to
`<DATA>/runs/<run-id>/` for `export_web.py` to package for the dashboard.
"""

from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import torch
from flwr.app import ArrayRecord, ConfigRecord, Context, MetricRecord
from flwr.serverapp import Grid, ServerApp
from flwr.serverapp.strategy import FedAvg, FedProx
from flwr.serverapp.strategy.strategy_utils import aggregate_metricrecords

from saajha_fl import inspector
from saajha_fl.common import DATA, HERO_CLASS, HERO_STATE, SEED, STATES
from saajha_fl.task import Head, accuracy_report, split_data

app = ServerApp()

# Filled as replies arrive; written once the round is scored. Module state
# because Flower's evaluate callback takes only a round number and the weights.
_ROUND: dict = {"per_state": {}, "raw_rows": 0, "t0": 0.0, "update_bytes": {}}
_RUN: dict = {"dir": None, "hidden": 0}


def _capture_train(records: list, weighting_metric_name: str):
    """Inspect every reply at the border, note who sent what, then aggregate."""
    _ROUND["raw_rows"] = inspector.assert_weights_only(records)
    per_state, update_bytes = {}, {}
    for record in records:
        metrics = next(iter(record.metric_records.values()))
        idx = int(metrics.get("partition-id", -1))
        state = STATES[idx] if 0 <= idx < len(STATES) else f"node-{idx}"
        per_state[state] = {"n_examples": int(metrics.get("num-examples", 0)),
                            "train_loss": round(float(metrics.get("train_loss", 0.0)), 4)}
        update_bytes[state] = sum(inspector.array_bytes(a) for a in record.array_records.values())
    _ROUND["per_state"], _ROUND["update_bytes"] = per_state, update_bytes
    return aggregate_metricrecords(records, weighting_metric_name)


@app.main()
def main(grid: Grid, context: Context) -> None:
    cfg = context.run_config
    num_rounds, lr, mu = int(cfg["num-server-rounds"]), float(cfg["lr"]), float(cfg["proximal-mu"])
    hidden = int(cfg["hidden"])

    run_id = str(cfg.get("run-name") or "") or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = DATA / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "rounds.jsonl").unlink(missing_ok=True)
    _RUN["dir"], _RUN["hidden"] = run_dir, hidden

    torch.manual_seed(SEED)
    model = Head(hidden=hidden)
    params = sum(p.numel() for p in model.parameters())
    strategy_name = f"FedProx(mu={mu})" if mu > 0 else "FedAvg"
    (run_dir / "config.json").write_text(json.dumps({
        "run_id": run_id, "strategy": strategy_name, "rounds": num_rounds, "lr": lr,
        "local_epochs": int(cfg["local-epochs"]), "hidden": hidden, "mask_absent": bool(cfg["mask-absent"]),
        "use_flip": bool(cfg["use-flip"]), "params": params, "seed": SEED,
    }, indent=1))
    print(f"\nSaajha federation {run_id}\n  states   : {len(STATES)} ({', '.join(STATES)})\n"
          f"  model    : head over frozen MobileNetV3-L embeddings, {params:,} parameters\n"
          f"  strategy : {strategy_name}, {num_rounds} rounds\n"
          f"  crossing a border: model weights only — no image, no label, no farmer record\n")

    kwargs = dict(fraction_evaluate=float(cfg["fraction-evaluate"]), train_metrics_aggr_fn=_capture_train)
    strategy = FedProx(proximal_mu=mu, **kwargs) if mu > 0 else FedAvg(**kwargs)
    _ROUND["t0"] = time.time()
    result = strategy.start(
        grid=grid,
        initial_arrays=ArrayRecord(model.state_dict()),
        train_config=ConfigRecord({"lr": lr}),
        num_rounds=num_rounds,
        evaluate_fn=global_evaluate,
    )
    torch.save(result.arrays.to_torch_state_dict(), run_dir / "final_head.pt")
    print(f"\nrun written to {run_dir}")


def global_evaluate(server_round: int, arrays: ArrayRecord) -> MetricRecord:
    """Score the national head on the held-out benchmark and record the round."""
    run_dir: Path = _RUN["dir"]
    state_dict = arrays.to_torch_state_dict()
    model = Head(hidden=_RUN["hidden"])
    model.load_state_dict(state_dict)
    Xt, Yt = split_data("test")
    report = accuracy_report(model, Xt, Yt)
    duration = time.time() - _ROUND["t0"]
    _ROUND["t0"] = time.time()

    hero = report["per_class_acc"][HERO_CLASS]
    hs = report["per_state"][HERO_STATE]
    print(f"  [national] round {server_round:>2}  acc {report['acc_all']:.3f}  "
          f"State {HERO_STATE} unseen {hs['acc_unseen']:.2f} seen {hs['acc_seen']:.2f}  {HERO_CLASS} {hero:.2f}")

    update_bytes = dict(_ROUND["update_bytes"]) if server_round > 0 else {}
    head_bytes = inspector.weight_summary(state_dict)[0]
    inspector.record_round(run_dir, {
        "round": server_round,
        "duration_s": round(duration, 3),
        "raw_rows_transmitted": _ROUND["raw_rows"] if server_round > 0 else 0,
        "payload_types": ["ArrayRecord", "MetricRecord"] if server_round > 0 else [],
        "clients": dict(_ROUND["per_state"]) if server_round > 0 else {},
        "update_bytes": update_bytes,
        "broadcast_bytes": head_bytes * len(STATES) if server_round > 0 else 0,
        "bytes_on_wire_total": (sum(update_bytes.values()) + head_bytes * len(STATES)) if server_round > 0 else 0,
        "global": {"acc_all": report["acc_all"], "per_class_acc": report["per_class_acc"]},
        "per_state": report["per_state"],
    }, {k: v.numpy() for k, v in state_dict.items()})
    return MetricRecord({"acc": report["acc_all"], f"{HERO_CLASS}_recall": hero})

"""The "before": each state's model trained only on its own verified cases.

Same head, same training recipe as a federated client — just no federation.
Saves `<run-dir>/heads/local_<S>.npz` and `<run-dir>/local.json`.

    python fl/scripts/baseline_local.py --run <run-id>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl import inspector  # noqa: E402
from saajha_fl.common import DATA, SEED, STATES  # noqa: E402
from saajha_fl.task import Head, accuracy_report, split_data, state_data, train  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--epochs", type=int, default=40)
    args = ap.parse_args()
    run_dir = DATA / "runs" / args.run
    cfg = json.loads((run_dir / "config.json").read_text())

    Xt, Yt = split_data("test")
    out = {}
    for i, s in enumerate(STATES):
        torch.manual_seed(SEED + i)
        X, Y = state_data(s, use_flip=cfg["use_flip"])
        model = Head(hidden=cfg["hidden"])
        train(model, X, Y, epochs=args.epochs, lr=cfg["lr"], seed=SEED + i)
        sd = {k: v.numpy() for k, v in model.state_dict().items()}
        sha = inspector.save_head(run_dir / "heads" / f"local_{s}.npz", sd)
        r = accuracy_report(model, Xt, Yt)
        out[s] = {"n_train": int(len(Y)) // (2 if cfg["use_flip"] else 1), "sha256": sha, "epochs": args.epochs,
                  "acc_all": r["acc_all"], "per_class_acc": r["per_class_acc"], **r["per_state"][s]}
        print(f"State {s}: n={out[s]['n_train']}  acc_all {r['acc_all']:.3f}  "
              f"seen {out[s]['acc_seen']:.3f}  unseen {out[s]['acc_unseen']:.3f}")
    (run_dir / "local.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()

"""Spike S2: does federation make State C diagnose pests it has never seen?

Plain torch, manual FedAvg — no Flower yet — so the ML question is answered
before any plumbing. Prints the centralised upper bound, each state's
local-only model, then the federated model round by round.

    python fl/scripts/flip_spike.py --rounds 20 --mask-absent
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.common import CLASS_KEYS, DATA, HERO_CLASS, HERO_STATE, STATES  # noqa: E402
from saajha_fl.task import (  # noqa: E402
    Head, accuracy_report, central_train_data, get_weights, set_weights, split_data, state_data, train,
)


def fmt(r: dict, s: str) -> str:
    ps = r["per_state"][s]
    return f"{s}: seen {ps['acc_seen']:.2f} unseen {ps['acc_unseen']:.2f}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rounds", type=int, default=20)
    ap.add_argument("--local-epochs", type=int, default=2)
    ap.add_argument("--local-only-epochs", type=int, default=30)
    ap.add_argument("--lr", type=float, default=0.5)
    ap.add_argument("--hidden", type=int, default=0)
    ap.add_argument("--mask-absent", action="store_true")
    ap.add_argument("--flip", action="store_true")
    ap.add_argument("--mu", type=float, default=0.0)
    args = ap.parse_args()
    torch.manual_seed(0)

    Xt, Yt = split_data("test")
    hero_idx = CLASS_KEYS.index(HERO_CLASS)
    results: dict = {"args": vars(args)}

    Xc, Yc = central_train_data(args.flip)
    central = Head(hidden=args.hidden)
    train(central, Xc, Yc, epochs=args.local_only_epochs, lr=args.lr)
    rc = accuracy_report(central, Xt, Yt)
    results["central"] = rc
    print(f"CENTRAL upper bound (pooled data — what federation must not need): acc {rc['acc_all']:.3f}")
    print("  per class:", {k: round(v, 2) for k, v in rc["per_class_acc"].items()})

    results["local"] = {}
    for s in STATES:
        X, Y = state_data(s, args.flip)
        m = Head(hidden=args.hidden)
        train(m, X, Y, epochs=args.local_only_epochs, lr=args.lr, seed=1)
        r = accuracy_report(m, Xt, Yt)
        results["local"][s] = r
        print(f"LOCAL-ONLY {s} (n={len(Y)}): acc_all {r['acc_all']:.3f}  {fmt(r, s)}  "
              f"hispa recall {r['per_class_acc'][HERO_CLASS]:.2f}")

    data = {s: state_data(s, args.flip) for s in STATES}
    n = {s: len(data[s][1]) for s in STATES}
    glob = Head(hidden=args.hidden)
    weights = get_weights(glob)
    update_bytes = sum(w.nbytes for w in weights)
    results["rounds"] = []
    flip_round = None
    print(f"FEDAVG: update {update_bytes:,} bytes per state per round, raw records moved: 0")
    for rnd in range(1, args.rounds + 1):
        t0 = time.time()
        replies = []
        for i, s in enumerate(STATES):
            local = Head(hidden=args.hidden)
            set_weights(local, weights)
            X, Y = data[s]
            train(local, X, Y, epochs=args.local_epochs, lr=args.lr, mask_absent=args.mask_absent,
                  proximal_mu=args.mu, seed=rnd * 10 + i)
            replies.append((get_weights(local), n[s]))
        total = sum(k for _, k in replies)
        weights = [sum(w[j] * k for w, k in replies) / total for j in range(len(weights))]
        set_weights(glob, weights)
        r = accuracy_report(glob, Xt, Yt)
        hero = r["per_class_acc"][HERO_CLASS]
        if flip_round is None and hero >= 0.7:
            flip_round = rnd
        results["rounds"].append({"round": rnd, "secs": time.time() - t0, **r})
        print(f"  r{rnd:>2} {time.time() - t0:4.1f}s acc {r['acc_all']:.3f} | "
              + " | ".join(fmt(r, s) for s in STATES) + f" | hispa {hero:.2f}")

    results["flip_round"] = flip_round
    tag = f"h{args.hidden}_m{int(args.mask_absent)}_f{int(args.flip)}_mu{args.mu}_lr{args.lr}"
    out = DATA / f"spike_{tag}.json"
    out.write_text(json.dumps(results, indent=1))
    last = results["rounds"][-1]
    print(f"\nSUMMARY [{tag}] central {rc['acc_all']:.3f} | fed final {last['acc_all']:.3f} | "
          f"{HERO_STATE} unseen: local {results['local'][HERO_STATE]['per_state'][HERO_STATE]['acc_unseen']:.2f}"
          f" -> fed {last['per_state'][HERO_STATE]['acc_unseen']:.2f} | hispa>=0.7 at round {flip_round}")


if __name__ == "__main__":
    main()

"""Package a finished federation run for the web app.

Reads `<DATA>/runs/<run-id>/` (config, rounds.jsonl, per-round heads, local
baselines) and writes `apps/hub/public/fl/`:

  run.json          everything the dashboard shows, every number from the run
  heads/*.json      every local and per-round global head, base64 float32 + sha256
  gallery.json      a few attributed held-out images with cached embeddings
and copies those gallery images to `apps/hub/public/gallery/`.

    python fl/scripts/export_web.py --run <run-id>
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import torch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl import inspector  # noqa: E402
from saajha_fl.backbone import BACKBONE_NAME, EMBED_DIM, INPUT_SIZE, MEAN, STD  # noqa: E402
from saajha_fl.common import (  # noqa: E402
    CLASSES, CLASS_KEYS, DATA, DISCLOSURE, HERO_CLASS, HERO_STATE, REPO, SEED, STATES,
    seen_classes, unseen_classes,
)
from saajha_fl.task import Head, _load_all, accuracy_report, central_train_data, predict, split_data, train  # noqa: E402

WEB = REPO / "apps" / "hub" / "public"
DATASET = {
    "name": "Paddy Doctor (10-class labelled release)",
    "authors": "Petchiammal A., Briskline Kiruba S., Murugan D., Pandarasamy Arjunan",
    "paper": "https://arxiv.org/abs/2205.11108",
    "url": "https://www.kaggle.com/competitions/paddy-disease-classification",
    "licence": "CC BY 4.0 (Kaggle competition rules §7A)",
    "origin": "Paddy fields near Tirunelveli, Tamil Nadu",
}
GALLERY_EXTRA = ["dead_heart", "blast", "tungro", "brown_spot", "normal"]


def load_head(path: Path, hidden: int) -> Head:
    arrays = np.load(path)
    model = Head(hidden=hidden)
    model.load_state_dict({k: torch.from_numpy(arrays[k]) for k in arrays.files})
    return model


@torch.inference_mode()
def fit_temperature(model: Head, X: torch.Tensor, Y: torch.Tensor) -> float:
    """Temperature scaling on held-out validation data, so shown confidences are honest."""
    model.eval()
    logits = model(X)
    grid = np.geomspace(0.25, 50, 80)
    nll = [float(torch.nn.functional.cross_entropy(logits / t, Y)) for t in grid]
    return round(float(grid[int(np.argmin(nll))]), 4)


@torch.inference_mode()
def probs(model: Head, X: torch.Tensor, temperature: float) -> torch.Tensor:
    model.eval()
    return torch.softmax(model(X) / temperature, dim=1)


def head_json(path: Path, kind: str, state: str | None, rnd: int | None, arch: str,
              temperature: float = 1.0) -> dict:
    arrays = np.load(path)
    sd = {k: arrays[k].astype("<f4") for k in arrays.files}
    tensors = [{"name": k, "shape": list(sd[k].shape), "dtype": "float32-le",
                "b64": base64.b64encode(np.ascontiguousarray(sd[k]).tobytes()).decode()} for k in sorted(sd)]
    return {"id": path.stem, "kind": kind, "state": state, "round": rnd, "arch": arch,
            "temperature": temperature, "tensors": tensors, "sha256": inspector.weight_summary(sd)[2]}


def git_commit() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], cwd=REPO, text=True,
                                       stderr=subprocess.DEVNULL).strip()
    except Exception:  # noqa: BLE001
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", required=True)
    ap.add_argument("--hero", default=None, help="sha1 prefix of the hero image (default: auto)")
    args = ap.parse_args()
    run_dir = DATA / "runs" / args.run
    cfg = json.loads((run_dir / "config.json").read_text())
    rounds = [json.loads(line) for line in (run_dir / "rounds.jsonl").read_text().splitlines() if line.strip()]
    local = json.loads((run_dir / "local.json").read_text())
    hidden = cfg["hidden"]
    arch = "mlp1" if hidden else "linear"

    out = WEB / "fl"
    if out.exists():
        shutil.rmtree(out)
    (out / "heads").mkdir(parents=True)

    manifest, emb, _, y = _load_all()
    train_counts = manifest[manifest.split == "train"].groupby(["state", "label"]).size()

    Xv, Yv = split_data("val")
    temps: dict[str, float] = {}

    # heads (local temperatures fitted on validation images of the classes that state holds)
    local_models = {}
    for s in STATES:
        seen_ids = torch.tensor([CLASS_KEYS.index(k) for k in seen_classes(s)])
        sel = torch.isin(Yv, seen_ids)
        temps[f"local_{s}"] = fit_temperature(load_head(run_dir / "heads" / f"local_{s}.npz", hidden), Xv[sel], Yv[sel])
        hj = head_json(run_dir / "heads" / f"local_{s}.npz", "local", s, None, arch, temps[f"local_{s}"])
        (out / "heads" / f"local_{s}.json").write_text(json.dumps(hj))
        local_models[s] = {"head_url": f"/fl/heads/local_{s}.json", "sha256": hj["sha256"],
                           "temperature": temps[f"local_{s}"],
                           **{k: local[s][k] for k in ("n_train", "acc_all", "acc_seen", "acc_unseen", "per_class_acc")}}
    round_entries = []
    for r in rounds:
        rid = f"global_r{r['round']:02d}"
        temps[rid] = fit_temperature(load_head(run_dir / "heads" / f"{rid}.npz", hidden), Xv, Yv)
        hj = head_json(run_dir / "heads" / f"{rid}.npz", "global", None, r["round"], arch, temps[rid])
        assert hj["sha256"] == r["weights_sha256"], f"sha mismatch on {rid}"
        (out / "heads" / f"{rid}.json").write_text(json.dumps(hj))
        round_entries.append({
            "round": r["round"], "duration_s": r["duration_s"], "head_url": f"/fl/heads/{rid}.json",
            "temperature": temps[rid],
            "weights_sha256": r["weights_sha256"], "tensor_shapes": r["tensor_shapes"],
            "update_bytes": r["update_bytes"], "broadcast_bytes": r["broadcast_bytes"],
            "bytes_on_wire_total": r["bytes_on_wire_total"], "raw_rows_transmitted": r["raw_rows_transmitted"],
            "payload_types": r["payload_types"], "clients": r["clients"],
            "global": r["global"], "per_state": r["per_state"],
        })
    final = round_entries[-1]
    final_model = load_head(run_dir / "heads" / f"global_r{final['round']:02d}.npz", hidden)
    local_c = load_head(run_dir / "heads" / f"local_{HERO_STATE}.npz", hidden)

    # centralised upper bound: same recipe on pooled data (what federation avoids needing)
    torch.manual_seed(SEED)
    Xc, Yc = central_train_data(cfg["use_flip"])
    central = Head(hidden=hidden)
    train(central, Xc, Yc, epochs=40, lr=cfg["lr"], seed=SEED)
    Xt, Yt = split_data("test")
    central_acc = accuracy_report(central, Xt, Yt)["acc_all"]

    # gate threshold on the validation split: lowest federated probability at which
    # accepted predictions are >= 90% correct
    final_id = f"global_r{final['round']:02d}"
    pv = probs(final_model, Xv, temps[final_id])
    conf, pred = pv.max(1)
    tau = 0.5
    for t in np.arange(0.30, 0.96, 0.01):
        sel = conf >= t
        if sel.sum() >= 20 and float((pred[sel] == Yv[sel]).float().mean()) >= 0.90:
            tau = round(float(t), 2)
            break

    # gallery: hero = held-out hispa image where State C's local head is wrong and the
    # federated head is right and confident; plus one image per extra class, right after
    test_rows = manifest.index[manifest.split == "test"].to_numpy()
    Xtest_rows = torch.from_numpy(emb[test_rows])
    pt_final = probs(final_model, Xtest_rows, temps[final_id])
    pt_local = probs(local_c, Xtest_rows, temps[f"local_{HERO_STATE}"])
    round_models = {r["round"]: load_head(run_dir / "heads" / f"global_r{r['round']:02d}.npz", hidden) for r in rounds}
    gdir = WEB / "gallery"
    if gdir.exists():
        shutil.rmtree(gdir)
    gdir.mkdir(parents=True)
    gallery = []
    for key in [HERO_CLASS] + GALLERY_EXTRA:
        ci = CLASS_KEYS.index(key)
        cands = [i for i, row in enumerate(test_rows) if y[row] == ci and pt_final[i].argmax() == ci]
        if key == HERO_CLASS:
            cands = [i for i in cands if pt_local[i].argmax() != ci]
        if not cands:
            print(f"  gallery: no candidate for {key}")
            continue
        if key == HERO_CLASS:
            ranked = sorted(cands, key=lambda i: -float(pt_final[i, ci]))
            (DATA / "hero_candidates.json").write_text(json.dumps(
                [{"sha1": manifest.sha1[test_rows[i]], "fed": round(float(pt_final[i, ci]), 3),
                  "local_top": CLASS_KEYS[int(pt_local[i].argmax())]} for i in ranked[:12]], indent=1))
            if args.hero:
                ranked = [i for i in ranked if manifest.sha1[test_rows[i]].startswith(args.hero)] or ranked
            best = ranked[0]
        else:
            best = max(cands, key=lambda i: float(pt_final[i, ci]))
        row = test_rows[best]
        sha = manifest.sha1[row]
        shutil.copy(DATA / "images" / f"{sha}.jpg", gdir / f"{sha}.jpg")

        def topk(p):
            return [[CLASS_KEYS[j], round(float(p[j]), 4)] for j in torch.argsort(p, descending=True)[:3].tolist()]

        gallery.append({
            "id": sha[:12], "image_url": f"/gallery/{sha}.jpg", "true_key": key, "hero": key == HERO_CLASS,
            "source": f"{DATASET['name']} — {DATASET['authors']}, {DATASET['licence']}",
            "embedding_b64": base64.b64encode(emb[row].astype("<f4").tobytes()).decode(),
            "python_topk": {f"local_{HERO_STATE}": topk(pt_local[best]), final_id: topk(pt_final[best])},
            # every round's prediction from that round's real weights (calibrated), for the replay
            "trajectory": [
                {"round": rnd, "top": CLASS_KEYS[int(p.argmax())], "top_p": round(float(p.max()), 4),
                 "true_p": round(float(p[ci]), 4)}
                for rnd, m in round_models.items()
                for p in [probs(m, torch.from_numpy(emb[row:row + 1]), temps[f"global_r{rnd:02d}"])[0]]
            ],
        })

    # hard subset: held-out images with no near-twin (cosine < 0.95) in ANY state's training
    # data. Paddy Doctor photographs the same plants repeatedly, so a random split flatters
    # every model; this subset is the more honest number.
    E = torch.nn.functional.normalize(torch.from_numpy(emb.copy()), dim=1)
    tr_mask = (manifest.split == "train").to_numpy()
    nearest = (E[test_rows] @ E[tr_mask].T).max(1).values
    hard = nearest < 0.95
    rh = accuracy_report(final_model, Xtest_rows[hard], torch.from_numpy(y[test_rows])[hard])
    rl = accuracy_report(local_c, Xtest_rows[hard], torch.from_numpy(y[test_rows])[hard])
    hard_subset = {"rule": "held-out images whose nearest training image (any state) has cosine < 0.95",
                   "n": int(hard.sum()), "n_test": int(len(test_rows)), "fed_acc_all": rh["acc_all"],
                   "fed_per_class_acc": rh["per_class_acc"], "fed_per_state": rh["per_state"],
                   f"local_{HERO_STATE}_per_state": rl["per_state"][HERO_STATE]}

    onnx = WEB / "models" / "backbone.onnx"
    bench_path = DATA / "gemini_bench.json"
    bench = None
    if bench_path.exists():
        b = json.loads(bench_path.read_text())
        shas = [r["sha1"] for r in b["rows"] if r.get("pred")]
        rows = manifest.set_index("sha1").loc[shas]
        idx = [manifest.index[manifest.sha1 == s][0] for s in shas]
        fed_pred = probs(final_model, torch.from_numpy(emb[idx]), temps[final_id]).argmax(1).numpy()
        fed_acc = float(np.mean([CLASS_KEYS[p] == t for p, t in zip(fed_pred, rows.label)]))
        bench = {k: b[k] for k in ("model", "n", "acc", "per_class_acc", "mean_conf_correct", "mean_conf_wrong",
                                   "models_used", "measured_at")}
        bench["fed_acc_same_images"] = fed_acc

    run = {
        "schema_version": 1, "run_id": args.run, "created_at": datetime.now(timezone.utc).isoformat(),
        "provenance": {"git_commit": git_commit(), "flwr": "1.37.0", "torch": torch.__version__, "seed": SEED,
                       "runtime": cfg.get("runtime", "deployment (flower-superlink + 4 flower-supernode processes)"),
                       "dataset": {**DATASET, "source": (DATA / "manifest_source.txt").read_text().strip(),
                                   "n_train": int((manifest.split == "train").sum()),
                                   "n_test": int((manifest.split == "test").sum())},
                       "disclosure": DISCLOSURE},
        "classes": [{"idx": i, "key": k, "name_en": n, "is_pest": p} for i, (k, n, p) in enumerate(CLASSES)],
        "states": [{"id": s, "partition_id": i, "seen": seen_classes(s), "unseen": unseen_classes(s),
                    "n_train": {k: int(train_counts.get((s, k), 0)) for k in seen_classes(s)}}
                   for i, s in enumerate(STATES)],
        "hero": {"state": HERO_STATE, "class": HERO_CLASS},
        "backbone": {"name": BACKBONE_NAME, "onnx_url": "/models/backbone.onnx",
                     "onnx_sha256": hashlib.sha256(onnx.read_bytes()).hexdigest() if onnx.exists() else None,
                     "onnx_bytes": onnx.stat().st_size if onnx.exists() else None,
                     "embedding_dim": EMBED_DIM,
                     "input": {"w": INPUT_SIZE, "h": INPUT_SIZE, "resize": "squash-bilinear", "mean": MEAN,
                               "std": STD, "layout": "NCHW", "input_name": "input", "output_name": "embedding"}},
        "head": {"arch": arch, "hidden": hidden, "input_norm": "l2", "params": cfg["params"],
                 "bytes_fp32": rounds[-1]["head_bytes"]},
        "strategy": {"name": cfg["strategy"], "rounds": cfg["rounds"], "local_epochs": cfg["local_epochs"],
                     "lr": cfg["lr"], "mask_absent": cfg["mask_absent"], "dp": None},
        "gate": {"tau_fed": tau, "tau_gem": 60, "calibrated_on": "validation split (5%), >=90% precision"},
        "local_models": local_models,
        "rounds": round_entries,
        "totals": {"records_moved": sum(r["raw_rows_transmitted"] for r in round_entries),
                   "bytes_on_wire": sum(r["bytes_on_wire_total"] for r in round_entries)},
        "centralized_upper_bound": {"acc_all": central_acc},
        "hard_subset": hard_subset,
        "gemini_benchmark": bench,
    }
    (out / "run.json").write_text(json.dumps(run, indent=1))
    (out / "gallery.json").write_text(json.dumps(gallery, indent=1))
    print(f"exported run {args.run}: {len(round_entries)} rounds, {len(gallery)} gallery images, tau_fed {tau}, "
          f"central {central_acc:.3f}, final {final['global']['acc_all']:.3f}, "
          f"{HERO_STATE} unseen {local_models[HERO_STATE]['acc_unseen']:.2f} -> {final['per_state'][HERO_STATE]['acc_unseen']:.2f}")


if __name__ == "__main__":
    main()

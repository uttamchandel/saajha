"""Validate apps/hub/public/fl before every deploy. Exits non-zero on any problem.

Checks the claims the dashboard makes: every round moved zero raw records,
every head file's sha256 recomputes, the ONNX hash matches, update sizes are
measured and consistent, and every class/state reference resolves.

    python fl/scripts/check_contract.py [apps/hub/public]
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.common import CLASS_KEYS, REPO, STATES  # noqa: E402
from saajha_fl.inspector import weight_summary  # noqa: E402

errors: list[str] = []


def check(cond: bool, msg: str) -> None:
    if not cond:
        errors.append(msg)


def load_head(public: Path, url: str) -> dict:
    hj = json.loads((public / url.lstrip("/")).read_text())
    sd = {t["name"]: np.frombuffer(base64.b64decode(t["b64"]), dtype="<f4").reshape(t["shape"]) for t in hj["tensors"]}
    check(weight_summary(sd)[2] == hj["sha256"], f"{url}: sha256 does not recompute")
    return hj


def main() -> None:
    public = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "apps" / "hub" / "public"
    run = json.loads((public / "fl" / "run.json").read_text())
    check(run["schema_version"] == 1, "schema_version != 1")
    check([c["key"] for c in run["classes"]] == CLASS_KEYS, "class order differs from CLASS_KEYS")
    check([s["id"] for s in run["states"]] == STATES, "states differ")
    check(run["totals"]["records_moved"] == 0, "records_moved != 0")
    check(run["provenance"]["disclosure"], "missing disclosure")

    onnx = public / run["backbone"]["onnx_url"].lstrip("/")
    check(onnx.exists(), "backbone.onnx missing")
    if onnx.exists():
        check(hashlib.sha256(onnx.read_bytes()).hexdigest() == run["backbone"]["onnx_sha256"], "onnx sha mismatch")

    for s, lm in run["local_models"].items():
        hj = load_head(public, lm["head_url"])
        check(hj["sha256"] == lm["sha256"], f"local_{s}: sha differs from run.json")
    for r in run["rounds"]:
        hj = load_head(public, r["head_url"])
        check(hj["sha256"] == r["weights_sha256"], f"round {r['round']}: sha differs from run.json")
        check(r["raw_rows_transmitted"] == 0, f"round {r['round']}: raw rows transmitted")
        if r["round"] > 0:
            check(set(r["update_bytes"]) == set(STATES), f"round {r['round']}: missing state updates")
            check(all(v == run["head"]["bytes_fp32"] for v in r["update_bytes"].values()),
                  f"round {r['round']}: update bytes != head size")
            check(set(r["payload_types"]) <= {"ArrayRecord", "MetricRecord", "ConfigRecord"},
                  f"round {r['round']}: unexpected payload types")

    gallery = json.loads((public / "fl" / "gallery.json").read_text())
    check(any(g["hero"] for g in gallery), "no hero image in gallery")
    check(len(gallery) <= 6, "more than 6 dataset images published (licence §7B)")
    for g in gallery:
        check((public / g["image_url"].lstrip("/")).exists(), f"gallery image missing: {g['image_url']}")
        check(g["true_key"] in CLASS_KEYS, f"gallery bad class {g['true_key']}")
        check(len(base64.b64decode(g["embedding_b64"])) == 4 * run["backbone"]["embedding_dim"], "bad embedding size")

    if errors:
        print("CONTRACT FAIL:\n  " + "\n  ".join(errors))
        sys.exit(1)
    print(f"CONTRACT OK: {len(run['rounds'])} rounds, {len(run['local_models'])} local heads, "
          f"{len(gallery)} gallery images, records moved {run['totals']['records_moved']}")


if __name__ == "__main__":
    main()

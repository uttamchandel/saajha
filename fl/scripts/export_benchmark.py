"""Export the held-out benchmark the hub uses to check every live round before it is released.

Writes apps/hub/data/benchmark/{val,test}.f16 (frozen-backbone embeddings, float16, row-major n x 1280)
and meta.json (labels, counts, and round 40's accuracy as a sanity anchor). The validation split
(516 photos) picks the server step and the temperature; the test split (1,549 photos) is the release
gate. None of these photos was used to train any state's model.

The files are derived from the Paddy Doctor competition data, so they are not committed (see
.gitignore); regenerate them with this script. The hub reads them on the server only; they are
never served to browsers.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import torch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "fl"))
from saajha_fl.common import CLASS_KEYS  # noqa: E402
from saajha_fl.task import Head, split_data  # noqa: E402

OUT = REPO / "apps" / "hub" / "data" / "benchmark"
RUN = json.loads((REPO / "apps/hub/public/fl/run.json").read_text())


def r40() -> Head:
    import base64
    last = RUN["rounds"][-1]
    h = json.loads((REPO / "apps/hub/public" / last["head_url"].lstrip("/")).read_text())
    m = Head(hidden=RUN["head"]["hidden"])
    m.load_state_dict({t["name"]: torch.from_numpy(np.frombuffer(base64.b64decode(t["b64"]), dtype="<f4").reshape(t["shape"]).copy())
                       for t in h["tensors"]})
    return m.eval()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    model = r40()
    meta = {"classes": CLASS_KEYS, "dim": 1280, "dtype": "float16-le", "source_run": RUN["run_id"], "splits": {}}
    for split in ("val", "test"):
        X, Y = split_data(split)
        (OUT / f"{split}.f16").write_bytes(X.numpy().astype("<f2").tobytes())
        with torch.inference_mode():
            acc32 = float((model(X).argmax(1) == Y).float().mean())
            acc16 = float((model(X.half().float()).argmax(1) == Y).float().mean())
        meta["splits"][split] = {"n": int(len(Y)), "labels": Y.tolist(), "round40_acc_fp32": round(acc32, 6), "round40_acc_fp16": round(acc16, 6)}
        print(f"{split}: {len(Y)} photos, round-40 accuracy fp32 {acc32:.4f}, from float16 {acc16:.4f}")
    (OUT / "meta.json").write_text(json.dumps(meta))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

"""Spike S4: export the frozen backbone to ONNX and prove parity with torch.

The browser runs this exact file, so the embeddings it computes must match the
ones the states trained their heads on.

    python fl/scripts/export_onnx.py --out apps/hub/public/models/backbone.onnx
"""

from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path

import numpy as np
import onnxruntime as ort
import pandas as pd
import torch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.backbone import INPUT_SIZE, Backbone, preprocess  # noqa: E402
from saajha_fl.common import DATA, REPO  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(REPO / "apps" / "hub" / "public" / "models" / "backbone.onnx"))
    ap.add_argument("--n", type=int, default=32)
    args = ap.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    model = Backbone()
    dummy = torch.zeros(1, 3, INPUT_SIZE, INPUT_SIZE)
    try:
        torch.onnx.export(model, (dummy,), str(out), input_names=["input"], output_names=["embedding"],
                          dynamic_axes={"input": {0: "batch"}, "embedding": {0: "batch"}},
                          opset_version=17, dynamo=False)
    except TypeError:
        torch.onnx.export(model, (dummy,), str(out), input_names=["input"], output_names=["embedding"],
                          dynamic_axes={"input": {0: "batch"}, "embedding": {0: "batch"}}, opset_version=17)

    manifest = pd.read_parquet(DATA / "manifest.parquet")
    shas = manifest[manifest.split == "test"].sha1.head(args.n).tolist()
    x = np.stack([preprocess(Image.open(DATA / "images" / f"{s}.jpg")) for s in shas]).astype(np.float32)
    with torch.inference_mode():
        ref = model(torch.from_numpy(x)).numpy()
    sess = ort.InferenceSession(str(out), providers=["CPUExecutionProvider"])
    got = sess.run(["embedding"], {"input": x})[0]

    diff = float(np.abs(ref - got).max())
    cos = float(np.min(np.sum(ref * got, 1) / (np.linalg.norm(ref, axis=1) * np.linalg.norm(got, axis=1))))
    sha = hashlib.sha256(out.read_bytes()).hexdigest()
    print(f"ONNX {out} {out.stat().st_size / 1e6:.1f} MB sha256 {sha[:16]}…")
    print(f"parity on {len(shas)} test images: max|diff| {diff:.2e}  min cosine {cos:.6f}  "
          f"{'PASS' if diff < 1e-3 and cos > 0.9999 else 'FAIL'}")


if __name__ == "__main__":
    main()

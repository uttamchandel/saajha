"""Embed every image once with the frozen backbone (plus a mirrored view).

Writes `<DATA>/emb/emb.npy` and `<DATA>/emb/emb_flip.npy` (float16, rows in
manifest order). In a real deployment each state runs this on its own images;
here one machine does it for all four partitions.

    python fl/scripts/embed.py
    python fl/scripts/embed.py --manifest states/manifest.parquet --out states/emb
"""

from __future__ import annotations

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.backbone import Backbone, preprocess  # noqa: E402
from saajha_fl.common import DATA  # noqa: E402

BATCH = 64


def load(rel: str) -> np.ndarray:
    with Image.open(DATA / rel) as img:
        return preprocess(img)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default="manifest.parquet", help="relative to $SAAJHA_DATA")
    ap.add_argument("--out", default="emb", help="output folder, relative to $SAAJHA_DATA")
    args = ap.parse_args()

    manifest = pd.read_parquet(DATA / args.manifest)
    # The multi-state manifest names each file; the prototype's stores every image as <sha1>.jpg.
    files = manifest.file.tolist() if "file" in manifest else [f"images/{s}.jpg" for s in manifest.sha1]
    torch.set_num_threads(max(1, torch.get_num_threads()))
    model = Backbone()
    out = DATA / args.out
    out.mkdir(parents=True, exist_ok=True)
    emb = np.zeros((len(files), 1280), dtype=np.float16)
    emb_flip = np.zeros_like(emb)

    start = time.time()
    with ThreadPoolExecutor(max_workers=4) as pool, torch.inference_mode():
        for i in range(0, len(files), BATCH):
            x = torch.from_numpy(np.stack(list(pool.map(load, files[i:i + BATCH]))))
            both = model(torch.cat([x, torch.flip(x, dims=[3])]))
            n = x.shape[0]
            emb[i:i + n] = both[:n].numpy()
            emb_flip[i:i + n] = both[n:].numpy()
            if (i // BATCH) % 20 == 0:
                done = i + n
                rate = done / (time.time() - start)
                print(f"  {done:>6}/{len(files)}  {rate:.0f} img/s", flush=True)

    np.save(out / "emb.npy", emb)
    np.save(out / "emb_flip.npy", emb_flip)
    print(f"embedded {len(files)} images in {time.time() - start:.0f}s -> {out}")


if __name__ == "__main__":
    main()

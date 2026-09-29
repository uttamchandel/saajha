"""Unpack the dataset, hold out a global benchmark, and partition into states.

Reads the Paddy Doctor parquet shards (Hugging Face mirror) or the official
Kaggle `train_images/<label>/*.jpg` tree, writes every image once to
`<DATA>/images/<sha1>.jpg`, and writes `<DATA>/manifest.parquet` with one row
per unique image: sha1, label, split (train/val/test) and state (train only).

    python fl/scripts/prepare_data.py            # auto-detects the source
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.common import (  # noqa: E402
    CLASS_KEYS, DATA, PRESENCE, SEED, STATES, TEST_FRACTION, VAL_FRACTION,
)


def rows_from_parquet(shards: list[Path]):
    import pyarrow.parquet as pq

    for shard in shards:
        table = pq.read_table(shard)
        meta = table.schema.metadata or {}
        names = None
        if b"huggingface" in meta:
            features = json.loads(meta[b"huggingface"])["info"]["features"]
            names = features.get("label", {}).get("names")
        cols = table.column_names
        img_col = "image" if "image" in cols else cols[0]
        lab_col = "label" if "label" in cols else None
        extra = [c for c in cols if c not in (img_col, lab_col)]
        for row in table.to_pylist():
            img = row[img_col]
            data = img["bytes"] if isinstance(img, dict) else img
            label = row[lab_col]
            if names is not None and isinstance(label, int):
                label = names[label]
            yield data, str(label), {c: row[c] for c in extra}


def rows_from_kaggle(root: Path):
    for path in sorted(root.glob("*/*.jpg")):
        yield path.read_bytes(), path.parent.name, {"image_id": path.name}


def main() -> None:
    kaggle_root = DATA / "kaggle" / "train_images"
    shards = sorted((DATA / "hf").glob("*.parquet"))
    if kaggle_root.exists():
        source, rows = "kaggle", rows_from_kaggle(kaggle_root)
    elif shards:
        source, rows = "hf-mirror", rows_from_parquet(shards)
    else:
        sys.exit(f"no data under {DATA}")

    out = DATA / "images"
    out.mkdir(parents=True, exist_ok=True)
    records, dupes = {}, 0
    for data, label, extra in rows:
        sha = hashlib.sha1(data).hexdigest()
        if sha in records:
            dupes += 1
            continue
        target = out / f"{sha}.jpg"
        if not target.exists():
            target.write_bytes(data)
        records[sha] = {"sha1": sha, "label": label, **extra}

    df = pd.DataFrame(records.values())
    unknown = sorted(set(df.label) - set(CLASS_KEYS))
    if unknown:
        sys.exit(f"labels not in CLASS_KEYS: {unknown}")

    rng = np.random.default_rng(SEED)
    df["split"], df["state"] = "train", None
    for key in CLASS_KEYS:
        idx = df.index[df.label == key].to_numpy().copy()
        rng.shuffle(idx)
        n_test = round(len(idx) * TEST_FRACTION)
        n_val = round(len(idx) * VAL_FRACTION)
        df.loc[idx[:n_test], "split"] = "test"
        df.loc[idx[n_test:n_test + n_val], "split"] = "val"
        train = idx[n_test + n_val:]
        holders = list(PRESENCE[key])
        for part, state in zip(np.array_split(train, len(holders)), holders):
            df.loc[part, "state"] = state

    df = df.sort_values(["label", "sha1"]).reset_index(drop=True)
    df.attrs["source"] = source
    df.to_parquet(DATA / "manifest.parquet", index=False)
    (DATA / "manifest_source.txt").write_text(source)

    print(f"source={source}  unique images={len(df)}  duplicates skipped={dupes}")
    train = df[df.split == "train"]
    table = pd.crosstab(train.label, train.state).reindex(index=CLASS_KEYS, columns=STATES, fill_value=0)
    table["val"] = df[df.split == "val"].label.value_counts()
    table["test"] = df[df.split == "test"].label.value_counts()
    table["total"] = df.label.value_counts()
    print(table.to_string())
    print("train per state:", train.state.value_counts().reindex(STATES).to_dict())


if __name__ == "__main__":
    main()

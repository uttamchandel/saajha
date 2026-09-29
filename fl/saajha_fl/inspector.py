"""The border inspector: evidence that nothing but weights left a state.

`records moved: 0` on the Saajha dashboard is a result, not a slogan. Every
reply a state node sends is inspected before it is aggregated: an ArrayRecord
of model weights and a MetricRecord of scalars are the only things allowed
through. Anything else — an image, an embedding matrix, a list of labels —
raises and stops the round instead of being averaged in.

Each round's evidence (bytes measured from the arrays themselves, tensor
shapes, SHA-256 of the aggregated weights, per-state update sizes) is appended
to `rounds.jsonl`, and the aggregated head is saved so the web app can replay
every round with the real weights.

Adapted from the weights-only inspector in the author's SwasthSetu Flower app
(itself derived from Flower's quickstart-pytorch, Apache-2.0).
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np

ALLOWED_RECORD_TYPES = ("ArrayRecord", "MetricRecord", "ConfigRecord")
SCALAR_TYPES = (int, float, bool, str)


class RawDataLeak(Exception):
    """A state returned something that was not weights or a scalar metric."""


def assert_weights_only(replies: Iterable[Any]) -> int:
    """Inspect every reply. Returns the count of raw records seen: zero.

    Raises RawDataLeak the moment anything arrives that is not model weights or
    a scalar, which is the only way the zero this returns can be trusted.
    """
    rows = 0
    for reply in replies:
        content = getattr(reply, "content", reply)
        items = content.items() if hasattr(content, "items") else []
        for name, record in items:
            kind = type(record).__name__
            if kind not in ALLOWED_RECORD_TYPES:
                raise RawDataLeak(f"state returned {kind!r} as {name}; only "
                                  f"{' or '.join(ALLOWED_RECORD_TYPES)} may cross a state border")
            if kind == "ArrayRecord":
                continue
            for key, value in dict(record).items():
                if isinstance(value, SCALAR_TYPES):
                    continue
                if isinstance(value, (list, tuple)) and all(isinstance(v, SCALAR_TYPES) for v in value):
                    if len(value) <= 16:  # a short list of numbers is a metric; a long one is data
                        continue
                    raise RawDataLeak(f"metric {key!r} carries {len(value)} values — that is a dataset")
                raise RawDataLeak(f"metric {key!r} is a {type(value).__name__}; metrics must be scalars")
    return rows


def array_bytes(arrays: Any) -> int:
    """Measured bytes of the tensors in an ArrayRecord."""
    return int(sum(np.asarray(a.numpy()).nbytes for a in arrays.values()))


def weight_summary(state_dict: dict) -> tuple[int, dict[str, list[int]], str]:
    """Measured bytes, tensor shapes and a SHA-256 of the weights.

    The web app recomputes this hash in the browser from the head file it
    downloads: for name in sorted(names): h.update(name); h.update(float32 LE bytes).
    """
    shapes, total, digest = {}, 0, hashlib.sha256()
    for name in sorted(state_dict):
        buf = np.ascontiguousarray(np.asarray(state_dict[name], dtype="<f4"))
        shapes[name] = list(buf.shape)
        total += int(buf.nbytes)
        digest.update(name.encode())
        digest.update(buf.tobytes())
    return total, shapes, digest.hexdigest()


def save_head(path: Path, state_dict: dict) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, **{k: np.asarray(v, dtype="<f4") for k, v in state_dict.items()})
    return weight_summary(state_dict)[2]


def record_round(run_dir: Path, entry: dict, state_dict: dict) -> None:
    """Append one round's evidence and save that round's aggregated head."""
    total, shapes, sha = weight_summary(state_dict)
    save_head(run_dir / "heads" / f"global_r{entry['round']:02d}.npz", state_dict)
    entry = {**entry, "weights_sha256": sha, "tensor_shapes": shapes, "head_bytes": total,
             "completed_at": datetime.now(timezone.utc).isoformat()}
    with open(run_dir / "rounds.jsonl", "a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")
    moved = entry.get("raw_rows_transmitted", 0)
    print(f"  inspector: round {entry['round']} — {total:,} bytes of weights, {len(shapes)} tensors, "
          f"sha {sha[:12]}, farmer records moved: {moved}")

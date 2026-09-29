"""Spike S3: how well does Gemini alone diagnose our ten paddy classes?

Zero-shot, constrained to the same label set as the federated model, on held
out test images no state trained on. The result decides how we answer "why
not just use Gemini?" — we only claim a gap we measured.

    python fl/scripts/gemini_bench.py --per-class 5
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from saajha_fl.common import CLASSES, CLASS_KEYS, DATA, SEED, load_env  # noqa: E402

PROMPT = (
    "This photo was taken by a paddy (rice) farmer in Tamil Nadu, India. "
    "Classify the crop's condition as exactly one of these labels:\n"
    + "\n".join(f"- {key}: {name}" for key, name, _ in CLASSES)
    + "\nReturn the label and your confidence (0-100) that it is correct."
)
SCHEMA = {
    "type": "object",
    "properties": {
        "class_key": {"type": "string", "enum": CLASS_KEYS},
        "confidence": {"type": "integer"},
    },
    "required": ["class_key", "confidence"],
}
RETRYABLE = ("429", "RESOURCE_EXHAUSTED", "quota", "503", "UNAVAILABLE", "overloaded")


def classify(client, model: str, fallback: str | None, data: bytes):
    from google.genai import types

    params = dict(
        contents=[types.Part.from_bytes(data=data, mime_type="image/jpeg"), PROMPT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json", response_schema=SCHEMA, temperature=0,
        ),
    )
    # Without a fallback, keep asking the primary model with growing pauses, so every row
    # measures the model we actually ship rather than whichever model happened to answer.
    chain = [model, model, fallback] if fallback else [model] * 6
    for attempt, name in enumerate(chain):
        try:
            res = client.models.generate_content(model=name, **params)
            return json.loads(res.text), name
        except Exception as err:  # noqa: BLE001
            if "PerDay" in str(err):  # a daily quota will not recover by waiting
                raise SystemExit(f"daily quota exhausted for {name}; stopping") from None
            if not any(t in str(err) for t in RETRYABLE) or attempt == len(chain) - 1:
                raise
            time.sleep((2 + attempt * 3) if fallback else 8 * (attempt + 1))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-class", type=int, default=5)
    ap.add_argument("--model", default="gemini-3.5-flash-lite")
    ap.add_argument("--fallback", default="gemini-3.1-flash-lite")
    ap.add_argument("--no-fallback", action="store_true", help="measure the primary model only")
    ap.add_argument("--pace", type=float, default=0.0, help="seconds to wait between photos")
    args = ap.parse_args()
    fallback = None if args.no_fallback else args.fallback

    load_env()
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        sys.exit("GEMINI_API_KEY not set (put it in saajha/apps/hub/.env.local)")
    from google import genai

    client = genai.Client(api_key=key)
    manifest = pd.read_parquet(DATA / "manifest.parquet")
    test = manifest[manifest.split == "test"]
    rng = np.random.default_rng(SEED)
    picks = pd.concat([
        g.iloc[rng.choice(len(g), size=min(args.per_class, len(g)), replace=False)]
        for _, g in test.groupby("label")
    ])

    rows = []
    for i, row in enumerate(picks.itertuples()):
        data = (DATA / "images" / f"{row.sha1}.jpg").read_bytes()
        try:
            out, used = classify(client, args.model, fallback, data)
            rows.append({"sha1": row.sha1, "true": row.label, "pred": out["class_key"],
                         "confidence": out["confidence"], "model": used})
        except Exception as err:  # noqa: BLE001
            rows.append({"sha1": row.sha1, "true": row.label, "pred": None, "error": str(err)[:200]})
        r = rows[-1]
        print(f"  {i + 1:>3}/{len(picks)} {r['true']:<26} -> {r.get('pred')} ({r.get('confidence')}) "
              f"{r.get('model', r.get('error', ''))}", flush=True)
        time.sleep(args.pace)

    ok = [r for r in rows if r.get("pred")]
    correct = [r for r in ok if r["pred"] == r["true"]]
    per_class = {k: (sum(r["pred"] == k for r in ok if r["true"] == k) / max(1, sum(r["true"] == k for r in ok)))
                 for k in CLASS_KEYS}
    summary = {
        "model": args.model, "fallback": fallback, "n": len(ok), "errors": len(rows) - len(ok),
        "acc": len(correct) / max(1, len(ok)), "per_class_acc": per_class,
        "mean_conf_correct": float(np.mean([r["confidence"] for r in correct])) if correct else None,
        "mean_conf_wrong": float(np.mean([r["confidence"] for r in ok if r not in correct])) if len(correct) < len(ok) else None,
        "models_used": sorted({r["model"] for r in ok}),
        "measured_at": datetime.now(timezone.utc).isoformat(), "rows": rows,
    }
    (DATA / "gemini_bench.json").write_text(json.dumps(summary, indent=1))
    print(f"\nGEMINI {summary['models_used']} n={summary['n']} acc {summary['acc']:.3f}  "
          f"conf right {summary['mean_conf_correct']} wrong {summary['mean_conf_wrong']}")
    print("  per class:", {k: round(v, 2) for k, v in per_class.items()})


if __name__ == "__main__":
    main()

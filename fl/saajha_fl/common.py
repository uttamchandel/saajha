"""Shared constants for the Saajha pipeline: classes, states, paths, partition.

The "states" are a simulated partition of one public dataset (Paddy Doctor,
Tamil Nadu). Which state holds which class is chosen to make the federation
measurable, not to describe real pest prevalence anywhere in India.
"""

from __future__ import annotations

import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = Path(os.environ.get("SAAJHA_DATA", r"C:\Users\prath\saajha-data"))
SEED = 42
TEST_FRACTION = 0.15  # global held-out benchmark; no state trains on it
VAL_FRACTION = 0.05  # calibration of gate thresholds; no state trains on it

# Head output order. Keys are the dataset's own label strings.
CLASSES: list[tuple[str, str, bool]] = [
    ("bacterial_leaf_blight", "Bacterial leaf blight", False),
    ("bacterial_leaf_streak", "Bacterial leaf streak", False),
    ("bacterial_panicle_blight", "Bacterial panicle blight", False),
    ("blast", "Blast", False),
    ("brown_spot", "Brown spot", False),
    ("dead_heart", "Dead heart (stem borer)", True),
    ("downy_mildew", "Downy mildew", False),
    ("hispa", "Rice hispa", True),
    ("normal", "Healthy", False),
    ("tungro", "Tungro", False),
]
CLASS_KEYS = [c[0] for c in CLASSES]
NUM_CLASSES = len(CLASSES)

STATES = ["A", "B", "C", "D"]
HERO_STATE = "C"
HERO_CLASS = "hispa"

# Which simulated states hold verified cases of each class.
PRESENCE: dict[str, str] = {
    "normal": "ABCD",
    "blast": "ABC",
    "hispa": "AB",
    "dead_heart": "AD",
    "tungro": "BCD",
    "brown_spot": "ACD",
    "downy_mildew": "BD",
    "bacterial_leaf_blight": "AC",
    "bacterial_leaf_streak": "BD",
    "bacterial_panicle_blight": "CD",
}

DISCLOSURE = (
    "States A-D are label-skewed partitions of one public Tamil Nadu dataset "
    "(Paddy Doctor). They do not describe real pest prevalence in any state."
)


def seen_classes(state: str) -> list[str]:
    return [k for k in CLASS_KEYS if state in PRESENCE[k]]


def unseen_classes(state: str) -> list[str]:
    return [k for k in CLASS_KEYS if state not in PRESENCE[k]]


def load_env() -> None:
    """Load GEMINI_API_KEY etc. from apps/hub/.env.local — one place for the key."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(REPO / "apps" / "hub" / ".env.local")

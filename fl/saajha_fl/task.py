"""Saajha's model and training loop: a small head over frozen embeddings.

Each state trains only this head on its own expert-verified cases. The head is
what crosses a state boundary — 1280x10 weights plus 10 biases, about 50 KB —
never an image, an embedding or a farmer record.

`mask_absent` restricts the local softmax to the classes a state actually
holds, so a state with no hispa cases does not spend its local epochs teaching
the shared model that hispa never happens (the standard label-skew failure of
plain FedAvg). Rows for absent classes then pass through local training
untouched and are learned from the states that do hold them.
"""

from __future__ import annotations

from functools import lru_cache

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F

import os

from .common import CLASS_KEYS, DATA, NUM_CLASSES, STATES

# Which embedding cache to train on (a backbone swap is one env var).
EMB_DIR = DATA / os.environ.get("SAAJHA_EMB", "emb")


class Head(nn.Module):
    def __init__(self, dim: int = 1280, hidden: int = 0, num_classes: int = NUM_CLASSES):
        super().__init__()
        if hidden:
            self.net = nn.Sequential(nn.Linear(dim, hidden), nn.ReLU(), nn.Linear(hidden, num_classes))
        else:
            self.net = nn.Sequential(nn.Linear(dim, num_classes))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(F.normalize(x, dim=1))  # L2-normalise: a per-image op, no shared stats


@lru_cache(maxsize=1)
def _load_all():
    manifest = pd.read_parquet(DATA / "manifest.parquet")
    emb = np.load(EMB_DIR / "emb.npy").astype(np.float32)
    flip_path = EMB_DIR / "emb_flip.npy"
    emb_flip = np.load(flip_path).astype(np.float32) if flip_path.exists() else None
    y = manifest.label.map({k: i for i, k in enumerate(CLASS_KEYS)}).to_numpy()
    return manifest, emb, emb_flip, y


def state_data(state: str, use_flip: bool = False):
    """(X, y) for one state's training partition — what that state holds."""
    manifest, emb, emb_flip, y = _load_all()
    mask = ((manifest.split == "train") & (manifest.state == state)).to_numpy()
    X, Y = emb[mask], y[mask]
    if use_flip and emb_flip is not None:
        X, Y = np.concatenate([X, emb_flip[mask]]), np.concatenate([Y, Y])
    return torch.from_numpy(X), torch.from_numpy(Y)


def split_data(split: str):
    manifest, emb, _, y = _load_all()
    mask = (manifest.split == split).to_numpy()
    return torch.from_numpy(emb[mask]), torch.from_numpy(y[mask])


def central_train_data(use_flip: bool = False):
    Xs, Ys = zip(*(state_data(s, use_flip) for s in STATES))
    return torch.cat(Xs), torch.cat(Ys)


def train(model: Head, X: torch.Tensor, Y: torch.Tensor, epochs: int, lr: float,
          batch_size: int = 64, mask_absent: bool = False, proximal_mu: float = 0.0,
          seed: int = 0, absent_scale: float | None = None) -> float:
    """Local training with class-balanced weights; returns the mean loss.

    `absent_scale` (used only when `mask_absent` is off) is the restricted softmax
    of FedRS (Li & Zhan, KDD 2021): logits of classes this state doesn't hold are
    multiplied by it, so they still act as negatives but with damped gradients.
    """
    n_out = list(model.parameters())[-1].shape[0]  # the head's own class count
    present = torch.bincount(Y, minlength=n_out)
    weights = torch.where(present > 0, present.sum() / (present.clamp(min=1) * (present > 0).sum()), 0.0)
    logit_mask = torch.where(present > 0, 0.0, float("-inf")) if mask_absent else None
    logit_scale = (torch.where(present > 0, 1.0, float(absent_scale))
                   if absent_scale is not None and not mask_absent else None)
    global_params = [p.detach().clone() for p in model.parameters()] if proximal_mu > 0 else None

    opt = torch.optim.SGD(model.parameters(), lr=lr, momentum=0.9)
    gen = torch.Generator().manual_seed(seed)
    model.train()
    total, count = 0.0, 0
    for _ in range(epochs):
        order = torch.randperm(len(Y), generator=gen)
        for i in range(0, len(Y), batch_size):
            idx = order[i:i + batch_size]
            logits = model(X[idx])
            if logit_mask is not None:
                logits = logits + logit_mask
            if logit_scale is not None:
                logits = logits * logit_scale
            loss = F.cross_entropy(logits, Y[idx], weight=weights)
            if global_params is not None:
                prox = sum(((p - g) ** 2).sum() for p, g in zip(model.parameters(), global_params))
                loss = loss + proximal_mu / 2 * prox
            opt.zero_grad()
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
            count += len(idx)
    return total / max(count, 1)


@torch.inference_mode()
def predict(model: Head, X: torch.Tensor) -> torch.Tensor:
    model.eval()
    return torch.softmax(model(X), dim=1)


def accuracy_report(model: Head, X: torch.Tensor, Y: torch.Tensor) -> dict:
    """Overall accuracy, per-class recall, and per-state seen/unseen accuracy."""
    from .common import seen_classes, unseen_classes

    pred = predict(model, X).argmax(1)
    correct = (pred == Y)
    per_class = {}
    for i, key in enumerate(CLASS_KEYS):
        sel = Y == i
        per_class[key] = float(correct[sel].float().mean()) if sel.any() else None
    per_state = {}
    for s in STATES:
        out = {}
        for name, keys in (("seen", seen_classes(s)), ("unseen", unseen_classes(s))):
            ids = torch.tensor([CLASS_KEYS.index(k) for k in keys])
            sel = torch.isin(Y, ids)
            out[f"acc_{name}"] = float(correct[sel].float().mean()) if sel.any() else None
        per_state[s] = out
    return {"acc_all": float(correct.float().mean()), "per_class_acc": per_class, "per_state": per_state}


def get_weights(model: nn.Module) -> list[np.ndarray]:
    return [p.detach().cpu().numpy().copy() for p in model.state_dict().values()]


def set_weights(model: nn.Module, weights: list[np.ndarray]) -> None:
    keys = list(model.state_dict().keys())
    model.load_state_dict({k: torch.from_numpy(np.asarray(w)) for k, w in zip(keys, weights)})

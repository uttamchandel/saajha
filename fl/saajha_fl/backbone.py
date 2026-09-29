"""The frozen feature extractor every state node runs locally.

MobileNetV3-Large (torchvision IMAGENET1K_V2) up to its 1280-d penultimate
layer. It never trains and never leaves the node's machine as anything but a
fixed public artefact, so the only thing a state ever shares is its head.

Preprocessing is deliberately simple so the browser can reproduce it with one
canvas draw: squash-resize to 224x224 (no crop), scale to [0, 1], ImageNet
mean/std, NCHW.
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn
from PIL import Image

INPUT_SIZE = 224
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)
EMBED_DIM = 1280
BACKBONE_NAME = "torchvision mobilenet_v3_large IMAGENET1K_V2 (frozen, 1280-d penultimate)"


class Backbone(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        from torchvision.models import MobileNet_V3_Large_Weights, mobilenet_v3_large

        net = mobilenet_v3_large(weights=MobileNet_V3_Large_Weights.IMAGENET1K_V2)
        self.features = net.features
        self.pool = net.avgpool
        # Linear(960, 1280) + Hardswish; the dropout and 1000-way layer are dropped.
        self.proj = nn.Sequential(net.classifier[0], net.classifier[1])
        self.eval()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.proj(torch.flatten(self.pool(self.features(x)), 1))


def preprocess(img: Image.Image) -> np.ndarray:
    """PIL image -> float32 CHW array, exactly as the browser does it."""
    img = img.convert("RGB").resize((INPUT_SIZE, INPUT_SIZE), Image.BILINEAR)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
    return arr.transpose(2, 0, 1)

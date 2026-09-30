"""Parity check for live rounds: the deployed TypeScript (node local training, hub averaging, server step,
calibration, release gate) against the Python/Flower reference on the same inputs.

Two simulated nodes train round 40 on 70 held-out photos the model was unsure about (45 and 25 cases,
so shuffling and momentum across batches are exercised); the average uses Flower's own FedAvg
aggregation (flwr.server.strategy.aggregate.aggregate). The TypeScript side runs the actual source files
(apps/node/lib/fed/train.ts, apps/hub/lib/rounds.ts), compiled with tsc into a temporary folder.

    python fl/scripts/check_live_round.py        # exits 1 on a mismatch
"""
from __future__ import annotations

import base64
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from flwr.server.strategy.aggregate import aggregate

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "fl"))
from saajha_fl.task import Head, split_data  # noqa: E402

RUN = json.loads((REPO / "apps/hub/public/fl/run.json").read_text())
LAST = RUN["rounds"][-1]
NAMES = ["net.0.bias", "net.0.weight", "net.2.bias", "net.2.weight"]
STEPS = [0.3, 0.2, 0.1, 0.05, 0.02]


def mulberry32_perm(n: int, seed: int) -> list[int]:
    a = seed & 0xFFFFFFFF

    def imul(x: int, y: int) -> int:
        return (x * y) & 0xFFFFFFFF

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    p = list(range(n))
    for i in range(n - 1, 0, -1):
        j = int(rand() * (i + 1))
        p[i], p[j] = p[j], p[i]
    return p


def load_r40() -> Head:
    h = json.loads((REPO / "apps/hub/public" / LAST["head_url"].lstrip("/")).read_text())
    m = Head(hidden=64)
    m.load_state_dict({t["name"]: torch.from_numpy(np.frombuffer(base64.b64decode(t["b64"]), dtype="<f4").reshape(t["shape"]).copy()) for t in h["tensors"]})
    return m


def train_live(m: Head, X: torch.Tensor, Y: torch.Tensor, seed: int) -> None:
    """fl/saajha_fl/task.py train(mask_absent=False) with the deployed shuffle order."""
    present = torch.bincount(Y, minlength=10)
    weights = torch.where(present > 0, present.sum() / (present.clamp(min=1) * (present > 0).sum()), 0.0)
    opt = torch.optim.SGD(m.parameters(), lr=0.2, momentum=0.9)
    m.train()
    for epoch in range(2):
        order = torch.tensor(mulberry32_perm(len(Y), seed * 1000 + epoch))
        for i in range(0, len(Y), 64):
            idx = order[i:i + 64]
            loss = F.cross_entropy(m(X[idx]), Y[idx], weight=weights)
            opt.zero_grad()
            loss.backward()
            opt.step()


def arrays(m: Head) -> list[np.ndarray]:
    sd = m.state_dict()
    return [sd[n].detach().numpy().astype("<f4") for n in NAMES]


def main() -> int:
    Xt, Yt = split_data("test")
    Xv, Yv = split_data("val")
    base = load_r40()
    with torch.inference_mode():
        p = torch.softmax(base(Xt) / LAST["temperature"], 1)
    unsure = torch.nonzero(p.max(1).values < RUN["gate"]["tau_fed"]).flatten()[:70]
    Xc, Yc = Xt[unsure], Yt[unsure]
    parts = {"A": (0, 45), "B": (45, 70)}

    # ---- Python / Flower reference
    local = {}
    for s, (a, b) in parts.items():
        m = load_r40()
        train_live(m, Xc[a:b], Yc[a:b], LAST["round"])
        local[s] = arrays(m)
    avg = aggregate([(local[s], b - a) for s, (a, b) in parts.items()])  # Flower's FedAvg
    base_arr = arrays(base)
    ref = Head(hidden=64)

    def acc(arrs, X, Y):
        ref.load_state_dict({n: torch.from_numpy(np.asarray(a, dtype="<f4")) for n, a in zip(NAMES, arrs)})
        with torch.inference_mode():
            return float((ref(X).argmax(1) == Y).float().mean()), ref(X)

    val_base, _ = acc(base_arr, Xv, Yv)
    chosen = None
    for step in STEPS:
        cand = [b + step * (v - b) for b, v in zip(base_arr, avg)]
        va, zv = acc(cand, Xv, Yv)
        if va >= val_base - 0.005:
            grid = np.geomspace(0.25, 50, 80)
            nll = [float(F.cross_entropy(zv / t, Yv)) for t in grid]
            T = round(float(grid[int(np.argmin(nll))]), 4)
            conf, pred = torch.softmax(zv / T, 1).max(1)
            tau = 0.5
            for i in range(30, 96):
                sel = conf >= i / 100
                if sel.sum() >= 20 and float((pred[sel] == Yv[sel]).float().mean()) >= 0.9:
                    tau = i / 100
                    break
            ta, _ = acc(cand, Xt, Yt)
            chosen = {"step": step, "T": T, "tau": tau, "val": va, "test": ta}
            break

    # ---- the deployed TypeScript on the same inputs
    tmp = Path(tempfile.mkdtemp(prefix="saajha-parity-"))
    subprocess.run(
        ["npx", "--prefix", str(REPO / "apps/node"), "tsc", "--outDir", str(tmp), "--module", "commonjs", "--target", "es2022",
         "--skipLibCheck", "--esModuleInterop", "--types", "node", "--typeRoots", str(REPO / "apps/node/node_modules/@types"),
         str(REPO / "apps/node/lib/fed/train.ts"), str(REPO / "apps/hub/lib/rounds.ts")],
        check=True, shell=os.name == "nt",
    )
    def f32b64(a) -> str:
        return base64.b64encode(np.asarray(a, dtype="<f4").tobytes()).decode()

    fixture = {
        "base": {n: f32b64(a) for n, a in zip(NAMES, base_arr)},
        "cases": [{"x": f32b64(Xc[i].numpy()), "y": int(Yc[i])} for i in range(len(Yc))],
        "parts": parts,
        "seed": LAST["round"],
    }
    (tmp / "fixture.json").write_text(json.dumps(fixture))
    runner = tmp / "run.cjs"
    runner.write_text(r"""
const fs = require("fs"), path = require("path");
const dir = __dirname;
const find = (name) => { const hits = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f === name) hits.push(p); } }; walk(dir); return hits[0]; };
const train = require(find("train.js"));
const rounds = require(find("rounds.js"));
const fx = JSON.parse(fs.readFileSync(path.join(dir, "fixture.json"), "utf8"));
const dec = (b) => { const buf = Buffer.from(b, "base64"); const o = new Float32Array(buf.length / 4); for (let i = 0; i < o.length; i++) o[i] = buf.readFloatLE(i * 4); return o; };
const enc = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const base = Object.fromEntries(Object.entries(fx.base).map(([k, v]) => [k, dec(v)]));
const cases = fx.cases.map((c) => ({ x: dec(c.x), y: c.y }));
(async () => {
  const out = { local: {} };
  const ups = [];
  for (const [s, [a, b]] of Object.entries(fx.parts)) {
    const { tensors } = train.trainLocal(base, cases.slice(a, b), fx.seed);
    out.local[s] = Object.fromEntries(Object.entries(tensors).map(([k, v]) => [k, enc(v)]));
    ups.push({ n: b - a, tensors });
  }
  out.avg = Object.fromEntries(Object.entries(rounds.fedAvg(ups)).map(([k, v]) => [k, enc(v)]));
  const r = await rounds.computeRound({ round: 40, sha256: "", temperature: 1, tau: 0.58, tensors: base, headUrl: "", source: "recorded" }, ups);
  out.round = { status: r.status, step: r.step, T: r.temperature ?? null, tau: r.tau ?? null, val: r.val, test: r.test };
  fs.writeFileSync(path.join(dir, "out.json"), JSON.stringify(out));
})();
""")
    subprocess.run(["node", str(runner)], check=True, cwd=str(REPO / "apps/hub"))
    out = json.loads((tmp / "out.json").read_text())

    def dec(b: str) -> np.ndarray:
        return np.frombuffer(base64.b64decode(b), dtype="<f4")

    ok = True
    for s in parts:
        d = max(float(np.abs(dec(out["local"][s][n]) - local[s][i].ravel()).max()) for i, n in enumerate(NAMES))
        print(f"node {s} local weights: max |TS - torch| = {d:.2e}")
        ok &= d < 1e-4
    d = max(float(np.abs(dec(out["avg"][n]) - np.asarray(avg[i]).ravel()).max()) for i, n in enumerate(NAMES))
    print(f"FedAvg (Flower's aggregate): max |TS - Flower| = {d:.2e}")
    ok &= d < 1e-4
    ts = out["round"]
    print(f"server step / temperature / threshold / val / test:\n  python {chosen}\n  ts     {ts}")
    if chosen is None:
        ok &= ts["status"] == "refused" and ts["step"] is None
    else:
        ok &= ts["step"] == chosen["step"] and ts["T"] == chosen["T"] and ts["tau"] == chosen["tau"]
        ok &= abs(ts["val"] - chosen["val"]) < 1e-6 and abs(ts["test"] - chosen["test"]) < 1e-6  # float32 vs float64 of the same count
    print("PARITY OK" if ok else "PARITY MISMATCH")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

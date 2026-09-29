"""Saajha state node: trains the shared head on this state's verified cases.

One ClientApp per state. It receives the national head, trains it on the
embeddings of its own expert-verified images, and returns weights — never an
image, an embedding or a label list. The only numbers beside the weights are
the loss, the example count used for weighting, and which state this is.
"""

import torch
from flwr.app import ArrayRecord, Context, Message, MetricRecord, RecordDict
from flwr.clientapp import ClientApp

from saajha_fl.common import STATES
from saajha_fl.task import Head, state_data, train as train_fn

app = ClientApp()


def _state(context: Context) -> tuple[int, str]:
    pid = int(context.node_config["partition-id"])
    return pid, STATES[pid]


@app.train()
def train(msg: Message, context: Context):
    pid, state = _state(context)
    cfg = context.run_config
    model = Head(hidden=int(cfg["hidden"]))
    model.load_state_dict(msg.content["arrays"].to_torch_state_dict())

    X, Y = state_data(state, use_flip=bool(cfg["use-flip"]))
    loss = train_fn(
        model, X, Y,
        epochs=int(cfg["local-epochs"]),
        lr=float(msg.content["config"]["lr"]),
        mask_absent=bool(cfg["mask-absent"]),
        proximal_mu=float(msg.content["config"].get("proximal-mu", 0.0)),
        seed=int(msg.content["config"].get("server-round", 0)) * 10 + pid,
    )
    print(f"  [State {state}] trained on {len(Y):>5} verified cases  loss {loss:.4f}")
    metrics = {"train_loss": loss, "num-examples": len(Y), "partition-id": float(pid)}
    content = RecordDict({"arrays": ArrayRecord(model.state_dict()), "metrics": MetricRecord(metrics)})
    return Message(content=content, reply_to=msg)


@app.evaluate()
def evaluate(msg: Message, context: Context):
    """Score the national head on this state's own training cases."""
    pid, state = _state(context)
    model = Head(hidden=int(context.run_config["hidden"]))
    model.load_state_dict(msg.content["arrays"].to_torch_state_dict())
    X, Y = state_data(state)
    with torch.inference_mode():
        acc = float((model(X).argmax(1) == Y).float().mean())
    content = RecordDict({"metrics": MetricRecord({"local_acc": acc, "num-examples": len(Y)})})
    return Message(content=content, reply_to=msg)

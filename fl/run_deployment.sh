#!/usr/bin/env bash
# Run a real Flower deployment: one SuperLink (the national aggregator) and one
# SuperNode per state, each a separate process with its own partition. This is
# the same topology a real rollout would have — "each state runs this node" —
# on one machine. (Flower's simulation engine needs Ray, which flwr 1.37 does
# not support on Windows, so we use the deployment runtime everywhere.)
#
#   ./run_deployment.sh [run-name] [extra --run-config overrides]
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8
VENV="${SAAJHA_VENV:-/c/Users/prath/venvs/saajha}"
BIN="$VENV/Scripts"; [ -d "$BIN" ] || BIN="$VENV/bin"
export PATH="$BIN:$PATH"
RUN_NAME="${1:-deploy-$(date +%Y%m%d-%H%M%S)}"
LOGS="${SAAJHA_DATA:-/c/Users/prath/saajha-data}/logs/$RUN_NAME"
mkdir -p "$LOGS"
STATES=(A B C D)

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT

flower-superlink --insecure --disable-runtime-dependency-installation >"$LOGS/superlink.log" 2>&1 &
pids+=($!)
sleep 6
for i in 0 1 2 3; do
  flower-supernode --insecure --superlink 127.0.0.1:9092 --port $((9094 + i)) \
    --node-config "partition-id=$i num-partitions=4" >"$LOGS/state-${STATES[$i]}.log" 2>&1 &
  pids+=($!)
done
sleep 6
echo "SuperLink + 4 state nodes up (logs: $LOGS)"
flwr run . local-deployment --stream --run-config "run-name=\"$RUN_NAME\" ${2:-}"
echo "done: $RUN_NAME"

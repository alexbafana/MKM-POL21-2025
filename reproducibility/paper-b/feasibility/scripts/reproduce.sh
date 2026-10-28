#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
OUT="$ROOT/reproducibility/paper-b/feasibility/results"
cd "$ROOT"
mkdir -p "$OUT"
{
 git rev-parse HEAD
 git status --short -- packages/hardhat/contracts/paperb/ModelBoundPublication.sol packages/hardhat/contracts/paperb/ModelPublicationCommittee.sol packages/hardhat/evaluation/feasibility reproducibility/paper-b/feasibility/scripts
 node --version
 corepack yarn --version
 uname -srm
} > "$OUT/environment.txt"
# Dependencies must already be installed using corepack yarn install --immutable.
corepack yarn hardhat:clean > "$OUT/build-output.txt" 2>&1
rm -rf "$OUT/local-store"
export PAPER_B_FEASIBILITY_RESULTS="$OUT"
NO_COLOR=1 REPORT_GAS=false corepack yarn workspace @se-2/hardhat hardhat test evaluation/feasibility/ModelBoundPublication.test.ts --network hardhat 2>&1 | tee "$OUT/test-output.txt"
node reproducibility/paper-b/feasibility/scripts/verify.cjs | tee "$OUT/integrity.json"
node reproducibility/paper-b/feasibility/scripts/test-verifier.cjs
node reproducibility/paper-b/feasibility/scripts/summarize.cjs

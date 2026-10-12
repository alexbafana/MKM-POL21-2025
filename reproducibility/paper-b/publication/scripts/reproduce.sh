#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
OUT="${ROOT}/reproducibility/paper-b/publication/results"
mkdir -p "$OUT"
cd "$ROOT"
{
  git rev-parse HEAD
  git status --short -- packages/hardhat/contracts/paperb packages/hardhat/evaluation/publication reproducibility/paper-b/publication/scripts yarn.lock
  node --version
  corepack yarn --version
  uname -srm
} > "$OUT/environment.txt"
corepack yarn hardhat:clean
rm -rf "$OUT/local-store"
export PAPER_B_PUBLICATION_RESULTS="$OUT"
REPORT_GAS=false corepack yarn workspace @se-2/hardhat hardhat test evaluation/publication/BoundPublication.test.ts --network hardhat 2>&1 | tee "$OUT/test-output.txt"
node reproducibility/paper-b/publication/scripts/verify-receipt.cjs
node reproducibility/paper-b/publication/scripts/test-verifier.cjs

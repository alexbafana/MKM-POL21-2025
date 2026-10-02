#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${PACKAGE_ROOT}/../.." && pwd)"
RESULTS_DIR="${PACKAGE_ROOT}/results/generated"

mkdir -p "${RESULTS_DIR}"
cd "${REPO_ROOT}"

{
  echo "commit=$(git rev-parse HEAD 2>/dev/null || echo container-build-context)"
  echo "node=$(node --version)"
  echo "corepack=$(corepack --version)"
  echo "yarn=$(corepack yarn --version)"
  echo "platform=$(uname -srm)"
} > "${RESULTS_DIR}/environment.txt"

corepack yarn install --immutable 2>&1 | tee "${RESULTS_DIR}/install.log"
corepack yarn hardhat:clean

set +e
REPORT_GAS=false corepack yarn workspace @se-2/hardhat hardhat test --network hardhat 2>&1 | tee "${RESULTS_DIR}/test-output.txt"
test_status=${PIPESTATUS[0]}
set -e
if [[ ${test_status} -ne 0 ]]; then
  exit "${test_status}"
fi

corepack yarn hardhat:clean
rm -rf packages/hardhat/coverage packages/hardhat/coverage.json

set +e
corepack yarn workspace @se-2/hardhat coverage:paper-b 2>&1 | tee "${RESULTS_DIR}/coverage-output.txt"
coverage_status=${PIPESTATUS[0]}
set -e
if [[ ${coverage_status} -ne 0 ]]; then
  exit "${coverage_status}"
fi

cp packages/hardhat/coverage.json "${RESULTS_DIR}/coverage.json"
cp packages/hardhat/coverage/lcov.info "${RESULTS_DIR}/lcov.info"
node reproducibility/paper-b/scripts/verify-manifest.mjs | tee "${RESULTS_DIR}/manifest-check.txt"

echo "Reproduction succeeded. Evidence is in ${RESULTS_DIR}"

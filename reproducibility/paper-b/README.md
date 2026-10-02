# Paper B reproducibility package

This directory is the reviewer entry point for the evaluation reported in
Section 6 of **Decentralized Governance of Institutional Knowledge Graph
Lifecycles**. It isolates the evaluated contracts, tests, requirements
crosswalk, scenarios, commands, and generated evidence from the rest of the
development repository.

## What can be reproduced

The package reproduces the contract-level claims only:

- compilation of the evaluated Solidity contracts;
- execution of 180 tests in eight files;
- the five evaluation situations S1--S5, including the negative GAP tests;
- statement, branch, function, and line coverage for the stated contract
  boundary;
- the counts and identifiers in the 36-row OLR/CR/ER/SG coverage crosswalk.

It does **not** reproduce legal validity, institutional legitimacy, operation
by independent organizations, or faithful publication to a live RDF/DKG
service. Those are explicitly outside the evidence boundary of Section 6.

## Fastest path

From the repository root:

```bash
bash reproducibility/paper-b/scripts/reproduce.sh
```

The script installs the lockfile-pinned dependencies, cleans generated
contract artifacts, runs all tests, runs Solidity coverage over the evaluated
contract boundary, validates the manifest and crosswalk, and writes evidence
to `reproducibility/paper-b/results/generated/`.

Expected headline results:

| Measure | Expected result |
|---|---:|
| Test files | 8 |
| Tests | 180 passing |
| Design requirements | 36 |
| Direct exercised support (E) | 2 |
| Partial support (P) | 16 |
| No implementation (N) | 18 |
| Statement coverage | 80.12% (137/171) |
| Branch coverage | 64.89% (122/188) |
| Function coverage | 73.61% (53/72) |
| Line coverage | 79.49% (186/234) |

Coverage is reported only for the contracts named in the paper's evaluation
boundary: `MKMPOL21`, `GADataValidation`, `Consortium`,
`ValidationCommittee`, and `VotingPowerToken`, plus their interfaces. Stub
contracts outside that boundary are explicitly listed in
`packages/hardhat/.solcover.js` and excluded.

## Container path

For a more controlled environment:

```bash
docker build -f reproducibility/paper-b/environment/Dockerfile -t paper-b-repro .
docker run --rm -v "$PWD/reproducibility/paper-b/results/generated:/artifact/reproducibility/paper-b/results/generated" paper-b-repro
```

The image pins Node.js and Corepack; Yarn, Hardhat, Solidity, and all remaining
JavaScript dependencies are pinned by `package.json` and `yarn.lock`.

## Navigation

- `artifact-manifest.json`: evaluated boundary, expected counts, toolchain,
  and paper-to-artifact relations.
- `requirements/coverage-crosswalk.csv`: all 36 design requirements with
  status, evidence location, and limitation.
- `requirements/status-rules.md`: operational decision rules for E/P/N.
- `scenarios/S1-S5.md`: scenario selection and concrete test locations.
- `scripts/reproduce.sh`: one-command clean reproduction.
- `scripts/verify-manifest.mjs`: independent count and crosswalk checks.
- `results/reference/`: reference summaries produced from the reviewed tree.
- `packages/hardhat/evaluation/`: detailed test inventory and historical
  source-level audit material.

## Interpreting the evidence

Passing tests show that the tested behavior occurred in the specified local
configuration. They are not proof that the associated institutional
requirement is satisfied. Negative tests prefixed `GAP:` deliberately pass
when they demonstrate a missing safeguard. The crosswalk therefore separates
directly exercised support, partial support, and absence, and always states
the remaining boundary.

## Archival release

For submission, create an immutable GitHub release from the reviewed commit
and archive that release with Zenodo. Replace the placeholder release and DOI
in the manuscript only after both exist. The repository includes
`CITATION.cff` and `.zenodo.json` metadata for that step.


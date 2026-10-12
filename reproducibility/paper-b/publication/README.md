# Paper B supplemental decision-to-publication episode

Paper: **Decentralized Governance of Institutional Knowledge Graph Lifecycles**.
This package contains no TEDM/token-economy artifacts.

## Reproduce

From the repository root after `corepack yarn install --immutable`:

```bash
bash reproducibility/paper-b/publication/scripts/reproduce.sh
```

Expected: 22 passing supplemental tests, one content-addressed canonical N-Quads object, one JSON receipt, and a passing offline receipt-integrity check. Outputs are in `results/`. The original eight-file/180-test suite and 36-row crosswalk remain a separate baseline; its published coverage percentages do not describe this new contract.

## Executed chain

1. A producer commits dataset/version, RDFC-1.0 canonical RDF digest (Keccak-256 over UTF-8), and model digest in BoundPublication. The version cannot be overwritten.
2. A separate validator runs a narrow synthetic fixture rule: valid N-Quads, one job-gain/job-loss classification, and a source IRI. It submits syntax/semantic flags and an evidence digest. This is not a SHACL certification, EMTAK accuracy study, or validated NLP pipeline.
3. The existing ValidationCommittee executes a single-call proposal after two of three equally weighted local voters vote in favor. Quorum is 34%, so one vote is insufficient. The contract computes the exact proposal ID and checks its Executed state during the Governor callback. A permission holder cannot authorize directly, and a relay-wrapped plan cannot substitute for the exact proposal.
4. The appointed adapter checks authorization, expiry and content before writing a local content-addressed N-Quads object. It reads the object back, canonicalizes it, and compares its digest to the approved digest.
5. The adapter submits proposal ID, observed digest, publication ID, and receipt digest. Confirmation is linked to asset/version, model/evidence hashes, decision, actor, and transaction. Replays and changed identifiers are rejected.
6. The offline verifier checks the saved content and receipt digests. The tests check the corresponding on-chain state/event. Offline verification alone is not chain replay.

## Boundaries and trust

All accounts belong to one local test operator. Distinct addresses test technical separation, not independent institutions. The immutable validator and adapter are trusted principals; false attestations by either are not cryptographically excluded. The governance permission manager retains the legacy administration/participation limitations. The single-call publication profile excludes compound plans, role changes, restoration, deprecation, legal policies, missing-receipt escalation, censorship and workload scalability.

The on-chain state change is atomic and replay-protected; filesystem write and chain confirmation are not one atomic transaction. A write followed by failed confirmation may leave an unconfirmed object. Read-back demonstrates observed local correspondence at that moment, not long-term availability or OriginTrail publication. No legacy requirement status is automatically upgraded.

## Reviewer entry points

- `packages/hardhat/contracts/paperb/BoundPublication.sol`: bounded authorization/confirmation implementation.
- `packages/hardhat/evaluation/publication/adapter.ts`: canonicalization, narrow fixture validation, local store adapter.
- `packages/hardhat/evaluation/publication/BoundPublication.test.ts`: 22 positive/negative checks.
- `scripts/verify-receipt.cjs`: independent executable integrity check (not independent human assessment).
- `review/`: prefilled baseline review and focused human tasks.

# WoodHive model-linked feasibility proof of concept

This is a **local, single-version publication** implementation of selected institutional DAOMod clauses. It complements, and does not replace, the historical 180-test baseline and 22-test supplemental episode. It does not implement the complete 36-requirement governance design.

## Reproduce

From the repository root, with Node.js 22.14.0 and Corepack 0.31.0 (the CI reference environment):

```bash
corepack yarn install --immutable
bash reproducibility/paper-b/feasibility/scripts/reproduce.sh
```

The script cleans contract artifacts, compiles, runs 30 integration/negative tests, writes a local canonical RDF object and receipt, verifies artifact integrity, rejects three tampered output variants, and writes `results/summary.json`. Actual local versions and source status are recorded in `results/environment.txt`. No private keys, external chain, paid service or live institution is needed. The local accounts are public deterministic Hardhat test identities.

## What is new

The earlier supplemental episode starts from hand-configured contract parameters. This bounded prototype additionally reads `models/WoodHive.institutional.json` and the linked profile, checks selected classes in the integrated ontology and the explicit institutional XML views, and derives the runtime commitments and supported publication settings. `modelRuntime.ts` is a hand-written adapter for this specific profile, **not a general DAO-ML/ET-DM-to-code generator or OWL interpreter**. The full model schema and ontology validators remain separate.

1. The supported model must specify the WoodHive `validated -> published` v1 plan, scoped propose/validate/authorize/execute permissions, producer/executor A, validator B and authorizers B/C, valid scoped mandate records, RDFC-1.0, SHA-256, quorum two and unanimity, 30 voting blocks, five delay blocks, and maximum principal share 0.5. Unsupported structures fail rather than silently become deployable settings. Fourteen selected requirement bindings resolve to ontology classes and explicit view bindings. Raw source-file hashes and a canonical JSON manifest commit the interpretation.
2. The deployment maps synthetic principals A/B/C to three local accounts. It uses the existing ValidationCommittee with two equal one-unit voting allocations and 100% quorum. In this fixed two-voter configuration that realizes quorum two plus unanimity. The inherited token/permission administration is trusted; token transfers, delegation and changes in ownership are not a demonstration of institutional authority or capture resistance.
3. `ModelBoundPublication.sol` stores model/plan/policy commitments, fixes the single permitted version key, checks producer/validator/executor identities and mandate block intervals, and requires the exact executed committee call, unchanged evidence and plan, expiry and delay. Admission atomically reserves authorization before the adapter writes anything. Pending and confirmed are technical execution states, not institutional confirmation.
4. The adapter canonicalizes the **new synthetic WoodHive fixture** using RDFC-1.0 and computes a real SHA-256 content digest. It obtains a narrow syntax/classification/source check and an evidence-manifest digest; it does not reuse the old model's `aaaa...` synthetic hash as measured evidence. A local content-addressed object is read back, its digest is compared, and a receipt commits the runtime model, exact plan, policy, decision, evidence and executor. Contract state and event assertions check the same decision/content/receipt linkage.
5. The offline verifier checks source commitments and the saved RDF, receipt and executed-test event record. It does not replay blockchain history independently. Three altered output copies (changed receipt, content or model manifest) must fail the verifier.

## Explicit runtime adaptations

- Original ontology, DAO-ML/ET-DM files and worked model remain unchanged. JSON example IDs are connected to runtime addresses, decision IDs and digests in `results/model-runtime.json`, `execution.json`, and the receipt.
- The original illustrative mandate interval 0–1000 is translated to block offsets from deployment. The model's `authorization.expires = 100` is interpreted as a 100-block upper bound for the runtime authorization window; it is not an original model timestamp. Voting and delay are in blocks. These are prototype adapter conventions, not inferred ontology semantics.
- Only v1 publication is implemented. The adapter's narrow graph validator checks N-Quads parsing, an allowed employment classification and a source IRI. It does not validate the truth of the 120-job claim, perform NLP/EMTAK inference, or implement general SHACL validation.
- The model digest in the contract commits the ontology/profile/views/instance and runtime interpretation. The ontology is not executed on-chain. Selected ontology and view references are checked, not all OWL semantics or every model condition.
- The old worked receipt/authorization are compact examples. New runtime records enrich them; they do not assert complete syntactic equivalence to the formal tuples.

## Evidence and limits

`requirement-clauses.csv` maps the 14 selected bindings to implementation points, tests and residual gaps. A binding is **not** a fully satisfied requirement. The baseline classifications remain 2 E / 16 P / 18 N; baseline test counts and Solidity coverage percentages do not measure this new contract.

Positive and failure checks establish feasibility of the bounded model-to-decision-to-local-publication chain. Identity-to-institution mappings, mandates, validator, adapter, deployment compiler and inherited committee administration remain trusted. Mandates are checked at authorization/execution; the legacy Governor is not extended to enforce mandate validity at each vote. Multiple addresses are technical identities, not independently assessed institutional principals.

There is no institutional confirmation gate, legal assessment, independent review or reproduction, workload evaluation, fault-tolerant recovery, compound atomic restoration, live graph network, formal verification or guarantee of availability. A tested failure after filesystem write but before blockchain confirmation leaves a pending operation and an unconfirmed object. The filesystem/chain operation is not atomic; a new admission is rejected, and automated retry/recovery is not implemented. The receipt is attributable to a transaction sender, not a detached signed JSON certificate. Its integrity depends on the stated trust boundary.

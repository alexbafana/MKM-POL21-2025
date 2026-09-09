# Test-suite evidential audit

- **Scope:** all 8 files in `packages/hardhat/test/` (221 `it()` blocks).
- **Method:** static reading of test bodies against `contracts/*.sol` and OpenZeppelin
  `@openzeppelin/contracts@4.9.6`. **No test run, no edit.** Where a judgement depends on
  a runtime fact I could not settle by reading, the verdict is `UNCLEAR` and says why.
- **Contract facts derived and used throughout** (from `MKMPOL21.sol` constructor, decoded):

  | idx | role | value | permission bits |
  |---:|---|---:|---|
  | 0 | Member_Institution | 1152 | 0-8, 11, 14, 15, 17, 19, 20, 23, 24, 25, 27, **28**, **29** |
  | 1 | Ordinary_User | 1153 | 1, 3, 22, 32, 33 |
  | 2 | MFSSIA_Guardian_Agent | 3074 | 11, 12, 13, 14, 18, 20, 23, 24 |
  | 3 | Eliza_Data_Extractor | 3075 | 15, 16, 17 |
  | 4 | Data_Validator | 1156 | 1, 3, **4**, 7, **8**, 9, 22, **28**, **29**, **30**, **31**, 32, 33 |
  | 5 | MKMPOL21Owner | 1029 | 0-33 (all) |
  | 6 | Consortium | 1030 | 4, 5, 19, 21, 25, 26, 27 (**no 6**) |
  | 7 | Validation_Committee | 1031 | 6, 10 |
  | 8 | Dispute_Resolution_Board | 1032 | 0, 2 |

  Two consequences used repeatedly below: **Member_Institution holds 4 (validate), 6 (approve)
  and 8 (submit) simultaneously**; and `MKMPOL21.canVote`/`canPropose` **revert** with
  `"User does not have this permission"` for a roled-but-unpermitted caller and **return false**
  only for a role-0 caller — so the `"User cannot propose"` / `"User cannot vote"` strings in
  `Consortium.sol` and `Validation_Committee.sol` are reachable *only* by unroled accounts.

## Verdict key

| verdict | meaning |
|---|---|
| SUBSTANTIVE | would fail if the contract's intended behaviour broke |
| TAUTOLOGICAL | asserts a value the test set, re-derives the expectation with the contract's own logic, or cannot fail |
| SHALLOW | real path, too little asserted (no revert reason, event without args, one field of many) |
| MISLABELLED | the requirement or claim in the name is not what the body tests |
| UNCLEAR | undeterminable from the code alone |

Counts over all 221 `it()` blocks, one primary verdict each:
**SUBSTANTIVE 137 · TAUTOLOGICAL 49 · SHALLOW 32 · MISLABELLED 3 · UNCLEAR 0.**
A further **8** tests carry MISLABELLED as a secondary note alongside their primary verdict, so
11 tests in total are misnamed. Of the 137 SUBSTANTIVE, 9 are `GAP:` tests whose evidential value
is *negative* — they demonstrate that a requirement is **not** met.

---

## 1. `test/ConsortiumOptimisticGovernance.test.ts` (22)

Root describe: `Consortium - Optimistic Governance (R1.5-R1.7, R2.9, R2.11, R3.11)`

### `[R1.3/R1.5] Proposal rights are permission-gated`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Member_Institution holding permission 28 can open a proposal | R1.3/R1.5 | SUBSTANTIVE | `has_permission(inst,28)==true` + `ProposalCreated` fires; args unchecked but the call path is real. |
| An address without any role cannot open a proposal | R1.3/R1.5 | SUBSTANTIVE | `"User cannot propose"` is the **only** string that pins `Consortium.sol:61`'s boolean result (role-0 branch of `canPropose`). |
| A role that lacks permission 28 cannot open a proposal | R1.5 | SHALLOW | Reason `"User does not have this permission"` comes from `MKMPOL21.canPropose:488`, and is identical for *any* missing bit. Does not show that bit **28** is the one checked. |
| Delegating permission 28 to a role grants proposal rights to every holder of that role | R1.5 | SUBSTANTIVE | Grants literal 28 to role 1153 and the same call then succeeds — this is the one test that pins the constant `28` in `Consortium.sol:61`. Caveat: line 170 uses bare `.to.be.reverted` (no reason). |

### `[R1.6] Veto rights`

| test | claimed req | verdict | reason |
|---|---|---|---|
| A holder of permission 29 can veto inside the challenge window | R1.6 | SUBSTANTIVE | Reads `proposals(id).vetoed == true` from storage. |
| A role without permission 29 cannot veto | R1.6 | SHALLOW | Same generic `canVote` string; does not identify bit 29. |
| An address without any role cannot veto | R1.6 | SUBSTANTIVE | `"User cannot vote"` pins `Consortium.sol:75`'s boolean. |
| The same proposal cannot be vetoed twice | R1.6 | SUBSTANTIVE | `"Proposal already vetoed"` is unique to `Consortium.sol:77`. |
| Revoking permission 29 removes the veto right from the whole role (R1.7) | R1.7 | SUBSTANTIVE | Strongest test in the file: revokes literal 29, checks the event args, shows the veto fails for role 0 **and still works for role 4** — pins both the constant and the role-scoping of revocation. |
| Revoking the role removes the proposal right from that account (R1.7) | R1.7 | SUBSTANTIVE | `RoleRevoked` args + subsequent `"User cannot propose"`. |
| Vetoing an unknown proposal is rejected by the window check, not by an existence check | — | SUBSTANTIVE | Honest characterisation test: `creationTime == 0` makes the window check fire. Note it is a *defect-documenting* test — adding a proper existence check would turn it red. Do not cite it as evidence for R2.9. |

### `[R2.9] Temporal constraints: the challenge window`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Records the creation time that opens the challenge window | R2.9 | SHALLOW | Of three assertions, `challengePeriod == CHALLENGE_PERIOD` is a constructor round-trip and `executed == false` is the struct default; only `creationTime == time.latest()` carries content. |
| Rejects a veto once the challenge window has expired | R2.9 | SUBSTANTIVE | `time.increase` past the window then a unique reason string. |
| Rejects optimistic execution before the challenge window is over | R2.9 | SUBSTANTIVE | Reason + `validated == false`. **Fragility:** it depends on `mine()`'s default 1-second block interval keeping the ~57 600 blocks of voting under 3 days of simulated time. A different interval would silently close the window and flip the reason. |
| Rejects optimistic execution of a vetoed proposal | R2.9 / R1.6 | SUBSTANTIVE | `time.increase` first, so the window check cannot mask the `"Vetoed"` check that is being tested. Correct ordering. |

### `[R2.11] A collective decision drives the lifecycle transition`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Executes Created -> Validated on behalf of the Consortium once the window closes unchallenged | R2.11 / R3.1 | SUBSTANTIVE | Best R2.11 evidence in the suite: event `withArgs(graphId, true, consortiumAddress)` + `validated` + `executed` + `state == Executed`. |
| Refuses to execute the same proposal twice | R2.11 | SUBSTANTIVE | `"Already executed"` pins `Consortium.sol:96`; note OZ would block it anyway with a different string, so this tests the project's own bookkeeping, not the safety property. |
| Cannot execute a decision the Consortium role is not authorized to carry out | R2.11 | SUBSTANTIVE | Bubbled `"No permission to approve"` + `approved == false`; genuinely exercises role 6 lacking bit 6. |

### `[R3.11] Adversarial paths around the optimistic safeguards`

| test | claimed req | verdict | reason |
|---|---|---|---|
| GUARD: the inherited Governor.execute() cannot bypass the veto or the challenge window | R3.11 | SUBSTANTIVE | Two distinct reasons in sequence + `validated == false` + `executed == false` + `state == Succeeded`. The single best adversarial test in the repository. |
| GUARD: an unchallenged proposal still executes through the inherited entry point | R3.11 | SUBSTANTIVE | Confirms the override did not break IGovernor conformance. |
| GUARD: relay() is not an independent execution path | R3.11 | SUBSTANTIVE | Real, but it asserts OpenZeppelin's `onlyGovernance` modifier, not project code. Cite as coverage of an attack path, not as evidence about the artifact's own design. |
| GAP: quorum is 0%, so a single voter carries a proposal for the whole consortium | R3.11 | SUBSTANTIVE | `quorum(snapshot) == 0` and one of three voters reaches `Succeeded`. A genuine negative finding. |

---

## 2. `test/ValidationCommitteeVoting.test.ts` (18)

Root describe: `ValidationCommittee - Collective Voting (R2.8, R2.10, R2.11)`

### `[R2.8] Proposal and voting rights`

| test | claimed req | verdict | reason |
|---|---|---|---|
| A Data_Validator holding permission 30 can put a decision to the committee | R2.8 | SUBSTANTIVE | Real proposal creation; event args unchecked. |
| A Member_Institution cannot put a decision to the committee | R2.8 | SHALLOW | Generic `canPropose` string. **Nothing in this file pins bit 30** — see Q2. |
| An address without any role cannot put a decision to the committee | R2.8 | SUBSTANTIVE | `"User cannot propose"` pins `Validation_Committee.sol:50`'s boolean. |
| Only holders of permission 31 can cast a vote | R2.8 | SHALLOW | Two reverts; the first is the generic string, the second the role-0 string. The name claims "permission 31" but bits 9, 30 and 31 are indistinguishable to this file. |
| Tallies for, against and abstain votes separately | R2.8 | SUBSTANTIVE | All three tallies + `hasVoted`. |
| Rejects a proposal that does not reach a majority | R2.8 | SUBSTANTIVE | Asserts `state == DEFEATED` *before* the execute revert, which is what distinguishes majority failure from every other cause. |
| Refuses execution while voting is still open | R2.8 | SHALLOW | Asserts only `"Governor: proposal not successful"`, which OZ emits for Pending, Active, Canceled, Defeated, Expired **and** Executed. State is not asserted, so the test cannot say *why* it failed. |

### `[R2.10] Quorum rules`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Derives the quorum from the voting power outstanding at the snapshot block | R2.10 | SHALLOW | `quorum(snapshot) == pastSupply * 34 / 100` re-derives the expectation with `GovernorVotesQuorumFraction`'s own formula. Only `pastSupply == 3e18` and `quorumNumerator == 34` are independent. |
| Defeats a proposal that has a majority but misses the quorum | R2.10 | SUBSTANTIVE | **Genuine quorum boundary.** 1e18 For, 0 Against: `_voteSucceeded` is true, so `DEFEATED` can only come from `_quorumReached` being false, and the test asserts `forVotes < quorum` explicitly. |
| Passes a proposal once the quorum is reached | R2.10 | SUBSTANTIVE | 2e18 >= 1.02e18 -> `SUCCEEDED`; the positive side of the same boundary. |
| Counts abstentions towards the quorum but not towards the majority | R2.10 | SUBSTANTIVE | For+abstain reaches quorum, For>Against holds -> `SUCCEEDED`. Isolates `GovernorCountingSimple._quorumReached`. |
| Defeats a proposal that reaches the quorum through abstentions alone | R2.10 | SUBSTANTIVE | Quorum met, `_voteSucceeded` false -> `DEFEATED`. Together with the two above this cleanly separates the two failure causes. |

### `[R2.11] The committee decision drives Validated -> Approved`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Approves the graph on behalf of the committee and attributes the event to it | R2.11 / R3.1 | SUBSTANTIVE | `RDFGraphApproved.withArgs(graphId, committeeAddress)` + `approved` + `state == EXECUTED`. Strongest R3.1 evidence in the suite. |
| Completes the full scenario: submit -> validate -> committee vote -> approve -> publish | R2.11 | SUBSTANTIVE | Genuine multi-contract path with a real vote; checks three state flags plus the publication event args. |
| Cannot execute the same committee decision twice | R2.11 | SHALLOW | Generic `"Governor: proposal not successful"`; no state assertion, so it cannot distinguish "second execution blocked" from any other non-Succeeded state. |
| A Data_Validator alone cannot perform the approval the committee votes on | R2.11 | SUBSTANTIVE | Role 4 genuinely lacks bit 6; unique reason string. |
| GAP: approveRDFGraph only checks permission 6, so a single institution can approve without any vote | — | SUBSTANTIVE | Negative finding, and the one that materially undercuts an unqualified R2.11 claim. |
| GAP: the submitting institution can also validate and approve its own graph | — | SUBSTANTIVE | Negative finding: separation of duties is not enforced on-chain. |

---

## 3. `test/RDFGraphLifecycleValidation.test.ts` (20)

Root describe: `GADataValidation - Validation Semantics and Re-processing (R2.5-R2.7, R2.12-R2.14)`

### `[R2.7] Syntax and semantic validation are recorded separately`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Marks a graph valid only when both N3 syntax and SHACL semantics pass | R2.7 | SUBSTANTIVE | Event `withArgs` + all four `getValidationDetails` fields. **But the name overstates:** the `(syntax=false, semantic=true)` case is never tested, so the "only when both" conjunction is demonstrated in one direction only (see Q2). |
| Keeps a syntactically valid but semantically invalid graph out of the validated state | R2.7 | SUBSTANTIVE | Four fields incl. the error string. |
| Records a syntax failure without claiming semantic validity | R2.7 | SUBSTANTIVE | Thin: with input `(false,false)` the second half of the claim is satisfied by the input, not by the contract. |
| Lets a re-validation clear a previously recorded failure | R2.7 | SUBSTANTIVE | Overwrite semantics of `validationErrors` and `validated`. |
| Requires permission 4 to record a detailed validation result | R2.7 | SUBSTANTIVE | Actor is MFSSIA_Guardian (bits 11-14, 18, 20, 23, 24) — genuinely lacks bit 4. |
| Rejects a detailed validation result for a graph that was never submitted | R2.7 | SUBSTANTIVE | Unique `"Graph does not exist"`. |
| Overwrites the coarse markRDFGraphValidated result with the detailed one | R2.7 | SUBSTANTIVE | true -> false transition observed through `getGraphStatus`. |
| GAP: approval and publication only check syntaxValid, so a SHACL failure reaches the DKG | R2.7 | SUBSTANTIVE | Negative finding; drives a graph with `validated == false` all the way to `published == true`. |

### `[R2.5/R2.6] Re-processing a dataset after an NLP model change`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Assigns an incremented version to the re-processed graph and keeps its model version | R2.5/R2.6 | SUBSTANTIVE | `version` is contract-derived (`datasetGraphs[key].length + 1`), not caller-supplied. |
| Starts the re-processed version in the Created state instead of inheriting the previous approval | R2.5 | SUBSTANTIVE | Four status flags on a fresh graph after a fully published predecessor. |
| Forces the re-processed version through validation and approval before publication | R2.5/R2.6 | SUBSTANTIVE | The best ordering test in the repository: two negative orderings with distinct reasons, then the correct order succeeding. |
| Keeps both versions addressable for lineage reconstruction | R2.5 / R3.2 | SUBSTANTIVE | Checks list length *and* both ids in order, plus submitter and timestamp. |
| GAP: publishing the new version leaves the superseded one published as well | R2.13 | SUBSTANTIVE | Negative finding: no deprecation of the superseded version. |

### `[R2.12] On-chain / off-chain correspondence`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Stores the content hash submitted with the graph | R2.12 | SHALLOW | Reads back the exact `bytes32` the test passed to `submitRDFGraph`. A storage round-trip. **No hash is recomputed from content and compared**, so this is not evidence of hash-equality verification. See Q4. |
| GAP: the DKG asset UAL is stored verbatim and never checked against the graph hash | R2.12 | SUBSTANTIVE | Negative finding. |
| GAP: the same UAL can be attached to two different graphs | R2.12 | SUBSTANTIVE | Negative finding. |

### `[R2.13/R2.14/R3.6/R3.7] Lifecycle transitions the artifact does not implement`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Has no Published -> Deprecated transition (R2.13) | R2.13 | TAUTOLOGICAL | Filters the ethers ABI fragment list by `/deprecat/i` and asserts `[]`. No contract call, no state. It is a name-regex over the ABI, passing by construction. |
| Has no rollback or un-publish transition (R2.14, R3.6) | R2.14 / R3.6 | TAUTOLOGICAL | Same mechanism, `/rollback\|revert\|unpublish\|restore/i`. |
| Has no emergency override, suspension or pause entry point (R3.7) | R3.7 | TAUTOLOGICAL + MISLABELLED | Same mechanism. Also incomplete as a claim: `GADataValidation` inherits `Ownable` (`transferOwnership`, `renounceOwnership`) and `MKMPOL21` exposes `remove_ordinary_member` / `remove_institution`; none match the regex. |
| Cannot undo a publication once it is recorded | R2.14 / R3.6 | SHALLOW + MISLABELLED | Shows only that a *second* `markRDFGraphPublished` reverts `"Already published"` — idempotence of one setter, not absence of an undo path. The record is also **not** frozen: `markRDFGraphValidated(id,false)` still flips `validated`/`syntaxValid` on a published graph, which the test does not check. |

---

## 4. `test/RDFDocumentAttestation.test.ts` (19)

Root describe: `MKMPOL21 - Attested RDF Document Submission (R3.2, R3.3, R3.5)`

### `[R3.5] Challenge threshold`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Accepts a document that passed all nine MFSSIA challenges | R3.5 | SUBSTANTIVE | Both events `withArgs` + two stored fields. |
| Accepts a document at the 8 of 9 threshold | R3.5 | SUBSTANTIVE | Pins the `>= 8` boundary from above. |
| Records a document below the threshold as not validated instead of rejecting it | R3.5 | SUBSTANTIVE | Pins the boundary from below; also documents that sub-threshold documents are stored, not refused. |
| Records a document that passed no challenge at all | R3.5 | SUBSTANTIVE | Thin, redundant with the previous test. |
| Rejects a challenge count above the nine defined challenges | R3.5 | SUBSTANTIVE | Unique reason string. |

### `[R1.3/R3.5] Who may submit an attested document`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Allows the MKMPOL21 owner to submit | R1.3 | SUBSTANTIVE | Checks the stored `submitter`, exercising the explicit owner branch. |
| Rejects a Data_Validator | R1.3/R3.5 | SUBSTANTIVE | Real role, unique reason. |
| Rejects an Ordinary_User | R1.3/R3.5 | SUBSTANTIVE | As above. |
| Rejects an address without any role | R1.3/R3.5 | SUBSTANTIVE | As above. |
| Rejects an empty document hash or an empty attestation | R3.5 | SUBSTANTIVE | Two distinct reason strings in one test. |

### `[R3.2] Traceability of the submission record`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Stores submitter, timestamp, content hash and attestation together | R3.2 | SUBSTANTIVE | Four fields via the getter plus a cross-check against the public mapping. |
| Gives two submissions of the same content distinct identifiers | R3.2 | SUBSTANTIVE | Real consequence of `block.timestamp` in the id. Note it demonstrates that the id is *not* content-addressed — relevant if the paper claims content-addressing. |
| Returns an empty record for an unknown document id | R3.2 | SHALLOW | Asserts Solidity's default struct values for an unwritten mapping slot; cannot fail short of a storage-layout change. |

### `[R3.3] Attestation lifetime`

| test | claimed req | verdict | reason |
|---|---|---|---|
| Binds an attestation to the onboarded institution for one year | R3.3 | SUBSTANTIVE | Five assertions incl. `expiresAt`. Mild caveat: `expiresAt` is re-derived as `now + ONE_YEAR`, the contract's own arithmetic; the 365-day constant is however independently stated in the test. |
| Treats the attestation as invalid once the validity period elapses | R3.3 | SUBSTANTIVE | Time travel past expiry, two independent views agree. |
| Reports no attestation for an account that never onboarded through MFSSIA | R3.3 | SHALLOW | Default struct values again. |
| Rejects onboarding with an empty attestation | R3.3 | SUBSTANTIVE | Unique reason string. |
| GAP: submitRDFDocument never checks the submitter's attestation | R3.3 | SUBSTANTIVE | Negative finding; a fabricated UAL string is accepted and the document is marked validated. |
| GAP: an expired attestation does not stop further submissions | R3.3 | SUBSTANTIVE | Negative finding. |

**File-level caveat.** The header calls R3.3 "identity and attestation binding". What the file
actually demonstrates is that an attestation *string* is stored with a one-year expiry and is
never verified against anything, on-chain or off. The two GAP tests say so plainly. R3.3 must be
cited as "attestation record with expiry", never as "identity binding".

---

## 5. `test/GADataValidation.test.ts` (29)

Root describe: `GADataValidation - RDF Graph Registry`. No requirement IDs anywhere in this file.

### `Deployment` (2)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should deploy GADataValidation successfully | — | SHALLOW | Constructor round-trip of `pm`. |
| Should initialize counters to zero | — | SHALLOW | Asserts constructor-assigned zeros (also the storage default). |

### `submitRDFGraph` (7)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should allow institution to submit RDF graph | — | SHALLOW | Only that an `RDFGraphSubmitted` log exists (no args) plus `rdfGraphCount == 1`. |
| Should reject submission without permission 8 | — | SUBSTANTIVE | Actor is MFSSIA_Guardian, genuinely without bit 8. |
| Should reject submission with invalid hash | — | SUBSTANTIVE | Unique reason. |
| Should reject submission with empty URI | — | SUBSTANTIVE | Unique reason. |
| Should reject submission with invalid year | — | SUBSTANTIVE | Both bounds (1999, 2101). |
| Should auto-increment version for same dataset/year | — | SUBSTANTIVE | Contract-derived version 1 then 2. |
| Should prevent duplicate graph submissions | — | TAUTOLOGICAL + MISLABELLED | The body's own comment concedes the duplicate guard cannot be reached (the id embeds `block.timestamp`), submits a *different* hash instead, and asserts `tx.hash !== undefined`. The `"Graph already exists"` require is never exercised by anything in the suite. |

### `markRDFGraphValidated` (4)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should allow data validator to mark graph as validated | — | SUBSTANTIVE | Event `withArgs` + `validated == true`. |
| Should allow validator to mark graph as invalid | — | TAUTOLOGICAL | Asserts `validated == false` — which is also the value before the call. The assertion cannot distinguish "set to false" from "never touched"; deleting the write would not turn it red. |
| Should reject validation without permission 4 | — | SUBSTANTIVE | Genuine role without bit 4. |
| Should reject validation of non-existent graph | — | SUBSTANTIVE | Unique reason. |

### `approveRDFGraph` (5)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should allow committee to approve validated graph | — | SUBSTANTIVE | Event `withArgs` + `approved`. Note the actor is an **EOA** holding role 1031, not the `ValidationCommittee` contract; no vote occurs. |
| Should reject approval without permission 6 | — | SUBSTANTIVE | Genuine role without bit 6. |
| Should reject approval of non-validated graph | — | SUBSTANTIVE | Actor holds bit 6, so the state guard is genuinely the failing check. |
| Should reject approval of non-existent graph | — | SUBSTANTIVE | Unique reason, permission satisfied first. |
| Should reject double approval | — | SUBSTANTIVE | Unique reason. |

### `markRDFGraphPublished` (5)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should allow owner to mark graph as published | — | SUBSTANTIVE | Event `withArgs` + flag + stored UAL. |
| Should reject publication by a role other than Data_Validator or Owner | — | SUBSTANTIVE | Graph is already approved in `beforeEach`, so the role check is unambiguously the failing one. |
| Should reject publication of non-approved graph | — | SUBSTANTIVE | Distinct graph, validated but not approved. |
| Should reject publication with empty UAL | — | SUBSTANTIVE | Unique reason. |
| Should reject double publication | — | SUBSTANTIVE | Unique reason. |

### `View Functions` (5)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should return basic graph info | — | SHALLOW | Five of six fields are the caller's own inputs read back; only `version` is derived. |
| Should return graph metadata | — | SHALLOW | Round-trip; `submittedAt > 0` is the only non-input assertion. |
| Should return graph status | — | SUBSTANTIVE | Walks all four lifecycle states, asserting after each transition. |
| Should check if graph is ready for publication | — | SUBSTANTIVE | Four-point transition of a derived predicate, including the post-publication flip back to false. |
| Should return all graphs for dataset/year | — | SHALLOW | Asserts `length == 3` only; no ids, no order. |

### `End-to-End Workflow` (1)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should complete full governance workflow | — | MISLABELLED | No governance body participates: `committee` and `owner` are EOAs invoking `approveRDFGraph`/`markRDFGraphPublished` directly on their permission bits. It is a happy-path state walk that duplicates "Should return graph status". Calling it a *governance* workflow is the misnomer. |

---

## 6. `test/BDIAgentIntegration.test.ts` (20)

Root describe: `BDI Agent Integration`. No requirement IDs anywhere in this file.
Note the `beforeEach` grants bits 4, 8 and 6 to roles that already hold them by default, which
neutralises several assertions below.

### `Agent Role Verification` (4)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Coordinator should have MFSSIA_Guardian_Agent role (index 2) | — | SHALLOW | Reads back the role value the same `beforeEach` assigned. Would fail only if `assignRole` itself broke; says nothing about agents. |
| Syntax Validator should have Data_Validator role (index 4) | — | SHALLOW | As above. |
| Semantic Validator should have Data_Validator role (index 4) | — | SHALLOW | As above. |
| DAO Submitter should have Member_Institution role (index 0) | — | SHALLOW | As above. |

### `Agent Permission Verification` (5)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Syntax Validator should have permission 4 (VALIDATE_RDF) | — | TAUTOLOGICAL | The `beforeEach` executes `grantPermission(DATA_VALIDATOR, 4)`; the test then asserts bit 4 is set. It restates the grant it performed and cannot evidence the constructor's role model. |
| Semantic Validator should have permission 4 (VALIDATE_RDF) | — | TAUTOLOGICAL | Same. |
| DAO Submitter should have permission 8 (SUBMIT_RDF) | — | TAUTOLOGICAL | `beforeEach` grants bit 8 to Member_Institution. Same. |
| Coordinator should NOT have permission 4 | — | SUBSTANTIVE | Nothing grants bit 4 to role index 2; a genuine negative. |
| Syntax Validator permission 8 status reflects contract defaults | — | TAUTOLOGICAL | Asserts `typeof hasPermission === "boolean"`. Cannot fail for any contract behaviour whatsoever. |

### `DAO Submitter Agent - Graph Submission` (2)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should submit RDF graph successfully | — | SHALLOW | Event fired (args unchecked) + counter. |
| Should handle submission from Syntax Validator based on contract defaults | — | TAUTOLOGICAL | Reads `has_permission` and then branches to whichever assertion that read implies. Both branches pass by construction; the test cannot fail. |

### `Syntax Validator Agent - RDF Validation` (4)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should validate graph successfully (isValid=true) | — | SUBSTANTIVE | Event `withArgs` incl. validator address + three status flags. |
| Should mark graph as invalid (isValid=false) | — | SHALLOW | Event args only; never checks that `validated` is false (which it already was). |
| Should handle validation from DAO Submitter based on contract defaults | — | TAUTOLOGICAL | Same self-selecting if/else as above. |
| Semantic Validator should also be able to validate | — | SUBSTANTIVE | Event `withArgs` for a second Data_Validator; thin but real. |

### `Full Validation Pipeline` (1)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should complete end-to-end agent validation workflow | — | SHALLOW | Steps 1-3 are real. Step 4 is captioned "Simulating Validation Committee approval" but is executed by `owner`, who holds **all 34 permission bits and role index 5**; step 5 likewise. The authorization semantics of the approval and publication steps are vacuous — see Q6. Also emits 20+ `console.log` lines into the test output. |

### `Agent Coordination via Events` (2)

| test | claimed req | verdict | reason |
|---|---|---|---|
| RDFGraphSubmitted event includes all required data for Coordinator | — | MISLABELLED | The name claims the payload is complete; the body asserts only that the event fired and then describes the intended payload **in a comment**. Not one argument is checked. |
| RDFGraphValidated event includes validator address for tracking | — | SUBSTANTIVE | Actually checks `withArgs(graphId, true, syntaxAgent.address)`. |

### `Error Handling` (2)

| test | claimed req | verdict | reason |
|---|---|---|---|
| Should reject validation of non-existent graph | — | SUBSTANTIVE | Unique reason, permission satisfied. |
| Should reject approval of non-validated graph | — | SUBSTANTIVE | Deliberately grants the actor bit 6 first so the *state* guard is the failing check rather than the permission check. This is the correct pattern and the only place in the suite where it is done explicitly. |

---

## 7. `test/OnboardingIntegration.test.ts` (21)

Root describe: `MKMPOL21 Onboarding Integration`. No requirement IDs.

| describe | test | verdict | reason |
|---|---|---|---|
| onboard_ordinary_user() | New user without role can self-onboard as Ordinary_User | SUBSTANTIVE | Pre-state, event `withArgs`, post-state. |
| onboard_ordinary_user() | User who already has a role cannot call onboard_ordinary_user() | SUBSTANTIVE | Unique reason. |
| onboard_ordinary_user() | Owner cannot call onboard_ordinary_user() (already has role) | SUBSTANTIVE | Unique reason; also confirms the deployer's role. |
| onboard_ordinary_user() | Multiple different users can each self-onboard | SUBSTANTIVE | Thin; duplicates the first test twice. |
| onboard_institution() | New user without role can self-onboard as Member_Institution | SUBSTANTIVE | As above. |
| onboard_institution() | User who already has a role cannot call onboard_institution() | SUBSTANTIVE | Unique reason. |
| onboard_institution() | Multiple different institutions can each self-onboard | SUBSTANTIVE | Thin duplicate. |
| ..._with_attestation() | New user can self-onboard with attestation | SUBSTANTIVE | Role + stored UAL + `verified`. `AttestationVerified` args unchecked. |
| ..._with_attestation() | Cannot onboard with empty attestation | SUBSTANTIVE | Unique reason. |
| ..._with_attestation() | User who already has a role cannot call ..._with_attestation() | SUBSTANTIVE | Unique reason. |
| ..._with_attestation() | Attestation should be valid after onboarding | SUBSTANTIVE | Thin; subset of the first test in the block. |
| institution ..._with_attestation() | New institution can self-onboard with attestation | SUBSTANTIVE | As above. |
| institution ..._with_attestation() | Cannot onboard with empty attestation | SUBSTANTIVE | Unique reason. |
| Dashboard Role Check Simulation | hasRole returns 0 for users without role | SHALLOW | Default mapping value; cannot fail. |
| Dashboard Role Check Simulation | hasRole returns correct role value after self-onboarding as user | SUBSTANTIVE | Duplicate of an earlier test. |
| Dashboard Role Check Simulation | hasRole returns correct role value after self-onboarding as institution | SUBSTANTIVE | Duplicate. |
| Dashboard Role Check Simulation | Role index extraction works correctly for dashboard display | TAUTOLOGICAL | The `& 31` masking is performed **in JavaScript**, on a value the test just caused to be written. The contract does no extraction here. |
| Full Onboarding Flow Integration | Complete user onboarding flow simulation | SUBSTANTIVE | Real path. **Warning:** the inline comment asserting Ordinary_User's bits ("1, 3, 9, 13, 16, 17, 33, 34") is wrong — the actual bits are 1, 3, 22, 32, 33. Only bit 1 is asserted, so the error is invisible to the runner but quotable by a reader. |
| Full Onboarding Flow Integration | Complete institution onboarding flow simulation | SUBSTANTIVE | Duplicate of the institution attestation test. |
| Cross-Role Prevention | User who onboarded as Ordinary_User cannot also onboard as Institution | SUBSTANTIVE | Unique reason. |
| Cross-Role Prevention | Institution who onboarded cannot also onboard as Ordinary_User | SUBSTANTIVE | Unique reason. |

**File-level caveat.** Every onboarding path in this file is *self-service and unverified*:
`MKMPOL21.onboard_*` carries the literal comment `// TODO: Add MFSSIA verification check here`.
The attestation variants store whatever string the caller supplies. Nothing here is evidence of
attestation-gated admission; it is evidence of open self-assignment of governance roles.

---

## 8. `test/MKMPOL21.ts` (72)

Root describe: `MKMPOL21 Permission System`. No requirement IDs.
**Structural finding:** two whole describe blocks (`Role Encoding Verification`, `Permission
Initialization`) and 12 of 13 tests in `Control Relations` make **no contract call at all** —
they compute over the test file's own `ROLES` / `EXPECTED_PERMISSIONS` constants using helper
functions that re-implement the contract's bit arithmetic. 24 of 72 tests in this file are inert
in that sense.

**Proof that this block is inert:** the file's `EXPECTED_PERMISSIONS.DATA_VALIDATOR` is
`16915628938n`, but `MKMPOL21.sol:84` sets `16915628954n` (bit 4 was added). The constant has
been wrong since bit 4 was introduced and no test noticed, because no test in the
`Permission Initialization` block ever reads the contract.

### `Deployment and Initialization` (4)

| test | verdict | reason |
|---|---|---|
| Should assign MKMPOL21Owner role to deployer | SUBSTANTIVE | Contract read of constructor effect. |
| Should correctly encode MKMPOL21Owner role with index 5 | TAUTOLOGICAL | Pure JS: `1029 & 31 === 5`. |
| Should correctly encode control bitmask for MKMPOL21Owner (only self-controlled) | TAUTOLOGICAL | Pure JS: `1029 >> 5 === 32`. |
| Should have no role assigned to random addresses | SHALLOW | Default mapping value. |

### `Role Encoding Verification` (7) — all TAUTOLOGICAL

| test | verdict | reason |
|---|---|---|
| Should correctly encode all role indices (0-8) | TAUTOLOGICAL | Iterates the test's own `ROLES` object; no contract call. |
| Should correctly encode Member_Institution (index 0, control: 100100) | TAUTOLOGICAL | Pure JS on `1152`. |
| Should correctly encode Ordinary_User (index 1, control: 100100) | TAUTOLOGICAL | Pure JS on `1153`. |
| Should correctly encode MFSSIA_Guardian_Agent (index 2, control: 1100000) | TAUTOLOGICAL | Pure JS on `3074`. |
| Should correctly encode Eliza_Data_Extractor_Agent (index 3, control: 1100000) | TAUTOLOGICAL | Pure JS on `3075`. |
| Should correctly encode Data_Validator (index 4, control: 100100) | TAUTOLOGICAL | Pure JS on `1156`. |
| Should correctly encode committee roles with control bitmask 100000 | TAUTOLOGICAL | Pure JS on `1030/1031/1032`. |

### `Control Relations` (13)

| test | verdict | reason |
|---|---|---|
| MKMPOL21Owner can control Member_Institution (index 5 controls index 0) | TAUTOLOGICAL | Uses the test's own `canControl` helper, which re-implements `MKMPOL21.canControl` line for line. |
| MKMPOL21Owner can control Ordinary_User | TAUTOLOGICAL | Same helper. |
| MKMPOL21Owner can control Data_Validator | TAUTOLOGICAL | Same helper. |
| MKMPOL21Owner can control MFSSIA_Guardian_Agent | TAUTOLOGICAL | Same helper. |
| MKMPOL21Owner can control Eliza_Data_Extractor_Agent | TAUTOLOGICAL | Same helper. |
| MKMPOL21Owner can control itself | TAUTOLOGICAL | Same helper. |
| MKMPOL21Owner can control committee roles | TAUTOLOGICAL | Same helper. |
| Consortium (index 6) can control MFSSIA_Guardian_Agent | TAUTOLOGICAL | Same helper. |
| Consortium (index 6) can control Eliza_Data_Extractor_Agent | TAUTOLOGICAL | Same helper. |
| Data_Validator (index 4) cannot control Member_Institution | TAUTOLOGICAL | Same helper. |
| Member_Institution (index 0) cannot control MKMPOL21Owner | TAUTOLOGICAL | Same helper. |
| Ordinary_User (index 1) cannot control any role | TAUTOLOGICAL + MISLABELLED | Same helper; and "any role" is 3 of the 9 roles. |
| Contract canControl function matches expected behavior | SUBSTANTIVE | The only one that calls `mkmpol21.canControl`. Four pairs, hardcoded expectations. |

### `Permission Initialization` (5) — all TAUTOLOGICAL

| test | verdict | reason |
|---|---|---|
| Member_Institution should have correct permissions (999999999) | TAUTOLOGICAL | `hasPermissionBit(999999999n, 0..2)` — pure JS on a literal that is never compared to the contract. |
| MKMPOL21Owner should have maximum permissions (17179869183) | TAUTOLOGICAL | Pure JS bit loop over a literal. |
| Dispute_Resolution_Board should have minimal permissions (5) | TAUTOLOGICAL | Pure JS on `5n`. |
| Validation_Committee should have permissions (1088) | TAUTOLOGICAL | Pure JS on `1088n`. |
| Eliza_Data_Extractor_Agent should have permissions (229376) | TAUTOLOGICAL | Pure JS on `229376n`. |

### `has_permission Function` (4)

| test | verdict | reason |
|---|---|---|
| Owner should have permission 0 | SUBSTANTIVE | Thin contract read. |
| Owner should have permission 18 (onboard_ordinary_user) | SUBSTANTIVE + MISLABELLED | The read is real, but `onboard_ordinary_user` is gated on "caller has no role", not on permission 18. The parenthetical is wrong. |
| Owner should have permission 27 (distribute_MKMT) | SUBSTANTIVE | Thin contract read. |
| User without role should not have any permissions | TAUTOLOGICAL + MISLABELLED | The body asserts **only** `hasRole == 0` and never calls `has_permission`. Worse, the inline comment then states the opposite of the title ("This means they get Member_Institution permissions"). Nothing here tests the claim in the name. |

### `Role Assignment` (7)

| test | verdict | reason |
|---|---|---|
| Owner can assign Member_Institution role | SUBSTANTIVE | Event `withArgs` + storage read. |
| Owner can assign Ordinary_User role | SUBSTANTIVE | Thin; storage read only. |
| Owner can assign Data_Validator role | SUBSTANTIVE | Thin. |
| Owner can assign MFSSIA_Guardian_Agent role | SUBSTANTIVE | Thin. |
| Non-owner cannot assign roles | SHALLOW | The actor holds role **0**, so what is shown is "an unroled account cannot assign", not "a non-owner cannot". The reason string is the one shared `controlledBy` message covering three distinct clauses. |
| Cannot assign role to zero address | SUBSTANTIVE | Unique reason, reached past the modifier. |
| Cannot assign invalid role index (>= 9) | SHALLOW | Same shared `controlledBy` message; the test cannot show that the *index-bound* clause fired rather than a control-relation clause. |

### `Role Revocation` (3)

| test | verdict | reason |
|---|---|---|
| Owner can revoke Member_Institution role | SUBSTANTIVE | Event `withArgs` + `hasRole == 0`. |
| Cannot revoke role that user doesn't have | SUBSTANTIVE | Unique reason. |
| Non-owner cannot revoke roles | SHALLOW | Actor holds role 0; shared reason string. |

### `Committee Initialization` (4)

| test | verdict | reason |
|---|---|---|
| Owner can initialize committees | SUBSTANTIVE | Three storage reads confirming indices 6, 7, 8. |
| Cannot initialize committees twice | SUBSTANTIVE | Reason `"Invalid committee initialization"` is shared with the zero-address clauses of the same `require`, but the setup makes the cause unambiguous. |
| Non-owner cannot initialize committees | SUBSTANTIVE | Unique reason. |
| Cannot initialize with zero addresses | SUBSTANTIVE | Three cases; same shared string, unambiguous here. |

### `Permission Granting` (3)

| test | verdict | reason |
|---|---|---|
| Owner can grant permission to controlled role | SHALLOW | Asserts only the `PermissionGranted` event. Never checks that bit 33 was actually written to `role_permissions[0]`. Actor holds all bits, so both guards are trivially satisfied. |
| Cannot grant permission user doesn't have | SUBSTANTIVE | DRB genuinely lacks bit 5. |
| Cannot grant permission to role user cannot control | SUBSTANTIVE | Well constructed: the comment explains that permission 4 was chosen precisely so the `hasPermission` modifier does not mask the control-relation check. |

### `Permission Revoking` (2)

| test | verdict | reason |
|---|---|---|
| Owner can revoke permission from controlled role | SHALLOW | Event only; never checks that bit 0 was cleared from Member_Institution. |
| Cannot revoke permission user doesn't have | SUBSTANTIVE | DRB genuinely lacks bit 5. |

There is **no** test of `revokePermission`'s control-relation guard (`MKMPOL21.sol:142`).

### `canVote and canPropose Functions` (4)

| test | verdict | reason |
|---|---|---|
| User with correct permission can vote | SUBSTANTIVE | Thin. |
| User without permission cannot vote | SUBSTANTIVE | Unique reason. |
| User with correct permission can propose | SUBSTANTIVE | Thin. |
| User without permission cannot propose | SUBSTANTIVE | Unique reason. |

None of these covers the `roles[user] == 0 -> return false` branch; that branch is covered only
indirectly, in the Consortium and ValidationCommittee files.

### `Permission-Gated Functions` (12)

| test | verdict | reason |
|---|---|---|
| An account without a role can self-onboard as Ordinary_User | SUBSTANTIVE | Not-reverted + storage read. |
| An account that already holds a role cannot call onboard_ordinary_user | SUBSTANTIVE | Unique reason. |
| An account without a role can self-onboard as Member_Institution | SUBSTANTIVE | Not-reverted + storage read. |
| The owner cannot self-onboard, since it already holds MKMPOL21Owner | SUBSTANTIVE | Unique reason. |
| Owner can call remove_ordinary_member (permission 20) | TAUTOLOGICAL | **The function body is empty.** Asserts only that a no-op does not revert when called by an account holding all 34 bits. |
| Owner can call remove_institution (permission 21) | TAUTOLOGICAL | Same. |
| Owner can call submit_query_to_eliza_agent (permission 22) | TAUTOLOGICAL | Same. |
| Owner can call Issue_DID (permission 23) | TAUTOLOGICAL | Same. |
| Owner can call Burn_DID (permission 24) | TAUTOLOGICAL | Same. |
| Owner can call mint_MKMT (permission 25) | TAUTOLOGICAL | Same. |
| Owner can call burn_MKMT (permission 26) | TAUTOLOGICAL | Same. |
| Owner can call distribute_MKMT (permission 27) | TAUTOLOGICAL | Same. |

No negative counterpart exists for any of the eight, so the `hasPermission(msg.sender, 20..27)`
modifiers are never exercised as guards — see Q2 and Q6.

### `Edge Cases and Security` (4)

| test | verdict | reason |
|---|---|---|
| Role value 0 maps to index 0 (Member_Institution permissions) | TAUTOLOGICAL + MISLABELLED | Body asserts only `hasRole == 0`; the titular claim is never tested, and it is *false* for `has_permission`, which short-circuits role 0 to `false` (`MKMPOL21.sol:156-158`). It remains true for the internal `hasPermission` modifier — but nothing here shows either. |
| Maximum valid role index is 8 | MISLABELLED | Assigns and revokes indices 0, 1, 4 and 2 only. Neither index 8 nor index 9 is ever touched. |
| Reassigning role overwrites previous role | SUBSTANTIVE | Two contract reads across an overwrite. |
| Control relation is symmetric for certain roles | TAUTOLOGICAL + MISLABELLED | Pure JS `36 === 36`. "Symmetric" is also the wrong word for "two roles share a control bitmask". |

---

# Answers to the seven questions

## Q1. Reverts without a reason, or with a reason a different failure could produce

**(a) No reason string at all — 1 site**

- `ConsortiumOptimisticGovernance.test.ts:170`, inside *"Delegating permission 28 to a role…"*:
  `await expect(consortium.connect(ordinary).propose(...)).to.be.reverted;`
  Any revert satisfies it — an out-of-gas, a bad `targets` array, a compile-level ABI mismatch.
  The test as a whole is still SUBSTANTIVE because the *positive* half (grant 28, then propose
  succeeds) carries the evidence.

**(b) Reason strings that a different failure produces**

1. **The generic permission string.** `"User does not have this permission"` is emitted by
   `MKMPOL21.canVote:479` / `canPropose:488` for *any* missing bit. Four tests rest on it:
   - Consortium *"A role that lacks permission 28 cannot open a proposal"*
   - Consortium *"A role without permission 29 cannot veto"*
   - ValidationCommittee *"A Member_Institution cannot put a decision to the committee"*
   - ValidationCommittee *"Only holders of permission 31 can cast a vote"*

   For the Consortium the specific bits are nevertheless pinned by the sibling grant/revoke tests.
   **For the ValidationCommittee they are not** (Q2). So the two committee tests name a permission
   index that no test in the suite demonstrates.

2. **`"Governor: proposal not successful"`** (OZ `Governor.sol:332`) covers `Pending`, `Active`,
   `Canceled`, `Defeated`, `Expired` **and** `Executed`. Three tests assert it:
   - *"Rejects a proposal that does not reach a majority"* — **safe**, it asserts `state == DEFEATED` first.
   - *"Refuses execution while voting is still open"* — **not** disambiguated.
   - *"Cannot execute the same committee decision twice"* — **not** disambiguated; it cannot tell
     "blocked because already executed" from "was never Succeeded in the first place".

3. **`"the given controller can't perform the given operation on the given controlled one"`**
   is a single `require` in `MKMPOL21.controlledBy` covering three distinct clauses (role-index
   bound, sender-vs-user control, sender-vs-target control). Three tests rest on it and none can
   say which clause fired: *"Non-owner cannot assign roles"*, *"Cannot assign invalid role index
   (>= 9)"*, *"Non-owner cannot revoke roles"*. In the first and third the acting account holds
   role **0**, so the "non-owner" framing actually exercises "no role at all".

4. **`"Invalid committee initialization"`** is one `require` covering the re-initialisation flag
   and three zero-address checks. *"Cannot initialize committees twice"* and *"Cannot initialize
   with zero addresses"* share it. Setup disambiguates both, so this is a naming risk, not a
   correctness risk.

5. **Self-declared masking.** Consortium *"Vetoing an unknown proposal is rejected by the window
   check, not by an existence check"* is *about* a masked reason: `proposals[unknown].creationTime
   == 0` makes `"Challenge period expired"` fire for a proposal that does not exist. The test is
   honest and correctly named; do not cite it as evidence of a temporal constraint.

**(c) Access control masking a state guard.** I found **no** instance where an access-control
revert silently stands in for the state guard under test. The two places where the risk is real
are handled correctly: BDI *"Should reject approval of non-validated graph"* explicitly grants the
actor permission 6 first, and GADataValidation *"Should reject publication by a role other than
Data_Validator or Owner"* runs against an already-approved graph so no state guard can fire.
`MKMPOL21.ts` *"Cannot grant permission to role user cannot control"* documents the same
discipline in a comment. Treat those three as the house style; they are not followed elsewhere.

## Q2. Contract lines removable without turning any test red

Reasoned statically; I did not modify contracts. Line numbers are current.

**Guards no test reaches at all**

| line | code | why it stays green |
|---|---|---|
| `_data_validation.sol:113` | `require(permission_manager != address(0), "pm is zero");` | No test constructs `GADataValidation` with a zero PM. |
| `_data_validation.sol:114` | `require(dao_manager != address(0), "dm is zero");` | Same; `dao_manager` is also a dead parameter — it is never stored or used. |
| `_data_validation.sol:124` | `require(newPm != address(0), "new pm is zero");` | `setPermissionManager` is never called by any test. |
| `_data_validation.sol:269` | `require(rdfGraphRegistry[graphId].submittedAt == 0, "Graph already exists");` | The id embeds `block.timestamp` and `msg.sender`; two submissions in one block from one sender with identical arguments never occur. The test named *"Should prevent duplicate graph submissions"* concedes this in its own comment and asserts `tx.hash !== undefined` instead. |
| `MKMPOL21.sol:142` | `require(canControl(roles[msg.sender], _role), "cannot revoke permission, …");` | No test revokes a permission from a role the caller cannot control. (The `grantPermission` twin at line 133 *is* covered.) |
| `MKMPOL21.sol:362, 367, 372, 377, 382, 387, 392, 397` | the eight `hasPermission(msg.sender, 20..27)` modifiers | Every call site is `owner`, who holds all 34 bits, and there is no negative test for any of the eight. |
| `_data_validation.sol:140-142, 162-164, 176-177, 193-195, 208-209, 225-226` | all guards on the legacy data-point functions | No test calls `submit_data_point_inclusion_proposal`, `Reject_data_point`, `edit_data_point_inclusion_proposal`, `add_metadata` or `inspect_data_point`. Only `sessionCount()` is read. |

**Guards a test *names* but does not pin**

| line | code | why it stays green |
|---|---|---|
| `MKMPOL21.sol:156-158` | `if (roles[user] == 0) { return false; }` in `has_permission` | **No test anywhere calls `has_permission` with a role-0 address.** The test literally named *"User without role should not have any permissions"* asserts only `hasRole == 0`. Removing the guard would let an unroled account read Member_Institution's bits (0-8, 11, 14, …) as its own, and the suite stays green. This is the single most consequential deletable line: it is the guard the paper would most want to cite. Note the sibling guards in `canVote:476` / `canPropose:485` **are** pinned, by the `"User cannot propose"` / `"User cannot vote"` tests. |
| `_data_validation.sol:452` | the `graph.syntaxValid &&` conjunct in `isReadyForPublication` | Every test that observes `isReadyForPublication == true` has already approved the graph, and approval already required `syntaxValid` at approval time. No test invalidates a graph after approval, so the conjunct is redundant to the suite. |

**Assertions that can be *weakened* rather than removed**

| line | change | why it stays green |
|---|---|---|
| `_data_validation.sol:346` | `validated = _syntaxValid && _semanticValid;` -> `validated = _semanticValid;` | The R2.7 block tests `(T,T)`, `(T,F)` and `(F,F)` only. **`(syntax=false, semantic=true)` is never tested**, so the conjunction is demonstrated in one direction only — despite the test named *"Marks a graph valid only when both N3 syntax and SHACL semantics pass"*. |
| `Validation_Committee.sol:40` and `:50` | swap the literals `31` and `30` (or set either to `9`) | Data_Validator holds 9, 30 and 31; Member_Institution and Ordinary_User hold none of the three; the outsider has role 0. Every test in `ValidationCommitteeVoting.test.ts` behaves identically. **The mapping "30 = propose, 31 = vote" asserted in that file's header is not demonstrated by any test.** |
| `Consortium.sol:61` and `:75` | — | **Not** weakenable. `28` is pinned by *"Delegating permission 28 …"* (grants literal 28, propose then works) and `29` by *"Revoking permission 29 …"* (revokes literal 29, veto then fails). This is a genuine strength of the Consortium file and the model the committee file should follow. |

## Q3. Is transition ORDER enforced, or only exercised in the right order?

The artifact has **no state machine.** `RDFGraph` carries independent booleans and the only
ordering constraints in the whole contract are four one-directional flag guards:

- `approveRDFGraph` requires `syntaxValid` (`_data_validation.sol:359`) — note: **`syntaxValid`, not `validated`**
- `approveRDFGraph` requires `!committeeApproved` (`:360`)
- `markRDFGraphPublished` requires `committeeApproved` (`:378`)
- `markRDFGraphPublished` requires `!publishedToDKG` (`:379`)

Nothing forbids a backward or repeated transition of the *validation* flags at any point.

**Negative ordering cases that ARE tested**

| case | where |
|---|---|
| approve before any validation -> `"Graph must pass syntax validation first"` | GADataValidation *"Should reject approval of non-validated graph"*; BDI *"Should reject approval of non-validated graph"*; RDFGraphLifecycle *"Forces the re-processed version…"* |
| publish before approval -> `"Graph must be approved first"` | GADataValidation *"Should reject publication of non-approved graph"*; RDFGraphLifecycle *"Forces the re-processed version…"* |
| submit then publish, skipping both middle steps | RDFGraphLifecycle *"Forces the re-processed version…"* (publish attempted on a freshly submitted graph) |
| approve twice -> `"Already approved"` | GADataValidation *"Should reject double approval"* |
| publish twice -> `"Already published"` | GADataValidation *"Should reject double publication"*; RDFGraphLifecycle *"Cannot undo a publication…"* |
| act on a graph that was never submitted -> `"Graph does not exist"` | GADataValidation (validate, approve); BDI (validate); RDFGraphLifecycle (validate-with-details) |
| a new version does not inherit the predecessor's approval | RDFGraphLifecycle *"Starts the re-processed version in the Created state…"* |

**Negative ordering cases that are NOT tested — and are NOT enforced**

| case | status |
|---|---|
| re-validate **after** approval (`markRDFGraphValidated(id,false)` on an approved graph) | not tested, not guarded; `committeeApproved` is not revoked |
| re-validate **after** publication | not tested, not guarded; `validated` / `syntaxValid` / `validationErrors` remain writable on a published graph, which directly weakens the *"Cannot undo a publication"* claim |
| approve a graph explicitly marked invalid (`markRDFGraphValidated(id,false)` then approve) | not tested; would revert, so this is a missing *positive-for-the-guard* case |
| approve with `syntaxValid == true` but `validated == false` | tested — and shown to **succeed** (RDFGraphLifecycle *"GAP: approval and publication only check syntaxValid…"*). This is a documented hole, not a guard |
| un-approve / un-publish / deprecate / roll back | no such function exists (Q4) |
| a governance body acting out of order (e.g. Consortium executing `markRDFGraphValidated` on an already-published graph) | not tested, not guarded |
| ordering **between** the two governance bodies (Consortium validate then Committee approve, in one scenario) | never tested in a single run; the two files each use only their own body |

**Verdict.** The order is enforced only for the two forward edges `validated -> approved` and
`approved -> published`, plus idempotence on approve and publish. Everything else — backward
edges, post-publication mutation, cross-body sequencing — is neither enforced nor tested. A claim
that the artifact "enforces the lifecycle order" is supportable only for those two edges, and only
if `syntaxValid` (not overall `validated`) is what the paper means by "validated".

## Q4. R2.12, R2.13, R2.14 in `RDFGraphLifecycleValidation.test.ts`

**R2.12 — "on-chain / off-chain hash equality (Section IV-D)".** No hash equality is verified
anywhere. The three tests under `[R2.12]` assert:

1. *"Stores the content hash submitted with the graph"* — `getRDFGraphBasicInfo(graphId).graphHash`
   equals the `bytes32` the test itself passed to `submitRDFGraph`. This is a **getter round-trip**.
   The contract never recomputes a hash, never receives content, and never compares anything.
2. *"GAP: the DKG asset UAL is stored verbatim and never checked against the graph hash"* — asserts
   that `"not-a-ual"` is accepted and stored.
3. *"GAP: the same UAL can be attached to two different graphs"* — asserts that a UAL already bound
   to one graph is accepted for a second.

Tests 2 and 3 are honest negative evidence: they demonstrate the *absence* of on-chain/off-chain
correspondence. Test 1's name is neutral, but the **describe path `[R2.12] On-chain / off-chain
correspondence` and the file header's "R2.12 on-chain / off-chain hash equality" overstate what is
demonstrated.** Nothing in this file supports R2.12 being satisfied; two thirds of the block
actively documents that it is not.

**R2.13 (Published -> Deprecated) and R2.14 (rollback).** No such contract functions exist —
correct. The three tests assert over `contract.interface.fragments`, i.e. the compiled **ABI's
function-name list**, filtered by a regular expression, expecting `[]`:

- `/deprecat/i` -> `[]`  (R2.13)
- `/rollback\|revert\|unpublish\|restore/i` -> `[]`  (R2.14, R3.6)
- `/emergency\|suspend\|pause\|freeze/i` over both contracts -> `[]`  (R3.7)

These assert the **absence of an identifier pattern**, not the absence of a capability. They cannot
fail for any behavioural reason, and they would not catch a differently-named implementation
(`retireGraph`, `setLifecycleState(uint8)`, an owner-only `selfdestruct`-style escape). The R3.7
one is additionally incomplete: `GADataValidation` inherits `Ownable` and therefore exposes
`transferOwnership` and `renounceOwnership`, and `MKMPOL21` exposes `remove_ordinary_member` /
`remove_institution`; none match the regex, yet all are emergency-adjacent controls.

The fourth test, *"Cannot undo a publication once it is recorded"*, is the only behavioural one:
it shows a second `markRDFGraphPublished` reverts `"Already published"`. **Its name overstates.**
It demonstrates idempotence of one setter. It does not show the record is immutable — after
publication, `markRDFGraphValidated` and `markRDFGraphValidatedWithDetails` remain callable and can
flip `validated`, `syntaxValid` and `validationErrors` on a published graph. The test does not
check that.

**Bottom line for the paper.** The file's header lists R2.12, R2.13 and R2.14 among "requirements
that were implemented but previously untested". That framing is wrong for all three: R2.13 and
R2.14 are unimplemented (the tests say so, in a describe block titled "Lifecycle transitions the
artifact does not implement"), and R2.12 is unimplemented in substance while being named as
covered. Citing this file as coverage of R2.12-R2.14 would misrepresent it. Citing it as
*evidence of three identified gaps* is fully supported.

## Q5. Does the ValidationCommittee exercise a genuine quorum boundary?

**Yes — this is the strongest cluster in the suite, and the distinction you asked about is made
explicitly.** Setup: three validators, 1e18 each, `totalSupply = 3e18`, `quorumNumerator = 34`, so
`quorum = 1.02e18`. `GovernorCountingSimple` decides `Defeated` on either `!_quorumReached`
(for + abstain < quorum) or `!_voteSucceeded` (for <= against). The block separates them:

| test | For | Against | Abstain | quorum reached? | majority? | result | isolates |
|---|---:|---:|---:|---|---|---|---|
| Defeats a proposal that has a majority but misses the quorum | 1e18 | 0 | 0 | **no** (1.0 < 1.02) | yes | DEFEATED | **quorum alone** |
| Rejects a proposal that does not reach a majority | 1e18 | 2e18 | 0 | yes | **no** | DEFEATED | **majority alone** |
| Passes a proposal once the quorum is reached | 2e18 | 0 | 0 | yes | yes | SUCCEEDED | positive side |
| Counts abstentions towards the quorum but not towards the majority | 1e18 | 0 | 1e18 | yes (via abstain) | yes | SUCCEEDED | abstain -> quorum |
| Defeats a proposal that reaches the quorum through abstentions alone | 0 | 0 | 2e18 | yes | **no** | DEFEATED | abstain !-> majority |

The first row is the answer to your question: `_voteSucceeded` is true there (1 > 0), so the only
possible cause of `DEFEATED` is the quorum, and the test asserts `forVotes < quorum(snapshot)`
directly rather than inferring it. This is genuine, not happy-path-plus-permissions.

**Three caveats.**
- The boundary is probed at 1.0e18 vs 2.0e18 against a 1.02e18 threshold. The exact boundary is
  never hit, so the `<=` vs `<` direction of `_quorumReached` is not pinned.
- *"Derives the quorum from the voting power outstanding at the snapshot block"* re-derives the
  expected value with `GovernorVotesQuorumFraction`'s own formula. Only `pastSupply == 3e18` and
  `quorumNumerator == 34` are independent assertions there.
- The **Consortium** has no quorum boundary at all, by construction: `GovernorVotesQuorumFraction(0)`
  makes `quorum == 0`, `_quorumReached` always true, and a single For vote carries the proposal.
  The file's *"GAP: quorum is 0%…"* test documents this honestly. Do not let the committee's good
  quorum evidence be read across to the Consortium.

## Q6. Setups that make the authorization check under test vacuous

**Yes — four clusters, in descending severity.**

1. **`MKMPOL21.ts` -> `Permission-Gated Functions` -> the eight `Owner can call X (permission N)`
   tests.** The acting account is `owner`, role index 5, `role_permissions[5] = 2^34 - 1` — every
   bit. The eight target functions (`remove_ordinary_member`, `remove_institution`,
   `submit_query_to_eliza_agent`, `Issue_DID`, `Burn_DID`, `mint_MKMT`, `burn_MKMT`,
   `distribute_MKMT`) have **empty bodies**. The assertion is `to.not.be.reverted`. So: an
   omnipotent caller invoking a no-op is asserted not to revert. The `hasPermission(msg.sender, N)`
   modifier is unreachable as a guard because no negative counterpart exists. These are the most
   vacuous tests in the repository, and their names read as permission coverage.

2. **`BDIAgentIntegration.test.ts` -> `Full Validation Pipeline` -> "Should complete end-to-end
   agent validation workflow".** Step 4 is captioned "Simulating Validation Committee approval" and
   is performed by `owner` after `grantPermission(MKMPOL21_OWNER, 6)` — a no-op, since the owner
   already holds bit 6. Step 5 publishes as `owner`, whose role index 5 satisfies
   `markRDFGraphPublished` directly. Neither step involves a committee, a proposal or a vote. The
   authorization semantics of the two governance-critical steps are entirely vacuous.

3. **`BDIAgentIntegration.test.ts` -> `Agent Permission Verification` -> the three positive
   permission tests.** The `beforeEach` runs `grantPermission(DATA_VALIDATOR, 4)`,
   `grantPermission(MEMBER_INSTITUTION, 8)` and `grantPermission(VALIDATION_COMMITTEE, 6)`. All
   three are already set by the constructor, but the grants mean the subsequent
   `has_permission(... ) == true` assertions would hold even if the constructor's role model did
   not include them. The tests restate the grants they performed.

4. **`MKMPOL21.ts` -> "Owner can grant permission to controlled role" / "Owner can revoke
   permission from controlled role".** Both guards (`hasPermission` on the caller, `canControl` on
   the target) are trivially satisfied by the all-bits owner, and neither test checks that the
   permission bit was actually written or cleared — only that the event fired. The state change
   under test is unobserved.

**Counter-examples worth preserving.** `RDFGraphLifecycleValidation.test.ts` and
`RDFDocumentAttestation.test.ts` choose narrow actors deliberately — `unauthorized` is
MFSSIA_Guardian (bits 11-14, 18, 20, 23, 24; no 4, 6 or 8), `committee` is role 1031 (bits 6 and 10
only), `outsider` has role 0. `ConsortiumOptimisticGovernance.test.ts` uses `owner` only as the
*administrator* of grants and revokes while the *subject* of every authorization check is a
narrowly-permissioned account. Those are sound.

## Q7. Requirement IDs across the suite

| req | files | consistent? |
|---|---|---|
| R1.3 | ConsortiumOptimisticGovernance, RDFDocumentAttestation | Yes — "permission-gated action" in both. |
| R1.5 | ConsortiumOptimisticGovernance | single file |
| R1.6 | ConsortiumOptimisticGovernance | single file |
| R1.7 | ConsortiumOptimisticGovernance | single file |
| R2.5 | RDFGraphLifecycleValidation | single file |
| R2.6 | RDFGraphLifecycleValidation | single file |
| R2.7 | RDFGraphLifecycleValidation | single file |
| R2.8 | ValidationCommitteeVoting | single file |
| R2.9 | ConsortiumOptimisticGovernance | single file |
| R2.10 | ValidationCommitteeVoting | single file |
| **R2.11** | **ConsortiumOptimisticGovernance, ValidationCommitteeVoting** | **Inconsistent — see below.** |
| R2.12 | RDFGraphLifecycleValidation | single file; overstated (Q4) |
| **R2.13** | **RDFGraphLifecycleValidation (twice, two meanings)** | **Inconsistent — see below.** |
| R2.14 | RDFGraphLifecycleValidation | single file; unimplemented, honestly labelled |
| **R3.1** | **ConsortiumOptimisticGovernance, ValidationCommitteeVoting** | Consistent (attribution of the lifecycle event to the acting body) — but note R3.1 appears **only in comments**, never in a describe or `it` name. |
| **R3.2** | **RDFDocumentAttestation, RDFGraphLifecycleValidation** | **Inconsistent — see below.** |
| R3.3 | RDFDocumentAttestation | single file; overstated ("identity binding" vs. an unverified stored string) |
| R3.5 | RDFDocumentAttestation | single file |
| R3.6 | RDFGraphLifecycleValidation | single file |
| R3.7 | RDFGraphLifecycleValidation | single file |
| R3.11 | ConsortiumOptimisticGovernance | single file |

**Flagged inconsistencies**

- **R2.11 means two different bindings.** In `ConsortiumOptimisticGovernance` it is
  *Created -> Validated*, driven by an optimistic proposal with a veto window. In
  `ValidationCommitteeVoting` it is *Validated -> Approved*, driven by a quorum vote. Both cite
  "Section IV-C". A reviewer reading one file will not get the other's mechanism. If the paper
  cites "R2.11" once, it will be citing only half the claim — and the half-claims rest on
  different governance protocols with different failure modes (0 % quorum vs. 34 % quorum).
- **R2.13 is used in two senses inside one file.** The `[R2.13/R2.14/R3.6/R3.7]` block treats it as
  "Published -> Deprecated does not exist" (an ABI-absence assertion). But the `[R2.5/R2.6]` block's
  *"GAP: publishing the new version leaves the superseded one published as well"* also cites
  "Table II expects Published -> Deprecated" in its comment, as a *behavioural* observation about
  superseded versions. Same ID, one structural claim and one behavioural claim.
- **R3.2 means "traceability" in two different objects.** In `RDFDocumentAttestation` it is the
  `RDFDocument` record in `MKMPOL21` (submitter, timestamp, documentHash, attestationUAL). In
  `RDFGraphLifecycleValidation` it is the `RDFGraph` record in `GADataValidation` (submitter,
  submittedAt). These are two separate registries with separate id schemes that are never linked
  on-chain. Citing R3.2 without saying which registry would conflate them.
- **Three files carry no requirement IDs at all** — `BDIAgentIntegration`, `GADataValidation`,
  `MKMPOL21.ts` — which is 121 of the 221 tests, i.e. 55 % of the suite is outside the requirement
  mapping entirely.
- **Stale inventory.** `evaluation/test-inventory.md` (generated at commit `84faa5a`) still records
  the Consortium file as having 20 tests including *"GAP: the inherited Governor.execute() bypasses
  both the veto and the challenge window"*. The file now has 22 tests and that GAP has become a
  GUARD — the bypass was fixed. Do not cite the inventory's counts or its R3.11 characterisation.

---

# Do NOT cite these as evidence

Ranked by how badly a reviewer would be misled if the test were offered as support for the claim
its name makes.

### Tier 1 — the name asserts a property the body never tests

1. **`MKMPOL21.ts` -> `has_permission Function` -> "User without role should not have any
   permissions".** The body asserts only `hasRole == 0`; `has_permission` is never called, and the
   inline comment then states the opposite of the title. The guard it appears to cover
   (`MKMPOL21.sol:156-158`) is deletable with the whole suite green. Offering this as evidence of
   default-deny would be the most damaging single citation in the suite.
2. **`GADataValidation.test.ts` -> `submitRDFGraph` -> "Should prevent duplicate graph
   submissions".** The body concedes in its own comment that it cannot reach the duplicate guard,
   submits a *different* hash, and asserts `tx.hash !== undefined`. `"Graph already exists"` is
   unreachable by the entire suite.
3. **`MKMPOL21.ts` -> `Edge Cases and Security` -> "Role value 0 maps to index 0 (Member_Institution
   permissions)".** Asserts only `hasRole == 0`. The titular claim is untested and is partly *false*
   for `has_permission`.
4. **`RDFGraphLifecycleValidation.test.ts` -> `[R2.12]` -> "Stores the content hash submitted with
   the graph".** A getter round-trip presented under a describe path named "On-chain / off-chain
   correspondence" and a header claiming "hash equality verification". No hash is ever compared.
5. **`BDIAgentIntegration.test.ts` -> "RDFGraphSubmitted event includes all required data for
   Coordinator".** Asserts only that the event fired; the payload it claims to verify is described
   in a comment. Zero arguments checked.
6. **`MKMPOL21.ts` -> "Maximum valid role index is 8".** Never touches index 8 or 9.

### Tier 2 — cannot fail, or restates the test's own setup

7. **`MKMPOL21.ts` -> the eight `Owner can call <stub> (permission N)` tests.** Empty function
   bodies, omnipotent caller, `to.not.be.reverted`. Cannot fail. Eight of the suite's 221 tests.
8. **`BDIAgentIntegration.test.ts` -> "Syntax Validator permission 8 status reflects contract
   defaults".** Asserts `typeof x === "boolean"`.
9. **`BDIAgentIntegration.test.ts` -> the two `…based on contract defaults` if/else tests**
   (submission from Syntax Validator; validation from DAO Submitter). Each reads contract state and
   then selects the assertion that state implies. Both branches pass by construction.
10. **`MKMPOL21.ts` -> `Permission Initialization` (5 tests) and `Role Encoding Verification`
    (7 tests) and 12 of 13 `Control Relations` tests.** 24 tests that make no contract call and
    compute over the test file's own constants using a re-implementation of the contract's bit
    arithmetic. Demonstrated inert: `EXPECTED_PERMISSIONS.DATA_VALIDATOR` has been wrong by exactly
    bit 4 since bit 4 was added, and every one of them still passes.
11. **`GADataValidation.test.ts` -> "Should allow validator to mark graph as invalid".** Asserts
    `validated == false`, which was already the value before the call.
12. **`OnboardingIntegration.test.ts` -> "Role index extraction works correctly for dashboard
    display".** The extraction is done in JavaScript.

### Tier 3 — real, but the requirement or mechanism named is broader than what is shown

13. **`RDFGraphLifecycleValidation.test.ts` -> the three ABI-regex tests (R2.13, R2.14/R3.6, R3.7).**
    Sound as regression tripwires, worthless as behavioural evidence, and the R3.7 one misses
    `Ownable.transferOwnership` / `renounceOwnership` and the `remove_*` stubs.
14. **`RDFGraphLifecycleValidation.test.ts` -> "Cannot undo a publication once it is recorded".**
    Shows idempotence of one setter. The record is not frozen: validation flags remain writable
    after publication and the test does not check that.
15. **`ValidationCommitteeVoting.test.ts` -> "A Member_Institution cannot put a decision to the
    committee"** and **"Only holders of permission 31 can cast a vote".** Both name a specific
    permission index that no test in the suite pins; bits 9, 30 and 31 are interchangeable to this
    file. Cite them as "the committee is permission-gated", not as "bit 30/31 gates it".
16. **`GADataValidation.test.ts` -> "Should complete full governance workflow"** and
    **`BDIAgentIntegration.test.ts` -> "Should complete end-to-end agent validation workflow".**
    No governance body participates in either; both approve and publish through EOAs holding the
    bits directly, the second one through an account holding *all* bits. Neither is evidence about
    collective decision-making.
17. **`ValidationCommitteeVoting.test.ts` -> "Refuses execution while voting is still open"** and
    **"Cannot execute the same committee decision twice".** Both rest on
    `"Governor: proposal not successful"` without asserting the state, so neither identifies the
    cause of the failure.
18. **`ConsortiumOptimisticGovernance.test.ts` -> "GUARD: relay() is not an independent execution
    path".** Correct and worth having, but it asserts OpenZeppelin's `onlyGovernance` modifier.
    Cite it as attack-surface coverage, not as a property of the artifact's design.
19. **Everything in `OnboardingIntegration.test.ts`** as evidence of attestation-gated admission.
    The contract carries `// TODO: Add MFSSIA verification check here`; every path is open
    self-assignment and the "attestation" is an unvalidated caller-supplied string. The file is
    good evidence of *self-onboarding*, and of nothing stronger.

---

# What IS safe to cite

For balance, the tests that would survive an adversarial reviewer:

- **R1.5 / R1.6 / R1.7 (delegation, veto, revocation)** — `ConsortiumOptimisticGovernance.test.ts`,
  `[R1.6] Veto rights`. In particular *"Revoking permission 29 removes the veto right from the whole
  role"* and *"Delegating permission 28 to a role…"*: these two are the only tests in the suite that
  pin a permission index to a behaviour, and they also pin the *role scope* of the change.
- **R2.10 (quorum)** — the five tests in `ValidationCommitteeVoting.test.ts` -> `[R2.10]`. They
  separate quorum failure from majority failure and from abstention arithmetic. See Q5.
- **R2.11 / R3.1 (a collective decision drives a lifecycle transition, attributed to the body)** —
  `ConsortiumOptimisticGovernance.test.ts` *"Executes Created -> Validated on behalf of the
  Consortium…"* and `ValidationCommitteeVoting.test.ts` *"Approves the graph on behalf of the
  committee and attributes the event to it"*. Both check the event arguments including the acting
  contract's address, plus the resulting state and the proposal state. Cite **both**, and say which
  transition each covers (Q7).
- **R2.9 (objection window) and R3.11 (capture resistance)** — the `[R2.9]` block and the two
  `GUARD:` tests in `[R3.11]`. The first GUARD test is the strongest adversarial test in the
  repository. Pair it with the honest **`GAP:` quorum-0 % finding**, which belongs in the paper as a
  limitation.
- **R2.5 / R2.6 (versioning and re-processing)** — the `[R2.5/R2.6]` block, especially *"Forces the
  re-processed version through validation and approval before publication"*, which is the only test
  that walks two negative orderings and then the positive one.
- **R3.5 (challenge threshold)** — the 8-of-9 boundary is pinned from both sides in
  `RDFDocumentAttestation.test.ts`.
- **All nine `GAP:` tests**, across four files, as evidence of *identified limitations*. They are
  honest, specific and behavioural, and they are the most defensible material in the suite for a
  limitations section.

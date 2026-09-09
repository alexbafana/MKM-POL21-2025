# Test inventory

- Generated: 2026-09-09
- **The counts below describe the tree committed in *this* commit.** The inventory is
  regenerated and committed together with the tests it describes, so it is not tied to an
  earlier hash. Parent commit at time of writing: `84faa5a` (branch `main`).
- **Total: 179 tests** across 8 files, all passing (0 failing, 0 pending).
- Structure parsed from the TypeScript sources in `packages/hardhat/test/`. Every per-file
  `it()` count was reconciled against the tests mocha actually executed, **and the full list
  of test names was compared in order**. All eight files reconcile exactly.
- Call kinds present: `describe`, `it`. No `.skip`, `.only`, `.todo`, `xdescribe` or `xit`
  anywhere in `test/`.

## Per-file breakdown

| File | Tests |
|---|---:|
| `test/BDIAgentIntegration.test.ts` | 14 |
| `test/ConsortiumOptimisticGovernance.test.ts` | 22 |
| `test/GADataValidation.test.ts` | 29 |
| `test/MKMPOL21.ts` | 37 |
| `test/OnboardingIntegration.test.ts` | 20 |
| `test/RDFDocumentAttestation.test.ts` | 19 |
| `test/RDFGraphLifecycleValidation.test.ts` | 20 |
| `test/ValidationCommitteeVoting.test.ts` | 18 |
| **Total** | **179** |

---

## `test/BDIAgentIntegration.test.ts`

14 tests, all passing (14 executed).

- **BDI Agent Integration**
  - **Agent Role Verification**
    - Coordinator should have MFSSIA_Guardian_Agent role (index 2)
    - Syntax Validator should have Data_Validator role (index 4)
    - Semantic Validator should have Data_Validator role (index 4)
    - DAO Submitter should have Member_Institution role (index 0)
  - **Agent Permission Verification**
    - Coordinator should NOT have permission 4 (does not validate directly)
  - **DAO Submitter Agent - Graph Submission**
    - Should submit RDF graph successfully
  - **Syntax Validator Agent - RDF Validation**
    - Should validate graph successfully (isValid=true)
    - Should mark graph as invalid (isValid=false)
    - Semantic Validator should also be able to validate
  - **Full Validation Pipeline**
    - Should complete end-to-end agent validation workflow
  - **Agent Coordination via Events**
    - RDFGraphSubmitted event includes all required data for Coordinator
    - RDFGraphValidated event includes validator address for tracking
  - **Error Handling**
    - Should reject validation of non-existent graph
    - Should reject approval of non-validated graph

## `test/ConsortiumOptimisticGovernance.test.ts`

22 tests, all passing (22 executed).

- **Consortium - Optimistic Governance (R1.5-R1.7, R2.9, R2.11, R3.11)**
  - **[R1.3/R1.5] Proposal rights are permission-gated**
    - Member_Institution holding permission 28 can open a proposal
    - An address without any role cannot open a proposal
    - A role that lacks permission 28 cannot open a proposal
    - Delegating permission 28 to a role grants proposal rights to every holder of that role
  - **[R1.6] Veto rights**
    - A holder of permission 29 can veto inside the challenge window
    - A role without permission 29 cannot veto
    - An address without any role cannot veto
    - The same proposal cannot be vetoed twice
    - Revoking permission 29 removes the veto right from the whole role (R1.7)
    - Revoking the role removes the proposal right from that account (R1.7)
    - Vetoing an unknown proposal is rejected by the window check, not by an existence check
  - **[R2.9] Temporal constraints: the challenge window**
    - Records the creation time that opens the challenge window
    - Rejects a veto once the challenge window has expired
    - Rejects optimistic execution before the challenge window is over
    - Rejects optimistic execution of a vetoed proposal
  - **[R2.11] A collective decision drives the lifecycle transition**
    - Executes Created -> Validated on behalf of the Consortium once the window closes unchallenged
    - Refuses to execute the same proposal twice
    - Cannot execute a decision the Consortium role is not authorized to carry out
  - **[R3.11] Adversarial paths around the optimistic safeguards**
    - GUARD: the inherited Governor.execute() cannot bypass the veto or the challenge window
    - GUARD: an unchallenged proposal still executes through the inherited entry point
    - GUARD: relay() is not an independent execution path
    - GAP: quorum is 0%, so a single voter carries a proposal for the whole consortium

## `test/GADataValidation.test.ts`

29 tests, all passing (29 executed).

- **GADataValidation - RDF Graph Registry**
  - **Deployment**
    - Should deploy GADataValidation successfully
    - Should initialize counters to zero
  - **submitRDFGraph**
    - Should allow institution to submit RDF graph
    - Should reject submission without permission 8
    - Should reject submission with invalid hash
    - Should reject submission with empty URI
    - Should reject submission with invalid year
    - Should auto-increment version for same dataset/year
    - Should prevent duplicate graph submissions
  - **markRDFGraphValidated**
    - Should allow data validator to mark graph as validated
    - Should allow validator to mark graph as invalid
    - Should reject validation without permission 4
    - Should reject validation of non-existent graph
  - **approveRDFGraph**
    - Should allow committee to approve validated graph
    - Should reject approval without permission 6
    - Should reject approval of non-validated graph
    - Should reject approval of non-existent graph
    - Should reject double approval
  - **markRDFGraphPublished**
    - Should allow owner to mark graph as published
    - Should reject publication by a role other than Data_Validator or Owner
    - Should reject publication of non-approved graph
    - Should reject publication with empty UAL
    - Should reject double publication
  - **View Functions**
    - Should return basic graph info
    - Should return graph metadata
    - Should return graph status
    - Should check if graph is ready for publication
    - Should return all graphs for dataset/year
  - **End-to-End Workflow**
    - Should complete full governance workflow

## `test/MKMPOL21.ts`

37 tests, all passing (37 executed).

- **MKMPOL21 Permission System**
  - **Deployment and Initialization**
    - Should assign MKMPOL21Owner role to deployer
    - Should have no role assigned to random addresses
  - **Control Relations**
    - Contract canControl function matches expected behavior
  - **has_permission Function**
    - Owner should have permission 0
    - Owner should have permission 18 (onboard_ordinary_user)
    - Owner should have permission 27 (distribute_MKMT)
    - An account without a role is denied every permission Member_Institution holds
  - **Role Assignment**
    - Owner can assign Member_Institution role
    - Owner can assign Ordinary_User role
    - Owner can assign Data_Validator role
    - Owner can assign MFSSIA_Guardian_Agent role
    - Non-owner cannot assign roles
    - Cannot assign role to zero address
    - Cannot assign invalid role index (>= 9)
  - **Role Revocation**
    - Owner can revoke Member_Institution role
    - Cannot revoke role that user doesn't have
    - Non-owner cannot revoke roles
  - **Committee Initialization**
    - Owner can initialize committees
    - Cannot initialize committees twice
    - Non-owner cannot initialize committees
    - Cannot initialize with zero addresses
  - **Permission Granting**
    - Owner can grant permission to controlled role
    - Cannot grant permission user doesn't have
    - Cannot grant permission to role user cannot control
  - **Permission Revoking**
    - Owner can revoke permission from controlled role
    - Cannot revoke permission user doesn't have
  - **canVote and canPropose Functions**
    - User with correct permission can vote
    - User without permission cannot vote
    - User with correct permission can propose
    - User without permission cannot propose
  - **Permission-Gated Functions**
    - An account without a role can self-onboard as Ordinary_User
    - An account that already holds a role cannot call onboard_ordinary_user
    - An account without a role can self-onboard as Member_Institution
    - The owner cannot self-onboard, since it already holds MKMPOL21Owner
  - **Edge Cases and Security**
    - Role value 0 maps to index 0 (Member_Institution permissions)
    - Maximum valid role index is 8
    - Reassigning role overwrites previous role

## `test/OnboardingIntegration.test.ts`

20 tests, all passing (20 executed).

- **MKMPOL21 Onboarding Integration**
  - **Self-Onboarding: onboard_ordinary_user()**
    - New user without role can self-onboard as Ordinary_User
    - User who already has a role cannot call onboard_ordinary_user()
    - Owner cannot call onboard_ordinary_user() (already has role)
    - Multiple different users can each self-onboard
  - **Self-Onboarding: onboard_institution()**
    - New user without role can self-onboard as Member_Institution
    - User who already has a role cannot call onboard_institution()
    - Multiple different institutions can each self-onboard
  - **Self-Onboarding with Attestation: onboard_ordinary_user_with_attestation()**
    - New user can self-onboard with attestation
    - Cannot onboard with empty attestation
    - User who already has a role cannot call onboard_ordinary_user_with_attestation()
    - Attestation should be valid after onboarding
  - **Self-Onboarding with Attestation: onboard_institution_with_attestation()**
    - New institution can self-onboard with attestation
    - Cannot onboard with empty attestation
  - **Dashboard Role Check Simulation**
    - hasRole returns 0 for users without role
    - hasRole returns correct role value after self-onboarding as user
    - hasRole returns correct role value after self-onboarding as institution
  - **Full Onboarding Flow Integration**
    - Complete user onboarding flow simulation
    - Complete institution onboarding flow simulation
  - **Cross-Role Prevention**
    - User who onboarded as Ordinary_User cannot also onboard as Institution
    - Institution who onboarded cannot also onboard as Ordinary_User

## `test/RDFDocumentAttestation.test.ts`

19 tests, all passing (19 executed).

- **MKMPOL21 - Attested RDF Document Submission (R3.2, R3.3, R3.5)**
  - **[R3.5] Challenge threshold**
    - Accepts a document that passed all nine MFSSIA challenges
    - Accepts a document at the 8 of 9 threshold
    - Records a document below the threshold as not validated instead of rejecting it
    - Records a document that passed no challenge at all
    - Rejects a challenge count above the nine defined challenges
  - **[R1.3/R3.5] Who may submit an attested document**
    - Allows the MKMPOL21 owner to submit
    - Rejects a Data_Validator
    - Rejects an Ordinary_User
    - Rejects an address without any role
    - Rejects an empty document hash or an empty attestation
  - **[R3.2] Traceability of the submission record**
    - Stores submitter, timestamp, content hash and attestation together
    - Gives two submissions of the same content distinct identifiers
    - Returns an empty record for an unknown document id
  - **[R3.3] Attestation lifetime**
    - Binds an attestation to the onboarded institution for one year
    - Treats the attestation as invalid once the validity period elapses
    - Reports no attestation for an account that never onboarded through MFSSIA
    - Rejects onboarding with an empty attestation
    - GAP: submitRDFDocument never checks the submitter's attestation
    - GAP: an expired attestation does not stop further submissions

## `test/RDFGraphLifecycleValidation.test.ts`

20 tests, all passing (20 executed).

- **GADataValidation - Validation Semantics and Re-processing (R2.5-R2.7, R2.12-R2.14)**
  - **[R2.7] Syntax and semantic validation are recorded separately**
    - Marks a graph valid only when both N3 syntax and SHACL semantics pass
    - Keeps a syntactically valid but semantically invalid graph out of the validated state
    - Records a syntax failure without claiming semantic validity
    - Lets a re-validation clear a previously recorded failure
    - Requires permission 4 to record a detailed validation result
    - Rejects a detailed validation result for a graph that was never submitted
    - Overwrites the coarse markRDFGraphValidated result with the detailed one
    - GAP: approval and publication only check syntaxValid, so a SHACL failure reaches the DKG
  - **[R2.5/R2.6] Re-processing a dataset after an NLP model change**
    - Assigns an incremented version to the re-processed graph and keeps its model version
    - Starts the re-processed version in the Created state instead of inheriting the previous approval
    - Forces the re-processed version through validation and approval before publication
    - Keeps both versions addressable for lineage reconstruction
    - GAP: publishing the new version leaves the superseded one published as well
  - **[R2.12] On-chain / off-chain correspondence**
    - Stores the content hash submitted with the graph
    - GAP: the DKG asset UAL is stored verbatim and never checked against the graph hash
    - GAP: the same UAL can be attached to two different graphs
  - **[R2.13/R2.14/R3.6/R3.7] Lifecycle transitions the artifact does not implement**
    - Has no Published -> Deprecated transition (R2.13)
    - Has no rollback or un-publish transition (R2.14, R3.6)
    - Has no emergency override, suspension or pause entry point (R3.7)
    - Cannot undo a publication once it is recorded

## `test/ValidationCommitteeVoting.test.ts`

18 tests, all passing (18 executed).

- **ValidationCommittee - Collective Voting (R2.8, R2.10, R2.11)**
  - **[R2.8] Proposal and voting rights**
    - A Data_Validator holding permission 30 can put a decision to the committee
    - A Member_Institution cannot put a decision to the committee
    - An address without any role cannot put a decision to the committee
    - Only holders of permission 31 can cast a vote
    - Tallies for, against and abstain votes separately
    - Rejects a proposal that does not reach a majority
    - Refuses execution while voting is still open
  - **[R2.10] Quorum rules**
    - Derives the quorum from the voting power outstanding at the snapshot block
    - Defeats a proposal that has a majority but misses the quorum
    - Passes a proposal once the quorum is reached
    - Counts abstentions towards the quorum but not towards the majority
    - Defeats a proposal that reaches the quorum through abstentions alone
  - **[R2.11] The committee decision drives Validated -> Approved**
    - Approves the graph on behalf of the committee and attributes the event to it
    - Completes the full scenario: submit -> validate -> committee vote -> approve -> publish
    - Cannot execute the same committee decision twice
    - A Data_Validator alone cannot perform the approval the committee votes on
    - GAP: approveRDFGraph only checks permission 6, so a single institution can approve without any vote
    - GAP: the submitting institution can also validate and approve its own graph

---

## Reconciliation

No mismatches. For every file the number of `it()` blocks parsed from source equals the
number of tests mocha executed, and the parsed test names match the executed test names
one-for-one and in the same order.

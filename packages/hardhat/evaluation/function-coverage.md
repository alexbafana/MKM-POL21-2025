# Contract inventory and test-reference cross-check

- Generated: 2026-09-07T22:30:55+03:00
- Repository commit: `84faa5aeaeaec6b8f5201b3f3f39f5c9e9ff9097` (branch `main`), working tree **not clean** — see caveat at the end.
- Scope: `packages/hardhat/contracts/` only. `DAO/` is excluded as instructed.
- Produced by static parsing of the Solidity sources (comments and string literals stripped).
- "Referenced in tests" is a *name-reference* check over `packages/hardhat/test/*.ts`, not an
  executed-line coverage measurement. A `yes` means the identifier appears at a call site
  (`.name(`); it does not prove the call was reached in a passing assertion. No
  solidity-coverage run was performed.

## 1. Per-file inventory

### `contracts/Consortium.sol`

- Lines: 146
- Constructors: 1
- contract **Consortium** (line 16) — inherits: Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction
  - OpenZeppelin bases: `Governor`, `GovernorSettings`, `GovernorCountingSimple`, `GovernorVotes`, `GovernorVotesQuorumFraction`
- External/public functions: 8 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `propose` | 51 | public | — | — | uint256 |
| `vetoProposal` | 74 | public | — | — | — |
| `executeProposal` | 83 | public | — | — | uint256 proposalId |
| `votingDelay` | 102 | public | view | — | uint256 |
| `votingPeriod` | 111 | public | view | — | uint256 |
| `quorum` | 120 | public | view | — | uint256 |
| `proposalThreshold` | 129 | public | view | — | uint256 |
| `supportsInterface` | 138 | public | view | — | bool |

Events: none declared in this file.

### `contracts/Dispute_Resolution_Board.sol`

- Lines: 100
- Constructors: 1
- contract **DisputeResolutionBoard** (line 16) — inherits: Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction
  - OpenZeppelin bases: `Governor`, `GovernorSettings`, `GovernorCountingSimple`, `GovernorVotes`, `GovernorVotesQuorumFraction`
- External/public functions: 6 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `castVote` | 39 | public | — | — | uint256 |
| `propose` | 49 | public | — | — | uint256 |
| `votingDelay` | 65 | public | view | — | uint256 |
| `votingPeriod` | 74 | public | view | — | uint256 |
| `quorum` | 83 | public | view | — | uint256 |
| `proposalThreshold` | 92 | public | view | — | uint256 |

Events: none declared in this file.

### `contracts/MKMPOL21.sol`

- Lines: 491
- Constructors: 1
- interface **IVotingPowerToken** (line 9) — inherits: (none)
- contract **MKMPOL21** (line 13) — inherits: IPermissionManager
- External/public functions: 29 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `mint` | 10 | external | — | — | — |
| `initializeCommittees` | 96 | external | — | — | — |
| `canControl` | 106 | public | pure | — | bool controls |
| `assignRole` | 118 | external | — | `controlledBy(msg.sender,roles[_user],true,_role)` | — |
| `revokeRole` | 125 | external | — | `controlledBy(msg.sender,roles[_user],false,_role)` | — |
| `grantPermission` | 132 | external | — | `hasPermission(msg.sender,_permissionIndex)` | — |
| `revokePermission` | 141 | external | — | `hasPermission(msg.sender,_permissionIndex)` | — |
| `hasRole` | 150 | external | view | — | uint32 |
| `has_permission` | 154 | external | view | — | bool |
| `onboard_ordinary_user` | 166 | external | — | — | — |
| `onboard_institution` | 177 | external | — | — | — |
| `setVotingToken` | 188 | external | — | — | — |
| `onboard_data_validator` | 193 | external | — | — | — |
| `onboard_ordinary_user_with_attestation` | 234 | external | — | — | — |
| `onboard_institution_with_attestation` | 256 | external | — | — | — |
| `submitRDFDocument` | 280 | external | — | — | bytes32 |
| `isAttestationValid` | 316 | public | view | — | bool |
| `getAttestation` | 324 | external | view | — | string memory ual, uint256 expiresAt, bool verified, bool isExpired |
| `getRDFDocument` | 342 | external | view | — | string memory documentHash, string memory attestationUAL, address submitter, uint256 submittedAt, bool validated, uint8 challengesPassed |
| `remove_ordinary_member` | 362 | external | — | `hasPermission(msg.sender,20)` | — |
| `remove_institution` | 367 | external | — | `hasPermission(msg.sender,21)` | — |
| `submit_query_to_eliza_agent` | 372 | external | — | `hasPermission(msg.sender,22)` | — |
| `Issue_DID` | 377 | external | — | `hasPermission(msg.sender,23)` | — |
| `Burn_DID` | 382 | external | — | `hasPermission(msg.sender,24)` | — |
| `mint_MKMT` | 387 | external | — | `hasPermission(msg.sender,25)` | — |
| `burn_MKMT` | 392 | external | — | `hasPermission(msg.sender,26)` | — |
| `distribute_MKMT` | 397 | external | — | `hasPermission(msg.sender,27)` | — |
| `canVote` | 474 | external | view | — | bool |
| `canPropose` | 483 | external | view | — | bool |

Events (8): `RoleRevoked`, `RoleAssigned`, `PermissionGranted`, `PermissionRevoked`, `AttestationVerified`, `AttestationExpired`, `RDFSubmitted`, `RDFValidated`

### `contracts/Validation_Committee.sol`

- Lines: 90
- Constructors: 1
- contract **ValidationCommittee** (line 20) — inherits: Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction
  - OpenZeppelin bases: `Governor`, `GovernorSettings`, `GovernorCountingSimple`, `GovernorVotes`, `GovernorVotesQuorumFraction`
- External/public functions: 6 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `castVote` | 35 | public | — | — | uint256 |
| `propose` | 45 | public | — | — | uint256 |
| `votingDelay` | 54 | public | view | — | uint256 |
| `votingPeriod` | 63 | public | view | — | uint256 |
| `quorum` | 72 | public | view | — | uint256 |
| `proposalThreshold` | 81 | public | view | — | uint256 |

Events: none declared in this file.

### `contracts/VotingPowerToken.sol`

- Lines: 52
- Constructors: 1
- contract **VotingPowerToken** (line 11) — inherits: ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable
  - OpenZeppelin bases: `ERC20`, `ERC20Burnable`, `ERC20Permit`, `ERC20Votes`, `Ownable`
- External/public functions: 1 (internal/private: 3)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `mint` | 23 | external | — | `onlyOwner` | — |

Events: none declared in this file.

### `contracts/_MFSSIA_authentication.sol`

- Lines: 45
- Constructors: 1
- contract **GADataAccess** (line 9) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 5 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 20 | external | — | `onlyOwner` | — |
| `Access_Challenge_Set` | 26 | external | — | — | — |
| `Validate_response` | 31 | external | — | — | — |
| `Access_Challenge_Response` | 36 | external | — | — | — |
| `Green_light_authentication` | 41 | external | — | — | — |

Events: none declared in this file.

### `contracts/_RDF_data_retrieval.sol`

- Lines: 43
- Constructors: 1
- contract **GADisputeResolution** (line 9) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 4 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 19 | external | — | `onlyOwner` | — |
| `Retrieve_Data` | 24 | external | — | — | — |
| `Make_Prediction` | 32 | external | — | — | — |
| `Notify_Contradiction` | 38 | external | — | — | — |

Events: none declared in this file.

### `contracts/_dao_management.sol`

- Lines: 51
- Constructors: 1
- contract **GADaoManagement** (line 8) — inherits: (none)
- External/public functions: 4 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `Modify_Statute` | 24 | external | — | — | — |
| `Upgrade_Permission_Manager` | 32 | external | — | — | — |
| `setGA` | 40 | public | — | — | — |
| `updateGA` | 45 | public | — | — | — |

Events: none declared in this file.

### `contracts/_data_access.sol`

- Lines: 28
- Constructors: 1
- contract **GADataAccess** (line 8) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 2 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 19 | external | — | `onlyOwner` | — |
| `submit_query_to_eliza_agent` | 24 | external | — | — | — |

Events: none declared in this file.

### `contracts/_data_validation.sol`

- Lines: 492
- Constructors: 1
- contract **GADataValidation** (line 13) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 17 (internal/private: 1)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 123 | external | — | `onlyOwner` | — |
| `submit_data_point_inclusion_proposal` | 135 | external | — | — | — |
| `Reject_data_point` | 161 | external | — | — | — |
| `edit_data_point_inclusion_proposal` | 188 | external | — | — | — |
| `add_metadata` | 207 | external | — | — | — |
| `inspect_data_point` | 218 | external | view | — | uint uid, bytes32 contentHash, bytes32 metadataHash, string memory dataUri, status currentStatus |
| `submitRDFGraph` | 245 | external | — | — | bytes32 |
| `markRDFGraphValidated` | 312 | external | — | — | — |
| `markRDFGraphValidatedWithDetails` | 331 | external | — | — | — |
| `approveRDFGraph` | 356 | external | — | — | — |
| `markRDFGraphPublished` | 373 | external | — | — | — |
| `getRDFGraphBasicInfo` | 394 | external | view | — | bytes32 graphHash, string memory graphURI, GraphType graphType, DatasetVariant datasetVariant, uint256 year, uint256 version |
| `getRDFGraphMetadata` | 417 | external | view | — | address submitter, uint256 submittedAt, string memory modelVersion, string memory dkgAssetUAL |
| `getDatasetGraphs` | 437 | external | view | — | bytes32[] memory |
| `isReadyForPublication` | 450 | external | view | — | bool |
| `getGraphStatus` | 459 | external | view | — | bool exists, bool validated, bool approved, bool published |
| `getValidationDetails` | 478 | external | view | — | bool syntaxValid, bool semanticValid, bool overallValid, string memory validationErrors |

Events (10): `dataPointSessionOpened`, `DataPointRejected`, `DataPointApproved`, `DataPointEdited`, `RDFGraphSubmitted`, `RDFGraphValidated`, `RDFGraphValidatedDetailed`, `RDFGraphApproved`, `RDFGraphPublishedToDKG`, `RDFGraphVersionIncremented`

### `contracts/_dispute_resolution.sol`

- Lines: 58
- Constructors: 1
- contract **GADisputeResolution** (line 9) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 5 (internal/private: 1)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 32 | external | — | `onlyOwner` | — |
| `request_revision_of_data` | 38 | external | — | — | — |
| `Propose_Modification_to_revision` | 43 | external | — | — | — |
| `Accept_revision` | 48 | external | — | — | — |
| `Accept_modification_to_revision` | 53 | external | — | — | — |

Events: none declared in this file.

### `contracts/_membersip_manager.sol`

- Lines: 49
- Constructors: 1
- contract **GADisputeResolution** (line 9) — inherits: GA, Ownable
  - OpenZeppelin bases: `Ownable`
- External/public functions: 5 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 18 | external | — | `onlyOwner` | — |
| `onboard_ordinary_user` | 23 | external | — | — | — |
| `onboard_institution` | 30 | external | — | — | — |
| `remove_ordinary_member` | 37 | external | — | — | — |
| `remove_institution` | 44 | external | — | — | — |

Events: none declared in this file.

### `contracts/interfaces/GA.sol`

- Lines: 5
- Constructors: 0
- interface **GA** (line 3) — inherits: (none)
- External/public functions: 1 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `setPermissionManager` | 4 | external | — | — | — |

Events: none declared in this file.

### `contracts/interfaces/IPermissionManager.sol`

- Lines: 8
- Constructors: 0
- interface **IPermissionManager** (line 3) — inherits: (none)
- External/public functions: 4 (internal/private: 0)

| Function | Line | Visibility | Mutability | Modifiers / overrides | Returns |
|---|---:|---|---|---|---|
| `has_permission` | 4 | external | view | — | bool |
| `hasRole` | 5 | external | view | — | uint32 |
| `canVote` | 6 | external | view | — | bool |
| `canPropose` | 7 | external | view | — | bool |

Events: none declared in this file.

## 2. Coverage cross-check

| Function | Contract | File | Referenced in tests | Test file(s) |
|---|---|---|---|---|
| `propose` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `vetoProposal` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `executeProposal` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `votingDelay` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `votingPeriod` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `quorum` | Consortium | `Consortium.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `proposalThreshold` | Consortium | `Consortium.sol` | no | — |
| `supportsInterface` | Consortium | `Consortium.sol` | no | — |
| `castVote` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `propose` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `votingDelay` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `votingPeriod` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `quorum` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `proposalThreshold` | DisputeResolutionBoard | `Dispute_Resolution_Board.sol` | no | — |
| `mint` | IVotingPowerToken | `MKMPOL21.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `initializeCommittees` | MKMPOL21 | `MKMPOL21.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts`, `ValidationCommitteeVoting.test.ts` |
| `canControl` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `assignRole` | MKMPOL21 | `MKMPOL21.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `GADataValidation.test.ts`, `MKMPOL21.ts`, `RDFDocumentAttestation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `revokeRole` | MKMPOL21 | `MKMPOL21.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts` |
| `grantPermission` | MKMPOL21 | `MKMPOL21.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `GADataValidation.test.ts`, `MKMPOL21.ts` |
| `revokePermission` | MKMPOL21 | `MKMPOL21.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts` |
| `hasRole` | MKMPOL21 | `MKMPOL21.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `has_permission` | MKMPOL21 | `MKMPOL21.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts`, `OnboardingIntegration.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `onboard_ordinary_user` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `onboard_institution` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `setVotingToken` | MKMPOL21 | `MKMPOL21.sol` | no | — |
| `onboard_data_validator` | MKMPOL21 | `MKMPOL21.sol` | no | — |
| `onboard_ordinary_user_with_attestation` | MKMPOL21 | `MKMPOL21.sol` | yes | `OnboardingIntegration.test.ts` |
| `onboard_institution_with_attestation` | MKMPOL21 | `MKMPOL21.sol` | yes | `OnboardingIntegration.test.ts`, `RDFDocumentAttestation.test.ts` |
| `submitRDFDocument` | MKMPOL21 | `MKMPOL21.sol` | yes | `RDFDocumentAttestation.test.ts` |
| `isAttestationValid` | MKMPOL21 | `MKMPOL21.sol` | yes | `OnboardingIntegration.test.ts`, `RDFDocumentAttestation.test.ts` |
| `getAttestation` | MKMPOL21 | `MKMPOL21.sol` | yes | `OnboardingIntegration.test.ts`, `RDFDocumentAttestation.test.ts` |
| `getRDFDocument` | MKMPOL21 | `MKMPOL21.sol` | yes | `RDFDocumentAttestation.test.ts` |
| `remove_ordinary_member` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `remove_institution` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `submit_query_to_eliza_agent` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `Issue_DID` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `Burn_DID` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `mint_MKMT` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `burn_MKMT` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `distribute_MKMT` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `canVote` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `canPropose` | MKMPOL21 | `MKMPOL21.sol` | yes | `MKMPOL21.ts` |
| `castVote` | ValidationCommittee | `Validation_Committee.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `propose` | ValidationCommittee | `Validation_Committee.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `votingDelay` | ValidationCommittee | `Validation_Committee.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `votingPeriod` | ValidationCommittee | `Validation_Committee.sol` | yes | `ConsortiumOptimisticGovernance.test.ts` |
| `quorum` | ValidationCommittee | `Validation_Committee.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `proposalThreshold` | ValidationCommittee | `Validation_Committee.sol` | no | — |
| `mint` | VotingPowerToken | `VotingPowerToken.sol` | yes | `ConsortiumOptimisticGovernance.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `setPermissionManager` | GADataAccess | `_MFSSIA_authentication.sol` | no | — |
| `Access_Challenge_Set` | GADataAccess | `_MFSSIA_authentication.sol` | no | — |
| `Validate_response` | GADataAccess | `_MFSSIA_authentication.sol` | no | — |
| `Access_Challenge_Response` | GADataAccess | `_MFSSIA_authentication.sol` | no | — |
| `Green_light_authentication` | GADataAccess | `_MFSSIA_authentication.sol` | no | — |
| `setPermissionManager` | GADisputeResolution | `_RDF_data_retrieval.sol` | no | — |
| `Retrieve_Data` | GADisputeResolution | `_RDF_data_retrieval.sol` | no | — |
| `Make_Prediction` | GADisputeResolution | `_RDF_data_retrieval.sol` | no | — |
| `Notify_Contradiction` | GADisputeResolution | `_RDF_data_retrieval.sol` | no | — |
| `Modify_Statute` | GADaoManagement | `_dao_management.sol` | no | — |
| `Upgrade_Permission_Manager` | GADaoManagement | `_dao_management.sol` | no | — |
| `setGA` | GADaoManagement | `_dao_management.sol` | no | — |
| `updateGA` | GADaoManagement | `_dao_management.sol` | no | — |
| `setPermissionManager` | GADataAccess | `_data_access.sol` | no | — |
| `submit_query_to_eliza_agent` | GADataAccess | `_data_access.sol` | yes | `MKMPOL21.ts` |
| `setPermissionManager` | GADataValidation | `_data_validation.sol` | no | — |
| `submit_data_point_inclusion_proposal` | GADataValidation | `_data_validation.sol` | no | — |
| `Reject_data_point` | GADataValidation | `_data_validation.sol` | no | — |
| `edit_data_point_inclusion_proposal` | GADataValidation | `_data_validation.sol` | no | — |
| `add_metadata` | GADataValidation | `_data_validation.sol` | no | — |
| `inspect_data_point` | GADataValidation | `_data_validation.sol` | no | — |
| `submitRDFGraph` | GADataValidation | `_data_validation.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `markRDFGraphValidated` | GADataValidation | `_data_validation.sol` | yes | `BDIAgentIntegration.test.ts`, `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `markRDFGraphValidatedWithDetails` | GADataValidation | `_data_validation.sol` | yes | `RDFGraphLifecycleValidation.test.ts` |
| `approveRDFGraph` | GADataValidation | `_data_validation.sol` | yes | `BDIAgentIntegration.test.ts`, `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `markRDFGraphPublished` | GADataValidation | `_data_validation.sol` | yes | `BDIAgentIntegration.test.ts`, `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `getRDFGraphBasicInfo` | GADataValidation | `_data_validation.sol` | yes | `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts` |
| `getRDFGraphMetadata` | GADataValidation | `_data_validation.sol` | yes | `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts` |
| `getDatasetGraphs` | GADataValidation | `_data_validation.sol` | yes | `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts` |
| `isReadyForPublication` | GADataValidation | `_data_validation.sol` | yes | `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `getGraphStatus` | GADataValidation | `_data_validation.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `GADataValidation.test.ts`, `RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `getValidationDetails` | GADataValidation | `_data_validation.sol` | yes | `RDFGraphLifecycleValidation.test.ts` |
| `setPermissionManager` | GADisputeResolution | `_dispute_resolution.sol` | no | — |
| `request_revision_of_data` | GADisputeResolution | `_dispute_resolution.sol` | no | — |
| `Propose_Modification_to_revision` | GADisputeResolution | `_dispute_resolution.sol` | no | — |
| `Accept_revision` | GADisputeResolution | `_dispute_resolution.sol` | no | — |
| `Accept_modification_to_revision` | GADisputeResolution | `_dispute_resolution.sol` | no | — |
| `setPermissionManager` | GADisputeResolution | `_membersip_manager.sol` | no | — |
| `onboard_ordinary_user` | GADisputeResolution | `_membersip_manager.sol` | yes | `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `onboard_institution` | GADisputeResolution | `_membersip_manager.sol` | yes | `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `remove_ordinary_member` | GADisputeResolution | `_membersip_manager.sol` | yes | `MKMPOL21.ts` |
| `remove_institution` | GADisputeResolution | `_membersip_manager.sol` | yes | `MKMPOL21.ts` |
| `setPermissionManager` | GA | `GA.sol` | no | — |
| `has_permission` | IPermissionManager | `IPermissionManager.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts`, `OnboardingIntegration.test.ts`, `ValidationCommitteeVoting.test.ts` |
| `hasRole` | IPermissionManager | `IPermissionManager.sol` | yes | `BDIAgentIntegration.test.ts`, `ConsortiumOptimisticGovernance.test.ts`, `MKMPOL21.ts`, `OnboardingIntegration.test.ts` |
| `canVote` | IPermissionManager | `IPermissionManager.sol` | yes | `MKMPOL21.ts` |
| `canPropose` | IPermissionManager | `IPermissionManager.sol` | yes | `MKMPOL21.ts` |

**64 of 97** external/public functions declared in `packages/hardhat/contracts/` appear at a call site in the test suite (33 do not).

## 3. Provenance caveat

Four test files (`ConsortiumOptimisticGovernance.test.ts`, `RDFDocumentAttestation.test.ts`,
`RDFGraphLifecycleValidation.test.ts`, `ValidationCommitteeVoting.test.ts`) are untracked, three
tracked test files are modified, and `test/YourContract.ts` is deleted in the working tree. Those
changes were made earlier in the same assistant session, before this measurement task. The
cross-check therefore describes the working tree, not commit `84faa5a`. No Solidity source
was modified at any point.

## 4. Known limits of the name-match

Some contract and function names are declared in more than one file, so a `yes` in the table above
cannot always be attributed to a specific contract:

Duplicate **contract** names:

- `GADataAccess` declared in `contracts/_MFSSIA_authentication.sol`, `contracts/_data_access.sol`
- `GADisputeResolution` declared in `contracts/_RDF_data_retrieval.sol`, `contracts/_dispute_resolution.sol`, `contracts/_membersip_manager.sol`

Duplicate external/public **function** names:

- `canPropose` in `MKMPOL21.sol`, `IPermissionManager.sol`
- `canVote` in `MKMPOL21.sol`, `IPermissionManager.sol`
- `castVote` in `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`
- `hasRole` in `MKMPOL21.sol`, `IPermissionManager.sol`
- `has_permission` in `MKMPOL21.sol`, `IPermissionManager.sol`
- `mint` in `MKMPOL21.sol`, `VotingPowerToken.sol`
- `onboard_institution` in `MKMPOL21.sol`, `_membersip_manager.sol`
- `onboard_ordinary_user` in `MKMPOL21.sol`, `_membersip_manager.sol`
- `proposalThreshold` in `Consortium.sol`, `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`
- `propose` in `Consortium.sol`, `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`
- `quorum` in `Consortium.sol`, `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`
- `remove_institution` in `MKMPOL21.sol`, `_membersip_manager.sol`
- `remove_ordinary_member` in `MKMPOL21.sol`, `_membersip_manager.sol`
- `setPermissionManager` in `_MFSSIA_authentication.sol`, `_RDF_data_retrieval.sol`, `_data_access.sol`, `_data_validation.sol`, `_dispute_resolution.sol`, `_membersip_manager.sol`, `GA.sol`
- `submit_query_to_eliza_agent` in `MKMPOL21.sol`, `_data_access.sol`
- `votingDelay` in `Consortium.sol`, `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`
- `votingPeriod` in `Consortium.sol`, `Dispute_Resolution_Board.sol`, `Validation_Committee.sol`

In particular, `remove_ordinary_member` and `remove_institution` are exercised in the tests as
`MKMPOL21` functions; the identically named functions in `_membersip_manager.sol` are not
deployed by any test and their `yes` is a false positive of the name match.

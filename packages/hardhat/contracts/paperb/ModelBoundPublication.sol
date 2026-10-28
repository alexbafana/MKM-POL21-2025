// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./BoundPublication.sol";

/// @notice Bounded local model-to-publication feasibility profile, not full lifecycle governance.
/// @dev Deployment compiler, mandate issuer, validator and publication adapter are trusted.
contract ModelBoundPublication {
    enum State {
        Missing,
        Candidate,
        Validated,
        Authorized,
        Pending,
        Confirmed
    }
    struct Config {
        bytes32 modelHash;
        bytes32 planHash;
        bytes32 policyHash;
        bytes32 assetKey;
        address producer;
        address validator;
        address executor;
        address governor;
        address[2] voters;
        uint64[3] validFrom;
        uint64[3] validUntil;
        uint64 delayBlocks;
        uint64 ttlBlocks;
    }
    struct Asset {
        bytes32 contentHash;
        bytes32 evidenceHash;
        uint256 proposalId;
        uint64 deadline;
        uint64 readyAt;
        State state;
        bytes32 receiptHash;
    }
    Config private configuration;
    mapping(address => uint64) public validFrom;
    mapping(address => uint64) public validUntil;
    mapping(bytes32 => Asset) public assets;
    event Submitted(bytes32 indexed assetId, bytes32 contentHash, bytes32 modelHash);
    event Validated(bytes32 indexed assetId, bytes32 evidenceHash);
    event Authorized(
        bytes32 indexed assetId,
        uint256 indexed decisionId,
        bytes32 planHash,
        bytes32 evidenceHash,
        uint64 deadline,
        uint64 readyAt
    );
    event Admitted(bytes32 indexed assetId, uint256 indexed decisionId, address executor);
    event Confirmed(
        bytes32 indexed assetId,
        uint256 indexed decisionId,
        bytes32 contentHash,
        bytes32 receiptHash,
        address executor
    );
    constructor(Config memory c) {
        require(
            c.modelHash != 0 && c.planHash != 0 && c.policyHash != 0 && c.assetKey != 0,
            "Model commitments required"
        );
        require(
            c.producer != address(0) && c.validator != address(0) && c.executor == c.producer,
            "Model actors required"
        );
        require(
            c.voters[0] == c.validator &&
                c.voters[1] != address(0) &&
                c.voters[1] != c.voters[0] &&
                c.producer != c.voters[0] &&
                c.producer != c.voters[1],
            "Model separation required"
        );
        require(c.governor.code.length > 0 && c.ttlBlocks > c.delayBlocks, "Invalid execution policy");
        configuration = c;
        address[3] memory actors = [c.producer, c.voters[0], c.voters[1]];
        for (uint i; i < 3; i++) {
            require(c.validUntil[i] > c.validFrom[i], "Invalid mandate interval");
            validFrom[actors[i]] = c.validFrom[i];
            validUntil[actors[i]] = c.validUntil[i];
        }
    }
    function config() external view returns (Config memory) {
        return configuration;
    }
    function mandateValid(address actor) public view returns (bool) {
        return validUntil[actor] != 0 && block.number >= validFrom[actor] && block.number <= validUntil[actor];
    }
    function submit(bytes32 hash) external returns (bytes32 id) {
        require(msg.sender == configuration.producer && mandateValid(msg.sender), "Producer mandate required");
        require(hash != 0, "Content required");
        id = keccak256(abi.encode(block.chainid, address(this), configuration.assetKey));
        require(assets[id].state == State.Missing, "Version exists");
        assets[id].contentHash = hash;
        assets[id].state = State.Candidate;
        emit Submitted(id, hash, configuration.modelHash);
    }
    function validate(bytes32 id, bool syntaxValid, bool semanticValid, bytes32 evidenceHash) external {
        require(msg.sender == configuration.validator && mandateValid(msg.sender), "Validator mandate required");
        require(assets[id].state == State.Candidate, "Candidate required");
        require(syntaxValid && semanticValid && evidenceHash != 0, "Validation required");
        assets[id].evidenceHash = evidenceHash;
        assets[id].state = State.Validated;
        emit Validated(id, evidenceHash);
    }
    function authorize(
        bytes32 id,
        uint64 deadline,
        bytes32 descriptionHash,
        bytes32 planHash,
        bytes32 evidenceHash
    ) external {
        Config memory c = configuration;
        require(msg.sender == c.governor, "Governor only");
        require(assets[id].state == State.Validated, "Validated required");
        require(planHash == c.planHash && evidenceHash == assets[id].evidenceHash, "Plan/evidence mismatch");
        require(mandateValid(c.voters[0]) && mandateValid(c.voters[1]), "Authorizer mandate required");
        require(deadline > block.number + c.delayBlocks && deadline <= block.number + c.ttlBlocks, "Invalid expiry");
        address[] memory targets = new address[](1);
        targets[0] = address(this);
        uint256[] memory values = new uint256[](1);
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeWithSelector(
            this.authorize.selector,
            id,
            deadline,
            descriptionHash,
            planHash,
            evidenceHash
        );
        uint256 decision = IPlanGovernor(c.governor).hashProposal(targets, values, calls, descriptionHash);
        require(IPlanGovernor(c.governor).state(decision) == 7, "Exact decision required");
        Asset storage a = assets[id];
        a.proposalId = decision;
        a.deadline = deadline;
        a.readyAt = uint64(block.number) + c.delayBlocks;
        a.state = State.Authorized;
        emit Authorized(id, decision, planHash, evidenceHash, deadline, a.readyAt);
    }
    function admit(bytes32 id, bytes32 planHash, bytes32 evidenceHash) external {
        require(msg.sender == configuration.executor && mandateValid(msg.sender), "Executor mandate required");
        Asset storage a = assets[id];
        require(a.state == State.Authorized, "Authorization required");
        require(block.number >= a.readyAt && block.number <= a.deadline, "Outside execution window");
        require(planHash == configuration.planHash && evidenceHash == a.evidenceHash, "Plan/evidence mismatch");
        // Atomic reservation, not atomic filesystem/chain execution.
        a.state = State.Pending;
        emit Admitted(id, a.proposalId, msg.sender);
    }
    function confirm(
        bytes32 id,
        uint256 decision,
        bytes32 observed,
        bytes32 publicationId,
        bytes32 receiptHash
    ) external {
        require(msg.sender == configuration.executor && mandateValid(msg.sender), "Executor mandate required");
        Asset storage a = assets[id];
        require(a.state == State.Pending, "Admission required");
        require(block.number <= a.deadline, "Authorization expired");
        require(decision == a.proposalId, "Decision mismatch");
        require(observed == a.contentHash && publicationId == a.contentHash, "Content mismatch");
        require(receiptHash != 0, "Receipt required");
        a.receiptHash = receiptHash;
        a.state = State.Confirmed;
        emit Confirmed(id, decision, observed, receiptHash, msg.sender);
    }
}

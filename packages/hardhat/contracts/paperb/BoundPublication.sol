// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPlanGovernor {
    function state(uint256) external view returns (uint8);
    function hashProposal(address[] memory, uint256[] memory, bytes[] memory, bytes32) external pure returns (uint256);
}

/// @notice Supplemental Paper B local integration profile; not a replacement for the legacy registry.
/// @dev The adapter is trusted to report read-back truth. On-chain equality cannot prove physical storage.
contract BoundPublication {
    enum State { Missing, Candidate, Validated, Authorized, Confirmed }
    struct Asset {
        bytes32 contentHash;
        bytes32 modelHash;
        bytes32 evidenceHash;
        uint256 proposalId;
        uint64 deadline;
        State state;
        bytes32 receiptHash;
    }
    address public immutable producer;
    address public immutable validator;
    address public immutable governor;
    address public immutable adapter;
    mapping(bytes32 => Asset) public assets;
    event Submitted(bytes32 indexed assetId, bytes32 contentHash, bytes32 modelHash, address producer);
    event Validated(bytes32 indexed assetId, bytes32 evidenceHash, address validator);
    event Authorized(bytes32 indexed assetId, uint256 indexed proposalId, bytes32 contentHash, uint64 deadline);
    event Confirmed(bytes32 indexed assetId, uint256 indexed proposalId, bytes32 publicationId, bytes32 receiptHash, address adapter);

    constructor(address p, address v, address g, address a) {
        require(p != address(0) && v != address(0) && a != address(0) && g.code.length > 0, "Invalid principals");
        require(p != v && p != a && v != a && g != p && g != v && g != a, "Distinct principals required");
        producer=p; validator=v; governor=g; adapter=a;
    }
    function submit(bytes32 dataset, uint64 version, bytes32 contentHash, bytes32 modelHash) external returns (bytes32 id) {
        require(msg.sender == producer, "Producer only");
        require(dataset != bytes32(0) && version > 0 && contentHash != bytes32(0) && modelHash != bytes32(0), "Invalid asset");
        id=keccak256(abi.encode(block.chainid,address(this),dataset,version));
        require(assets[id].state == State.Missing, "Version exists");
        assets[id].contentHash=contentHash; assets[id].modelHash=modelHash; assets[id].state=State.Candidate;
        emit Submitted(id,contentHash,modelHash,msg.sender);
    }
    function validate(bytes32 id, bool syntaxValid, bool semanticValid, bytes32 evidenceHash) external {
        require(msg.sender == validator, "Validator only");
        Asset storage a=assets[id]; require(a.state == State.Candidate, "Candidate required");
        require(syntaxValid && semanticValid && evidenceHash != bytes32(0), "Both validations required");
        a.evidenceHash=evidenceHash; a.state=State.Validated;
        emit Validated(id,evidenceHash,msg.sender);
    }
    /// @dev Supported policy is one exact authorization call in one executed Governor proposal.
    function authorize(bytes32 id, uint64 deadline, bytes32 descriptionHash) external {
        require(msg.sender == governor, "Governor only");
        Asset storage a=assets[id]; require(a.state == State.Validated, "Validated required");
        require(deadline > block.timestamp, "Authorization expired");
        address[] memory targets=new address[](1); targets[0]=address(this);
        uint256[] memory values=new uint256[](1);
        bytes[] memory calls=new bytes[](1); calls[0]=abi.encodeWithSelector(this.authorize.selector,id,deadline,descriptionHash);
        a.proposalId=IPlanGovernor(governor).hashProposal(targets,values,calls,descriptionHash);
        require(IPlanGovernor(governor).state(a.proposalId) == 7, "Exact decision not executed");
        a.deadline=deadline; a.state=State.Authorized;
        emit Authorized(id,a.proposalId,a.contentHash,deadline);
    }
    function confirm(bytes32 id, uint256 proposalId, bytes32 observedHash, bytes32 publicationId, bytes32 receiptHash) external {
        require(msg.sender == adapter, "Adapter only");
        Asset storage a=assets[id]; require(a.state == State.Authorized, "Authorization required");
        require(block.timestamp <= a.deadline, "Authorization expired");
        require(proposalId == a.proposalId, "Decision mismatch");
        require(observedHash == a.contentHash && publicationId == a.contentHash, "Content mismatch");
        require(receiptHash != bytes32(0), "Receipt required");
        a.receiptHash=receiptHash; a.state=State.Confirmed;
        emit Confirmed(id,proposalId,publicationId,receiptHash,msg.sender);
    }
}

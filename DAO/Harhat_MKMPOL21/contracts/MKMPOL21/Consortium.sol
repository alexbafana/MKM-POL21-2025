// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// @title Consortium in MKMPOL21, using the optimistic_governance protocol

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

import "./interfaces/IPermissionManager.sol";

contract Consortium is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    IPermissionManager public permissionManager;

    struct Proposal {
        bool vetoed;
        uint256 creationTime;
        bool executed;
    }

    uint256 public challengePeriod;
    mapping(uint256 => Proposal) public proposals;

    constructor(IVotes _token, address _permissionManager, uint256 _challengePeriod)
        Governor("Consortium") 
        GovernorSettings(7200 /* 1 day */, 50400 /* 1 week */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(0)
    {
        permissionManager = IPermissionManager(_permissionManager);
        challengePeriod = _challengePeriod;
    }

    // Permissioned propose
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    )
        public
        override(Governor)
        returns (uint256)
    {
        require(permissionManager.canPropose(msg.sender, 28), "User cannot propose");

        uint256 proposalId = super.propose(targets, values, calldatas, description);

        proposals[proposalId] = Proposal({
            vetoed: false,
            creationTime: block.timestamp,
            executed: false
        });

        return proposalId;
    }

    function vetoProposal(uint256 proposalId) public {
        require(permissionManager.canVote(msg.sender, 29), "User cannot vote");
        Proposal storage p = proposals[proposalId];
        require(!p.vetoed, "Proposal already vetoed");
        require(block.timestamp < p.creationTime + challengePeriod, "Challenge period expired");
        p.vetoed = true;
    }

    /// @notice Optimistic execution after challenge period if not vetoed
    function executeProposal(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public returns (uint256 proposalId) {
        proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        require(block.timestamp >= p.creationTime + challengePeriod, "Challenge period not over");
        require(!p.vetoed, "Vetoed");

        super.execute(targets, values, calldatas, descriptionHash);
        p.executed = true;
    }

    function votingDelay()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(Governor)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function proposalThreshold()
        public
        view
        override(Governor, GovernorSettings)
        returns (uint256)
    {
        return super.proposalThreshold();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// @title DisputeResolutionBoard in MKMPOL21, using the simple_majority protocol

import {Governor} from "@openzeppelin/contracts/governance/Governor.sol";
import {GovernorSettings} from "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import {GovernorCountingSimple} from "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import {GovernorVotes} from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import {GovernorVotesQuorumFraction} from "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import {IGovernor} from "@openzeppelin/contracts/governance/IGovernor.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

import "./interfaces/IPermissionManager.sol";

contract DisputeResolutionBoard is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction
{
    // State variables
    IPermissionManager public permissionManager;

    // Constructor
    constructor(IVotes _token, address _permissionManager)
        Governor("DisputeResolutionBoard")
        // votingDelay = 7200 blocks (~1 day), votingPeriod = 50400 blocks (~1 week), proposalThreshold = 0
        GovernorSettings(7200, 50400, 0)
        GovernorVotes(_token)
        // quorum = 0% (adjust to taste)
        GovernorVotesQuorumFraction(0)
    {
        permissionManager = IPermissionManager(_permissionManager);
    }

    // Permissioned voting
    function castVote(uint256 proposalId, uint8 support)
        public
        override /* Only Governor defines it; no multi-base collision */
        returns (uint256)
    {
        require(permissionManager.canVote(msg.sender, 33), "User cannot vote");
        return super.castVote(proposalId, support);
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
        require(permissionManager.canPropose(msg.sender, 32), "User cannot propose");
        return super.propose(targets, values, calldatas, description);
    }

    // -------- Required overrides (OZ v5) --------

    function votingDelay()
        public
        view
        override(GovernorSettings, IGovernor)
        returns (uint256)
    {
        return super.votingDelay();
    }

    function votingPeriod()
        public
        view
        override(GovernorSettings, IGovernor)
        returns (uint256)
    {
        return super.votingPeriod();
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(GovernorVotesQuorumFraction, IGovernor)
        returns (uint256)
    {
        return super.quorum(blockNumber);
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

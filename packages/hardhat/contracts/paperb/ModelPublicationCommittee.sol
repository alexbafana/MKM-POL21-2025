// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "../Validation_Committee.sol";

/// @notice Fixed-profile unanimous decision policy; administration and token allocation remain trusted.
contract ModelPublicationCommittee is ValidationCommittee {
    constructor(
        IVotes votes,
        address permissions,
        uint32 period
    ) ValidationCommittee(votes, permissions, 0, period, 100) {}

    // The inherited simple-majority rule would accept one yes plus one abstention.
    // Require all voting weight at the snapshot to be explicitly in favor.
    function _voteSucceeded(
        uint256 proposalId
    ) internal view override(Governor, GovernorCountingSimple) returns (bool) {
        (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) = proposalVotes(proposalId);
        return
            againstVotes == 0 &&
            abstainVotes == 0 &&
            forVotes > 0 &&
            forVotes == token.getPastTotalSupply(proposalSnapshot(proposalId));
    }
}

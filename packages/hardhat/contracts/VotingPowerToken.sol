// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
// If this import errors, switch to: "draft-ERC20Permit.sol"
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract VotingPowerToken is ERC20, ERC20Burnable, ERC20Permit, ERC20Votes, Ownable {
    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
        Ownable()
    {
        // In OZ v4, Ownable() sets msg.sender as owner; move to the address you pass in
        if (initialOwner != msg.sender) {
            _transferOwnership(initialOwner);
        }
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // --- Required overrides in OZ v4 when combining ERC20 + ERC20Votes ---
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
        // Auto-self-delegate on first token receipt so voting power is active immediately
        if (delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function _burn(address from, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(from, amount);
    }
}

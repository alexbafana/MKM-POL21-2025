// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADataAccess is GA, Ownable {
    IPermissionManager public pm;

    constructor(address permission_manager, address dao_manager) Ownable(dao_manager) {
        require(permission_manager != address(0), "pm is zero");
        require(dao_manager != address(0), "dm is zero");

        pm = IPermissionManager(permission_manager);
    }

    // optional: let the (contract) owner rotate itself to a new PM
    function setPermissionManager(address newPm) external onlyOwner {
        require(newPm != address(0), "new pm is zero");
        pm = IPermissionManager(newPm);
        _transferOwnership(newPm); // or transferOwnership(newPm);
    }
    function submit_query_to_eliza_agent() external  {
        require(pm.has_permission(msg.sender, 22), "cannot submit query to Eliza Agent");
            // TODO: Implement the function logic here
        }
}

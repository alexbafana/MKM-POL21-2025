// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADataAccess is GA, Ownable {
    IPermissionManager public pm;

    constructor(address permission_manager, address dao_manager) {
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
   
function Access_Challenge_Set() external{
         require(pm.has_permission(msg.sender, 11));
            // TODO: Implement the function logic here
        }

        function Validate_response() external {
            require(pm.has_permission(msg.sender, 12));
            // TODO: Implement the function logic here
        }

        function Access_Challenge_Response() external {
            require(pm.has_permission(msg.sender, 13));
            // TODO: Implement the function logic here
        } 

        function Green_light_authentication() external {
            require(pm.has_permission(msg.sender, 14));
            // TODO: Implement the function logic here
        }
        }
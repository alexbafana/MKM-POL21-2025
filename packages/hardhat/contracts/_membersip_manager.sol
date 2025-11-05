// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADisputeResolution is GA, Ownable {
    IPermissionManager public pm;

    constructor(address permission_manager, address dao_manager) {
        require(permission_manager != address(0), "pm is zero");
        require(dao_manager != address(0), "dm is zero");

        pm = IPermissionManager(permission_manager);
    }
     function setPermissionManager(address newPm) external onlyOwner {
        require(newPm != address(0), "new pm is zero");
        pm = IPermissionManager(newPm);
        _transferOwnership(newPm); 
    } 
function onboard_ordinary_user() external {
                require(pm.has_permission(msg.sender, 18));

            // TODO: Implement the function logic here
        }
                

        function onboard_institution() external{
            require(pm.has_permission(msg.sender, 19));

            // TODO: Implement the function logic here
        }
                

        function remove_ordinary_member() external {
            require(pm.has_permission(msg.sender, 20));

            // TODO: Implement the function logic here
        }
                

        function remove_institution() external {
            require(pm.has_permission(msg.sender, 21));

            // TODO: Implement the function logic here
        }
}
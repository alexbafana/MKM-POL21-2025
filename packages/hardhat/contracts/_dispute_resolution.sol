// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADisputeResolution is GA, Ownable {
    IPermissionManager public pm;
    revisionSession[] revisionSessions;
        


        struct revisionSession{
            address sender;
            bytes32 data_point_identifier; //keccak256 hash of data point
            string data_uri;
        }
        string statute_uri;
        bytes32 statute_hash;
    constructor(address permission_manager, address dao_manager) {
        require(permission_manager != address(0), "pm is zero");
        require(dao_manager != address(0), "dm is zero");

        pm = IPermissionManager(permission_manager);
    }
    function _triggerRevision()internal {

        }

    function setPermissionManager(address newPm) external onlyOwner {
        require(newPm != address(0), "new pm is zero");
        pm = IPermissionManager(newPm);
        _transferOwnership(newPm); 
    } 
            
        function request_revision_of_data() external {
            require(pm.has_permission(msg.sender, 1));

            // TODO: Implement the function logic here
        }
         function Propose_Modification_to_revision() external {
              require(pm.has_permission(msg.sender, 2));

            // TODO: Implement the function logic here
        }
        function Accept_revision() external {
            require(pm.has_permission(msg.sender, 0));
            //par: revisionSession ID (uint128)
            // TODO: Implement the function logic here
        }
        function Accept_modification_to_revision() external {
                         require(pm.has_permission(msg.sender, 3));

            // TODO: Implement the function logic here
    }   
}
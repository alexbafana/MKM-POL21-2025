// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";


contract GADaoManagement
{
string statuteURI; 
bytes32 statuteHash;
IPermissionManager pm ;
GA[] GA_contracts;

constructor(address permission_manager, address[] memory _GA_contracts)
{

pm = IPermissionManager(permission_manager);
for(uint i = 0; i<_GA_contracts.length; i++){
GA_contracts[i] = GA(_GA_contracts[i]);
}

}
 function Modify_Statute(string memory newUri, bytes32 newHash) external {
    require(pm.has_permission(msg.sender, 4),"user cannot modify the statute of the DAO");
    require(bytes(newUri).length > 0, "URI cannot be empty");
    require(newHash != bytes32(0), "Hash cannot be empty");
    statuteURI = newUri;
    statuteHash = newHash;
    }

    function Upgrade_Permission_Manager(address new_implementation) external {
    require(pm.has_permission(msg.sender, 5),"user cannot upgrade the smart contracts of the DAO");

    for(uint i = 0; i<GA_contracts.length; i++){
    GA_contracts[i].setPermissionManager(new_implementation);
    }

    }
    function setGA(address newGA )public {
    require(pm.has_permission(msg.sender, 5),"user cannot upgrade the smart contracts of the DAO");
    GA_contracts.push(GA(newGA));

    }
    function updateGA(address newGA, uint current_GA_index)public {
    require(current_GA_index < GA_contracts.length, "invalid index");
    require(pm.has_permission(msg.sender, 5),"user cannot upgrade the smart contracts of the DAO");
    GA_contracts[current_GA_index] = GA(newGA);
    GA_contracts[current_GA_index].setPermissionManager(address(pm));
    }
}
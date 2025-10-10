pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADataValidation is GA, Ownable {
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

    function Reject_data_point() external {
        require(pm.has_permission(msg.sender,6));
            // TODO: Implement the function logic here
        }                      

   function edit_data_point_inclusion_proposal() external {
             require(pm.has_permission(msg.sender, 7));

            // TODO: Implement the function logic here
        }
        function submit_data_point_inclusion_proposal() external {
            require(pm.has_permission(msg.sender, 8));
            // TODO: Implement the function logic here
        }
                

        function add_metadata() external {
            require(pm.has_permission(msg.sender, 9));
            // TODO: Implement the function logic here
        }
                

        function inspect_data_point() external{
        require(pm.has_permission(msg.sender, 10));

            // TODO: Implement the function logic here
        }
}
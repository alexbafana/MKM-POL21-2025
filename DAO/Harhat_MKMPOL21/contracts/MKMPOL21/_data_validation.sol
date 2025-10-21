pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

contract GADataValidation is GA, Ownable {
    IPermissionManager public pm;

//data format: 
//mapping uint->struct with all the data processed
//-struct datapoint with data content hash, status, and content_uri, metadata_hash, metadata_uri
//-enum with a set of possible states: rejected, approved, pending_approval
//-the function reject data point> takes the uint id as input and changes status to rejected
//-the function edit data point modifies the data hash and replace it with a new one provided as input. 

enum status {rejected, approved, pending_approval}
struct datapoint {
    status status;
    uint uid;
    bytes32 contentHash;
    bytes32 metadataHash;
    string dataUri;    
    }
mapping(uint=>datapoint) dataRegistry;
uint64 sessionCount;

event dataPointSessionOpened(uint indexed sessionId, bytes32 indexed contentHash, address indexed senderAddress);
    constructor(address permission_manager, address dao_manager) Ownable(dao_manager) {
        require(permission_manager != address(0), "pm is zero");
        require(dao_manager != address(0), "dm is zero");

        pm = IPermissionManager(permission_manager);
        sessionCount = 0;
    }

    function setPermissionManager(address newPm) external onlyOwner {
        require(newPm != address(0), "new pm is zero");
        pm = IPermissionManager(newPm);
        _transferOwnership(newPm); 
    }

     function submit_data_point_inclusion_proposal( string memory dataUri, bytes32 contentHash, bytes32 metadataHash) external {
            require(pm.has_permission(msg.sender, 8));
            //TODO: sanity checks on input data
            uint64 sessionId = sessionCount + 1;
            datapoint storage newDataPoint = dataRegistry[sessionId];
            newDataPoint.uid = sessionId;
            newDataPoint.contentHash = contentHash;
            newDataPoint.metadataHash = metadataHash;
            newDataPoint.dataUri = dataUri;
            newDataPoint.status = status.pending_approval;
        }
    function Reject_data_point() external {
        require(pm.has_permission(msg.sender,6));
            // TODO: Implement the function logic here
        }                      

   function edit_data_point_inclusion_proposal() external {
             require(pm.has_permission(msg.sender, 7));

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
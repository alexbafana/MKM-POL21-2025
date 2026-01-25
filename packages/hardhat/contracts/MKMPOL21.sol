// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
/**
 * @title MKMPOL21
 * @notice Manage the governance of public data
 */
import "./interfaces/IPermissionManager.sol";
contract MKMPOL21 is IPermissionManager {
    bool internal committee_initialization_blocked;
    mapping(address => uint32) internal roles;
    uint64[9] internal role_permissions;
    uint32[9] internal all_roles = [
        1152, // #0) Member_Institution -> ID : 0 , control bitmask: 100100
        1153, // #1) Ordinary_User -> ID : 1 , control bitmask: 100100
        3074, // #2) MFSSIA_Guardian_Agent -> ID : 2 , control bitmask: 1100000
        3075, // #3) Eliza_Data_Extractor_Agent -> ID : 3 , control bitmask: 1100000
        1156, // #4) Data_Validator -> ID : 4 , control bitmask: 100100
        1029, // #5) MKMPOL21Owner -> ID : 5 , control bitmask: 100000
        1030, // #6)  Consortium -> ID : 6 , control bitmask: 100000
        1031, // #7)  Validation_Committee -> ID : 7 , control bitmask: 100000
        1032 // #8)  Dispute_Resolution_Board -> ID : 8 , control bitmask: 100000
    ];
 //Events
    event RoleRevoked(address indexed user, uint32 indexed role);
    event RoleAssigned(address indexed user, uint32 indexed role);
    event PermissionGranted(uint32 indexed role, uint64 indexed permission);
    event PermissionRevoked(uint32 indexed role, uint64 indexed permission);



        modifier controlledBy(address sender, uint32 user_role_id, bool allowNullRole_user, uint32 new_role_id) {
            //we obtain the control relations of the controller role by shifting the its id by the number of bits contained in ids
            //the sender must control BOTH the target role AND the user's role

            uint32 index_new_role = new_role_id & 31;
            uint32 sender_role_index = ( uint32(1) << ( roles[sender] & 31 ) );

            require(
                ( // the new role must be a valid one
                    index_new_role < 9 // checking for "index out of bounds"
                )
                && ( // "check the sender and target user control relation"
                    (allowNullRole_user && (user_role_id == 0)) || // allow to add role if the user doesn't have one
                    ((
                        (user_role_id >> 5) // get the user role's bitmask 
                        &  // (... and then perform the bitwise-and with ...)
                        sender_role_index
                    ) != 0) // final check
                ) &&
                ( // "control relation check between sender and the target role"
                    (
                        ( all_roles[index_new_role] >> 5) // get the new role's bitmask from those internally stored
                        &  // (... and then perform the bitwise-and with ...)
                        sender_role_index
                    ) != 0 // final check
                )
                , "the given controller can't perform the given operation on the given controlled one" );
            _;
        }
        

 
    modifier hasPermission(address _executor, uint64 _permissionIndex) {
        require(role_permissions[uint64(roles[_executor] & 31)] & (uint64(1) << _permissionIndex) != 0, "User does not have this permission");
        _;
    }
            
    constructor(
) {
        role_permissions[0] = 999999999; // #0) Member_Institution 

        role_permissions[1] = 12889096202; // #1) Ordinary_User 

        role_permissions[2] = 26507264; // #2) MFSSIA_Guardian_Agent 

        role_permissions[3] = 229376; // #3) Eliza_Data_Extractor_Agent 

        role_permissions[4] = 16915628938; // #4) Data_Validator 

        role_permissions[5] = 17179869183; // #5) MKMPOL21Owner 

        role_permissions[6] = 237502512; // #6) Consortium 

        role_permissions[7] = 1088; // #7) Validation_Committee 

        role_permissions[8] = 5; // #8) Dispute_Resolution_Board 

roles[msg.sender] = all_roles[5]; // MKMPOL21Owner
}
    function initializeCommittees(address _Consortium, address _Validation_Committee, address _Dispute_Resolution_Board) external {
        require(roles[msg.sender] == all_roles[5], "Only the owner can initialize the Dao");  // MKMPOL21Owner
    require(committee_initialization_blocked == false && _Consortium != address(0) && _Validation_Committee != address(0) && _Dispute_Resolution_Board != address(0), "Invalid committee initialization");
        roles[_Consortium] = all_roles[6]; // Consortium (was incorrectly all_roles[0])
        roles[_Validation_Committee] = all_roles[7]; // Validation_Committee (was incorrectly all_roles[1])
        roles[_Dispute_Resolution_Board] = all_roles[8]; // Dispute_Resolution_Board (was incorrectly all_roles[2])
        committee_initialization_blocked = true;
    }

        
        function canControl(uint32 controller, uint32 controlled) public pure returns(bool controls){
             // ( "CAN the sender control the target user (through its role)?"
                //(allowNullRole && (target_role_id == 0)) || // allow to add role if the user has not already one assigned to it
                if((
                    (controlled >> 5 ) // get the role's bitmask 
                    &  // (and then perform the bitwise-and with ...)
                    (uint32(1) << ( controller & 31 )) // (...) get the sender role's index AND shift it accordingly 
                ) != 0 ){
                    controls = true;
                     return controls;} else {return controls;}
        }
        
        function assignRole(address _user, uint32 _role) external controlledBy(msg.sender, roles[_user], true, _role) {
            require(_user != address(0) , "Invalid user address" );
            
            roles[_user] = _role;
            emit RoleAssigned(_user, _role);
        }

        function revokeRole(address _user, uint32 _role) external controlledBy(msg.sender, roles[_user], false, _role) {
            require(roles[_user] == _role, "User's role and the role to be removed don't coincide" );

            delete roles[_user];
            emit RoleRevoked(_user, _role);
        }

        function grantPermission(uint32 _role, uint64 _permissionIndex) external hasPermission(msg.sender, _permissionIndex) {
            require(canControl(roles[msg.sender], _role), "cannot grant permission, as the control relation is lacking");
            uint64 new_role_perm_value;
            new_role_perm_value  = role_permissions[_role & 31 ] | (uint64(1) << _permissionIndex);
            role_permissions[_role & 31 ] = new_role_perm_value;
            
            emit PermissionGranted(_role, _permissionIndex);
        }

        function revokePermission(uint32 _role, uint64  _permissionIndex) external hasPermission(msg.sender, _permissionIndex) {
            require(canControl(roles[msg.sender], _role), "cannot revoke permission, as the control relation is lacking");
            uint64 new_role_perm_value;
            new_role_perm_value = role_permissions[_role & 31] & ~(uint64(1) << _permissionIndex);
            role_permissions[_role & 31] = new_role_perm_value;

            emit PermissionRevoked(_role, _permissionIndex);
        }

        function hasRole(address user) external view returns(uint32) {
            return roles[user];
        }

        function has_permission(address user, uint64 _permissionIndex) external view returns (bool) {
            // If user has no role, they have no permissions
            if (roles[user] == 0) {
                return false;
            }
            if (role_permissions[uint64(roles[user] & 31)] & (uint64(1) << _permissionIndex) != 0){ 
                return true;
            }else{
                return false;
            }
        }
        
        function onboard_ordinary_user() external {
            require(roles[msg.sender] == 0, "User already has a role");
            // TODO: Add MFSSIA verification check here
            roles[msg.sender] = all_roles[1]; // Ordinary_User (index 1, value 1153)
            emit RoleAssigned(msg.sender, all_roles[1]);
        }

        function onboard_institution() external {
            require(roles[msg.sender] == 0, "User already has a role");
            // TODO: Add MFSSIA verification check here
            roles[msg.sender] = all_roles[0]; // Member_Institution (index 0, value 1152)
            emit RoleAssigned(msg.sender, all_roles[0]);
        }

        // ===== MFSSIA ATTESTATION SYSTEM =====

        struct Attestation {
            string ual;
            uint256 expiresAt;
            bool verified;
        }

        struct RDFDocument {
            string documentHash;
            string attestationUAL;
            address submitter;
            uint256 submittedAt;
            bool validated;
            uint8 challengesPassed;
        }

        mapping(address => Attestation) public userAttestations;
        mapping(bytes32 => RDFDocument) public rdfDocuments;

        uint256 public constant ATTESTATION_VALIDITY_PERIOD = 365 days;

        event AttestationVerified(address indexed user, string ual, uint256 expiresAt);
        event AttestationExpired(address indexed user);
        event RDFSubmitted(bytes32 indexed docId, address indexed submitter, string attestationUAL);
        event RDFValidated(bytes32 indexed docId, bool validated, uint8 challengesPassed);

        /**
         * Onboard ordinary user with MFSSIA attestation
         * @param attestationUAL Universal Attestation Locator from MFSSIA
         */
        function onboard_ordinary_user_with_attestation(string memory attestationUAL) external {
            require(roles[msg.sender] == 0, "User already has a role");
            require(bytes(attestationUAL).length > 0, "Invalid attestation");

            // Store attestation
            userAttestations[msg.sender] = Attestation({
                ual: attestationUAL,
                expiresAt: block.timestamp + ATTESTATION_VALIDITY_PERIOD,
                verified: true
            });

            // Assign role
            roles[msg.sender] = all_roles[1]; // Ordinary_User (1153)

            emit RoleAssigned(msg.sender, all_roles[1]);
            emit AttestationVerified(msg.sender, attestationUAL, block.timestamp + ATTESTATION_VALIDITY_PERIOD);
        }

        /**
         * Onboard institution with MFSSIA attestation
         * @param attestationUAL Universal Attestation Locator from MFSSIA
         */
        function onboard_institution_with_attestation(string memory attestationUAL) external {
            require(roles[msg.sender] == 0, "User already has a role");
            require(bytes(attestationUAL).length > 0, "Invalid attestation");

            // Store attestation
            userAttestations[msg.sender] = Attestation({
                ual: attestationUAL,
                expiresAt: block.timestamp + ATTESTATION_VALIDITY_PERIOD,
                verified: true
            });

            // Assign role
            roles[msg.sender] = all_roles[0]; // Member_Institution (1152)

            emit RoleAssigned(msg.sender, all_roles[0]);
            emit AttestationVerified(msg.sender, attestationUAL, block.timestamp + ATTESTATION_VALIDITY_PERIOD);
        }

        /**
         * Submit RDF document with MFSSIA Example D validation
         * @param documentHash SHA-256 hash of the RDF content
         * @param attestationUAL MFSSIA attestation from Example D verification
         * @param challengesPassed Number of challenges passed (0-9)
         */
        function submitRDFDocument(
            string memory documentHash,
            string memory attestationUAL,
            uint8 challengesPassed
        ) external returns (bytes32) {
            require(
                roles[msg.sender] == all_roles[0] || roles[msg.sender] == all_roles[5],
                "Only institutions and owners can submit RDF"
            );
            require(bytes(documentHash).length > 0, "Invalid document hash");
            require(bytes(attestationUAL).length > 0, "Invalid attestation");
            require(challengesPassed <= 9, "Invalid challenges count");

            bytes32 docId = keccak256(abi.encodePacked(documentHash, msg.sender, block.timestamp));

            // Require at least 8/9 challenges to pass for validation
            bool validated = challengesPassed >= 8;

            rdfDocuments[docId] = RDFDocument({
                documentHash: documentHash,
                attestationUAL: attestationUAL,
                submitter: msg.sender,
                submittedAt: block.timestamp,
                validated: validated,
                challengesPassed: challengesPassed
            });

            emit RDFSubmitted(docId, msg.sender, attestationUAL);
            emit RDFValidated(docId, validated, challengesPassed);

            return docId;
        }

        /**
         * Check if user's attestation is still valid
         */
        function isAttestationValid(address user) public view returns (bool) {
            Attestation memory attestation = userAttestations[user];
            return attestation.verified && block.timestamp < attestation.expiresAt;
        }

        /**
         * Get user's attestation details
         */
        function getAttestation(address user) external view returns (
            string memory ual,
            uint256 expiresAt,
            bool verified,
            bool isExpired
        ) {
            Attestation memory attestation = userAttestations[user];
            return (
                attestation.ual,
                attestation.expiresAt,
                attestation.verified,
                block.timestamp >= attestation.expiresAt
            );
        }

        /**
         * Get RDF document details
         */
        function getRDFDocument(bytes32 docId) external view returns (
            string memory documentHash,
            string memory attestationUAL,
            address submitter,
            uint256 submittedAt,
            bool validated,
            uint8 challengesPassed
        ) {
            RDFDocument memory doc = rdfDocuments[docId];
            return (
                doc.documentHash,
                doc.attestationUAL,
                doc.submitter,
                doc.submittedAt,
                doc.validated,
                doc.challengesPassed
            );
        }


        function remove_ordinary_member() external hasPermission(msg.sender, 20) {
            // TODO: Implement the function logic here
        }
                

        function remove_institution() external hasPermission(msg.sender, 21) {
            // TODO: Implement the function logic here
        }
                

        function submit_query_to_eliza_agent() external hasPermission(msg.sender, 22) {
            // TODO: Implement the function logic here
        }
                

        function Issue_DID() external hasPermission(msg.sender, 23) {
            // TODO: Implement the function logic here
        }
                

        function Burn_DID() external hasPermission(msg.sender, 24) {
            // TODO: Implement the function logic here
        }
                

        function mint_MKMT() external hasPermission(msg.sender, 25) {
            // TODO: Implement the function logic here
        }
                

        function burn_MKMT() external hasPermission(msg.sender, 26) {
            // TODO: Implement the function logic here
        }
                

        function distribute_MKMT() external hasPermission(msg.sender, 27) {
            // TODO: Implement the function logic here
        }
         

    //     function request_revision_of_data() external hasPermission(msg.sender, 1) {
    //         // TODO: Implement the function logic here
    //     }
    //      function Propose_Modification_to_revision() external hasPermission(msg.sender, 2) {
    //         // TODO: Implement the function logic here
    //     }
    //     function Accept_revision() external hasPermission(msg.sender, 0) {
    //         //par: revisionSession ID (uint128)
    //         // TODO: Implement the function logic here
    //     }
    //     function Accept_modification_to_revision() external hasPermission(msg.sender, 3) {
    //         // TODO: Implement the function logic here
    // }   

    //  function Reject_data_point() external hasPermission(msg.sender, 6) {
    //         // TODO: Implement the function logic here
    //     }                      

        // function edit_data_point_inclusion_proposal() external hasPermission(msg.sender, 7) {
        //     // TODO: Implement the function logic here
        // }
                

        // function submit_data_point_inclusion_proposal() external hasPermission(msg.sender, 8) {
        //     // TODO: Implement the function logic here
        // }
                

        // function add_metadata() external hasPermission(msg.sender, 9) {
        //     // TODO: Implement the function logic here
        // }
                

        // function inspect_data_point() external hasPermission(msg.sender, 10) {
        //     // TODO: Implement the function logic here
        // }
                
/*
        function Access_Challenge_Set() external hasPermission(msg.sender, 11) {
            // TODO: Implement the function logic here
        }
                

        function Validate_response() external hasPermission(msg.sender, 12) {
            // TODO: Implement the function logic here
        }
                

        function Access_Challenge_Response() external hasPermission(msg.sender, 13) {
            // TODO: Implement the function logic here
        }
                

        function Green_light_authentication() external hasPermission(msg.sender, 14) {
            // TODO: Implement the function logic here
        }
        */
        // function Retrieve_Data() external hasPermission(msg.sender, 15) {
        //     // TODO: Implement the function logic here
        // }
                

        // function Make_Prediction() external hasPermission(msg.sender, 16) {
        //     // TODO: Implement the function logic here
        // }
                
        // function Notify_Contradiction() external hasPermission(msg.sender, 17) {
        //     // TODO: Implement the function logic here
        // }

                

            function canVote(address user, uint64 permissionIndex) external view returns (bool) {
                // If user has no role, they cannot vote
                if (roles[user] == 0) {
                    return false;
                }
                require(role_permissions[uint64(roles[user] & 31)] & (uint64(1) << permissionIndex) != 0, "User does not have this permission");
                return true;
            }

            function canPropose(address user, uint64 permissionIndex) external view returns (bool) {
                // If user has no role, they cannot propose
                if (roles[user] == 0) {
                    return false;
                }
                require(role_permissions[uint64(roles[user] & 31)] & (uint64(1) << permissionIndex) != 0, "User does not have this permission");
                return true;
            }
}

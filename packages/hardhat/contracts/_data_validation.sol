// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IPermissionManager.sol";
import "./interfaces/GA.sol";

/**
 * @title GADataValidation
 * @notice Governance Area for Data Validation
 * @dev Manages data point proposals and RDF graph registry with committee approval workflow
 */
contract GADataValidation is GA, Ownable {
    IPermissionManager public pm;

    // ===== DATA POINT STRUCTURES (Legacy) =====

    enum status {rejected, approved, pending_approval}

    struct datapoint {
        status status;
        uint uid;
        bytes32 contentHash;
        bytes32 metadataHash;
        string dataUri;
    }

    mapping(uint => datapoint) public dataRegistry;
    uint64 public sessionCount;

    // ===== RDF GRAPH REGISTRY =====

    enum GraphType {
        ARTICLES,       // 0: articles.ttl
        ENTITIES,       // 1: entities.ttl
        MENTIONS,       // 2: mentions.ttl
        NLP,            // 3: nlp.ttl
        ECONOMICS,      // 4: economics.ttl
        RELATIONS,      // 5: relations.ttl
        PROVENANCE      // 6: provenance.ttl
    }

    enum DatasetVariant {
        ERR_ONLINE,     // 0: ERR online content
        OL_ONLINE,      // 1: Õhtuleht online content
        OL_PRINT,       // 2: Õhtuleht print content
        ARIREGISTER     // 3: Estonian Business Registry
    }

    struct RDFGraph {
        bytes32 graphHash;              // SHA-256 hash of TTL content
        string graphURI;                // Named graph IRI (e.g., urn:graph:articles)
        GraphType graphType;            // Type of graph
        DatasetVariant datasetVariant;  // Dataset source
        uint256 year;                   // Dataset year (2019, 2020, etc.)
        uint256 version;                // Incremental version number
        address submitter;              // Who submitted the graph
        uint256 submittedAt;            // Timestamp of submission
        bool validated;                 // Passed overall validation (syntax AND semantic)
        bool syntaxValid;               // Passed N3.js syntax validation
        bool semanticValid;             // Passed SHACL semantic validation
        string validationErrors;        // Error summary (first 256 chars)
        bool committeeApproved;         // Approved by Validation Committee
        bool publishedToDKG;            // Published to OriginTrail DKG
        string dkgAssetUAL;             // DKG asset identifier
        string modelVersion;            // NLP model version (e.g., "EstBERT-1.0")
    }

    // Mapping: graphId => RDFGraph
    mapping(bytes32 => RDFGraph) public rdfGraphRegistry;

    // Mapping: datasetVariant_year => array of graphIds
    mapping(bytes32 => bytes32[]) public datasetGraphs;

    // Counter for RDF graphs
    uint256 public rdfGraphCount;

    // ===== EVENTS =====

    // Legacy events
    event dataPointSessionOpened(uint indexed sessionId, bytes32 indexed contentHash, address indexed senderAddress);
    event DataPointRejected(uint indexed sessionId, address indexed rejector);
    event DataPointApproved(uint indexed sessionId, address indexed approver);
    event DataPointEdited(uint indexed sessionId, bytes32 indexed newContentHash);

    // RDF graph events
    event RDFGraphSubmitted(
        bytes32 indexed graphId,
        string graphURI,
        DatasetVariant indexed variant,
        uint256 indexed year,
        GraphType graphType
    );
    event RDFGraphValidated(bytes32 indexed graphId, bool syntaxValid, address indexed validator);
    event RDFGraphValidatedDetailed(
        bytes32 indexed graphId,
        bool syntaxValid,
        bool semanticValid,
        string errorSummary,
        address indexed validator
    );
    event RDFGraphApproved(bytes32 indexed graphId, address indexed approver);
    event RDFGraphPublishedToDKG(bytes32 indexed graphId, string dkgAssetUAL);
    event RDFGraphVersionIncremented(
        bytes32 indexed oldGraphId,
        bytes32 indexed newGraphId,
        uint256 newVersion
    );

    // ===== CONSTRUCTOR =====

    constructor(address permission_manager, address dao_manager) {
        require(permission_manager != address(0), "pm is zero");
        require(dao_manager != address(0), "dm is zero");

        pm = IPermissionManager(permission_manager);
        sessionCount = 0;
        rdfGraphCount = 0;
    }

    // ===== PERMISSION MANAGER FUNCTIONS =====

    function setPermissionManager(address newPm) external onlyOwner {
        require(newPm != address(0), "new pm is zero");
        pm = IPermissionManager(newPm);
        _transferOwnership(newPm);
    }

    // ===== DATA POINT FUNCTIONS (Legacy) =====

    /**
     * @notice Submit data point inclusion proposal
     * @dev Requires permission 8 (Member Institution)
     */
    function submit_data_point_inclusion_proposal(
        string memory dataUri,
        bytes32 contentHash,
        bytes32 metadataHash
    ) external {
        require(pm.has_permission(msg.sender, 8), "No permission to submit data point");
        require(contentHash != bytes32(0), "Invalid content hash");
        require(bytes(dataUri).length > 0, "Invalid data URI");

        sessionCount++;
        uint64 sessionId = sessionCount;

        datapoint storage newDataPoint = dataRegistry[sessionId];
        newDataPoint.uid = sessionId;
        newDataPoint.contentHash = contentHash;
        newDataPoint.metadataHash = metadataHash;
        newDataPoint.dataUri = dataUri;
        newDataPoint.status = status.pending_approval;

        emit dataPointSessionOpened(sessionId, contentHash, msg.sender);
    }

    /**
     * @notice Reject data point proposal
     * @dev Requires permission 6 (Validation Committee)
     */
    function Reject_data_point(uint sessionId) external {
        require(pm.has_permission(msg.sender, 6), "No permission to reject");
        require(dataRegistry[sessionId].uid == sessionId, "Data point does not exist");
        require(dataRegistry[sessionId].status == status.pending_approval, "Not pending approval");

        dataRegistry[sessionId].status = status.rejected;

        emit DataPointRejected(sessionId, msg.sender);
    }

    /**
     * @notice Approve data point proposal
     * @dev Internal function called after validation
     */
    function approve_data_point(uint sessionId) internal {
        require(dataRegistry[sessionId].uid == sessionId, "Data point does not exist");
        require(dataRegistry[sessionId].status == status.pending_approval, "Not pending approval");

        dataRegistry[sessionId].status = status.approved;

        emit DataPointApproved(sessionId, msg.sender);
    }

    /**
     * @notice Edit data point inclusion proposal
     * @dev Requires permission 7 (Data Validator)
     */
    function edit_data_point_inclusion_proposal(
        uint sessionId,
        bytes32 newContentHash,
        bytes32 newMetadataHash
    ) external {
        require(pm.has_permission(msg.sender, 7), "No permission to edit");
        require(dataRegistry[sessionId].uid == sessionId, "Data point does not exist");
        require(newContentHash != bytes32(0), "Invalid content hash");

        dataRegistry[sessionId].contentHash = newContentHash;
        dataRegistry[sessionId].metadataHash = newMetadataHash;

        emit DataPointEdited(sessionId, newContentHash);
    }

    /**
     * @notice Add metadata to existing data point
     * @dev Requires permission 9
     */
    function add_metadata(uint sessionId, bytes32 metadataHash) external {
        require(pm.has_permission(msg.sender, 9), "No permission to add metadata");
        require(dataRegistry[sessionId].uid == sessionId, "Data point does not exist");

        dataRegistry[sessionId].metadataHash = metadataHash;
    }

    /**
     * @notice Inspect data point details
     * @dev Requires permission 10
     */
    function inspect_data_point(uint sessionId) external view returns (
        uint uid,
        bytes32 contentHash,
        bytes32 metadataHash,
        string memory dataUri,
        status currentStatus
    ) {
        require(pm.has_permission(msg.sender, 10), "No permission to inspect");
        require(dataRegistry[sessionId].uid == sessionId, "Data point does not exist");

        datapoint memory dp = dataRegistry[sessionId];
        return (dp.uid, dp.contentHash, dp.metadataHash, dp.dataUri, dp.status);
    }

    // ===== RDF GRAPH FUNCTIONS =====

    /**
     * @notice Submit RDF graph with full metadata
     * @dev Requires permission 8 (Member Institution) - same as data point submission
     * @param graphURI Named graph IRI (e.g., urn:graph:articles)
     * @param graphHash SHA-256 hash of TTL content
     * @param graphType Type of graph (articles, entities, etc.)
     * @param datasetVariant Dataset source (ERR, OL online, etc.)
     * @param year Dataset year
     * @param modelVersion NLP model version string
     * @return graphId Unique identifier for this graph
     */
    function submitRDFGraph(
        string memory graphURI,
        bytes32 graphHash,
        GraphType graphType,
        DatasetVariant datasetVariant,
        uint256 year,
        string memory modelVersion
    ) external returns (bytes32) {
        require(pm.has_permission(msg.sender, 8), "No permission to submit RDF graph");
        require(graphHash != bytes32(0), "Invalid graph hash");
        require(bytes(graphURI).length > 0, "Invalid graph URI");
        require(year >= 2000 && year <= 2100, "Invalid year");

        // Generate unique graph ID
        bytes32 graphId = keccak256(abi.encodePacked(
            graphURI,
            graphHash,
            datasetVariant,
            year,
            block.timestamp,
            msg.sender
        ));

        // Check for duplicate
        require(rdfGraphRegistry[graphId].submittedAt == 0, "Graph already exists");

        // Get version number (check previous versions for same dataset/year)
        bytes32 datasetKey = keccak256(abi.encodePacked(datasetVariant, year));
        uint256 version = datasetGraphs[datasetKey].length + 1;

        // Store graph metadata
        rdfGraphRegistry[graphId] = RDFGraph({
            graphHash: graphHash,
            graphURI: graphURI,
            graphType: graphType,
            datasetVariant: datasetVariant,
            year: year,
            version: version,
            submitter: msg.sender,
            submittedAt: block.timestamp,
            validated: false,                 // Will be set by validator (overall pass)
            syntaxValid: false,               // Will be set by syntax validator
            semanticValid: false,             // Will be set by semantic validator
            validationErrors: "",             // Will be populated if validation fails
            committeeApproved: false,         // Requires committee vote
            publishedToDKG: false,
            dkgAssetUAL: "",
            modelVersion: modelVersion
        });

        // Add to dataset collection
        datasetGraphs[datasetKey].push(graphId);

        // Increment counter
        rdfGraphCount++;

        emit RDFGraphSubmitted(graphId, graphURI, datasetVariant, year, graphType);

        return graphId;
    }

    /**
     * @notice Mark RDF graph as validated (syntax check passed)
     * @dev Requires permission 4 (Data Validator role)
     * @param graphId Unique graph identifier
     * @param isValid Whether validation passed
     */
    function markRDFGraphValidated(bytes32 graphId, bool isValid) external {
        require(pm.has_permission(msg.sender, 4), "No permission to validate");
        require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");

        rdfGraphRegistry[graphId].validated = isValid;
        // For backwards compatibility, also set syntaxValid
        rdfGraphRegistry[graphId].syntaxValid = isValid;

        emit RDFGraphValidated(graphId, isValid, msg.sender);
    }

    /**
     * @notice Mark RDF graph as validated with detailed results
     * @dev Requires permission 4 (Data Validator role)
     * @param graphId Unique graph identifier
     * @param _syntaxValid Whether N3.js syntax validation passed
     * @param _semanticValid Whether SHACL semantic validation passed
     * @param errorSummary Summary of validation errors (max 256 chars recommended)
     */
    function markRDFGraphValidatedWithDetails(
        bytes32 graphId,
        bool _syntaxValid,
        bool _semanticValid,
        string calldata errorSummary
    ) external {
        require(pm.has_permission(msg.sender, 4), "No permission to validate");
        require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");

        // Update validation fields
        rdfGraphRegistry[graphId].syntaxValid = _syntaxValid;
        rdfGraphRegistry[graphId].semanticValid = _semanticValid;
        rdfGraphRegistry[graphId].validationErrors = errorSummary;

        // Overall validated = syntax AND semantic both pass
        rdfGraphRegistry[graphId].validated = _syntaxValid && _semanticValid;

        emit RDFGraphValidatedDetailed(graphId, _syntaxValid, _semanticValid, errorSummary, msg.sender);
    }

    /**
     * @notice Approve RDF graph for publication
     * @dev Requires permission 6 (Validation Committee)
     * @param graphId Unique graph identifier
     */
    function approveRDFGraph(bytes32 graphId) external {
        require(pm.has_permission(msg.sender, 6), "No permission to approve");
        require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");
        require(rdfGraphRegistry[graphId].syntaxValid, "Graph must pass syntax validation first");
        require(!rdfGraphRegistry[graphId].committeeApproved, "Already approved");

        rdfGraphRegistry[graphId].committeeApproved = true;

        emit RDFGraphApproved(graphId, msg.sender);
    }

    /**
     * @notice Mark RDF graph as published to DKG
     * @dev Requires Data Validator (role 4) or Owner (role 5) - called after successful OriginTrail publication
     * @param graphId Unique graph identifier
     * @param dkgAssetUAL DKG asset UAL from OriginTrail
     */
    function markRDFGraphPublished(bytes32 graphId, string memory dkgAssetUAL) external {
        uint32 senderRole = pm.hasRole(msg.sender);
        uint32 roleIndex = senderRole & 31;
        require(roleIndex == 4 || roleIndex == 5, "Only Data Validator or Owner can mark published");
        require(rdfGraphRegistry[graphId].submittedAt > 0, "Graph does not exist");
        require(rdfGraphRegistry[graphId].committeeApproved, "Graph must be approved first");
        require(!rdfGraphRegistry[graphId].publishedToDKG, "Already published");
        require(bytes(dkgAssetUAL).length > 0, "Invalid DKG asset UAL");

        rdfGraphRegistry[graphId].publishedToDKG = true;
        rdfGraphRegistry[graphId].dkgAssetUAL = dkgAssetUAL;

        emit RDFGraphPublishedToDKG(graphId, dkgAssetUAL);
    }

    // ===== VIEW FUNCTIONS =====

    /**
     * @notice Get RDF graph basic info
     * @param graphId Unique graph identifier
     */
    function getRDFGraphBasicInfo(bytes32 graphId) external view returns (
        bytes32 graphHash,
        string memory graphURI,
        GraphType graphType,
        DatasetVariant datasetVariant,
        uint256 year,
        uint256 version
    ) {
        RDFGraph storage graph = rdfGraphRegistry[graphId];
        return (
            graph.graphHash,
            graph.graphURI,
            graph.graphType,
            graph.datasetVariant,
            graph.year,
            graph.version
        );
    }

    /**
     * @notice Get RDF graph metadata
     * @param graphId Unique graph identifier
     */
    function getRDFGraphMetadata(bytes32 graphId) external view returns (
        address submitter,
        uint256 submittedAt,
        string memory modelVersion,
        string memory dkgAssetUAL
    ) {
        RDFGraph storage graph = rdfGraphRegistry[graphId];
        return (
            graph.submitter,
            graph.submittedAt,
            graph.modelVersion,
            graph.dkgAssetUAL
        );
    }

    /**
     * @notice Get all graph IDs for a specific dataset variant and year
     * @param datasetVariant Dataset source
     * @param year Dataset year
     */
    function getDatasetGraphs(DatasetVariant datasetVariant, uint256 year)
        external
        view
        returns (bytes32[] memory)
    {
        bytes32 datasetKey = keccak256(abi.encodePacked(datasetVariant, year));
        return datasetGraphs[datasetKey];
    }

    /**
     * @notice Check if RDF graph is ready for DKG publication
     * @param graphId Unique graph identifier
     */
    function isReadyForPublication(bytes32 graphId) external view returns (bool) {
        RDFGraph memory graph = rdfGraphRegistry[graphId];
        return graph.syntaxValid && graph.committeeApproved && !graph.publishedToDKG;
    }

    /**
     * @notice Get graph status summary
     * @param graphId Unique graph identifier
     */
    function getGraphStatus(bytes32 graphId) external view returns (
        bool exists,
        bool validated,
        bool approved,
        bool published
    ) {
        RDFGraph memory graph = rdfGraphRegistry[graphId];
        return (
            graph.submittedAt > 0,
            graph.validated,
            graph.committeeApproved,
            graph.publishedToDKG
        );
    }

    /**
     * @notice Get detailed validation status
     * @param graphId Unique graph identifier
     */
    function getValidationDetails(bytes32 graphId) external view returns (
        bool syntaxValid,
        bool semanticValid,
        bool overallValid,
        string memory validationErrors
    ) {
        RDFGraph memory graph = rdfGraphRegistry[graphId];
        return (
            graph.syntaxValid,
            graph.semanticValid,
            graph.validated,
            graph.validationErrors
        );
    }
}

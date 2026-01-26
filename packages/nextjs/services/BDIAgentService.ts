/**
 * BDI Agent Service
 *
 * Server-side service enabling BDI validation agents (Jadex) to interact
 * with MKMPOL21 DAO contracts via HTTP API endpoints.
 *
 * This service provides:
 * - Belief methods (read operations): Query agent roles, permissions, graph status
 * - Intention methods (write operations): Submit, validate, approve, publish graphs
 * - Event listeners: Coordinate agent activities via contract events
 *
 * Usage from Jadex agents:
 *   HTTP POST to /api/bdi-agent/{action} with appropriate parameters
 */
import { Contract, EventLog, JsonRpcProvider, Wallet } from "ethers";

// =============================================================================
// Contract ABIs (minimal subset needed for agent operations)
// =============================================================================

const GA_DATA_VALIDATION_ABI = [
  // Submit RDF graph
  "function submitRDFGraph(string graphURI, bytes32 graphHash, uint8 graphType, uint8 datasetVariant, uint256 year, string modelVersion) external returns (bytes32)",

  // Validation operations
  "function markRDFGraphValidated(bytes32 graphId, bool isValid) external",
  "function markRDFGraphValidatedWithDetails(bytes32 graphId, bool syntaxValid, bool semanticValid, string errorSummary) external",
  "function approveRDFGraph(bytes32 graphId) external",
  "function markRDFGraphPublished(bytes32 graphId, string dkgAssetUAL) external",

  // View functions
  "function getGraphStatus(bytes32 graphId) external view returns (bool exists, bool validated, bool approved, bool published)",
  "function getValidationDetails(bytes32 graphId) external view returns (bool syntaxValid, bool semanticValid, bool overallValid, string validationErrors)",
  "function getRDFGraphBasicInfo(bytes32 graphId) external view returns (bytes32 graphHash, string graphURI, uint8 graphType, uint8 datasetVariant, uint256 year, uint256 version)",
  "function getRDFGraphMetadata(bytes32 graphId) external view returns (address submitter, uint256 submittedAt, string modelVersion, string dkgAssetUAL)",
  "function isReadyForPublication(bytes32 graphId) external view returns (bool)",
  "function rdfGraphCount() external view returns (uint256)",

  // Events
  "event RDFGraphSubmitted(bytes32 indexed graphId, string graphURI, uint8 indexed variant, uint256 indexed year, uint8 graphType)",
  "event RDFGraphValidated(bytes32 indexed graphId, bool syntaxValid, address indexed validator)",
  "event RDFGraphValidatedDetailed(bytes32 indexed graphId, bool syntaxValid, bool semanticValid, string errorSummary, address indexed validator)",
  "event RDFGraphApproved(bytes32 indexed graphId, address indexed approver)",
  "event RDFGraphPublishedToDKG(bytes32 indexed graphId, string dkgAssetUAL)",
];

const MKMPOL21_ABI = [
  "function hasRole(address user) external view returns (uint32)",
  "function has_permission(address user, uint64 permissionIndex) external view returns (bool)",
  "function assignRole(address _user, uint32 _role) external",
  "function grantPermission(uint32 _role, uint64 _permissionIndex) external",
  "event RoleAssigned(address indexed user, uint32 indexed role)",
];

const VALIDATION_COMMITTEE_ABI = [
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) external returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) external returns (uint256)",
  "function state(uint256 proposalId) external view returns (uint8)",
  "function proposalVotes(uint256 proposalId) external view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) external payable returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)",
];

// =============================================================================
// Type Definitions
// =============================================================================

/** Graph types matching GADataValidation.sol GraphType enum */
export enum GraphType {
  ARTICLES = 0, // articles.ttl
  ENTITIES = 1, // entities.ttl
  MENTIONS = 2, // mentions.ttl
  NLP = 3, // nlp.ttl
  ECONOMICS = 4, // economics.ttl - employment events
  RELATIONS = 5, // relations.ttl
  PROVENANCE = 6, // provenance.ttl
}

/** Dataset variants matching GADataValidation.sol DatasetVariant enum */
export enum DatasetVariant {
  ERR_ONLINE = 0, // ERR online content
  OL_ONLINE = 1, // Õhtuleht online content
  OL_PRINT = 2, // Õhtuleht print content
  ARIREGISTER = 3, // Estonian Business Registry
}

/** Parameters for submitting an RDF graph */
export interface RDFSubmissionParams {
  graphURI: string; // Named graph IRI (e.g., urn:graph:employment-events)
  graphHash: string; // SHA-256 hash of TTL content (bytes32 hex)
  graphType: GraphType;
  datasetVariant: DatasetVariant;
  year: number;
  modelVersion: string; // e.g., "EstBERT-1.0"
}

/** Result of graph submission */
export interface SubmissionResult {
  graphId: string;
  txHash: string;
  blockNumber: number;
}

/** Result of validation operation */
export interface ValidationResult {
  graphId: string;
  isValid: boolean;
  validatorAddress: string;
  txHash: string;
}

/** Result of detailed validation operation */
export interface DetailedValidationResult {
  graphId: string;
  syntaxValid: boolean;
  semanticValid: boolean;
  errorSummary: string;
  validatorAddress: string;
  txHash: string;
}

/** Detailed validation status from contract */
export interface ValidationDetails {
  syntaxValid: boolean;
  semanticValid: boolean;
  overallValid: boolean;
  validationErrors: string;
}

/** Graph status from contract */
export interface GraphStatus {
  exists: boolean;
  validated: boolean;
  approved: boolean;
  published: boolean;
}

/** Basic graph info */
export interface GraphBasicInfo {
  graphHash: string;
  graphURI: string;
  graphType: GraphType;
  datasetVariant: DatasetVariant;
  year: number;
  version: number;
}

/** Graph metadata */
export interface GraphMetadata {
  submitter: string;
  submittedAt: Date;
  modelVersion: string;
  dkgAssetUAL: string;
}

/** Agent role info */
export interface AgentRoleInfo {
  roleValue: number;
  roleIndex: number;
  roleName: string;
}

// Role names for display
const ROLE_NAMES: Record<number, string> = {
  0: "Member_Institution",
  1: "Ordinary_User",
  2: "MFSSIA_Guardian_Agent",
  3: "Eliza_Data_Extractor_Agent",
  4: "Data_Validator",
  5: "MKMPOL21Owner",
  6: "Consortium",
  7: "Validation_Committee",
  8: "Dispute_Resolution_Board",
};

// =============================================================================
// BDI Agent Service Class
// =============================================================================

/**
 * Service class for BDI agent interactions with MKMPOL21 DAO contracts.
 *
 * Implements the Belief-Desire-Intention pattern:
 * - Beliefs: Read methods that query current state
 * - Intentions: Write methods that execute actions
 * - Coordination: Event listeners for multi-agent coordination
 */
/** Result of proposal creation */
export interface ProposalResult {
  proposalId: string;
  txHash: string;
  description: string;
}

export class BDIAgentService {
  private provider: JsonRpcProvider;
  private gaDataValidationAddress: string;
  private mkmpol21Address: string;
  private validationCommitteeAddress: string;

  constructor(
    rpcUrl: string,
    gaDataValidationAddress: string,
    mkmpol21Address: string,
    validationCommitteeAddress?: string,
  ) {
    this.provider = new JsonRpcProvider(rpcUrl);
    this.gaDataValidationAddress = gaDataValidationAddress;
    this.mkmpol21Address = mkmpol21Address;
    this.validationCommitteeAddress = validationCommitteeAddress || "";
  }

  // ===========================================================================
  // Private Helpers
  // ===========================================================================

  /** Create a wallet instance for an agent using their private key */
  private getAgentWallet(privateKey: string): Wallet {
    return new Wallet(privateKey, this.provider);
  }

  /** Get GADataValidation contract instance */
  private getGAContract(signer?: Wallet): Contract {
    return new Contract(this.gaDataValidationAddress, GA_DATA_VALIDATION_ABI, signer ?? this.provider);
  }

  /** Get MKMPOL21 contract instance */
  private getMKMPOL21Contract(signer?: Wallet): Contract {
    return new Contract(this.mkmpol21Address, MKMPOL21_ABI, signer ?? this.provider);
  }

  /** Get ValidationCommittee contract instance */
  private getValidationCommitteeContract(signer?: Wallet): Contract {
    if (!this.validationCommitteeAddress) {
      throw new Error("ValidationCommittee address not configured");
    }
    return new Contract(this.validationCommitteeAddress, VALIDATION_COMMITTEE_ABI, signer ?? this.provider);
  }

  // ===========================================================================
  // Belief Methods (Read Operations)
  // ===========================================================================

  /**
   * Check if an agent has a specific permission
   * @param agentAddress - Agent's Ethereum address
   * @param permissionIndex - Permission index (4=validate, 5=publish, 6=approve, 8=submit)
   */
  async checkPermission(agentAddress: string, permissionIndex: number): Promise<boolean> {
    const mkmpol21 = this.getMKMPOL21Contract();
    return await mkmpol21.has_permission(agentAddress, permissionIndex);
  }

  /**
   * Get agent's current role information
   * @param agentAddress - Agent's Ethereum address
   */
  async getAgentRole(agentAddress: string): Promise<AgentRoleInfo> {
    const mkmpol21 = this.getMKMPOL21Contract();
    const roleValue = Number(await mkmpol21.hasRole(agentAddress));
    const roleIndex = roleValue & 31;

    return {
      roleValue,
      roleIndex,
      roleName: ROLE_NAMES[roleIndex] || "Unknown",
    };
  }

  /**
   * Get RDF graph validation status
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async getGraphStatus(graphId: string): Promise<GraphStatus> {
    const ga = this.getGAContract();
    const [exists, validated, approved, published] = await ga.getGraphStatus(graphId);
    return { exists, validated, approved, published };
  }

  /**
   * Get basic graph information
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async getGraphBasicInfo(graphId: string): Promise<GraphBasicInfo> {
    const ga = this.getGAContract();
    const [graphHash, graphURI, graphType, datasetVariant, year, version] = await ga.getRDFGraphBasicInfo(graphId);

    return {
      graphHash,
      graphURI,
      graphType: Number(graphType) as GraphType,
      datasetVariant: Number(datasetVariant) as DatasetVariant,
      year: Number(year),
      version: Number(version),
    };
  }

  /**
   * Get graph metadata
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async getGraphMetadata(graphId: string): Promise<GraphMetadata> {
    const ga = this.getGAContract();
    const [submitter, submittedAt, modelVersion, dkgAssetUAL] = await ga.getRDFGraphMetadata(graphId);

    return {
      submitter,
      submittedAt: new Date(Number(submittedAt) * 1000),
      modelVersion,
      dkgAssetUAL,
    };
  }

  /**
   * Check if graph is ready for DKG publication
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async isReadyForPublication(graphId: string): Promise<boolean> {
    const ga = this.getGAContract();
    return await ga.isReadyForPublication(graphId);
  }

  /**
   * Get detailed validation status
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async getValidationDetails(graphId: string): Promise<ValidationDetails> {
    const ga = this.getGAContract();
    const [syntaxValid, semanticValid, overallValid, validationErrors] = await ga.getValidationDetails(graphId);

    return {
      syntaxValid,
      semanticValid,
      overallValid,
      validationErrors,
    };
  }

  /**
   * Get total number of RDF graphs in registry
   */
  async getGraphCount(): Promise<number> {
    const ga = this.getGAContract();
    return Number(await ga.rdfGraphCount());
  }

  // ===========================================================================
  // Intention Methods (Write Operations)
  // ===========================================================================

  /**
   * Submit RDF graph to DAO (DAO Submitter Agent)
   * Requires Permission 8 (Member_Institution role)
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param params - RDF submission parameters
   */
  async submitRDFGraph(agentPrivateKey: string, params: RDFSubmissionParams): Promise<SubmissionResult> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const ga = this.getGAContract(wallet);

    // Ensure hash is bytes32 format
    const hashBytes32 = params.graphHash.startsWith("0x") ? params.graphHash : `0x${params.graphHash}`;

    // Validate hash length (bytes32 = 66 chars with 0x prefix)
    if (hashBytes32.length !== 66) {
      throw new Error(`Invalid graph hash length: expected 66 chars (bytes32), got ${hashBytes32.length}`);
    }

    const tx = await ga.submitRDFGraph(
      params.graphURI,
      hashBytes32,
      params.graphType,
      params.datasetVariant,
      params.year,
      params.modelVersion,
    );

    const receipt = await tx.wait();

    // Extract graphId from RDFGraphSubmitted event
    let graphId = "";
    for (const log of receipt.logs) {
      try {
        const parsed = ga.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === "RDFGraphSubmitted") {
          graphId = parsed.args[0];
          break;
        }
      } catch {
        // Skip logs that don't match our ABI
      }
    }

    if (!graphId) {
      throw new Error("Failed to extract graphId from transaction receipt");
    }

    return {
      graphId,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Mark RDF graph as validated (Syntax/Semantic Validator Agent)
   * Requires Permission 4 (Data_Validator role)
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param graphId - Graph identifier (bytes32 hex)
   * @param isValid - Whether validation passed
   */
  async markGraphValidated(agentPrivateKey: string, graphId: string, isValid: boolean): Promise<ValidationResult> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const ga = this.getGAContract(wallet);

    const tx = await ga.markRDFGraphValidated(graphId, isValid);
    await tx.wait();

    return {
      graphId,
      isValid,
      validatorAddress: wallet.address,
      txHash: tx.hash,
    };
  }

  /**
   * Mark RDF graph as validated with detailed results
   * Requires Permission 4 (Data_Validator role)
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param graphId - Graph identifier (bytes32 hex)
   * @param syntaxValid - Whether N3.js syntax validation passed
   * @param semanticValid - Whether SHACL semantic validation passed
   * @param errorSummary - Summary of validation errors (max 256 chars)
   */
  async markGraphValidatedWithDetails(
    agentPrivateKey: string,
    graphId: string,
    syntaxValid: boolean,
    semanticValid: boolean,
    errorSummary: string,
  ): Promise<DetailedValidationResult> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const ga = this.getGAContract(wallet);

    // Truncate error summary to 256 characters for gas efficiency
    const truncatedErrors = errorSummary.slice(0, 256);

    const tx = await ga.markRDFGraphValidatedWithDetails(graphId, syntaxValid, semanticValid, truncatedErrors);
    await tx.wait();

    return {
      graphId,
      syntaxValid,
      semanticValid,
      errorSummary: truncatedErrors,
      validatorAddress: wallet.address,
      txHash: tx.hash,
    };
  }

  /**
   * Approve RDF graph (Validation Committee)
   * Requires Permission 6
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param graphId - Graph identifier (bytes32 hex)
   */
  async approveGraph(agentPrivateKey: string, graphId: string): Promise<{ txHash: string }> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const ga = this.getGAContract(wallet);

    const tx = await ga.approveRDFGraph(graphId);
    await tx.wait();

    return { txHash: tx.hash };
  }

  /**
   * Mark graph as published to DKG
   * Requires Permission 5 (Owner)
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param graphId - Graph identifier (bytes32 hex)
   * @param dkgAssetUAL - DKG asset identifier from OriginTrail
   */
  async markGraphPublished(agentPrivateKey: string, graphId: string, dkgAssetUAL: string): Promise<{ txHash: string }> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const ga = this.getGAContract(wallet);

    const tx = await ga.markRDFGraphPublished(graphId, dkgAssetUAL);
    await tx.wait();

    return { txHash: tx.hash };
  }

  /**
   * Create a governance proposal in the Validation Committee to approve an RDF graph.
   * Requires Permission 30 (propose on ValidationCommittee)
   *
   * @param agentPrivateKey - Agent's private key for signing
   * @param graphId - Graph identifier (bytes32 hex)
   * @param metadata - Graph metadata for description
   */
  async createRDFApprovalProposal(
    agentPrivateKey: string,
    graphId: string,
    metadata: {
      graphURI: string;
      graphType: number;
      datasetVariant: number;
      year: number;
      modelVersion: string;
      syntaxValid?: boolean;
      semanticValid?: boolean;
      consistencyValid?: boolean;
    },
  ): Promise<ProposalResult> {
    const wallet = this.getAgentWallet(agentPrivateKey);
    const committee = this.getValidationCommitteeContract(wallet);
    const ga = this.getGAContract();

    // Encode calldata for GADataValidation.approveRDFGraph(graphId)
    const calldata = ga.interface.encodeFunctionData("approveRDFGraph", [graphId]);

    // Build graph type and dataset labels
    const graphTypeLabels = ["ARTICLES", "ENTITIES", "MENTIONS", "NLP", "ECONOMICS", "RELATIONS", "PROVENANCE"];
    const datasetLabels = ["ERR Online", "Ohtuleht Online", "Ohtuleht Print", "Ariregister"];

    // Build validation summary
    const validationParts: string[] = [];
    if (metadata.syntaxValid !== undefined) {
      validationParts.push(`Syntax ${metadata.syntaxValid ? "passed" : "failed"}`);
    }
    if (metadata.semanticValid !== undefined) {
      validationParts.push(`Semantic ${metadata.semanticValid ? "passed" : "has warnings"}`);
    }
    if (metadata.consistencyValid !== undefined) {
      validationParts.push(`Consistency ${metadata.consistencyValid ? "passed" : "has issues"}`);
    }
    const validationSummary = validationParts.length > 0 ? validationParts.join(", ") : "Pending";

    // Build proposal description with [RDF-APPROVAL] marker
    const description = [
      `[RDF-APPROVAL] Approve RDF Graph for DKG Publication`,
      ``,
      `Graph ID: ${graphId}`,
      `Graph URI: ${metadata.graphURI}`,
      `Graph Type: ${graphTypeLabels[metadata.graphType] || "Unknown"}`,
      `Dataset: ${datasetLabels[metadata.datasetVariant] || "Unknown"}`,
      `Year: ${metadata.year}`,
      `Model: ${metadata.modelVersion}`,
      ``,
      `Validation: ${validationSummary}`,
      ``,
      `This proposal, upon execution, will call GADataValidation.approveRDFGraph()`,
      `to mark the submitted RDF graph as committee-approved for DKG publication.`,
    ].join("\n");

    const tx = await committee.propose([this.gaDataValidationAddress], [0n], [calldata], description);

    const receipt = await tx.wait();

    // Extract proposalId from ProposalCreated event
    let proposalId = "";
    for (const log of receipt.logs) {
      try {
        const parsed = committee.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === "ProposalCreated") {
          proposalId = parsed.args[0].toString();
          break;
        }
      } catch {
        // Skip logs that don't match
      }
    }

    if (!proposalId) {
      throw new Error("Failed to extract proposalId from transaction receipt");
    }

    return {
      proposalId,
      txHash: tx.hash,
      description,
    };
  }

  // ===========================================================================
  // Event Listening (Agent Coordination)
  // ===========================================================================

  /**
   * Listen for RDFGraphSubmitted events
   * Used by Coordinator Agent to trigger validation pipeline
   */
  onGraphSubmitted(
    callback: (graphId: string, graphURI: string, variant: number, year: number, graphType: number) => void,
  ): void {
    const ga = this.getGAContract();
    ga.on("RDFGraphSubmitted", callback);
  }

  /**
   * Listen for RDFGraphValidated events
   * Used by Coordinator Agent to track validation progress
   */
  onGraphValidated(callback: (graphId: string, isValid: boolean, validator: string) => void): void {
    const ga = this.getGAContract();
    ga.on("RDFGraphValidated", callback);
  }

  /**
   * Listen for RDFGraphApproved events
   */
  onGraphApproved(callback: (graphId: string, approver: string) => void): void {
    const ga = this.getGAContract();
    ga.on("RDFGraphApproved", callback);
  }

  /**
   * Listen for RDFGraphPublishedToDKG events
   */
  onGraphPublished(callback: (graphId: string, dkgAssetUAL: string) => void): void {
    const ga = this.getGAContract();
    ga.on("RDFGraphPublishedToDKG", callback);
  }

  /**
   * Stop listening to all events
   */
  removeAllListeners(): void {
    const ga = this.getGAContract();
    ga.removeAllListeners();
  }

  /**
   * Query historical RDFGraphSubmitted events
   * @param fromBlock - Starting block number
   * @param toBlock - Ending block number (default: latest)
   */
  async querySubmittedGraphs(
    fromBlock: number,
    toBlock: number | "latest" = "latest",
  ): Promise<
    Array<{
      graphId: string;
      graphURI: string;
      variant: number;
      year: number;
      graphType: number;
      blockNumber: number;
    }>
  > {
    const ga = this.getGAContract();
    const filter = ga.filters.RDFGraphSubmitted();
    const events = await ga.queryFilter(filter, fromBlock, toBlock);

    return events
      .filter((event): event is EventLog => "args" in event)
      .map(event => ({
        graphId: event.args[0],
        graphURI: event.args[1],
        variant: Number(event.args[2]),
        year: Number(event.args[3]),
        graphType: Number(event.args[4]),
        blockNumber: event.blockNumber,
      }));
  }
}

// =============================================================================
// Singleton Factory
// =============================================================================

let bdiAgentServiceInstance: BDIAgentService | null = null;
let bdiAgentServiceAddresses: string = "";

/**
 * Get or create the BDI Agent Service singleton
 *
 * Recreates the instance if contract addresses change (e.g. after a redeploy).
 *
 * @param rpcUrl - JSON-RPC endpoint URL (default: localhost:8545)
 * @param gaDataValidationAddress - GADataValidation contract address
 * @param mkmpol21Address - MKMPOL21 contract address
 * @param validationCommitteeAddress - ValidationCommittee contract address
 */
export function getBDIAgentService(
  rpcUrl?: string,
  gaDataValidationAddress?: string,
  mkmpol21Address?: string,
  validationCommitteeAddress?: string,
): BDIAgentService {
  const addressKey = `${gaDataValidationAddress}|${mkmpol21Address}|${validationCommitteeAddress}`;

  if (!bdiAgentServiceInstance || addressKey !== bdiAgentServiceAddresses) {
    if (!gaDataValidationAddress || !mkmpol21Address) {
      throw new Error(
        "BDIAgentService not initialized. Provide gaDataValidationAddress and mkmpol21Address on first call.",
      );
    }
    bdiAgentServiceInstance = new BDIAgentService(
      rpcUrl || "http://localhost:8545",
      gaDataValidationAddress,
      mkmpol21Address,
      validationCommitteeAddress,
    );
    bdiAgentServiceAddresses = addressKey;
  }
  return bdiAgentServiceInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetBDIAgentService(): void {
  bdiAgentServiceInstance = null;
}

/**
 * BDI Agent Account Configuration
 *
 * Defines the Hardhat accounts assigned to each BDI validation agent.
 * These agents interact with the MKMPOL21 DAO to validate RDF files
 * from the employment event detection pipeline.
 *
 * Accounts #10-#13 from Hardhat's default accounts are reserved for agents.
 */

// Role values from MKMPOL21.sol all_roles array
export const ROLE_VALUES = {
  MEMBER_INSTITUTION: 1152, // Index 0, control bitmask: 100100
  ORDINARY_USER: 1153, // Index 1, control bitmask: 100100
  MFSSIA_GUARDIAN_AGENT: 3074, // Index 2, control bitmask: 1100000
  ELIZA_DATA_EXTRACTOR_AGENT: 3075, // Index 3, control bitmask: 1100000
  DATA_VALIDATOR: 1156, // Index 4, control bitmask: 100100
  MKMPOL21_OWNER: 1029, // Index 5, control bitmask: 100000
  CONSORTIUM: 1030, // Index 6, control bitmask: 100000
  VALIDATION_COMMITTEE: 1031, // Index 7, control bitmask: 100000
  DISPUTE_RESOLUTION_BOARD: 1032, // Index 8, control bitmask: 100000
} as const;

// Permission indices from GADataValidation.sol
export const PERMISSIONS = {
  VALIDATE_RDF: 4, // markRDFGraphValidated()
  PUBLISH_TO_DKG: 5, // markRDFGraphPublished()
  APPROVE_RDF: 6, // approveRDFGraph()
  SUBMIT_RDF: 8, // submitRDFGraph()
} as const;

// Agent account configuration
export const AGENT_ACCOUNTS = {
  COORDINATOR: {
    name: "Coordinator Agent",
    description: "Orchestrates the validation pipeline, listens for events",
    address: "0xBcd4042DE499D14e55001CcbB24a551F3b954096",
    hardhatAccountIndex: 10,
    // Private key for local dev only - NEVER use in production
    privateKey: "0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897",
    role: "MFSSIA_GUARDIAN_AGENT",
    roleIndex: 2,
    roleValue: ROLE_VALUES.MFSSIA_GUARDIAN_AGENT,
    requiredPermissions: [], // Coordinator orchestrates, doesn't directly call permissioned functions
  },
  SYNTAX_VALIDATOR: {
    name: "Syntax Validator Agent",
    description: "Validates RDF syntax using Apache Jena/RIOT",
    address: "0x71bE63f3384f5fb98995898A86B02Fb2426c5788",
    hardhatAccountIndex: 11,
    privateKey: "0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82",
    role: "DATA_VALIDATOR",
    roleIndex: 4,
    roleValue: ROLE_VALUES.DATA_VALIDATOR,
    requiredPermissions: [PERMISSIONS.VALIDATE_RDF],
  },
  SEMANTIC_VALIDATOR: {
    name: "Semantic Validator Agent",
    description: "Validates RDF semantics using SHACL shapes and SPARQL queries",
    address: "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a",
    hardhatAccountIndex: 12,
    privateKey: "0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1",
    role: "DATA_VALIDATOR",
    roleIndex: 4,
    roleValue: ROLE_VALUES.DATA_VALIDATOR,
    requiredPermissions: [PERMISSIONS.VALIDATE_RDF],
  },
  DAO_SUBMITTER: {
    name: "DAO Submitter Agent",
    description: "Submits RDF graphs to the DAO for validation and approval",
    address: "0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec",
    hardhatAccountIndex: 13,
    privateKey: "0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd",
    role: "MEMBER_INSTITUTION",
    roleIndex: 0,
    roleValue: ROLE_VALUES.MEMBER_INSTITUTION,
    requiredPermissions: [PERMISSIONS.SUBMIT_RDF],
  },
} as const;

export type AgentType = keyof typeof AGENT_ACCOUNTS;
export type AgentConfig = (typeof AGENT_ACCOUNTS)[AgentType];

/**
 * Get agent by Hardhat account index
 */
export function getAgentByIndex(index: number): AgentConfig | undefined {
  return Object.values(AGENT_ACCOUNTS).find(agent => agent.hardhatAccountIndex === index);
}

/**
 * Get agent by address
 */
export function getAgentByAddress(address: string): AgentConfig | undefined {
  const normalizedAddress = address.toLowerCase();
  return Object.values(AGENT_ACCOUNTS).find(agent => agent.address.toLowerCase() === normalizedAddress);
}

/**
 * Get all agents with a specific role
 */
export function getAgentsByRole(roleValue: number): AgentConfig[] {
  return Object.values(AGENT_ACCOUNTS).filter(agent => agent.roleValue === roleValue);
}

/**
 * MFSSIA Types
 * Type definitions for Multi-Factor Self-Sovereign Identity Authentication
 * Data sourced from MFSSIA API: https://api.dymaxion-ou.co
 *
 * Example A - Baseline RDF Artifact Integrity
 * Minimal MFSSIA challenge set ensuring source authenticity, data integrity,
 * deterministic parsing, and provenance completeness for RDF representations of public articles.
 */

/**
 * Factor classes that challenges can verify
 */
export type FactorClass =
  | "SourceIntegrity"
  | "ContentIntegrity"
  | "TemporalValidity"
  | "AuthorAuthenticity"
  | "Provenance"
  | "DistributionIntegrity"
  | "ProcessIntegrity"
  | "DataIntegrity"
  | "SemanticCorrectness"
  | "EconomicConsistency"
  | "TemporalPlausibility"
  | "ProvenanceIntegrity"
  | "InstitutionalOversight";

/**
 * Challenge status during verification
 */
export type ChallengeStatus = "pending" | "in_progress" | "passed" | "failed";

/**
 * Individual challenge definition
 * Structure matches MFSSIA API /api/challenge-definitions
 */
export interface ChallengeDefinition {
  code: string; // e.g., "mfssia:C-A-1"
  name: string; // e.g., "Source Authenticity Challenge"
  description: string;
  factorClass: FactorClass;
  mandatory: boolean;
  expectedEvidence: string[]; // Field names expected in evidence payload
  oracleEndpoint: string; // Oracle endpoint name from MFSSIA API
  question?: string; // The verification question being answered
  evaluationPassCondition?: string; // What constitutes a pass
}

/**
 * Challenge set information
 * Structure matches MFSSIA API /api/challenge-sets
 */
export interface ChallengeSetInfo {
  id: string; // UUID from API
  code: string; // e.g., "mfssia:Example-A"
  name: string; // e.g., "Baseline RDF Artifact Integrity"
  description: string;
  version: string; // e.g., "1.0"
  status: "ACTIVE" | "DEPRECATED";
  mandatoryChallenges: number;
  optionalChallenges: number;
  challenges: ChallengeDefinition[];
  applicableRoles: string[]; // DAO roles that can use this set
  requiredConfidence: number; // Minimum confidence score (0-1)
}

/**
 * Per-challenge status during verification
 */
export interface ChallengeVerificationStatus {
  code: string;
  name: string;
  status: ChallengeStatus;
  confidence: number | null;
  message: string | null;
  timestamp: string | null;
}

/**
 * Oracle verification result for a single challenge
 */
export interface OracleChallengeResult {
  challengeCode: string;
  passed: boolean;
  confidence: number;
  message?: string;
}

/**
 * Complete verification session state
 */
export interface VerificationSession {
  instanceId: string;
  did: string;
  challengeSet: ChallengeSetInfo;
  challenges: ChallengeVerificationStatus[];
  overallStatus: "idle" | "in_progress" | "success" | "failed";
  overallConfidence: number | null;
  startedAt: string;
  completedAt: string | null;
}

/**
 * Employment Event Artifact data for Example-D challenge set
 * Contains all the data needed for employment event detection verification
 */
export interface EmploymentEventArtifactData {
  // Source information (C-D-1)
  sourceDomainHash: string; // Raw domain string (e.g., "err.ee") for whitelist check
  contentHash: string; // SHA-256 hash of TTL content

  // Content integrity (C-D-2)
  content: string; // The actual TTL content (used to compute sha256ContentHash)

  // NLP determinism (C-D-3)
  modelName: string; // e.g., "EstBERT-1.0"
  modelVersionHash: string; // SHA-256 hash of model weights/config
  softwareTrajectoryHash: string; // SHA-256 hash of NLP pipeline software trajectory

  // Semantic coherence (C-D-4)
  crossConsistencyScore: number; // 0-1 score of cross-triple consistency

  // Employment plausibility (C-D-5)
  llmConfidenceScore: number; // 0-1 LLM adjudication confidence (pass >= 0.9)
  numericExtractionTrace: string; // JSON string of extraction trace

  // EMTAK consistency (C-D-6)
  emtakCode: string; // 5-digit EMTAK classification code
  registrySectorMatch: boolean; // Whether EMTAK matches business registry

  // Temporal validity (C-D-7)
  articleDate: string; // ISO date of article
  ingestionTimestamp: string; // ISO timestamp of pipeline ingestion

  // Provenance closure (C-D-8)
  provenanceHash: string; // SHA-256 hash of provenance chain
  provWasGeneratedBy: string; // prov:wasGeneratedBy URI of generating PipelineRun

  // Governance acknowledgement (C-D-9)
  governanceSignature: string; // DAO governance signature
}

/**
 * RDF Artifact data for Example-A challenge set
 * Contains all the data needed for artifact integrity verification
 */
export interface RDFArtifactData {
  // Source information (C-A-1)
  sourceDomain: string; // e.g., "err.ee"
  sourceUrl?: string; // Full URL of the source article
  contentHash: string; // SHA-256 hash of content

  // Content data (C-A-2)
  content: string; // The actual article content
  semanticFingerprint?: string; // Semantic fingerprint for duplicate detection
  similarityScore?: number; // 0-1 score against flagged corpus

  // Temporal data (C-A-3)
  claimedPublishDate: string; // ISO date when article claims to be published
  serverTimestamp: string; // Timestamp from server
  archiveEarliestCaptureDate?: string; // Earliest web archive capture

  // Author data (C-A-4)
  authorName: string;
  authorEmailDomain?: string;
  affiliationRecordHash?: string; // Hash of affiliation record

  // Provenance data (C-A-5 - optional)
  artifactSignature?: string; // Cryptographic signature of the artifact
  merkleProof?: string; // Merkle proof for provenance chain
  signerPublicKeyId?: string; // URI of signer's public key

  // Distribution data (C-A-6)
  shareEventTimestamps?: string; // Comma-separated ISO timestamps of share events
  accountTrustSignals?: string; // Trust signals for sharing accounts
  networkClusterScore?: number; // 0-1 score for coordinated amplification detection
}

/**
 * Challenge sets from MFSSIA API
 * Source: Official MFSSIA Challenge Definition Schema
 *
 * Example A – Baseline RDF Artifact Integrity
 * Minimal MFSSIA challenge set ensuring source authenticity, data integrity,
 * deterministic parsing, and provenance completeness for RDF representations of public articles.
 *
 * Per MFSSIA API requirements:
 * - mandatoryChallenges: C-A-1, C-A-2, C-A-3, C-A-4, C-A-5, C-A-6 (all 6 required)
 * - optionalChallenges: none
 * - policy.minChallengesRequired: 6 (all mandatory)
 * - policy.aggregationRule: ALL_MANDATORY
 */
export const CHALLENGE_SETS: ChallengeSetInfo[] = [
  {
    id: "mfssia:Example-A",
    code: "mfssia:Example-A",
    name: "Example A – Baseline RDF Artifact Integrity",
    description:
      "Minimal MFSSIA challenge set ensuring source authenticity, data integrity, deterministic parsing, and provenance completeness for RDF representations of public articles.",
    version: "1.0",
    status: "ACTIVE",
    mandatoryChallenges: 6, // C-A-1, C-A-2, C-A-3, C-A-4, C-A-5, C-A-6
    optionalChallenges: 0, // All challenges are mandatory
    challenges: [
      {
        code: "mfssia:C-A-1",
        name: "Source Authenticity Challenge",
        description: "Verifies if the article originates from a whitelisted institutional publisher (ERR).",
        factorClass: "SourceIntegrity",
        mandatory: true,
        // Expected evidence per MFSSIA spec:
        // - sourceDomainHash: string (SHA-256 hash of normalized domain)
        // - contentHash: string (SHA-256 hash of content)
        expectedEvidence: ["sourceDomainHash", "contentHash"],
        oracleEndpoint: "ERRArchiveOracle",
        question: "Does the article originate from a whitelisted institutional publisher (ERR)?",
        evaluationPassCondition: "sourceDomainHash matches whitelisted ERR domain",
      },
      {
        code: "mfssia:C-A-2",
        name: "Content Integrity Challenge",
        description:
          "Detects whether published content has been tampered with or is a near-duplicate of known flagged content.",
        factorClass: "ContentIntegrity",
        mandatory: true,
        // Expected evidence per MFSSIA spec:
        // - contentHash: hash (SHA-256 hash of content)
        // - semanticFingerprint: string (semantic fingerprint for duplicate detection)
        // - similarityScore: number (0-1 score against flagged corpus)
        expectedEvidence: ["contentHash", "semanticFingerprint", "similarityScore"],
        oracleEndpoint: "SimilarityDBOracle",
        question: "Is the content a near-duplicate or tampered version of previously flagged content?",
        evaluationPassCondition: "similarityScore < 0.75 or contentHash not present in flagged corpus",
      },
      {
        code: "mfssia:C-A-3",
        name: "Temporal Validity Challenge",
        description:
          "Checks whether the content's claimed publish date is consistent with evidence and not backdated or misrepresented.",
        factorClass: "TemporalValidity",
        mandatory: true,
        // Expected evidence per MFSSIA spec:
        // - claimedPublishDate: string (ISO date string)
        // - serverTimestamp: string (ISO date string)
        // - archiveEarliestCaptureDate: string (ISO date string)
        expectedEvidence: ["claimedPublishDate", "serverTimestamp", "archiveEarliestCaptureDate"],
        oracleEndpoint: "WebArchiveOracle",
        question: "Is the article's publish date verifiably accurate and within expected bounds?",
        evaluationPassCondition: "archiveEarliestCaptureDate <= claimedPublishDate <= serverTimestamp + 7 days",
      },
      {
        code: "mfssia:C-A-4",
        name: "Author Authenticity Challenge",
        description:
          "Verifies whether the listed author is a real, attributable individual with credentials matching the claimed affiliation.",
        factorClass: "AuthorAuthenticity",
        mandatory: true,
        // Expected evidence per MFSSIA spec:
        // - authorName: string (full name of author)
        // - authorEmailDomain: string (email domain for verification)
        // - affiliationRecordHash: hash (SHA-256 hash of affiliation record)
        expectedEvidence: ["authorName", "authorEmailDomain", "affiliationRecordHash"],
        oracleEndpoint: "InstitutionalDirectoryOracle",
        question: "Can the author's identity and claimed affiliation be verified against trusted registries?",
        evaluationPassCondition: "MATCH / PARTIAL_MATCH / NO_MATCH",
      },
      {
        code: "mfssia:C-A-5",
        name: "Provenance Chain Challenge",
        description: "Validates the cryptographic provenance chain for the artifact.",
        factorClass: "Provenance",
        mandatory: true, // Required per MFSSIA API
        // Expected evidence per MFSSIA spec:
        // - artifactSignature: string (cryptographic signature)
        // - merkleProof: string (JSON-encoded Merkle proof)
        // - signerPublicKeyId: uri (DID or URI of signer's public key)
        expectedEvidence: ["artifactSignature", "merkleProof", "signerPublicKeyId"],
        oracleEndpoint: "SignatureVerificationOracle",
        question: "Does the artifact include verifiable cryptographic signatures or Merkle proofs?",
        evaluationPassCondition: "artifactSignature AND merkleProof valid AND signer trusted",
      },
      {
        code: "mfssia:C-A-6",
        name: "Distribution Integrity Challenge",
        description: "Detects whether the content was amplified by inauthentic or coordinated accounts.",
        factorClass: "DistributionIntegrity",
        mandatory: true,
        // Expected evidence per MFSSIA spec:
        // - shareEventTimestamps: string (comma-separated ISO timestamps)
        // - accountTrustSignals: string (trust signal indicators)
        // - networkClusterScore: number (0-1 score, pass if < 0.45)
        expectedEvidence: ["shareEventTimestamps", "accountTrustSignals", "networkClusterScore"],
        oracleEndpoint: "GraphAnalysisOracle",
        question: "Is the observed distribution pattern indicative of coordinated inauthentic amplification?",
        evaluationPassCondition: "networkClusterScore < 0.45",
      },
    ],
    applicableRoles: ["ORDINARY_USER", "MEMBER_INSTITUTION", "DATA_VALIDATOR"],
    requiredConfidence: 0.85,
  },
  {
    id: "mfssia:Example-D",
    code: "mfssia:Example-D",
    name: "Example D \u2013 Employment Event Detection & Publication Pipeline",
    description:
      "Policy-grade MFSSIA challenge set authenticating employment gain/loss events using multi-source, multi-model analytical pipelines.",
    version: "1.0",
    status: "ACTIVE",
    mandatoryChallenges: 6, // C-D-1, C-D-2, C-D-3, C-D-5, C-D-6, C-D-8
    optionalChallenges: 3, // C-D-4, C-D-7, C-D-9
    challenges: [
      {
        code: "mfssia:C-D-1",
        name: "Source Authenticity Challenge",
        description: "Verifies that the ingested article originates from a whitelisted institutional publisher (ERR).",
        factorClass: "SourceIntegrity",
        mandatory: true,
        expectedEvidence: ["source"],
        oracleEndpoint: "ERRArchiveOracle",
        question: "Does the article originate from a whitelisted institutional publisher (ERR)?",
        evaluationPassCondition: "source matches whitelisted publisher domain",
      },
      {
        code: "mfssia:C-D-2",
        name: "Content Integrity Challenge",
        description: "Ensures byte-level identity between the ingested article and downstream CSV/JSON payload.",
        factorClass: "ProcessIntegrity",
        mandatory: true,
        expectedEvidence: ["content", "contentHash"],
        oracleEndpoint: "InternalHashingOracle",
        question: "Is the CSV \u2192 JSON payload byte-identical to the ingested article?",
        evaluationPassCondition: "Computed hash equals ingested content hash",
      },
      {
        code: "mfssia:C-D-3",
        name: "NLP Determinism Challenge",
        description: "Verifies that NLP components were executed with declared and approved model versions.",
        factorClass: "ProcessIntegrity",
        mandatory: true,
        expectedEvidence: ["modelName", "versionHash", "softwareHash"],
        oracleEndpoint: "CIAttestationOracle",
        question: "Were EstBERT, KeyBERT, and EstNER executed with declared versions?",
        evaluationPassCondition: "All hashes match declared pipeline configuration",
      },
      {
        code: "mfssia:C-D-4",
        name: "Semantic Coherence Challenge",
        description: "Evaluates whether extracted entities, keywords, and lemmas jointly support an employment event.",
        factorClass: "SemanticCorrectness",
        mandatory: false, // Optional per spec
        expectedEvidence: ["crossConsistencyScore"],
        oracleEndpoint: "SemanticValidationOracle",
        question: "Do NER entities, keywords, and lemmas jointly support an employment event?",
        evaluationPassCondition: "crossConsistencyScore \u2265 policy threshold",
      },
      {
        code: "mfssia:C-D-5",
        name: "Employment Event Plausibility Challenge",
        description: "Validates linguistic and contextual support for extracted employment change values.",
        factorClass: "SemanticCorrectness",
        mandatory: true,
        expectedEvidence: ["llmConfidence", "numericExtractionTrace"],
        oracleEndpoint: "LLMAdjudicationOracle",
        question: "Is the extracted job gain/loss value linguistically and contextually supported?",
        evaluationPassCondition: "llmConfidence \u2265 0.9",
      },
      {
        code: "mfssia:C-D-6",
        name: "EMTAK Consistency Challenge",
        description: "Checks alignment between EMTAK classification and official business registry data.",
        factorClass: "EconomicConsistency",
        mandatory: true,
        expectedEvidence: ["ariregisterSectorMatch"],
        oracleEndpoint: "EstonianBusinessRegistryOracle",
        question: "Does the EMTAK code align with official registry data for the entity?",
        evaluationPassCondition: 'ariregisterSectorMatch = "true"',
      },
      {
        code: "mfssia:C-D-7",
        name: "Temporal Validity Challenge",
        description: "Ensures the article falls within the allowed policy time window.",
        factorClass: "TemporalPlausibility",
        mandatory: false, // Optional per spec
        expectedEvidence: ["articleDate", "ingestionTime"],
        oracleEndpoint: "TimeOracle",
        question: "Is the article within the allowed policy time window?",
        evaluationPassCondition: "Date difference \u2264 policy threshold",
      },
      {
        code: "mfssia:C-D-8",
        name: "Provenance Closure Challenge",
        description: "Ensures every RDF triple is cryptographically linked to the generating PipelineRun.",
        factorClass: "ProvenanceIntegrity",
        mandatory: true,
        expectedEvidence: ["wasGeneratedBy", "provenanceHash"],
        oracleEndpoint: "DKGRDFValidationOracle",
        question: "Is every RDF triple prov-linked to this PipelineRun?",
        evaluationPassCondition: "All triples prov-linked and hash-valid",
      },
      {
        code: "mfssia:C-D-9",
        name: "Governance Acknowledgement Challenge",
        description: "Determines eligibility of analytical output for ministry-level usage.",
        factorClass: "InstitutionalOversight",
        mandatory: false, // Optional per spec
        expectedEvidence: ["daoSignature"],
        oracleEndpoint: "GovernanceOracle",
        question: "Is this output eligible for ministry-level analytics?",
        evaluationPassCondition: "Signature issued by authorized governance body",
      },
    ],
    applicableRoles: ["MEMBER_INSTITUTION", "DATA_VALIDATOR"],
    requiredConfidence: 0.85,
  },
];

/**
 * Get challenge set by code (e.g., "mfssia:Example-A")
 */
export function getChallengeSetByCode(code: string): ChallengeSetInfo | undefined {
  return CHALLENGE_SETS.find(set => set.code === code);
}

/**
 * Get challenge set by ID (UUID)
 */
export function getChallengeSetById(id: string): ChallengeSetInfo | undefined {
  return CHALLENGE_SETS.find(set => set.id === id);
}

/**
 * Get active challenge sets
 */
export function getActiveChallengeSets(): ChallengeSetInfo[] {
  return CHALLENGE_SETS.filter(set => set.status === "ACTIVE");
}

/**
 * Get challenge sets applicable for a role
 */
export function getChallengeSetsForRole(roleKey: string): ChallengeSetInfo[] {
  return CHALLENGE_SETS.filter(set => set.status === "ACTIVE" && set.applicableRoles.includes(roleKey));
}

/**
 * Initialize challenge verification statuses for a challenge set
 */
export function initializeChallengeStatuses(challengeSet: ChallengeSetInfo): ChallengeVerificationStatus[] {
  return challengeSet.challenges.map(challenge => ({
    code: challenge.code,
    name: challenge.name,
    status: "pending",
    confidence: null,
    message: null,
    timestamp: null,
  }));
}

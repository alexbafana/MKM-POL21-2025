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
  | "DataIntegrity";

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
  sourceDomainHash: string; // SHA-256 hash of normalized domain (e.g., "err.ee")
  contentHash: string; // SHA-256 hash of TTL content

  // Content integrity (C-D-2)
  csvHash: string; // SHA-256 hash of source CSV data
  content: string; // The actual TTL content

  // NLP determinism (C-D-3)
  modelName: string; // e.g., "EstBERT-1.0"
  modelVersionHash: string; // SHA-256 hash of model weights/config
  softwareHash: string; // SHA-256 hash of NLP pipeline software

  // Semantic coherence (C-D-4)
  crossConsistencyScore: number; // 0-1 score of cross-triple consistency

  // Employment plausibility (C-D-5)
  llmConfidence: number; // 0-1 LLM adjudication confidence
  numericExtractionTrace: string; // JSON string of extraction trace

  // EMTAK consistency (C-D-6)
  emtakCode: string; // 5-digit EMTAK classification code
  registrySectorMatch: boolean; // Whether EMTAK matches business registry

  // Temporal validity (C-D-7)
  articleDate: string; // ISO date of article
  ingestionTime: string; // ISO timestamp of pipeline ingestion

  // Provenance closure (C-D-8)
  provenanceHash: string; // SHA-256 hash of provenance chain
  wasGeneratedBy: string; // URI of generating process

  // Governance acknowledgement (C-D-9)
  daoSignature: string; // DAO governance signature
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
    name: "Example D \u2013 Employment Event Detection",
    description:
      "MFSSIA challenge set for verifying employment event detection from Estonian news articles. Ensures source authenticity, NLP pipeline determinism, employment plausibility, EMTAK classification consistency, and provenance completeness.",
    version: "1.0",
    status: "ACTIVE",
    mandatoryChallenges: 9,
    optionalChallenges: 0,
    challenges: [
      {
        code: "mfssia:C-D-1",
        name: "Source Authenticity",
        description: "Verifies that the article originates from a whitelisted institutional publisher (ERR).",
        factorClass: "SourceIntegrity",
        mandatory: true,
        expectedEvidence: ["sourceDomainHash", "contentHash"],
        oracleEndpoint: "ERRArchiveOracle",
        question: "Does the article originate from a whitelisted institutional publisher?",
        evaluationPassCondition: "sourceDomainHash matches whitelisted ERR domain",
      },
      {
        code: "mfssia:C-D-2",
        name: "Content Integrity",
        description: "Verifies that the TTL content has not been tampered with since generation from the source CSV.",
        factorClass: "DataIntegrity",
        mandatory: true,
        expectedEvidence: ["contentHash", "csvHash"],
        oracleEndpoint: "InternalHashOracle",
        question: "Is the TTL content hash consistent with the source data hash?",
        evaluationPassCondition:
          "contentHash and csvHash are valid SHA-256 hashes and content is internally consistent",
      },
      {
        code: "mfssia:C-D-3",
        name: "NLP Determinism",
        description:
          "Verifies that the NLP pipeline produces deterministic output given the same input and model version.",
        factorClass: "ProcessIntegrity",
        mandatory: true,
        expectedEvidence: ["modelName", "modelVersionHash", "softwareHash"],
        oracleEndpoint: "ContainerRegistryOracle",
        question: "Is the NLP pipeline version verifiable and deterministic?",
        evaluationPassCondition: "modelVersionHash matches registered model, softwareHash matches container registry",
      },
      {
        code: "mfssia:C-D-4",
        name: "Semantic Coherence",
        description:
          "Checks cross-consistency of extracted triples (e.g., employment events reference valid entities).",
        factorClass: "ContentIntegrity",
        mandatory: true,
        expectedEvidence: ["crossConsistencyScore"],
        oracleEndpoint: "SemanticValidationOracle",
        question: "Are the extracted RDF triples semantically coherent and cross-consistent?",
        evaluationPassCondition: "crossConsistencyScore >= 0.7",
      },
      {
        code: "mfssia:C-D-5",
        name: "Employment Plausibility",
        description:
          "Uses LLM adjudication to verify whether extracted employment events are plausible given the article text.",
        factorClass: "ContentIntegrity",
        mandatory: true,
        expectedEvidence: ["llmConfidence", "numericExtractionTrace"],
        oracleEndpoint: "LLMAdjudicationOracle",
        question: "Are the extracted employment events plausible given the source article?",
        evaluationPassCondition: "llmConfidence >= 0.6 and numericExtractionTrace is valid JSON",
      },
      {
        code: "mfssia:C-D-6",
        name: "EMTAK Consistency",
        description:
          "Verifies that the EMTAK classification code is consistent with the business registry sector data.",
        factorClass: "ContentIntegrity",
        mandatory: true,
        expectedEvidence: ["emtakCode", "registrySectorMatch"],
        oracleEndpoint: "BusinessRegistryOracle",
        question: "Is the EMTAK classification consistent with the Estonian Business Registry?",
        evaluationPassCondition: "emtakCode matches 5-digit pattern and registrySectorMatch is true",
      },
      {
        code: "mfssia:C-D-7",
        name: "Temporal Validity",
        description:
          "Checks that the article date and pipeline ingestion timestamp are within acceptable temporal bounds.",
        factorClass: "TemporalValidity",
        mandatory: true,
        expectedEvidence: ["articleDate", "ingestionTime"],
        oracleEndpoint: "TimeOracle",
        question: "Are the temporal claims (article date, ingestion time) valid and consistent?",
        evaluationPassCondition: "articleDate <= ingestionTime and ingestionTime <= now + 24h",
      },
      {
        code: "mfssia:C-D-8",
        name: "Provenance Closure",
        description:
          "Validates that the RDF graph has complete provenance metadata (prov:wasGeneratedBy chain is closed).",
        factorClass: "Provenance",
        mandatory: true,
        expectedEvidence: ["provenanceHash", "wasGeneratedBy"],
        oracleEndpoint: "RDFValidatorOracle",
        question: "Does the RDF graph have a complete and valid provenance chain?",
        evaluationPassCondition: "provenanceHash is valid SHA-256 and wasGeneratedBy URI resolves",
      },
      {
        code: "mfssia:C-D-9",
        name: "Governance Acknowledgement",
        description: "Verifies that the DAO governance system has acknowledged and signed off on the data submission.",
        factorClass: "DataIntegrity",
        mandatory: true,
        expectedEvidence: ["daoSignature"],
        oracleEndpoint: "GovernanceOracle",
        question: "Has the DAO governance system acknowledged this data submission?",
        evaluationPassCondition: "daoSignature is a valid cryptographic signature from a DAO committee member",
      },
    ],
    applicableRoles: ["MEMBER_INSTITUTION", "DATA_VALIDATOR"],
    requiredConfidence: 0.8,
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

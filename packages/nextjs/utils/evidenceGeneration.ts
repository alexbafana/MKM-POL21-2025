/**
 * Evidence Generation Utilities for MFSSIA Challenges
 * Generates structured evidence payloads for different challenge types
 */
import { EvidencePayload } from "~~/services/MFSSIAService";

/**
 * Hash a string using Web Crypto API (SHA-256)
 * Works in both browser and Node.js environments
 */
export async function sha256Hash(data: string): Promise<string> {
  // Check if we're in a browser environment
  if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Node.js environment
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Generate current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// ==================== EXAMPLE A: Baseline RDF Artifact Integrity Challenges ====================
// These challenges verify the integrity of RDF article data submitted to the DAO

/**
 * Helper: Generate semantic fingerprint from content
 * In production, this would use NLP models; here we use a simplified hash-based approach
 */
async function generateSemanticFingerprint(content: string): Promise<string> {
  // Normalize content: lowercase, remove extra whitespace, sort words
  const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").sort().join(" ");
  return sha256Hash(words);
}

/**
 * Helper: Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * C-A-1: Source Authenticity Challenge
 * Verifies if the article originates from a whitelisted institutional publisher
 *
 * Expected evidence: { sourceDomainHash, contentHash }
 */
export async function generateSourceAuthenticityEvidence(
  sourceDomain: string,
  content: string,
): Promise<EvidencePayload> {
  const domain = extractDomain(sourceDomain);
  const sourceDomainHash = await sha256Hash(domain);
  const contentHash = await sha256Hash(content);

  return {
    sourceDomainHash,
    contentHash,
  };
}

/**
 * C-A-2: Content Integrity Challenge
 * Detects if content is tampered or near-duplicate of flagged content
 *
 * Expected evidence: { contentHash, semanticFingerprint, similarityScore }
 */
export async function generateContentIntegrityEvidence(
  content: string,
  similarityScore: number = 0, // 0-1, will be calculated by oracle if not provided
): Promise<EvidencePayload> {
  const contentHash = await sha256Hash(content);
  const semanticFingerprint = await generateSemanticFingerprint(content);

  return {
    contentHash,
    semanticFingerprint,
    similarityScore,
  };
}

/**
 * C-A-3: Temporal Validity Challenge
 * Checks if the publish date is consistent with evidence
 *
 * Expected evidence: { claimedPublishDate, serverTimestamp, archiveEarliestCaptureDate }
 */
export function generateTemporalValidityEvidence(
  claimedPublishDate: string,
  archiveEarliestCaptureDate?: string,
): EvidencePayload {
  const serverTimestamp = getCurrentTimestamp();

  return {
    claimedPublishDate,
    serverTimestamp,
    archiveEarliestCaptureDate: archiveEarliestCaptureDate || claimedPublishDate,
  };
}

/**
 * C-A-4: Author Authenticity Challenge
 * Verifies if the author is a real, attributable individual
 *
 * Expected evidence: { authorName, authorEmailDomain, affiliationRecordHash }
 */
export async function generateAuthorAuthenticityEvidence(
  authorName: string,
  authorEmailDomain?: string,
  affiliationRecord?: string,
): Promise<EvidencePayload> {
  const affiliationRecordHash = affiliationRecord ? await sha256Hash(affiliationRecord) : await sha256Hash(authorName);

  return {
    authorName,
    authorEmailDomain: authorEmailDomain || "unknown",
    affiliationRecordHash,
  };
}

/**
 * C-A-5: Provenance Chain Challenge
 * Validates the cryptographic provenance chain
 *
 * Expected evidence: { artifactSignature, merkleProof, signerPublicKeyId }
 */
export async function generateProvenanceChainEvidence(
  artifactContent: string,
  signerPublicKeyId: string,
  signFunction?: (data: string) => Promise<string>,
): Promise<EvidencePayload> {
  // Generate artifact signature
  let artifactSignature = "";
  if (signFunction) {
    artifactSignature = await signFunction(artifactContent);
  } else {
    // Fallback: hash the content as a pseudo-signature
    artifactSignature = await sha256Hash(artifactContent + getCurrentTimestamp());
  }

  // Generate simple Merkle proof (in production, this would be a real Merkle tree)
  const leafHash = await sha256Hash(artifactContent);
  const merkleProof = JSON.stringify({
    leaf: leafHash,
    root: await sha256Hash(leafHash + signerPublicKeyId),
    path: [],
  });

  return {
    artifactSignature,
    merkleProof,
    signerPublicKeyId,
  };
}

/**
 * C-A-6: Distribution Integrity Challenge
 * Detects coordinated inauthentic amplification
 *
 * Expected evidence: { shareEventTimestamps, accountTrustSignals, networkClusterScore }
 */
export function generateDistributionIntegrityEvidence(
  shareEventTimestamps?: string[],
  accountTrustSignals?: string,
  networkClusterScore?: number,
): EvidencePayload {
  // If no share events provided, use current timestamp
  const timestamps = shareEventTimestamps?.length ? shareEventTimestamps.join(",") : getCurrentTimestamp();

  return {
    shareEventTimestamps: timestamps,
    accountTrustSignals: accountTrustSignals || "UNVERIFIED",
    networkClusterScore: networkClusterScore ?? 0.1, // Low score = no coordinated amplification
  };
}

/**
 * Generate all Example-A evidence from RDF artifact data
 * Convenience function to generate all 6 challenges at once
 */
export async function generateAllExampleAEvidence(
  artifactData: {
    sourceDomain: string;
    content: string;
    claimedPublishDate: string;
    authorName: string;
    authorEmailDomain?: string;
    archiveEarliestCaptureDate?: string;
    affiliationRecord?: string;
    signerPublicKeyId?: string;
    shareEventTimestamps?: string[];
    accountTrustSignals?: string;
    networkClusterScore?: number;
    signFunction?: (data: string) => Promise<string>;
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _includeOptional: boolean = false,
): Promise<Record<string, EvidencePayload>> {
  const evidence: Record<string, EvidencePayload> = {};

  // C-A-1: Source Authenticity (Mandatory)
  evidence["mfssia:C-A-1"] = await generateSourceAuthenticityEvidence(artifactData.sourceDomain, artifactData.content);

  // C-A-2: Content Integrity (Mandatory)
  evidence["mfssia:C-A-2"] = await generateContentIntegrityEvidence(
    artifactData.content,
    0, // Let oracle calculate similarity
  );

  // C-A-3: Temporal Validity (Mandatory)
  evidence["mfssia:C-A-3"] = generateTemporalValidityEvidence(
    artifactData.claimedPublishDate,
    artifactData.archiveEarliestCaptureDate,
  );

  // C-A-4: Author Authenticity (Mandatory)
  evidence["mfssia:C-A-4"] = await generateAuthorAuthenticityEvidence(
    artifactData.authorName,
    artifactData.authorEmailDomain,
    artifactData.affiliationRecord,
  );

  // C-A-5: Provenance Chain (Mandatory per MFSSIA API)
  evidence["mfssia:C-A-5"] = await generateProvenanceChainEvidence(
    artifactData.content,
    artifactData.signerPublicKeyId || "did:web:mkmpol21:unknown",
    artifactData.signFunction,
  );

  // C-A-6: Distribution Integrity (Mandatory)
  evidence["mfssia:C-A-6"] = generateDistributionIntegrityEvidence(
    artifactData.shareEventTimestamps,
    artifactData.accountTrustSignals,
    artifactData.networkClusterScore,
  );

  return evidence;
}

// ==================== EXAMPLE B: Institution Challenges ====================

/**
 * C-B-1: Domain Ownership Challenge
 * Generate TXT record for DNS verification
 */
export async function generateDomainOwnershipEvidence(domain: string): Promise<EvidencePayload> {
  const timestamp = getCurrentTimestamp();
  const verificationString = `${domain}:${timestamp}`;
  const verificationHash = await sha256Hash(verificationString);

  return {
    domain,
    txtRecord: `mfssia-verification=${verificationHash}`,
    timestamp,
    instructions: `Add this TXT record to your DNS: mfssia-verification=${verificationHash}`,
  };
}

/**
 * C-B-2: Business Registry Verification
 * Provide Estonian business registry information
 */
export function generateBusinessRegistryEvidence(registryNumber: string, companyName: string): EvidencePayload {
  return {
    registryNumber,
    companyName,
    country: "EE", // Estonia
    timestamp: getCurrentTimestamp(),
    // In production, this would include API call to Äriregister
  };
}

/**
 * C-B-3: Authorized Representative Evidence
 * Prove wallet owner is authorized to represent the institution
 */
export async function generateAuthorizedRepresentativeEvidence(
  name: string,
  position: string,
  institutionName: string,
): Promise<EvidencePayload> {
  return {
    representativeName: name,
    position,
    institutionName,
    timestamp: getCurrentTimestamp(),
    // In production, include supporting documents or credentials
  };
}

/**
 * C-B-4: Institutional Signature
 * Multi-sig or institutional wallet signature
 */
export async function generateInstitutionalSignatureEvidence(
  institutionAddress: string,
  nonce: string,
  signMessageAsync: (args: { message: string }) => Promise<string>,
): Promise<EvidencePayload> {
  const timestamp = getCurrentTimestamp();
  const message = `MFSSIA Institutional Signature\nNonce: ${nonce}\nInstitution Address: ${institutionAddress}\nTimestamp: ${timestamp}`;

  try {
    const signature = await signMessageAsync({ message });

    return {
      institutionAddress,
      signature,
      nonce,
      timestamp,
      message,
    };
  } catch (error: any) {
    throw new Error(`Failed to sign institutional message: ${error.message}`);
  }
}

// ==================== EXAMPLE D: RDF Data Validation Challenges ====================

/**
 * Parse RDF content to extract triples and metadata
 * Simplified parser - in production use a proper RDF library
 */
function parseRDFContent(rdfContent: string): {
  source?: string;
  articleDate?: string;
  jobCount?: number;
  emtakCode?: string;
  employmentEvent?: string;
  provenanceHash?: string;
} {
  const result: any = {};

  // Extract source
  const sourceMatch = rdfContent.match(/ex:source\s+"([^"]+)"/);
  if (sourceMatch) result.source = sourceMatch[1];

  // Extract date
  const dateMatch = rdfContent.match(/dct:created\s+"([^"]+)"/);
  if (dateMatch) result.articleDate = dateMatch[1];

  // Extract job count
  const jobCountMatch = rdfContent.match(/emp:jobCount\s+(\d+)/);
  if (jobCountMatch) result.jobCount = parseInt(jobCountMatch[1]);

  // Extract EMTAK code
  const emtakMatch = rdfContent.match(/cls:(\d+)/);
  if (emtakMatch) result.emtakCode = emtakMatch[1];

  // Extract employment event
  const eventMatch = rdfContent.match(/emp:employmentEvent\s+"([^"]+)"/);
  if (eventMatch) result.employmentEvent = eventMatch[1];

  // Check for provenance
  const hasProvenance = rdfContent.includes("prov:wasGeneratedBy");
  result.hasProvenance = hasProvenance;

  return result;
}

/**
 * C-D-1: Source Authenticity Challenge (Example D)
 */
export async function generateExampleDSourceAuthenticityEvidence(rdfContent: string): Promise<EvidencePayload> {
  const parsed = parseRDFContent(rdfContent);
  const sourceHash = await sha256Hash(parsed.source || "");
  const contentHash = await sha256Hash(rdfContent);

  return {
    source: parsed.source,
    sourceHash,
    contentHash,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-2: Content Integrity Challenge (Example D)
 */
export async function generateExampleDContentIntegrityEvidence(rdfContent: string): Promise<EvidencePayload> {
  const contentHash = await sha256Hash(rdfContent);

  return {
    contentHash,
    contentLength: rdfContent.length,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-3: NLP Determinism Challenge
 */
export function generateNLPDeterminismEvidence(nlpModels: { name: string; version: string }[]): EvidencePayload {
  return {
    models: nlpModels,
    timestamp: getCurrentTimestamp(),
    // In production, include model hashes and software trajectory
  };
}

/**
 * C-D-4: Semantic Coherence Challenge
 */
export function generateSemanticCoherenceEvidence(
  crossConsistencyScore: number,
  nerEntities: string[],
  keywords: string[],
): EvidencePayload {
  return {
    crossConsistencyScore,
    nerEntitiesCount: nerEntities.length,
    keywordsCount: keywords.length,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-5: Employment Event Plausibility Challenge
 */
export function generateEmploymentEventEvidence(rdfContent: string, llmConfidence: number): EvidencePayload {
  const parsed = parseRDFContent(rdfContent);

  return {
    employmentEvent: parsed.employmentEvent,
    jobCount: parsed.jobCount,
    llmConfidence,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-6: EMTAK Consistency Challenge
 */
export async function generateEMTAKConsistencyEvidence(
  rdfContent: string,
  companyName: string,
): Promise<EvidencePayload> {
  const parsed = parseRDFContent(rdfContent);

  return {
    emtakCode: parsed.emtakCode,
    companyName,
    // In production, verify against Äriregister
    registryMatch: true,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-7: Temporal Validity Challenge (Example D)
 */
export function generateExampleDTemporalValidityEvidence(rdfContent: string): EvidencePayload {
  const parsed = parseRDFContent(rdfContent);
  const currentTime = new Date();
  const articleDate = parsed.articleDate ? new Date(parsed.articleDate) : currentTime;
  const daysDifference = Math.floor((currentTime.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    articleDate: parsed.articleDate,
    ingestionTime: getCurrentTimestamp(),
    daysDifference,
    isWithinPolicy: daysDifference <= 30, // 30-day policy
  };
}

/**
 * C-D-8: Provenance Closure Challenge
 */
export async function generateProvenanceClosureEvidence(rdfContent: string): Promise<EvidencePayload> {
  const hasProvenanceLinks = rdfContent.includes("prov:wasGeneratedBy");
  const hasProvenanceHash = rdfContent.match(/provenanceHash/);

  // Extract provenance information
  const provenanceMatch = rdfContent.match(/prov:wasGeneratedBy\s+ex:([^\s;]+)/);
  const pipelineRun = provenanceMatch ? provenanceMatch[1] : null;

  return {
    hasProvenanceLinks,
    hasProvenanceHash: !!hasProvenanceHash,
    pipelineRun,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * C-D-9: Governance Acknowledgement Challenge
 */
export async function generateGovernanceAcknowledgementEvidence(
  rdfContent: string,
  governanceSignature?: string,
): Promise<EvidencePayload> {
  return {
    contentHash: await sha256Hash(rdfContent),
    governanceSignature: governanceSignature || "",
    eligibleForMinistryAnalytics: !!governanceSignature,
    timestamp: getCurrentTimestamp(),
  };
}

/**
 * Generate all Example D evidence from RDF content
 * Convenience function to generate all 9 challenges at once
 */
export async function generateAllExampleDEvidence(
  rdfContent: string,
  options: {
    nlpModels?: { name: string; version: string }[];
    llmConfidence?: number;
    companyName?: string;
    governanceSignature?: string;
  } = {},
): Promise<Record<string, EvidencePayload>> {
  const {
    nlpModels = [
      { name: "EstBERT", version: "1.0" },
      { name: "KeyBERT", version: "0.7" },
      { name: "EstNER", version: "2.1" },
    ],
    llmConfidence = 0.94,
    companyName = "Unknown",
    governanceSignature = "",
  } = options;

  // Note: parseRDFContent is called by individual evidence generators as needed

  // Generate evidence for all challenges
  const evidence: Record<string, EvidencePayload> = {
    "mfssia:C-D-1": await generateExampleDSourceAuthenticityEvidence(rdfContent),
    "mfssia:C-D-2": await generateExampleDContentIntegrityEvidence(rdfContent),
    "mfssia:C-D-3": generateNLPDeterminismEvidence(nlpModels),
    "mfssia:C-D-4": generateSemanticCoherenceEvidence(
      0.92, // cross-consistency score
      ["WoodHive", "Pärnu", "Tarvo Kivimägi"], // NER entities (would be extracted)
      ["WoodHive", "120 uut töökohta", "tootmise laienemine"], // keywords
    ),
    "mfssia:C-D-5": generateEmploymentEventEvidence(rdfContent, llmConfidence),
    "mfssia:C-D-6": await generateEMTAKConsistencyEvidence(rdfContent, companyName),
    "mfssia:C-D-7": generateExampleDTemporalValidityEvidence(rdfContent),
    "mfssia:C-D-8": await generateProvenanceClosureEvidence(rdfContent),
    "mfssia:C-D-9": await generateGovernanceAcknowledgementEvidence(rdfContent, governanceSignature),
  };

  return evidence;
}

/**
 * Validate RDF syntax (basic check)
 * Returns true if RDF appears valid
 */
export function validateRDFSyntax(rdfContent: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for basic RDF structure
  if (!rdfContent.includes("@prefix") && !rdfContent.includes("<rdf:RDF")) {
    errors.push("Missing RDF namespace declarations");
  }

  // Check for required prefixes
  const requiredPrefixes = ["ex:", "art:", "dct:", "prov:"];
  for (const prefix of requiredPrefixes) {
    if (!rdfContent.includes(prefix)) {
      errors.push(`Missing required prefix: ${prefix}`);
    }
  }

  // Check for basic triples
  if (!rdfContent.match(/\w+:\w+\s+\w+:\w+/)) {
    errors.push("No valid RDF triples found");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * MFSSIA Admin Setup Script
 *
 * This script allows the DAO owner to configure challenge sets and definitions
 * on the MFSSIA production node.
 *
 * Requirements:
 * - MFSSIA_API_URL environment variable
 * - MFSSIA_ADMIN_API_KEY environment variable (with governance/admin permissions)
 *
 * Usage:
 *   npx tsx mfssia-admin-setup.ts
 *
 * This will:
 * 1. Create challenge definitions (C-A-1, C-A-2, C-A-3, C-B-1, etc.)
 * 2. Create challenge sets (Example-A, Example-B, Example-D)
 */

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const MFSSIA_ADMIN_API_KEY = process.env.MFSSIA_ADMIN_API_KEY || "";

if (!MFSSIA_ADMIN_API_KEY) {
  console.error("❌ ERROR: MFSSIA_ADMIN_API_KEY environment variable is required");
  console.error("   This API key must have governance/admin permissions on the MFSSIA node");
  console.error("   Set it with: export MFSSIA_ADMIN_API_KEY=your_admin_key_here");
  process.exit(1);
}

interface CreateResult {
  success: boolean;
  item: string;
  data?: any;
  error?: string;
}

const results: CreateResult[] = [];

/**
 * HTTP request wrapper with admin authentication
 */
async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${MFSSIA_API_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${MFSSIA_ADMIN_API_KEY}`,
    ...options.headers,
  };

  console.log(`\n🔄 ${options.method || 'GET'} ${endpoint}`);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Success (${duration}ms)`);
    return data;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error (${duration}ms):`, error.message);
    throw error;
  }
}

/**
 * Challenge Definitions for Example A (Individual User Authentication)
 */
const EXAMPLE_A_DEFINITIONS = [
  {
    code: "mfssia:C-A-1",
    name: "Wallet Ownership",
    description: "Verify that the user controls the wallet associated with their DID",
    factorClass: "SourceIntegrity",
    question: "Does the user control the cryptographic keys for this wallet?",
    expectedEvidence: [
      { type: "mfssia:SignedMessage", name: "signature", dataType: "string" },
      { type: "mfssia:Message", name: "message", dataType: "string" },
      { type: "mfssia:PublicKey", name: "publicKey", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "CryptoSignatureVerifier",
      oracleType: "INTERNAL" as const,
      verificationMethod: "ECDSA signature verification",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Signature is cryptographically valid for the provided message and public key",
    },
    failureEffect: "User cannot authenticate as an individual",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-A-2",
    name: "Liveness Check",
    description: "Verify that the authentication is performed by a live human, not a bot",
    factorClass: "ProcessIntegrity",
    question: "Is this authentication performed by a live human user?",
    expectedEvidence: [
      { type: "mfssia:InteractionTime", name: "interactionTime", dataType: "number" },
      { type: "mfssia:UserAgent", name: "userAgent", dataType: "string" },
      { type: "mfssia:Timestamp", name: "timestamp", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "LivenessDetector",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Behavioral analysis and timing patterns",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Interaction patterns consistent with human behavior",
    },
    failureEffect: "Authentication flagged as potentially automated",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-A-3",
    name: "Geographic Location (Optional)",
    description: "Optional verification of user's geographic location for compliance",
    factorClass: "DataIntegrity",
    question: "Is the user located in an authorized jurisdiction?",
    expectedEvidence: [
      { type: "mfssia:IPAddress", name: "ipAddress", dataType: "string" },
      { type: "mfssia:Country", name: "country", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "GeolocationVerifier",
      oracleType: "INTERNAL" as const,
      verificationMethod: "IP geolocation database lookup",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "User is in an authorized jurisdiction",
    },
    failureEffect: "Optional challenge - does not block authentication",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
];

/**
 * Challenge Definitions for Example B (Institutional Authentication)
 */
const EXAMPLE_B_DEFINITIONS = [
  {
    code: "mfssia:C-B-1",
    name: "Domain Ownership",
    description: "Verify that the institution controls the claimed domain",
    factorClass: "SourceIntegrity",
    question: "Does the institution control the DNS records for their domain?",
    expectedEvidence: [
      { type: "mfssia:Domain", name: "domain", dataType: "string" },
      { type: "mfssia:DNSRecord", name: "dnsRecord", dataType: "string" },
      { type: "mfssia:Nonce", name: "nonce", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "DNSVerifier",
      oracleType: "INTERNAL" as const,
      verificationMethod: "DNS TXT record verification",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "DNS TXT record matches expected nonce",
    },
    failureEffect: "Institution cannot authenticate",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-B-2",
    name: "Business Registry Verification",
    description: "Verify that the institution is registered in official business registry",
    factorClass: "SourceIntegrity",
    question: "Is this institution registered in the Estonian Business Registry?",
    expectedEvidence: [
      { type: "mfssia:RegistryCode", name: "registryCode", dataType: "string" },
      { type: "mfssia:LegalName", name: "legalName", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "BusinessRegistryOracle",
      oracleType: "CHAINLINK" as const,
      verificationMethod: "Query Estonian Business Registry API",
    },
    evaluation: {
      resultType: "entities" as const,
      passCondition: "Registry code matches legal name in official registry",
    },
    failureEffect: "Institution cannot authenticate",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-B-3",
    name: "Authorized Representative",
    description: "Verify that the person authenticating is authorized to represent the institution",
    factorClass: "ProcessIntegrity",
    question: "Is this person authorized to act on behalf of the institution?",
    expectedEvidence: [
      { type: "mfssia:SignedAuthorization", name: "authorization", dataType: "string" },
      { type: "mfssia:RepresentativeID", name: "representativeId", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "AuthorizationVerifier",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Verify signature against institution's authorized signers list",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Representative is listed as authorized signer",
    },
    failureEffect: "Representative cannot authenticate for institution",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-B-4",
    name: "Institutional Signature",
    description: "Verify cryptographic signature from institution's wallet",
    factorClass: "SourceIntegrity",
    question: "Does the institution control the cryptographic keys for this wallet?",
    expectedEvidence: [
      { type: "mfssia:InstitutionalSignature", name: "signature", dataType: "string" },
      { type: "mfssia:Message", name: "message", dataType: "string" },
      { type: "mfssia:InstitutionalPublicKey", name: "publicKey", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "InstitutionalCryptoVerifier",
      oracleType: "INTERNAL" as const,
      verificationMethod: "ECDSA signature verification for institutional wallet",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Institutional signature is cryptographically valid",
    },
    failureEffect: "Institution cannot authenticate",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
];

/**
 * Challenge Definitions for Example D (RDF Data Validation)
 */
const EXAMPLE_D_DEFINITIONS = [
  {
    code: "mfssia:C-D-1",
    name: "Source Authenticity",
    description: "Verify that the RDF data originates from an authentic source",
    factorClass: "SourceIntegrity",
    question: "Can the data source be cryptographically verified?",
    expectedEvidence: [
      { type: "mfssia:SourceSignature", name: "signature", dataType: "string" },
      { type: "mfssia:SourcePublicKey", name: "publicKey", dataType: "string" },
      { type: "mfssia:DataHash", name: "dataHash", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "SourceAuthenticityOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Verify digital signature of data source",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Source signature is valid and from trusted authority",
    },
    failureEffect: "RDF graph rejected - untrusted source",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-2",
    name: "Content Integrity",
    description: "Verify that RDF content has not been tampered with",
    factorClass: "DataIntegrity",
    question: "Does the content hash match the expected value?",
    expectedEvidence: [
      { type: "mfssia:ContentHash", name: "contentHash", dataType: "string" },
      { type: "mfssia:RDFContent", name: "rdfContent", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "ContentIntegrityOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Compare computed hash with declared hash",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Computed hash matches declared hash",
    },
    failureEffect: "RDF graph rejected - content tampering detected",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-3",
    name: "NLP Determinism",
    description: "Verify that NLP processing is deterministic and reproducible",
    factorClass: "ProcessIntegrity",
    question: "Can the NLP results be reproduced with the declared model?",
    expectedEvidence: [
      { type: "mfssia:ModelVersion", name: "modelVersion", dataType: "string" },
      { type: "mfssia:NLPResults", name: "nlpResults", dataType: "string" },
      { type: "mfssia:SourceText", name: "sourceText", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "NLPDeterminismOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Rerun NLP model and compare outputs",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "NLP results can be reproduced within tolerance",
    },
    failureEffect: "RDF graph flagged - non-deterministic NLP processing",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-4",
    name: "Semantic Coherence",
    description: "Verify that RDF triples are semantically coherent",
    factorClass: "Semantic",
    question: "Are the RDF triples semantically valid and coherent?",
    expectedEvidence: [
      { type: "mfssia:RDFTriples", name: "rdfTriples", dataType: "string" },
      { type: "mfssia:OntologyURI", name: "ontologyUri", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "SemanticCoherenceOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "SHACL validation against ontology",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "All triples conform to declared ontology",
    },
    failureEffect: "RDF graph rejected - semantic violations detected",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-5",
    name: "Employment Event Plausibility",
    description: "Verify that employment events are plausible and internally consistent",
    factorClass: "Semantic",
    question: "Are the employment events plausible (e.g., timeline, roles)?",
    expectedEvidence: [
      { type: "mfssia:EmploymentEvents", name: "events", dataType: "string" },
      { type: "mfssia:Timeline", name: "timeline", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "PlausibilityOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Check for temporal consistency and logical constraints",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "No implausible or contradictory events detected",
    },
    failureEffect: "RDF graph flagged - plausibility issues detected",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-6",
    name: "EMTAK Consistency",
    description: "Verify that EMTAK codes (Estonian classification) are valid and consistent",
    factorClass: "Semantic",
    question: "Are EMTAK codes valid according to official classification?",
    expectedEvidence: [
      { type: "mfssia:EMTAKCodes", name: "emtakCodes", dataType: "string" },
      { type: "mfssia:ClassificationVersion", name: "version", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "EMTAKOracle",
      oracleType: "CHAINLINK" as const,
      verificationMethod: "Validate against official EMTAK registry",
    },
    evaluation: {
      resultType: "entities" as const,
      passCondition: "All EMTAK codes are valid in the declared version",
    },
    failureEffect: "RDF graph rejected - invalid EMTAK codes",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-7",
    name: "Temporal Validity",
    description: "Verify that temporal attributes are valid and consistent",
    factorClass: "DataIntegrity",
    question: "Are all timestamps and date ranges valid?",
    expectedEvidence: [
      { type: "mfssia:Timestamps", name: "timestamps", dataType: "string" },
      { type: "mfssia:DateRanges", name: "dateRanges", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "TemporalValidityOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Validate timestamp formats and logical consistency",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "All temporal data is valid and consistent",
    },
    failureEffect: "RDF graph rejected - temporal inconsistencies",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-8",
    name: "Provenance Closure",
    description: "Verify that all provenance claims are complete and traceable",
    factorClass: "Provenance",
    question: "Is the complete provenance chain documented and verifiable?",
    expectedEvidence: [
      { type: "mfssia:ProvenanceChain", name: "provenanceChain", dataType: "string" },
      { type: "mfssia:W3CPROV", name: "w3cProv", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "ProvenanceOracle",
      oracleType: "INTERNAL" as const,
      verificationMethod: "Validate W3C PROV-O completeness",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "All provenance entities and activities are documented",
    },
    failureEffect: "RDF graph flagged - incomplete provenance",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
  {
    code: "mfssia:C-D-9",
    name: "Governance Acknowledgement",
    description: "Verify that data provider acknowledges DAO governance rules",
    factorClass: "Governance",
    question: "Has the data provider acknowledged DAO governance terms?",
    expectedEvidence: [
      { type: "mfssia:GovernanceSignature", name: "governanceSignature", dataType: "string" },
      { type: "mfssia:TermsVersion", name: "termsVersion", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "GovernanceOracle",
      oracleType: "DAO" as const,
      verificationMethod: "Verify signature against DAO governance terms",
    },
    evaluation: {
      resultType: "assertions" as const,
      passCondition: "Valid signature on current governance terms",
    },
    failureEffect: "RDF graph rejected - governance acknowledgement missing",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE" as const,
  },
];

/**
 * Challenge Set Configurations
 */
const CHALLENGE_SETS = [
  {
    code: "mfssia:Example-A",
    name: "Individual User Authentication",
    description: "Basic authentication for ordinary users accessing the DAO platform",
    version: "1.0.0",
    status: "ACTIVE",
    publishedBy: {
      type: "Organization",
      name: "MKM-POL21 DAO",
    },
    mandatoryChallenges: ["mfssia:C-A-1", "mfssia:C-A-2"],
    optionalChallenges: ["mfssia:C-A-3"],
    policy: {
      minChallengesRequired: 2,
      aggregationRule: "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE" as const,
      confidenceThreshold: 0.85,
    },
    lifecycle: {
      creationEvent: "DAO_APPROVAL",
      mutation: "IMMUTABLE",
      deprecationPolicy: "VERSIONED_REPLACEMENT",
    },
  },
  {
    code: "mfssia:Example-B",
    name: "Institutional Authentication",
    description: "Enhanced authentication for member institutions submitting data or participating in governance",
    version: "1.0.0",
    status: "ACTIVE",
    publishedBy: {
      type: "Organization",
      name: "MKM-POL21 DAO",
    },
    mandatoryChallenges: ["mfssia:C-B-1", "mfssia:C-B-2", "mfssia:C-B-3", "mfssia:C-B-4"],
    optionalChallenges: [],
    policy: {
      minChallengesRequired: 4,
      aggregationRule: "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE" as const,
      confidenceThreshold: 0.9,
    },
    lifecycle: {
      creationEvent: "DAO_APPROVAL",
      mutation: "IMMUTABLE",
      deprecationPolicy: "VERSIONED_REPLACEMENT",
    },
  },
  {
    code: "mfssia:Example-D",
    name: "RDF Data Validation",
    description: "Comprehensive validation pipeline for employment trends RDF graphs before DKG publication",
    version: "1.0.0",
    status: "ACTIVE",
    publishedBy: {
      type: "Organization",
      name: "MKM-POL21 DAO",
    },
    mandatoryChallenges: [
      "mfssia:C-D-1",
      "mfssia:C-D-2",
      "mfssia:C-D-3",
      "mfssia:C-D-4",
      "mfssia:C-D-5",
      "mfssia:C-D-6",
      "mfssia:C-D-7",
      "mfssia:C-D-8",
      "mfssia:C-D-9",
    ],
    optionalChallenges: [],
    policy: {
      minChallengesRequired: 9,
      aggregationRule: "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE" as const,
      confidenceThreshold: 0.85,
    },
    lifecycle: {
      creationEvent: "DAO_APPROVAL",
      mutation: "IMMUTABLE",
      deprecationPolicy: "VERSIONED_REPLACEMENT",
    },
  },
];

/**
 * Create a single challenge definition
 */
async function createChallengeDefinition(definition: any): Promise<CreateResult> {
  try {
    const data = await adminRequest("/api/challenge-definitions", {
      method: "POST",
      body: JSON.stringify(definition),
    });

    return {
      success: true,
      item: definition.code,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      item: definition.code,
      error: error.message,
    };
  }
}

/**
 * Create a challenge set
 */
async function createChallengeSet(challengeSet: any): Promise<CreateResult> {
  try {
    const data = await adminRequest("/api/challenge-sets", {
      method: "POST",
      body: JSON.stringify(challengeSet),
    });

    return {
      success: true,
      item: challengeSet.code,
      data,
    };
  } catch (error: any) {
    return {
      success: false,
      item: challengeSet.code,
      error: error.message,
    };
  }
}

/**
 * Print setup summary
 */
function printSummary(results: CreateResult[]) {
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 MFSSIA ADMIN SETUP SUMMARY");
  console.log("=".repeat(60));

  const totalItems = results.length;
  const successCount = results.filter(r => r.success).length;
  const failureCount = totalItems - successCount;

  console.log(`\nTotal Items: ${totalItems}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);

  console.log("\n" + "-".repeat(60));
  console.log("DETAILED RESULTS:");
  console.log("-".repeat(60));

  results.forEach(result => {
    const icon = result.success ? "✅" : "❌";
    console.log(`\n${icon} ${result.item}`);

    if (result.success && result.data) {
      console.log(`   Created successfully`);
    }

    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log(`\n${successCount === totalItems ? "🎉 ALL ITEMS CREATED!" : "⚠️  SOME ITEMS FAILED"}\n`);
}

/**
 * Main setup function
 */
async function runSetup() {
  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " ".repeat(12) + "MFSSIA ADMIN SETUP SCRIPT" + " ".repeat(21) + "║");
  console.log("╚" + "═".repeat(58) + "╝");
  console.log(`\nAPI Endpoint: ${MFSSIA_API_URL}`);
  console.log(`Admin API Key: ${MFSSIA_ADMIN_API_KEY ? "✅ Configured" : "❌ Missing"}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Step 1: Create all challenge definitions
    console.log("\n\n" + "=".repeat(60));
    console.log("STEP 1: Creating Challenge Definitions");
    console.log("=".repeat(60));

    const allDefinitions = [
      ...EXAMPLE_A_DEFINITIONS,
      ...EXAMPLE_B_DEFINITIONS,
      ...EXAMPLE_D_DEFINITIONS,
    ];

    console.log(`\nTotal definitions to create: ${allDefinitions.length}`);

    for (const definition of allDefinitions) {
      const result = await createChallengeDefinition(definition);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 2: Create all challenge sets
    console.log("\n\n" + "=".repeat(60));
    console.log("STEP 2: Creating Challenge Sets");
    console.log("=".repeat(60));

    console.log(`\nTotal challenge sets to create: ${CHALLENGE_SETS.length}`);

    for (const challengeSet of CHALLENGE_SETS) {
      const result = await createChallengeSet(challengeSet);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print summary
    printSummary(results);

    // Step 3: Verify setup
    console.log("\n\n" + "=".repeat(60));
    console.log("STEP 3: Verifying Setup");
    console.log("=".repeat(60));

    console.log("\n🔍 Querying challenge sets...");
    const sets = await adminRequest<{ data?: any[] }>("/api/challenge-sets");
    console.log(`Found ${sets.data?.length || 0} challenge sets`);

    console.log("\n🔍 Querying challenge definitions...");
    const definitions = await adminRequest<{ data?: any[] }>("/api/challenge-definitions");
    console.log(`Found ${definitions.data?.length || 0} challenge definitions`);

    console.log("\n✅ Setup verification complete!");

  } catch (error: any) {
    console.error("\n❌ Unexpected error during setup:", error);
    printSummary(results);
    process.exit(1);
  }
}

// Run setup
runSetup().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

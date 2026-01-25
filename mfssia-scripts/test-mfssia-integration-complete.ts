/**
 * MFSSIA Complete Integration Test
 * Sets up challenge definitions/sets, then tests the complete authentication flow
 *
 * Run with: npx tsx test-mfssia-integration-complete.ts
 */

import * as crypto from 'crypto';

// Environment configuration
const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const TEST_DID = `did:web:test:${Date.now()}`;

interface TestResult {
  step: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * HTTP request wrapper
 */
async function mfssiaRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${MFSSIA_API_URL}${endpoint}`;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
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
 * Challenge Definitions
 */
const CHALLENGE_DEFINITIONS = [
  // Example A - Individual Authentication
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
      oracleType: "INTERNAL",
      verificationMethod: "ECDSA signature verification",
    },
    evaluation: {
      resultType: "assertions",
      passCondition: "Signature is cryptographically valid",
    },
    failureEffect: "User cannot authenticate",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE",
  },
  {
    code: "mfssia:C-A-2",
    name: "Liveness Check",
    description: "Verify that the authentication is performed by a live human",
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
      oracleType: "INTERNAL",
      verificationMethod: "Behavioral analysis",
    },
    evaluation: {
      resultType: "assertions",
      passCondition: "Interaction patterns consistent with human behavior",
    },
    failureEffect: "Authentication flagged as potentially automated",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE",
  },
  {
    code: "mfssia:C-A-3",
    name: "Geographic Location",
    description: "Optional verification of user's geographic location",
    factorClass: "DataIntegrity",
    question: "Is the user located in an authorized jurisdiction?",
    expectedEvidence: [
      { type: "mfssia:IPAddress", name: "ipAddress", dataType: "string" },
      { type: "mfssia:Country", name: "country", dataType: "string" },
    ],
    oracle: {
      type: "mfssia:Oracle",
      name: "GeolocationVerifier",
      oracleType: "INTERNAL",
      verificationMethod: "IP geolocation database lookup",
    },
    evaluation: {
      resultType: "assertions",
      passCondition: "User is in an authorized jurisdiction",
    },
    failureEffect: "Optional challenge - does not block authentication",
    reusability: "GLOBAL",
    version: "1.0.0",
    status: "ACTIVE",
  },
];

/**
 * Challenge Sets
 */
const CHALLENGE_SETS = [
  {
    code: "mfssia:Example-A",
    name: "Individual User Authentication",
    description: "Basic authentication for ordinary users",
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
      aggregationRule: "ALL_MANDATORY_AND_WEIGHTED_CONFIDENCE",
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
 * Setup: Create Challenge Definitions
 */
async function setupChallengeDefinitions(): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("SETUP: Create Challenge Definitions");
  console.log("=".repeat(60));

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  // Check existing definitions
  try {
    const existing = await mfssiaRequest<any>("/api/challenge-definitions");
    const existingCodes = new Set(existing.data?.map((d: any) => d.code) || []);
    console.log(`\nFound ${existingCodes.size} existing definitions`);

    // Create each definition
    for (const definition of CHALLENGE_DEFINITIONS) {
      if (existingCodes.has(definition.code)) {
        console.log(`\n⏭️  Skipping ${definition.code} (already exists)`);
        skipped.push(definition.code);
        continue;
      }

      try {
        await mfssiaRequest("/api/challenge-definitions", {
          method: "POST",
          body: JSON.stringify(definition),
        });
        created.push(definition.code);
        console.log(`✅ Created ${definition.code}`);
      } catch (error: any) {
        console.error(`❌ Failed to create ${definition.code}: ${error.message}`);
        failed.push(definition.code);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      step: "Setup Challenge Definitions",
      success: failed.length === 0,
      data: { created, skipped, failed },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Setup Challenge Definitions",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Setup: Create Challenge Sets
 */
async function setupChallengeSets(): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("SETUP: Create Challenge Sets");
  console.log("=".repeat(60));

  const created: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  // Check existing sets
  try {
    const existing = await mfssiaRequest<any>("/api/challenge-sets");
    const existingCodes = new Set(existing.data?.map((s: any) => s.code) || []);
    console.log(`\nFound ${existingCodes.size} existing challenge sets`);

    // Create each set
    for (const challengeSet of CHALLENGE_SETS) {
      if (existingCodes.has(challengeSet.code)) {
        console.log(`\n⏭️  Skipping ${challengeSet.code} (already exists)`);
        skipped.push(challengeSet.code);
        continue;
      }

      try {
        await mfssiaRequest("/api/challenge-sets", {
          method: "POST",
          body: JSON.stringify(challengeSet),
        });
        created.push(challengeSet.code);
        console.log(`✅ Created ${challengeSet.code}`);
      } catch (error: any) {
        console.error(`❌ Failed to create ${challengeSet.code}: ${error.message}`);
        failed.push(challengeSet.code);
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return {
      step: "Setup Challenge Sets",
      success: failed.length === 0,
      data: { created, skipped, failed },
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Setup Challenge Sets",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 1: Health Check
 */
async function testHealthCheck(): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: Health Check");
  console.log("=".repeat(60));

  try {
    const data = await mfssiaRequest<any>("/api/api/infrastructure/healthcheck");
    return {
      step: "Health Check",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Health Check",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 2: Register DID
 */
async function testRegisterDID(): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 2: Register DID");
  console.log("=".repeat(60));
  console.log(`DID: ${TEST_DID}`);

  try {
    const data = await mfssiaRequest<any>("/api/identities/register", {
      method: "POST",
      body: JSON.stringify({
        did: TEST_DID,
        requestedChallengeSet: "mfssia:Example-A",
        metadata: {
          roleType: "TEST_USER",
          platform: "mkm-pol21-dao-test",
          timestamp: new Date().toISOString(),
          testRun: true,
        },
      }),
    });

    return {
      step: "Register DID",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Register DID",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 3: Create Challenge Instance
 */
async function testCreateChallengeInstance(): Promise<{ result: TestResult; instanceId?: string }> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 3: Create Challenge Instance");
  console.log("=".repeat(60));

  try {
    const data = await mfssiaRequest<any>("/api/challenge-instances", {
      method: "POST",
      body: JSON.stringify({
        did: TEST_DID,
        challengeSet: "mfssia:Example-A",
      }),
    });

    return {
      result: {
        step: "Create Challenge Instance",
        success: true,
        data,
        duration: Date.now() - startTime,
      },
      instanceId: data.data?.id || data.id,
    };
  } catch (error: any) {
    return {
      result: {
        step: "Create Challenge Instance",
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
    };
  }
}

/**
 * Test 4: Submit Evidence (Wallet Ownership)
 */
async function testSubmitEvidenceWallet(instanceId: string): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 4: Submit Evidence - Wallet Ownership");
  console.log("=".repeat(60));

  try {
    const message = `Authenticate DID: ${TEST_DID}`;
    const mockSignature = crypto.randomBytes(65).toString('hex');

    const data = await mfssiaRequest<any>("/api/challenge-evidence", {
      method: "POST",
      body: JSON.stringify({
        instanceId,
        challengeCode: "mfssia:C-A-1",
        evidence: {
          signature: `0x${mockSignature}`,
          message,
          publicKey: `0x${crypto.randomBytes(20).toString('hex')}`,
          signedAt: new Date().toISOString(),
        },
      }),
    });

    return {
      step: "Submit Evidence - Wallet",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Submit Evidence - Wallet",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 5: Submit Evidence (Liveness Check)
 */
async function testSubmitEvidenceLiveness(instanceId: string): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 5: Submit Evidence - Liveness Check");
  console.log("=".repeat(60));

  try {
    const data = await mfssiaRequest<any>("/api/challenge-evidence", {
      method: "POST",
      body: JSON.stringify({
        instanceId,
        challengeCode: "mfssia:C-A-2",
        evidence: {
          interactionTime: 2500,
          userAgent: "Mozilla/5.0 (Test Environment)",
          timestamp: new Date().toISOString(),
          mouseMovements: 42,
          keystrokes: 15,
        },
      }),
    });

    return {
      step: "Submit Evidence - Liveness",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Submit Evidence - Liveness",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 6: Poll for Attestation
 */
async function testPollForAttestation(maxAttempts = 10): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 6: Poll for Attestation");
  console.log("=".repeat(60));
  console.log(`Max attempts: ${maxAttempts}, Interval: 2s`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`\n📡 Attempt ${attempt}/${maxAttempts}...`);
      const data = await mfssiaRequest<any>(`/api/attestations/did/${encodeURIComponent(TEST_DID)}`);

      if (data.data?.ual || data.ual) {
        console.log(`\n🎉 Attestation received!`);
        return {
          step: "Poll for Attestation",
          success: true,
          data,
          duration: Date.now() - startTime,
        };
      }

      console.log(`⏳ Not ready yet, waiting 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      if (attempt === maxAttempts) {
        return {
          step: "Poll for Attestation",
          success: false,
          error: `Attestation not ready after ${maxAttempts} attempts: ${error.message}`,
          duration: Date.now() - startTime,
        };
      }
      console.log(`⚠️  Error (will retry): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return {
    step: "Poll for Attestation",
    success: false,
    error: `Timeout after ${maxAttempts} attempts`,
    duration: Date.now() - startTime,
  };
}

/**
 * Print Summary
 */
function printSummary(results: TestResult[]) {
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

  console.log("\n" + "-".repeat(60));
  console.log("DETAILED RESULTS:");
  console.log("-".repeat(60));

  results.forEach((result, index) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`\n${icon} ${result.step}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.success && result.data) {
      const dataStr = JSON.stringify(result.data, null, 2);
      const lines = dataStr.split('\n');
      if (lines.length > 10) {
        console.log(`   Data: ${lines.slice(0, 10).join('\n   ')}\n   ... (truncated)`);
      } else {
        console.log(`   Data: ${dataStr.split('\n').map(line => `   ${line}`).join('\n')}`);
      }
    }

    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log(`\n${passedTests === totalTests ? "🎉 ALL TESTS PASSED!" : "⚠️  SOME TESTS FAILED"}\n`);
}

/**
 * Main Test Runner
 */
async function runTests() {
  console.log("\n");
  console.log("╔" + "═".repeat(58) + "╗");
  console.log("║" + " ".repeat(8) + "MFSSIA COMPLETE INTEGRATION TEST" + " ".repeat(18) + "║");
  console.log("╚" + "═".repeat(58) + "╝");
  console.log(`\nAPI Endpoint: ${MFSSIA_API_URL}`);
  console.log(`Test DID: ${TEST_DID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Setup Phase
    console.log("\n\n" + "█".repeat(60));
    console.log("PHASE 1: SETUP - Create Challenge Definitions & Sets");
    console.log("█".repeat(60));

    const setupDefinitionsResult = await setupChallengeDefinitions();
    results.push(setupDefinitionsResult);

    const setupSetsResult = await setupChallengeSets();
    results.push(setupSetsResult);

    // Test Phase
    console.log("\n\n" + "█".repeat(60));
    console.log("PHASE 2: TESTING - Complete Authentication Flow");
    console.log("█".repeat(60));

    // Test 1: Health Check
    const healthResult = await testHealthCheck();
    results.push(healthResult);

    if (!healthResult.success) {
      console.log("\n⚠️  Health check failed. Aborting further tests.");
      printSummary(results);
      return;
    }

    // Test 2: Register DID
    const registerResult = await testRegisterDID();
    results.push(registerResult);

    if (!registerResult.success) {
      console.log("\n⚠️  DID registration failed. Aborting further tests.");
      printSummary(results);
      return;
    }

    // Test 3: Create Challenge Instance
    const { result: challengeResult, instanceId } = await testCreateChallengeInstance();
    results.push(challengeResult);

    if (!challengeResult.success || !instanceId) {
      console.log("\n⚠️  Challenge instance creation failed. Aborting further tests.");
      printSummary(results);
      return;
    }

    // Test 4: Submit Wallet Evidence
    const walletResult = await testSubmitEvidenceWallet(instanceId);
    results.push(walletResult);

    // Test 5: Submit Liveness Evidence
    const livenessResult = await testSubmitEvidenceLiveness(instanceId);
    results.push(livenessResult);

    // Test 6: Poll for Attestation
    const attestationResult = await testPollForAttestation(10);
    results.push(attestationResult);

    // Print final summary
    printSummary(results);

  } catch (error: any) {
    console.error("\n❌ Unexpected error during test execution:", error);
    printSummary(results);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

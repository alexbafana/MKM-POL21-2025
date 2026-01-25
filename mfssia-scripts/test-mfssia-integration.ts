/**
 * MFSSIA Integration Test
 * Tests the complete challenge set process with the production MFSSIA node
 *
 * Run with: npx ts-node test-mfssia-integration.ts
 */

import * as crypto from 'crypto';

// Environment configuration
const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
// NOTE: MFSSIA API does NOT require an API key - it is a public API
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
 * Test 1: Health Check
 */
async function testHealthCheck(): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 1: Health Check");
  console.log("=".repeat(60));

  try {
    const data = await mfssiaRequest<{ status: string; timestamp: string }>("/api/api/infrastructure/healthcheck");

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
      step: "Register DID & Create Challenge",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Register DID & Create Challenge",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 3: Create Challenge Instance (Example A)
 */
async function testCreateChallengeInstance(): Promise<{ result: TestResult; instanceId?: string }> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 3: Create Challenge Instance (Example A)");
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
      instanceId: data.id,
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
 * Test 4: Submit Evidence (C-A-1: Wallet Ownership)
 */
async function testSubmitEvidenceWallet(instanceId: string): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 4: Submit Evidence - Wallet Ownership (C-A-1)");
  console.log("=".repeat(60));

  try {
    // Generate mock signature
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
      step: "Submit Evidence - Wallet (C-A-1)",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Submit Evidence - Wallet (C-A-1)",
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Test 5: Submit Evidence (C-A-2: Liveness Check)
 */
async function testSubmitEvidenceLiveness(instanceId: string): Promise<TestResult> {
  const startTime = Date.now();
  console.log("\n" + "=".repeat(60));
  console.log("TEST 5: Submit Evidence - Liveness Check (C-A-2)");
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
      step: "Submit Evidence - Liveness (C-A-2)",
      success: true,
      data,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      step: "Submit Evidence - Liveness (C-A-2)",
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

      if (data.ual && data.ual.length > 0) {
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
      console.log(`⚠️ Error (will retry): ${error.message}`);
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
 * Print Results Summary
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
    console.log(`\n${icon} Test ${index + 1}: ${result.step}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.success && result.data) {
      console.log(`   Data:`, JSON.stringify(result.data, null, 2).split('\n').map(line => `   ${line}`).join('\n'));
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
  console.log("║" + " ".repeat(10) + "MFSSIA INTEGRATION TEST SUITE" + " ".repeat(18) + "║");
  console.log("╚" + "═".repeat(58) + "╝");
  console.log(`\nAPI Endpoint: ${MFSSIA_API_URL}`);
  console.log(`Note: MFSSIA API is public - no API key required`);
  console.log(`Test DID: ${TEST_DID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
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

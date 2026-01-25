#!/usr/bin/env npx ts-node

/**
 * MFSSIA End-to-End Integration Test Script
 *
 * Tests the complete Artifact Integrity verification workflow:
 * 1. DID Registration
 * 2. Challenge Instance Creation
 * 3. Evidence Submission (batch)
 * 4. WebSocket Connection & Event Monitoring
 * 5. Polling for State Changes
 * 6. Attestation Fetching
 *
 * Usage:
 *   npx tsx scripts/test-mfssia-e2e.ts
 *
 * Environment Variables:
 *   MFSSIA_API_URL     - API base URL (default: https://api.dymaxion-ou.co)
 *   TEST_WALLET_ADDRESS - Wallet address for DID (default: auto-generated)
 *   POLLING_TIMEOUT_MS  - Max polling time in ms (default: 180000 = 3 min)
 *   QUICK_MODE          - Set to "true" for 30-second polling timeout
 *
 * Example (quick mode):
 *   QUICK_MODE=true npx tsx scripts/test-mfssia-e2e.ts
 */
import crypto from "crypto";
import { Socket, io } from "socket.io-client";

// ============================================================================
// Configuration
// ============================================================================

const quickMode = process.env.QUICK_MODE === "true";
const CONFIG = {
  apiUrl: process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co",
  walletAddress: process.env.TEST_WALLET_ADDRESS || "0xTestWallet" + Date.now().toString(16),
  challengeSet: "mfssia:Example-A",
  pollingIntervalMs: 4000,
  pollingTimeoutMs: quickMode ? 30000 : parseInt(process.env.POLLING_TIMEOUT_MS || "180000"), // Quick: 30s, Normal: 3 min
  wsTimeoutMs: 120000, // 2 minutes for WebSocket events
};

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  step: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
}

interface ChallengeInstance {
  id: string;
  challengeSet: string;
  subjectDid: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  state: string;
  submittedEvidenceCount?: number;
}

// ============================================================================
// Utilities
// ============================================================================

function log(level: "INFO" | "SUCCESS" | "ERROR" | "WARN" | "DEBUG", message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const colors = {
    INFO: "\x1b[36m", // Cyan
    SUCCESS: "\x1b[32m", // Green
    ERROR: "\x1b[31m", // Red
    WARN: "\x1b[33m", // Yellow
    DEBUG: "\x1b[90m", // Gray
  };
  const reset = "\x1b[0m";

  console.log(`${colors[level]}[${timestamp}] [${level}]${reset} ${message}`);
  if (data) {
    console.log(`${colors.DEBUG}${JSON.stringify(data, null, 2)}${reset}`);
  }
}

function hashString(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// API Client
// ============================================================================

class MFSSIATestClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request(method: string, endpoint: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    log("DEBUG", `${method} ${url}`, body);

    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const duration = Date.now() - startTime;
      const text = await response.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawText: text };
      }

      log("DEBUG", `Response (${duration}ms, status ${response.status}):`, data);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || data.error || text}`);
      }

      // Unwrap MFSSIA API response format
      return data.data || data;
    } catch (error: any) {
      log("ERROR", `Request failed: ${error.message}`);
      throw error;
    }
  }

  async registerDID(did: string, challengeSet: string, metadata: any): Promise<any> {
    // MFSSIA API expects 'requestedChallengeSet' not 'challengeSet'
    return this.request("POST", "/api/identities/register", {
      did,
      requestedChallengeSet: challengeSet,
      metadata,
    });
  }

  async createChallengeInstance(did: string, challengeSet: string): Promise<ChallengeInstance> {
    return this.request("POST", "/api/challenge-instances", {
      did,
      challengeSet,
    });
  }

  async getChallengeInstance(instanceId: string): Promise<ChallengeInstance> {
    return this.request("GET", `/api/challenge-instances/${instanceId}`);
  }

  async submitAllEvidence(
    instanceId: string,
    evidenceList: Array<{ challengeId: string; evidence: any }>,
  ): Promise<any> {
    // MFSSIA API expects { challengeInstanceId, responses: [...] } format
    return this.request("POST", "/api/challenge-evidence", {
      challengeInstanceId: instanceId,
      responses: evidenceList,
    });
  }

  async getAttestation(did: string): Promise<any> {
    const encodedDid = encodeURIComponent(did);
    // Correct MFSSIA API endpoint: /api/attestations/did/{did}
    return this.request("GET", `/api/attestations/did/${encodedDid}`);
  }
}

// ============================================================================
// WebSocket Tester
// ============================================================================

class WebSocketTester {
  private socket: Socket | null = null;
  private events: Array<{ timestamp: string; event: string; data: any }> = [];
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  connect(): Promise<string> {
    return new Promise((resolve, reject) => {
      log("INFO", "Connecting to WebSocket...", { url: this.baseUrl, path: "/ws/oracle" });

      const timeout = setTimeout(() => {
        reject(new Error("WebSocket connection timeout"));
      }, 30000);

      this.socket = io(this.baseUrl, {
        path: "/ws/oracle",
        transports: ["websocket"],
        reconnection: false,
        timeout: 30000,
        forceNew: true,
      });

      this.socket.on("connect", () => {
        clearTimeout(timeout);
        const socketId = this.socket?.id || "unknown";
        log("SUCCESS", `WebSocket connected: ${socketId}`);
        resolve(socketId);
      });

      this.socket.on("connect_error", error => {
        clearTimeout(timeout);
        log("ERROR", "WebSocket connection error", {
          message: error.message,
          type: (error as any).type,
          description: (error as any).description,
        });
        reject(error);
      });

      this.socket.on("disconnect", reason => {
        log("WARN", `WebSocket disconnected: ${reason}`);
      });

      // Listen for ALL events (dot notation)
      const dotEvents = [
        "oracle.connected",
        "oracle.subscribed",
        "oracle.error",
        "oracle.verification.requested",
        "oracle.verification.processing",
        "oracle.verification.success",
        "oracle.verification.failed",
        "oracle.verification.error",
      ];

      dotEvents.forEach(eventName => {
        this.socket?.on(eventName, (data: any) => {
          this.recordEvent(eventName, data);
        });
      });

      // Listen for underscore notation events
      const underscoreEvents = [
        "oracle_connected",
        "oracle_subscribed",
        "oracle_error",
        "oracle_verification_requested",
        "oracle_verification_processing",
        "oracle_verification_success",
        "oracle_verification_failed",
        "oracle_verification_error",
      ];

      underscoreEvents.forEach(eventName => {
        this.socket?.on(eventName, (data: any) => {
          this.recordEvent(eventName, data);
        });
      });

      // Catch-all for any other events
      this.socket.onAny((eventName: string, ...args: any[]) => {
        log("DEBUG", `[onAny] Event: ${eventName}`, args);
        if (!dotEvents.includes(eventName) && !underscoreEvents.includes(eventName)) {
          this.recordEvent(`UNKNOWN:${eventName}`, args);
        }
      });
    });
  }

  private recordEvent(event: string, data: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };
    this.events.push(entry);
    log("INFO", `[WS EVENT] ${event}`, data);
  }

  subscribe(instanceId: string): void {
    if (!this.socket?.connected) {
      throw new Error("WebSocket not connected");
    }
    log("INFO", `Subscribing to instance: ${instanceId}`);
    this.socket.emit("oracle.subscribe", { verificationInstanceId: instanceId });

    // Also try underscore notation
    this.socket.emit("oracle_subscribe", { verificationInstanceId: instanceId });
  }

  waitForEvent(eventPattern: string | RegExp, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        const matching = this.events.find(e => {
          if (typeof eventPattern === "string") {
            return e.event.includes(eventPattern);
          }
          return eventPattern.test(e.event);
        });

        if (matching) {
          resolve(matching);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(new Error(`Timeout waiting for event matching: ${eventPattern}`));
          return;
        }

        setTimeout(check, 500);
      };

      check();
    });
  }

  getEvents(): typeof this.events {
    return [...this.events];
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// ============================================================================
// Evidence Generator
// ============================================================================

function generateTestEvidence(nonce: string): Array<{ challengeId: string; evidence: any }> {
  const timestamp = new Date().toISOString();
  const testContent = `Test RDF artifact content for MFSSIA verification - nonce: ${nonce} - timestamp: ${timestamp}`;

  return [
    {
      challengeId: "mfssia:C-A-1",
      evidence: {
        sourceDomainHash: hashString("err.ee"),
        contentHash: hashString(testContent),
      },
    },
    {
      challengeId: "mfssia:C-A-2",
      evidence: {
        contentHash: hashString(testContent),
        semanticFingerprint: hashString(testContent.toLowerCase().split(" ").sort().join(" ")),
        similarityScore: 0.1,
      },
    },
    {
      challengeId: "mfssia:C-A-3",
      evidence: {
        claimedPublishDate: "2024-01-15T10:00:00Z",
        serverTimestamp: timestamp,
        archiveEarliestCaptureDate: "2024-01-15T10:00:00Z",
      },
    },
    {
      challengeId: "mfssia:C-A-4",
      evidence: {
        authorName: "Test Author",
        authorEmailDomain: "test.ee",
        affiliationRecordHash: hashString("Test Author:test.ee"),
      },
    },
    {
      challengeId: "mfssia:C-A-5",
      evidence: {
        artifactSignature: hashString(testContent + timestamp),
        merkleProof: JSON.stringify({
          leaf: hashString(testContent),
          root: hashString(hashString(testContent) + nonce),
          path: [],
        }),
        signerPublicKeyId: `did:web:mkmpol21:test`,
      },
    },
    {
      challengeId: "mfssia:C-A-6",
      evidence: {
        shareEventTimestamps: timestamp,
        accountTrustSignals: "VERIFIED",
        networkClusterScore: 0.1,
      },
    },
  ];
}

// ============================================================================
// Test Runner
// ============================================================================

async function runE2ETest(): Promise<void> {
  const results: TestResult[] = [];
  const client = new MFSSIATestClient(CONFIG.apiUrl);
  let wsTester: WebSocketTester | null = null;

  const did = `did:web:mkmpol21:${CONFIG.walletAddress}`;
  let instanceId: string | null = null;
  let nonce: string | null = null;

  console.log("\n");
  log("INFO", "=".repeat(60));
  log("INFO", "MFSSIA End-to-End Integration Test");
  log("INFO", "=".repeat(60));
  log("INFO", "Configuration:", CONFIG);
  log("INFO", `DID: ${did}`);
  log("INFO", "=".repeat(60));
  console.log("\n");

  // -------------------------------------------------------------------------
  // Step 1: Register DID
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 1/7] Registering DID...");
  const step1Start = Date.now();
  try {
    const registration = await client.registerDID(did, CONFIG.challengeSet, {
      purpose: "e2e-test",
      walletAddress: CONFIG.walletAddress,
      platform: "mkm-pol21-dao-test",
      timestamp: new Date().toISOString(),
    });

    results.push({
      step: "DID Registration",
      success: true,
      duration: Date.now() - step1Start,
      data: registration,
    });
    log("SUCCESS", "[STEP 1/7] DID registered successfully");
  } catch (error: any) {
    results.push({
      step: "DID Registration",
      success: false,
      duration: Date.now() - step1Start,
      error: error.message,
    });
    log("ERROR", `[STEP 1/7] DID registration failed: ${error.message}`);
    // Continue anyway - DID might already exist
  }

  // -------------------------------------------------------------------------
  // Step 2: Create Challenge Instance
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 2/7] Creating challenge instance...");
  const step2Start = Date.now();
  try {
    const instance = await client.createChallengeInstance(did, CONFIG.challengeSet);
    instanceId = instance.id || (instance as any).instanceId || (instance as any)._id;
    nonce = instance.nonce || (instance as any).challengeNonce;

    if (!instanceId || !nonce) {
      throw new Error(`Missing required fields: instanceId=${instanceId}, nonce=${nonce}`);
    }

    results.push({
      step: "Challenge Instance Creation",
      success: true,
      duration: Date.now() - step2Start,
      data: { instanceId, nonce, state: instance.state },
    });
    log("SUCCESS", `[STEP 2/7] Challenge instance created: ${instanceId}`);
    log("INFO", `Instance state: ${instance.state}`);
    log("INFO", `Nonce: ${nonce}`);
  } catch (error: any) {
    results.push({
      step: "Challenge Instance Creation",
      success: false,
      duration: Date.now() - step2Start,
      error: error.message,
    });
    log("ERROR", `[STEP 2/7] Failed to create challenge instance: ${error.message}`);
    printSummary(results);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Step 3: Connect WebSocket
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 3/7] Connecting to WebSocket...");
  const step3Start = Date.now();
  try {
    wsTester = new WebSocketTester(CONFIG.apiUrl);
    const socketId = await wsTester.connect();

    results.push({
      step: "WebSocket Connection",
      success: true,
      duration: Date.now() - step3Start,
      data: { socketId },
    });
    log("SUCCESS", `[STEP 3/7] WebSocket connected: ${socketId}`);

    // Subscribe to instance
    wsTester.subscribe(instanceId!);
    log("INFO", "Subscribed to instance for oracle events");

    // Wait a moment for subscription acknowledgement
    await sleep(2000);
  } catch (error: any) {
    results.push({
      step: "WebSocket Connection",
      success: false,
      duration: Date.now() - step3Start,
      error: error.message,
    });
    log("WARN", `[STEP 3/7] WebSocket connection failed: ${error.message}`);
    log("WARN", "Continuing with polling only...");
  }

  // -------------------------------------------------------------------------
  // Step 4: Submit Evidence
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 4/7] Submitting evidence (one at a time)...");
  const step4Start = Date.now();
  try {
    const evidence = generateTestEvidence(nonce!);
    log(
      "DEBUG",
      "Generated evidence for challenges:",
      evidence.map(e => e.challengeId),
    );

    const submitResult = await client.submitAllEvidence(instanceId!, evidence);

    results.push({
      step: "Evidence Submission",
      success: true,
      duration: Date.now() - step4Start,
      data: submitResult,
    });
    log("SUCCESS", "[STEP 4/7] Evidence submitted successfully");
  } catch (error: any) {
    // Check for 409 (already submitted/auto-verified)
    if (error.message?.includes("409") || error.message?.includes("auto-verified")) {
      results.push({
        step: "Evidence Submission",
        success: true,
        duration: Date.now() - step4Start,
        data: { autoVerified: true, message: error.message },
      });
      log("SUCCESS", "[STEP 4/7] Evidence auto-verified (409 response)");
    } else {
      results.push({
        step: "Evidence Submission",
        success: false,
        duration: Date.now() - step4Start,
        error: error.message,
      });
      log("ERROR", `[STEP 4/7] Evidence submission failed: ${error.message}`);
      printSummary(results, wsTester?.getEvents());
      wsTester?.disconnect();
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Step 5: Poll for State Changes
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 5/7] Polling for verification state changes...");
  const step5Start = Date.now();
  let finalState: string | null = null;
  let pollCount = 0;
  const successStates = ["VERIFIED", "COMPLETED"];
  const failureStates = ["FAILED", "EXPIRED"];

  try {
    while (Date.now() - step5Start < CONFIG.pollingTimeoutMs) {
      pollCount++;
      const instance = await client.getChallengeInstance(instanceId!);
      const currentState = instance.state;

      log("DEBUG", `Poll #${pollCount}: State = ${currentState}`);

      if (successStates.includes(currentState)) {
        finalState = currentState;
        log("SUCCESS", `State changed to: ${currentState}`);
        break;
      }

      if (failureStates.includes(currentState)) {
        finalState = currentState;
        log("WARN", `State changed to failure state: ${currentState}`);
        break;
      }

      // Log progress every 10 polls
      if (pollCount % 10 === 0) {
        const elapsed = Math.round((Date.now() - step5Start) / 1000);
        log("INFO", `Still polling... State: ${currentState}, Elapsed: ${elapsed}s, Polls: ${pollCount}`);
      }

      await sleep(CONFIG.pollingIntervalMs);
    }

    if (finalState && successStates.includes(finalState)) {
      results.push({
        step: "State Polling",
        success: true,
        duration: Date.now() - step5Start,
        data: { finalState, pollCount },
      });
      log("SUCCESS", `[STEP 5/7] Verification completed: ${finalState}`);
    } else if (finalState && failureStates.includes(finalState)) {
      results.push({
        step: "State Polling",
        success: false,
        duration: Date.now() - step5Start,
        data: { finalState, pollCount },
        error: `Verification failed with state: ${finalState}`,
      });
      log("ERROR", `[STEP 5/7] Verification failed: ${finalState}`);
    } else {
      results.push({
        step: "State Polling",
        success: false,
        duration: Date.now() - step5Start,
        data: { pollCount },
        error: `Polling timeout - state never changed to terminal state`,
      });
      log("ERROR", "[STEP 5/7] Polling timeout - Oracle verification stuck");
    }
  } catch (error: any) {
    results.push({
      step: "State Polling",
      success: false,
      duration: Date.now() - step5Start,
      error: error.message,
    });
    log("ERROR", `[STEP 5/7] Polling error: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Step 6: Check WebSocket Events
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 6/7] Analyzing WebSocket events...");
  const wsEvents = wsTester?.getEvents() || [];

  if (wsEvents.length === 0) {
    results.push({
      step: "WebSocket Events",
      success: false,
      duration: 0,
      error: "No WebSocket events received",
    });
    log("WARN", "[STEP 6/7] No WebSocket events were received");
    log("WARN", "This indicates the Oracle server may not be emitting events");
  } else {
    const verificationEvents = wsEvents.filter(e => e.event.includes("verification") || e.event.includes("oracle"));

    results.push({
      step: "WebSocket Events",
      success: verificationEvents.length > 0,
      duration: 0,
      data: {
        totalEvents: wsEvents.length,
        verificationEvents: verificationEvents.length,
        eventTypes: [...new Set(wsEvents.map(e => e.event))],
      },
    });

    if (verificationEvents.length > 0) {
      log("SUCCESS", `[STEP 6/7] Received ${verificationEvents.length} verification events`);
    } else {
      log("WARN", `[STEP 6/7] Received ${wsEvents.length} events but none were verification events`);
    }
  }

  // -------------------------------------------------------------------------
  // Step 7: Fetch Attestation
  // -------------------------------------------------------------------------
  log("INFO", "[STEP 7/7] Fetching attestation...");
  const step7Start = Date.now();

  // Wait a moment for attestation to be ready
  await sleep(2000);

  try {
    const attestation = await client.getAttestation(did);

    if (attestation && (attestation.ual || (Array.isArray(attestation) && attestation.length > 0))) {
      const ual = attestation.ual || attestation[0]?.ual;
      results.push({
        step: "Attestation Fetch",
        success: true,
        duration: Date.now() - step7Start,
        data: { ual, attestation },
      });
      log("SUCCESS", `[STEP 7/7] Attestation retrieved: ${ual}`);
    } else {
      results.push({
        step: "Attestation Fetch",
        success: false,
        duration: Date.now() - step7Start,
        data: attestation,
        error: "Attestation not found or empty",
      });
      log("WARN", "[STEP 7/7] No attestation found");
    }
  } catch (error: any) {
    results.push({
      step: "Attestation Fetch",
      success: false,
      duration: Date.now() - step7Start,
      error: error.message,
    });
    log("ERROR", `[STEP 7/7] Attestation fetch failed: ${error.message}`);
  }

  // -------------------------------------------------------------------------
  // Cleanup & Summary
  // -------------------------------------------------------------------------
  wsTester?.disconnect();
  printSummary(results, wsEvents);
}

function printSummary(results: TestResult[], wsEvents?: any[]): void {
  console.log("\n");
  log("INFO", "=".repeat(60));
  log("INFO", "TEST SUMMARY");
  log("INFO", "=".repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach(result => {
    const status = result.success ? "\x1b[32m✓ PASS\x1b[0m" : "\x1b[31m✗ FAIL\x1b[0m";
    console.log(`  ${status} ${result.step} (${result.duration}ms)`);
    if (result.error) {
      console.log(`       \x1b[31mError: ${result.error}\x1b[0m`);
    }
    if (result.success) passed++;
    else failed++;
  });

  console.log("\n");
  log("INFO", "-".repeat(60));
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  log("INFO", "-".repeat(60));

  if (wsEvents && wsEvents.length > 0) {
    console.log("\n");
    log("INFO", "WebSocket Events Received:");
    wsEvents.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.timestamp}] ${e.event}`);
    });
  }

  // Diagnostic recommendations
  console.log("\n");
  log("INFO", "=".repeat(60));
  log("INFO", "DIAGNOSTIC RECOMMENDATIONS");
  log("INFO", "=".repeat(60));

  const failedSteps = results.filter(r => !r.success);

  if (failedSteps.some(s => s.step === "WebSocket Connection")) {
    console.log(`
  ⚠️  WebSocket Connection Failed:
      - Check if MFSSIA WebSocket server is running
      - Verify the path '/ws/oracle' is correct
      - Check for CORS issues
      - Ensure firewall allows WebSocket connections
    `);
  }

  if (failedSteps.some(s => s.step === "WebSocket Events")) {
    console.log(`
  ⚠️  No WebSocket Events Received:
      - The Oracle server may not be emitting events
      - Event names may differ (tried both dot and underscore notation)
      - Subscription may not be working correctly
      - Check server logs for event emission
    `);
  }

  if (failedSteps.some(s => s.step === "State Polling")) {
    console.log(`
  ⚠️  Polling Timeout (Oracle Stuck):
      - The Oracle is stuck in VERIFICATION_IN_PROGRESS
      - Oracle service may be down or overloaded
      - Evidence format may not match Oracle expectations
      - Contact MFSSIA team for Oracle status
    `);
  }

  if (failedSteps.some(s => s.step === "Attestation Fetch")) {
    console.log(`
  ⚠️  Attestation Not Found:
      - Verification may not have completed successfully
      - Attestation creation may be delayed
      - Check if Oracle verification actually succeeded
    `);
  }

  if (failed === 0) {
    console.log(`
  ✅ All tests passed! MFSSIA integration is working correctly.
    `);
  }

  console.log("\n");
}

// ============================================================================
// Main Entry Point
// ============================================================================

runE2ETest().catch(error => {
  log("ERROR", "Unhandled error in test:", error);
  process.exit(1);
});

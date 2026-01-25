/**
 * MFSSIA API Client Service
 * Handles all interactions with the MFSSIA (Multi-Factor Self-Sovereign Identity Authentication) API
 * API Documentation: https://api.dymaxion-ou.co/docs
 */
import {
  CHALLENGE_SETS,
  ChallengeSetInfo,
  ChallengeVerificationStatus,
  getActiveChallengeSets,
  getChallengeSetById,
  getChallengeSetsForRole,
  initializeChallengeStatuses,
} from "~~/types/mfssia";

export interface EvidencePayload {
  [key: string]: any;
}

/**
 * Event types for MFSSIA operations
 */
export type MFSSIAEventType =
  | "submission.started"
  | "submission.progress"
  | "submission.success"
  | "submission.failed"
  | "submission.error"
  | "attestation.fetching"
  | "attestation.success"
  | "attestation.failed"
  | "instance.created"
  | "instance.state_changed"
  | "did.registered";

/**
 * Event data structure for logging
 */
export interface MFSSIAEventData {
  type: MFSSIAEventType;
  timestamp: string;
  endpoint?: string;
  method?: string;
  status?: "pending" | "success" | "failed" | "error";
  data?: any;
  error?: string;
  duration?: number;
  challengeId?: string;
  instanceId?: string;
  did?: string;
}

/**
 * Callback type for event listeners
 */
export type MFSSIAEventCallback = (event: MFSSIAEventData) => void;

export interface ChallengeInstanceResponse {
  id: string;
  challengeSet: string;
  subjectDid: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  // Note: MFSSIA API returns various states during the verification lifecycle
  state:
    | "PENDING_CHALLENGE"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FAILED"
    | "VERIFIED"
    | "VERIFICATION_IN_PROGRESS"
    | "AWAITING_EVIDENCE"
    | "EXPIRED";
  submittedEvidenceCount: number;
}

export interface AttestationResponse {
  ual: string;
  did: string;
  challengeSet: string;
  validity: {
    issuedAt: string;
    expiresAt: string;
  };
  oracleProof: {
    finalResult: boolean;
    passedChallenges: string[];
    confidence: number;
  };
}

export interface IdentityResponse {
  id: string;
  did: string;
  metadata: any;
  createdAt: string;
  state: string;
}

export interface EvidenceResponse {
  success: boolean;
  message: string;
  challengeCode: string;
  instanceId: string;
}

export type ChallengeSet =
  | "mfssia:Example-A" // Individual User Authentication (C-A-1 + C-A-2) - ACTIVE, used by DAO
  | "mfssia:Example-B" // Entity Referential Integrity (not configured as challenge set)
  | "mfssia:Example-C" // Economic Activity Classification (not configured as challenge set)
  | "mfssia:Example-D" // Employment Event Detection (not configured as challenge set)
  | "mfssia:Example-U"; // Legacy - DAO User Onboarding (deprecated, oracle not configured)

/**
 * MFSSIA Service Client
 * Handles authentication flow for users, institutions, and RDF data validation
 */
export class MFSSIAService {
  private baseUrl: string;
  private apiKey: string;
  private isEnabled: boolean;
  private isBrowser: boolean;
  private eventListeners: Set<MFSSIAEventCallback> = new Set();
  private eventLog: MFSSIAEventData[] = [];
  private maxEventLogSize: number = 100;

  constructor() {
    // Check if running in browser
    this.isBrowser = typeof window !== "undefined";

    // In browser, use Next.js API routes
    // On server, call MFSSIA API directly
    this.baseUrl = this.isBrowser
      ? "" // Empty string for relative paths to Next.js API routes
      : process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";

    // NOTE: MFSSIA API does NOT require an API key - it is a public API
    this.apiKey = "";
    this.isEnabled = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";
  }

  /**
   * Add an event listener for MFSSIA operations
   */
  addEventListener(callback: MFSSIAEventCallback): void {
    this.eventListeners.add(callback);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(callback: MFSSIAEventCallback): void {
    this.eventListeners.delete(callback);
  }

  /**
   * Emit an event to all listeners and log it
   */
  private emitEvent(event: MFSSIAEventData): void {
    // Add to event log
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxEventLogSize) {
      this.eventLog.shift(); // Remove oldest event
    }

    // Log to console with appropriate formatting
    const logPrefix = `[MFSSIA ${event.type.toUpperCase()}]`;
    const logData = {
      timestamp: event.timestamp,
      endpoint: event.endpoint,
      status: event.status,
      duration: event.duration ? `${event.duration}ms` : undefined,
      data: event.data,
      error: event.error,
    };

    if (event.status === "error" || event.status === "failed") {
      console.error(logPrefix, event.error || "Operation failed", logData);
    } else if (event.status === "success") {
      console.log(logPrefix, "Operation successful", logData);
    } else {
      console.log(logPrefix, logData);
    }

    // Notify all listeners
    this.eventListeners.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        console.error("[MFSSIA] Error in event listener:", err);
      }
    });
  }

  /**
   * Get the event log for debugging
   */
  getEventLog(): MFSSIAEventData[] {
    return [...this.eventLog];
  }

  /**
   * Clear the event log
   */
  clearEventLog(): void {
    this.eventLog = [];
  }

  /**
   * Generic HTTP request wrapper with error handling
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.isEnabled) {
      throw new Error("MFSSIA service is not enabled. Set NEXT_PUBLIC_MFSSIA_ENABLED=true");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      console.log(`[MFSSIA] ${options.method || "GET"} ${endpoint}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));

        const errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
        console.error(`[MFSSIA] ${options.method || "GET"} ${endpoint} - Error:`, errorMessage);

        // Include endpoint in error message for better debugging
        throw new Error(`[${endpoint}] ${errorMessage}`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`MFSSIA API Error [${endpoint}]:`, error);

      // If error already includes endpoint info, don't duplicate it
      if (error.message?.includes("[")) {
        throw error;
      }

      throw new Error(`[${endpoint}] ${error.message}`);
    }
  }

  /**
   * Unwrap MFSSIA API response
   * The API wraps responses in { success, message, data, statusCode, timestamp }
   */
  private unwrapResponse<T>(response: any): T {
    // If response has a "data" field, unwrap it
    if (response && typeof response === "object" && "data" in response) {
      return response.data as T;
    }
    // Otherwise return as-is
    return response as T;
  }

  /**
   * Register a new DID (Decentralized Identifier) with MFSSIA
   * This is the first step in the authentication flow
   */
  async registerDID(did: string, requestedChallengeSet: ChallengeSet, metadata: any = {}): Promise<IdentityResponse> {
    const endpoint = this.isBrowser ? "/api/mfssia/register-did" : "/api/identities/register";
    const body = this.isBrowser
      ? JSON.stringify({ did, requestedChallengeSet, metadata })
      : JSON.stringify({
          did,
          requestedChallengeSet,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            platform: "mkm-pol21-dao",
          },
        });

    const response = await this.request<any>(endpoint, {
      method: "POST",
      body,
    });

    return this.unwrapResponse<IdentityResponse>(response);
  }

  /**
   * Create a new challenge instance for a DID
   * Returns a challenge set with nonce and expiration
   */
  async createChallengeInstance(did: string, challengeSet: ChallengeSet): Promise<ChallengeInstanceResponse> {
    const endpoint = this.isBrowser ? "/api/mfssia/challenge-instance" : "/api/challenge-instances";

    const response = await this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        did,
        challengeSet,
      }),
    });

    return this.unwrapResponse<ChallengeInstanceResponse>(response);
  }

  /**
   * Submit evidence for a specific challenge
   * Evidence structure varies by challenge type
   */
  async submitEvidence(
    instanceId: string,
    challengeCode: string,
    evidence: EvidencePayload,
  ): Promise<EvidenceResponse> {
    const endpoint = this.isBrowser ? "/api/mfssia/submit-evidence" : "/api/challenge-evidence";

    // API expects challengeInstanceId and challengeId, not instanceId and challengeCode
    const response = await this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        challengeInstanceId: instanceId, // API field name
        challengeId: challengeCode, // API field name
        evidence,
      }),
    });

    return this.unwrapResponse<EvidenceResponse>(response);
  }

  /**
   * Submit multiple evidence items in a single batch request
   * Format: { challengeInstanceId, responses: [{ challengeId, evidence }, ...] }
   */
  async submitEvidenceBatch(payload: {
    challengeInstanceId: string;
    responses: Array<{ challengeId: string; evidence: EvidencePayload }>;
  }): Promise<EvidenceResponse> {
    const endpoint = this.isBrowser ? "/api/mfssia/submit-evidence-batch" : "/api/challenge-evidence/batch";
    const startTime = Date.now();
    const challengeIds = payload.responses.map(r => r.challengeId);

    // Very prominent browser console logging
    console.log(
      "%c[MFSSIA CLIENT] ========== BATCH EVIDENCE SUBMISSION STARTED ==========",
      "background: #222; color: #bada55; font-size: 14px; padding: 4px;",
    );
    console.log("%c[MFSSIA CLIENT] Instance ID:", "color: #00ff00", payload.challengeInstanceId);
    console.log("%c[MFSSIA CLIENT] Challenge count:", "color: #00ff00", payload.responses.length);
    console.log("%c[MFSSIA CLIENT] Challenge IDs:", "color: #00ff00", challengeIds.join(", "));
    console.log("%c[MFSSIA CLIENT] Running in browser:", "color: #00ff00", this.isBrowser);
    console.log("%c[MFSSIA CLIENT] Event listeners registered:", "color: #00ff00", this.eventListeners.size);
    console.log("[MFSSIA CLIENT] Full payload:", payload);

    // Emit submission started event
    this.emitEvent({
      type: "submission.started",
      timestamp: new Date().toISOString(),
      endpoint,
      method: "POST",
      status: "pending",
      instanceId: payload.challengeInstanceId,
      data: {
        challengeCount: payload.responses.length,
        challengeIds,
        payload: payload,
      },
    });

    try {
      // Emit progress event
      console.log("%c[MFSSIA CLIENT] Sending evidence to API...", "color: #ffff00");
      this.emitEvent({
        type: "submission.progress",
        timestamp: new Date().toISOString(),
        endpoint,
        method: "POST",
        status: "pending",
        instanceId: payload.challengeInstanceId,
        data: {
          message: "Sending evidence to MFSSIA API...",
          challengeIds,
        },
      });

      const response = await this.request<any>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;
      const unwrappedResponse = this.unwrapResponse<EvidenceResponse>(response);

      // Emit success event with full response data
      console.log(
        "%c[MFSSIA CLIENT] ========== SUBMISSION SUCCESS ==========",
        "background: #008000; color: #ffffff; font-size: 14px; padding: 4px;",
      );
      console.log("%c[MFSSIA CLIENT] Duration:", "color: #00ff00", `${duration}ms`);
      console.log("[MFSSIA CLIENT] Raw response:", response);
      console.log("[MFSSIA CLIENT] Unwrapped response:", unwrappedResponse);

      this.emitEvent({
        type: "submission.success",
        timestamp: new Date().toISOString(),
        endpoint,
        method: "POST",
        status: "success",
        duration,
        instanceId: payload.challengeInstanceId,
        data: {
          response: unwrappedResponse,
          rawResponse: response,
          challengeIds,
          message: "All evidence submitted successfully",
        },
      });

      return unwrappedResponse;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      console.log(
        "%c[MFSSIA CLIENT] ========== SUBMISSION FAILED ==========",
        "background: #ff0000; color: #ffffff; font-size: 14px; padding: 4px;",
      );
      console.error("%c[MFSSIA CLIENT] Duration:", "color: #ff0000", `${duration}ms`);
      console.error("%c[MFSSIA CLIENT] Error:", "color: #ff0000", error.message);
      console.error("[MFSSIA CLIENT] Full error:", error);

      // Emit failed/error event
      this.emitEvent({
        type: "submission.failed",
        timestamp: new Date().toISOString(),
        endpoint,
        method: "POST",
        status: "failed",
        duration,
        instanceId: payload.challengeInstanceId,
        error: error.message,
        data: {
          challengeIds,
          errorDetails: error,
        },
      });

      throw error;
    }
  }

  /**
   * Submit multiple evidence items sequentially (fallback if batch endpoint unavailable)
   */
  async submitEvidenceSequentially(
    instanceId: string,
    evidenceList: Array<{ challengeCode: string; evidence: EvidencePayload }>,
  ): Promise<EvidenceResponse[]> {
    const results: EvidenceResponse[] = [];

    for (const { challengeCode, evidence } of evidenceList) {
      const result = await this.submitEvidence(instanceId, challengeCode, evidence);
      results.push(result);
    }

    return results;
  }

  /**
   * Get attestation for a DID (single fetch, no polling)
   * Use this after receiving oracle.verification.success event via WebSocket
   *
   * @param did The DID to get attestation for
   * @returns The attestation response, or throws if not found
   * @throws Error if attestation is not found or API fails
   */
  async getAttestation(did: string): Promise<AttestationResponse> {
    const endpoint = this.isBrowser
      ? `/api/mfssia/attestation/${encodeURIComponent(did)}`
      : `/api/attestations/did/${encodeURIComponent(did)}`;
    const startTime = Date.now();

    // Emit fetching event
    this.emitEvent({
      type: "attestation.fetching",
      timestamp: new Date().toISOString(),
      endpoint,
      method: "GET",
      status: "pending",
      did,
      data: { message: `Fetching attestation for DID: ${did}` },
    });

    console.log(`[MFSSIA] ========== FETCHING ATTESTATION ==========`);
    console.log(`[MFSSIA] DID: ${did}`);
    console.log(`[MFSSIA] Endpoint: ${endpoint}`);
    console.log(`[MFSSIA] ============================================`);

    try {
      const response = await this.request<any>(endpoint);
      const data = this.unwrapResponse<AttestationResponse>(response);
      const duration = Date.now() - startTime;

      console.log(`[MFSSIA] Raw attestation response:`, JSON.stringify(response, null, 2));
      console.log(`[MFSSIA] Unwrapped attestation data:`, JSON.stringify(data, null, 2));

      // Handle array response format - API returns array of attestations
      if (Array.isArray(data)) {
        console.log(`[MFSSIA] Attestation response is array with ${data.length} items`);
        if (data.length === 0) {
          const error = new Error(
            "No attestation found for this DID. " +
              "Oracle may not have completed verification yet. " +
              "If using WebSocket, ensure you received oracle.verification.success event first.",
          );

          this.emitEvent({
            type: "attestation.failed",
            timestamp: new Date().toISOString(),
            endpoint,
            method: "GET",
            status: "failed",
            duration,
            did,
            error: error.message,
            data: { response, message: "Empty attestation array" },
          });

          throw error;
        }
        // Return most recent attestation (first in array)
        const attestation = data[0];

        this.emitEvent({
          type: "attestation.success",
          timestamp: new Date().toISOString(),
          endpoint,
          method: "GET",
          status: "success",
          duration,
          did,
          data: {
            attestation,
            ual: attestation.ual,
            confidence: attestation.oracleProof?.confidence,
            passedChallenges: attestation.oracleProof?.passedChallenges,
            validity: attestation.validity,
          },
        });

        console.log(`[MFSSIA] ========== ATTESTATION SUCCESS ==========`);
        console.log(`[MFSSIA] Duration: ${duration}ms`);
        console.log(`[MFSSIA] UAL: ${attestation.ual}`);
        console.log(`[MFSSIA] Confidence: ${attestation.oracleProof?.confidence}`);
        console.log(`[MFSSIA] Passed challenges:`, attestation.oracleProof?.passedChallenges);
        console.log(`[MFSSIA] Full attestation:`, JSON.stringify(attestation, null, 2));
        console.log(`[MFSSIA] =============================================`);

        return attestation;
      }

      if (!data || !data.ual) {
        const error = new Error(
          "Invalid attestation response - missing UAL. " +
            "Oracle may still be processing. Try again after receiving WebSocket success event.",
        );

        this.emitEvent({
          type: "attestation.failed",
          timestamp: new Date().toISOString(),
          endpoint,
          method: "GET",
          status: "failed",
          duration,
          did,
          error: error.message,
          data: { response, data },
        });

        throw error;
      }

      this.emitEvent({
        type: "attestation.success",
        timestamp: new Date().toISOString(),
        endpoint,
        method: "GET",
        status: "success",
        duration,
        did,
        data: {
          attestation: data,
          ual: data.ual,
          confidence: data.oracleProof?.confidence,
          passedChallenges: data.oracleProof?.passedChallenges,
          validity: data.validity,
        },
      });

      console.log(`[MFSSIA] ========== ATTESTATION SUCCESS ==========`);
      console.log(`[MFSSIA] Duration: ${duration}ms`);
      console.log(`[MFSSIA] UAL: ${data.ual}`);
      console.log(`[MFSSIA] Confidence: ${data.oracleProof?.confidence}`);
      console.log(`[MFSSIA] Passed challenges:`, data.oracleProof?.passedChallenges);
      console.log(`[MFSSIA] Full attestation:`, JSON.stringify(data, null, 2));
      console.log(`[MFSSIA] =============================================`);

      return data;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Only emit if not already emitted above
      if (
        !error.message?.includes("No attestation found") &&
        !error.message?.includes("Invalid attestation response")
      ) {
        this.emitEvent({
          type: "attestation.failed",
          timestamp: new Date().toISOString(),
          endpoint,
          method: "GET",
          status: "error",
          duration,
          did,
          error: error.message,
          data: { errorDetails: error },
        });
      }

      console.error(`[MFSSIA] ========== ATTESTATION FAILED ==========`);
      console.error(`[MFSSIA] Duration: ${duration}ms`);
      console.error(`[MFSSIA] DID: ${did}`);
      console.error(`[MFSSIA] Error: ${error.message}`);
      console.error(`[MFSSIA] ==========================================`);

      throw error;
    }
  }

  /**
   * Poll for attestation with timeout
   * Useful since oracle verification can take time
   *
   * @deprecated Use WebSocket events instead for real-time updates.
   * Connect to MFSSIAWebSocketService and listen for oracle.verification.success event,
   * then call getAttestation() once. This polling method is kept for backward compatibility.
   *
   * @param did The DID to poll attestation for
   * @param maxAttempts Maximum number of polling attempts (default: 30)
   * @param intervalMs Interval between attempts in milliseconds (default: 2000)
   * @returns The attestation response
   * @throws Error if attestation not found after max attempts
   */
  async pollForAttestation(did: string, maxAttempts = 30, intervalMs = 2000): Promise<AttestationResponse> {
    console.warn(
      "[MFSSIA] pollForAttestation is DEPRECATED. " +
        "Use WebSocket events (oracle.verification.success) and getAttestation() instead.",
    );

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`[MFSSIA] Polling for attestation attempt ${attempt + 1}/${maxAttempts}`);
        const attestationResponse = await this.getAttestation(did);
        console.log(`[MFSSIA] Attestation response:`, attestationResponse);

        // Handle array response format - take the first attestation if array
        let attestation = attestationResponse;
        if (Array.isArray(attestationResponse)) {
          console.log(`[MFSSIA] Response is an array with ${attestationResponse.length} items`);
          if (attestationResponse.length > 0) {
            attestation = attestationResponse[0];
            console.log(`[MFSSIA] Using first attestation from array:`, attestation);
          } else {
            console.log(`[MFSSIA] Empty array - no attestations exist yet. Retrying in ${intervalMs}ms...`);
            // Continue polling
            await new Promise(resolve => setTimeout(resolve, intervalMs));
            continue;
          }
        }

        if (attestation && attestation.ual) {
          console.log(`[MFSSIA] Attestation found with UAL:`, attestation.ual);
          return attestation;
        }

        console.log(`[MFSSIA] Attestation not ready yet, no UAL found. Retrying in ${intervalMs}ms...`);
      } catch (error: any) {
        console.log(`[MFSSIA] Error getting attestation (attempt ${attempt + 1}):`, error.message);

        // If it's a 404, the attestation doesn't exist yet - continue polling
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          console.log(`[MFSSIA] Attestation not found (404), continuing to poll...`);
        } else if (attempt === maxAttempts - 1) {
          // On last attempt, throw the error
          throw new Error(
            `Attestation verification timeout after ${maxAttempts} attempts. Last error: ${error.message}`,
          );
        } else {
          // For other errors, log but continue polling
          console.log(`[MFSSIA] Non-404 error, continuing to poll...`);
        }
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error("Failed to retrieve attestation after maximum attempts");
  }

  /**
   * Get challenge instance details
   *
   * NOTE: The MFSSIA API's GET /api/challenge-instances/{id} endpoint is known to
   * return 500 errors in some cases. This is an issue on the MFSSIA API side.
   * The calling code should handle errors gracefully and continue with the flow.
   *
   * @throws Error if the API call fails (common with this endpoint)
   */
  async getChallengeInstance(instanceId: string): Promise<ChallengeInstanceResponse> {
    const endpoint = this.isBrowser
      ? `/api/mfssia/challenge-instance?id=${encodeURIComponent(instanceId)}`
      : `/api/challenge-instances/${instanceId}`;

    console.log(`[MFSSIA] Getting challenge instance: ${instanceId}`);

    try {
      const response = await this.request<any>(endpoint);
      return this.unwrapResponse<ChallengeInstanceResponse>(response);
    } catch (error: any) {
      // Add context to the error message
      console.error(`[MFSSIA] getChallengeInstance failed for ${instanceId}:`, error.message);

      // Check if this is the known 500/502 error from MFSSIA API
      if (
        error.message?.includes("500") ||
        error.message?.includes("502") ||
        error.message?.includes("internal error")
      ) {
        throw new Error(
          `MFSSIA API error retrieving challenge instance. ` +
            `This is a known issue with the MFSSIA API. ` +
            `Original error: ${error.message}`,
        );
      }

      throw error;
    }
  }

  /**
   * Verify attestation validity (client-side check)
   * Server-side verification happens on smart contract
   */
  isAttestationValid(attestation: AttestationResponse): boolean {
    try {
      const expiresAt = new Date(attestation.validity.expiresAt);
      const now = new Date();

      return (
        attestation.ual.length > 0 &&
        attestation.oracleProof.finalResult === true &&
        expiresAt > now &&
        attestation.oracleProof.confidence >= 0.85
      );
    } catch (error) {
      console.error("Error validating attestation:", error);
      return false;
    }
  }

  /**
   * Get challenge set configuration (for UI display)
   */
  getChallengeSetInfo(challengeSet: ChallengeSet): {
    name: string;
    description: string;
    challenges: string[];
    requiredConfidence: number;
  } {
    switch (challengeSet) {
      case "mfssia:Example-A":
        // Primary challenge set for DAO user authentication
        // Uses source authenticity and content integrity verification
        return {
          name: "Individual User Authentication",
          description: "Wallet-based authentication with source and content integrity verification for DAO members",
          challenges: [
            "C-A-1: Source Authenticity (wallet ownership proof via signature)",
            "C-A-2: Content Integrity (message hash and identity fingerprint)",
          ],
          requiredConfidence: 0.85,
        };

      case "mfssia:Example-B":
        // Entity Referential Integrity - challenge definitions exist but not configured as a set
        return {
          name: "Entity Referential Integrity",
          description: "Authenticates correct extraction, typing, and stable identity of entities",
          challenges: [
            "C-B-1: Source Authenticity",
            "C-B-2: Content Integrity",
            "C-B-3: NLP Determinism",
            "C-B-4: Named-Entity Extraction",
            "C-B-5: Entity Typing",
            "C-B-6: Referential Stability",
            "C-B-7: Mention-Graph Closure",
            "C-B-8: Provenance Completeness",
          ],
          requiredConfidence: 0.9,
        };

      case "mfssia:Example-C":
        return {
          name: "Economic Activity Classification",
          description: "LLM-based EMTAK classification validation",
          challenges: [
            "C-C-1: Source Authenticity",
            "C-C-2: Content Integrity",
            "C-C-3: NLP & NER Determinism",
            "C-C-4: Entity Grounding",
            "C-C-5: LLM Invocation Integrity",
            "C-C-7: EMTAK Plausibility",
            "C-C-9: Provenance Closure",
            "C-C-10: Trajectory Integrity",
          ],
          requiredConfidence: 0.9,
        };

      case "mfssia:Example-D":
        return {
          name: "Employment Event Detection",
          description: "Employment trends data validation pipeline",
          challenges: [
            "C-D-1: Source Authenticity",
            "C-D-2: Content Integrity",
            "C-D-3: NLP Determinism",
            "C-D-5: Employment Event Plausibility",
            "C-D-6: EMTAK Consistency",
            "C-D-8: Provenance Closure",
          ],
          requiredConfidence: 0.85,
        };

      case "mfssia:Example-U":
        // Legacy - deprecated, oracle not configured
        return {
          name: "DAO User Onboarding (Legacy)",
          description: "Deprecated - use Example-A instead. Oracle not configured for this challenge set.",
          challenges: ["C-U-1: Wallet Ownership Proof", "C-U-2: Human Interaction Verification"],
          requiredConfidence: 1.0,
        };

      default:
        throw new Error(`Unknown challenge set: ${challengeSet}`);
    }
  }

  /**
   * Health check - verify MFSSIA API is accessible
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.request<{ status: string; timestamp: string }>("/api/api/infrastructure/healthcheck");
    } catch {
      return {
        status: "error",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // ============================================================================
  // Challenge Set Management Methods
  // ============================================================================

  /**
   * Get all available challenge sets
   * Returns static configuration data for all defined challenge sets
   */
  getAllChallengeSets(): ChallengeSetInfo[] {
    return CHALLENGE_SETS;
  }

  /**
   * Get active (usable) challenge sets
   */
  getActiveChallengeSets(): ChallengeSetInfo[] {
    return getActiveChallengeSets();
  }

  /**
   * Get challenge sets applicable for a specific role
   */
  getChallengeSetsForRole(roleKey: string): ChallengeSetInfo[] {
    return getChallengeSetsForRole(roleKey);
  }

  /**
   * Get detailed information about a specific challenge set
   */
  getChallengeSetDetails(setId: string): ChallengeSetInfo | undefined {
    return getChallengeSetById(setId);
  }

  /**
   * Initialize challenge verification statuses for tracking
   */
  initializeChallengeStatuses(challengeSet: ChallengeSetInfo): ChallengeVerificationStatus[] {
    return initializeChallengeStatuses(challengeSet);
  }

  /**
   * Fetch challenge sets from the MFSSIA API (for dynamic configuration)
   * This complements the static CHALLENGE_SETS for cases where the API has new sets
   */
  async fetchChallengeSetsFromAPI(): Promise<any[]> {
    const endpoint = this.isBrowser ? "/api/mfssia/challenge-sets" : "/api/challenge-sets";

    try {
      const response = await this.request<any>(endpoint);
      return this.unwrapResponse<any[]>(response) || [];
    } catch (error: any) {
      console.warn("[MFSSIA] Failed to fetch challenge sets from API, using static configuration:", error.message);
      return [];
    }
  }

  /**
   * Create a new challenge set definition on the MFSSIA API
   * Note: Requires appropriate permissions
   */
  async createChallengeSet(challengeSet: {
    id: string;
    name: string;
    description: string;
    challengeDefinitionIds: string[];
    requiredConfidence: number;
  }): Promise<any> {
    const endpoint = this.isBrowser ? "/api/mfssia/challenge-sets" : "/api/challenge-sets";

    const response = await this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(challengeSet),
    });

    return this.unwrapResponse<any>(response);
  }

  /**
   * Get challenge definitions from the MFSSIA API
   */
  async fetchChallengeDefinitions(): Promise<any[]> {
    const endpoint = this.isBrowser ? "/api/mfssia/challenge-definitions" : "/api/challenge-definitions";

    try {
      const response = await this.request<any>(endpoint);
      return this.unwrapResponse<any[]>(response) || [];
    } catch (error: any) {
      console.warn("[MFSSIA] Failed to fetch challenge definitions from API:", error.message);
      return [];
    }
  }

  /**
   * Create a challenge definition on the MFSSIA API
   */
  async createChallengeDefinition(definition: {
    challengeId: string;
    name: string;
    description: string;
    factorClass: string;
    mandatory: boolean;
    expectedEvidence: Record<string, any>;
    oracleEndpoint: string;
    scope: string;
  }): Promise<any> {
    const endpoint = this.isBrowser ? "/api/mfssia/challenge-definitions" : "/api/challenge-definitions";

    const response = await this.request<any>(endpoint, {
      method: "POST",
      body: JSON.stringify(definition),
    });

    return this.unwrapResponse<any>(response);
  }
}

/**
 * Singleton instance for easy import
 */
let mfssiaServiceInstance: MFSSIAService | null = null;

export function getMFSSIAService(): MFSSIAService {
  if (!mfssiaServiceInstance) {
    mfssiaServiceInstance = new MFSSIAService();
  }
  return mfssiaServiceInstance;
}

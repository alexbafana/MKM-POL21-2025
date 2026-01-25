"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { ChallengeSet, MFSSIAEventData, getMFSSIAService } from "~~/services/MFSSIAService";
import {
  OracleErrorPayload,
  OracleFailedPayload,
  OracleProcessingPayload,
  OracleRequestedPayload,
  OracleSuccessPayload,
  getMFSSIAWebSocket,
} from "~~/services/MFSSIAWebSocketService";

/**
 * Onboarding step types
 */
export type OnboardingStep = "connect" | "verify" | "token" | "assign" | "complete";

/**
 * Role definitions for the MKMPOL21 DAO
 */
export const ROLES = {
  MEMBER_INSTITUTION: { name: "Member_Institution", value: 1152, index: 0 },
  ORDINARY_USER: { name: "Ordinary_User", value: 1153, index: 1 },
  MFSSIA_GUARDIAN: { name: "MFSSIA_Guardian_Agent", value: 3074, index: 2 },
  ELIZA_EXTRACTOR: { name: "Eliza_Data_Extractor_Agent", value: 3075, index: 3 },
  DATA_VALIDATOR: { name: "Data_Validator", value: 1156, index: 4 },
  MKMPOL21_OWNER: { name: "MKMPOL21Owner", value: 1029, index: 5 },
  CONSORTIUM: { name: "Consortium", value: 1030, index: 6 },
  VALIDATION_COMMITTEE: { name: "Validation_Committee", value: 1031, index: 7 },
  DISPUTE_RESOLUTION: { name: "Dispute_Resolution_Board", value: 1032, index: 8 },
} as const;

export type RoleKey = keyof typeof ROLES;

/**
 * Oracle connection and verification state
 */
export type OracleConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";
export type OracleVerificationState = "idle" | "requested" | "processing" | "success" | "failed" | "error";

/**
 * API call log entry
 */
export interface ApiLogEntry {
  timestamp: string;
  type: "info" | "error" | "success" | "warning" | "event";
  endpoint: string;
  message: string;
  details?: any;
}

/**
 * Oracle event log entry
 */
export interface OracleLogEntry {
  timestamp: string;
  event: string;
  data: any;
}

interface OnboardingState {
  currentStep: OnboardingStep;
  isVerifying: boolean;
  isVerified: boolean;
  verificationError: string | null;
  accessToken: string | null;
  isAcquiringToken: boolean;
  tokenError: string | null;
  isAssigning: boolean;
  assignmentError: string | null;
  isComplete: boolean;
  txHash: string | null;
  // MFSSIA-specific fields
  instanceId: string | null;
  did: string | null;
  nonce: string | null;
  attestationUAL: string | null;
  // Oracle state
  oracleConnectionState: OracleConnectionState;
  oracleVerificationState: OracleVerificationState;
  oracleMessage: string | null;
  oracleConfidence: number | null;
  // Event logs
  apiCallLog: ApiLogEntry[];
  oracleEventLog: OracleLogEntry[];
  serviceEvents: MFSSIAEventData[];
}

/**
 * Hook for managing the onboarding flow
 * Handles MFSSIA identity verification, token acquisition, and role assignment
 */
export function useOnboarding(roleKey: RoleKey) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "MKMPOL21" });

  // Check if MFSSIA is enabled
  const mfssiaEnabled = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";

  // Stub mode: bypass MFSSIA API calls but show the UI flow (for pilots/demos)
  const mfssiaStubMode = process.env.NEXT_PUBLIC_MFSSIA_STUB_MODE === "true";

  const [state, setState] = useState<OnboardingState>({
    currentStep: "connect",
    isVerifying: false,
    isVerified: false,
    verificationError: null,
    accessToken: null,
    isAcquiringToken: false,
    tokenError: null,
    isAssigning: false,
    assignmentError: null,
    isComplete: false,
    txHash: null,
    // MFSSIA-specific fields
    instanceId: null,
    did: null,
    nonce: null,
    attestationUAL: null,
    // Oracle state
    oracleConnectionState: "disconnected",
    oracleVerificationState: "idle",
    oracleMessage: null,
    oracleConfidence: null,
    // Event logs
    apiCallLog: [],
    oracleEventLog: [],
    serviceEvents: [],
  });

  // Refs for cleanup and data persistence
  const wsCleanupRef = useRef<(() => void) | null>(null);
  const verificationDataRef = useRef<{
    instanceId: string | null;
    did: string | null;
    nonce: string | null;
  }>({
    instanceId: null,
    did: null,
    nonce: null,
  });

  // Get the target role
  const targetRole = ROLES[roleKey];

  /**
   * Helper function to log API calls
   */
  const logApiCall = useCallback(
    (type: "info" | "error" | "success" | "warning" | "event", endpoint: string, message: string, details?: any) => {
      const logEntry: ApiLogEntry = {
        timestamp: new Date().toISOString(),
        type,
        endpoint,
        message,
        details,
      };

      const prefix = `[ONBOARDING ${type.toUpperCase()}]`;
      if (type === "error") {
        console.error(`${prefix} ${endpoint}: ${message}`, details || "");
      } else if (type === "warning") {
        console.warn(`${prefix} ${endpoint}: ${message}`, details || "");
      } else {
        console.log(`${prefix} ${endpoint}: ${message}`, details || "");
      }

      setState(prev => ({
        ...prev,
        apiCallLog: [...prev.apiCallLog, logEntry].slice(-50),
      }));
    },
    [],
  );

  /**
   * Helper function to log oracle events
   */
  const logOracleEvent = useCallback((event: string, data: any) => {
    const eventEntry: OracleLogEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
    };

    console.log(`[ONBOARDING ORACLE] ========== ${event.toUpperCase()} ==========`);
    console.log(`[ONBOARDING ORACLE] Timestamp: ${eventEntry.timestamp}`);
    console.log(`[ONBOARDING ORACLE] Data:`, JSON.stringify(data, null, 2));
    console.log(`[ONBOARDING ORACLE] =============================================`);

    setState(prev => ({
      ...prev,
      oracleEventLog: [...prev.oracleEventLog, eventEntry].slice(-50),
    }));
  }, []);

  /**
   * Handle MFSSIA service events
   */
  const handleServiceEvent = useCallback((event: MFSSIAEventData) => {
    console.log(`[ONBOARDING SERVICE] ========== ${event.type.toUpperCase()} ==========`);
    console.log(`[ONBOARDING SERVICE] Timestamp: ${event.timestamp}`);
    console.log(`[ONBOARDING SERVICE] Status: ${event.status}`);
    if (event.error) {
      console.error(`[ONBOARDING SERVICE] Error: ${event.error}`);
    }
    console.log(`[ONBOARDING SERVICE] Data:`, JSON.stringify(event.data, null, 2));
    console.log(`[ONBOARDING SERVICE] =============================================`);

    setState(prev => ({
      ...prev,
      serviceEvents: [...prev.serviceEvents, event].slice(-50),
    }));
  }, []);

  // Register MFSSIA service event listener
  useEffect(() => {
    if (!mfssiaEnabled) return;

    const mfssia = getMFSSIAService();
    mfssia.addEventListener(handleServiceEvent);

    return () => {
      mfssia.removeEventListener(handleServiceEvent);
    };
  }, [mfssiaEnabled, handleServiceEvent]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, []);

  // Update ref when state changes
  useEffect(() => {
    verificationDataRef.current = {
      instanceId: state.instanceId,
      did: state.did,
      nonce: state.nonce,
    };
  }, [state.instanceId, state.did, state.nonce]);

  // Update step based on connection status
  const updateStep = useCallback(() => {
    if (!isConnected) {
      setState(prev => ({ ...prev, currentStep: "connect" }));
    } else if (!state.isVerified) {
      setState(prev => ({ ...prev, currentStep: "verify" }));
    } else if (!state.accessToken) {
      setState(prev => ({ ...prev, currentStep: "token" }));
    } else if (!state.isComplete) {
      setState(prev => ({ ...prev, currentStep: "assign" }));
    } else {
      setState(prev => ({ ...prev, currentStep: "complete" }));
    }
  }, [isConnected, state.isVerified, state.accessToken, state.isComplete]);

  /**
   * MFSSIA identity verification
   * Creates a challenge instance, submits evidence, and gets attestation
   */
  const verifyIdentity = useCallback(async () => {
    if (!address) {
      logApiCall("error", "verifyIdentity", "Wallet not connected");
      setState(prev => ({
        ...prev,
        verificationError: "Wallet not connected",
      }));
      return false;
    }

    if (!mfssiaEnabled) {
      // Fallback to mock verification if MFSSIA is disabled
      logApiCall("warning", "verifyIdentity", "MFSSIA disabled, using mock verification");
      setState(prev => ({
        ...prev,
        isVerifying: true,
        verificationError: null,
      }));

      await new Promise(resolve => setTimeout(resolve, 2000));

      setState(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: true,
        currentStep: "token",
      }));

      logApiCall("success", "verifyIdentity", "Mock verification completed");
      return true;
    }

    // STUB MODE: Simulate MFSSIA flow without actual API calls (for pilots/demos)
    if (mfssiaStubMode) {
      logApiCall("warning", "verifyIdentity", "STUB MODE: Simulating MFSSIA verification (no real API calls)");

      setState(prev => ({
        ...prev,
        isVerifying: true,
        verificationError: null,
        oracleConnectionState: "connecting",
        oracleVerificationState: "idle",
      }));

      const did = `did:web:mkmpol21:${address}`;
      const stubInstanceId = `stub-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const stubNonce = `0x${Math.random().toString(16).substring(2, 34)}`;

      // Simulate DID registration
      logApiCall("info", "POST /api/identities/register", `[STUB] Registering DID: ${did}`);
      await new Promise(resolve => setTimeout(resolve, 500));
      logApiCall("success", "POST /api/identities/register", "[STUB] DID registration completed");

      // Simulate challenge instance creation
      logApiCall("info", "POST /api/challenge-instances", "[STUB] Creating challenge instance");
      await new Promise(resolve => setTimeout(resolve, 500));
      logApiCall("success", "POST /api/challenge-instances", "[STUB] Challenge instance created", {
        instanceId: stubInstanceId,
        nonce: stubNonce,
        state: "IN_PROGRESS",
      });

      setState(prev => ({
        ...prev,
        instanceId: stubInstanceId,
        did,
        nonce: stubNonce,
      }));

      // Simulate evidence collection
      logApiCall("info", "Evidence", "[STUB] Generating wallet ownership proof");
      await new Promise(resolve => setTimeout(resolve, 300));
      logApiCall("success", "Evidence", "[STUB] Wallet signature obtained");

      // Simulate evidence submission
      logApiCall("info", "POST /api/challenge-evidence", "[STUB] Submitting evidence batch");
      await new Promise(resolve => setTimeout(resolve, 500));
      logApiCall("success", "POST /api/challenge-evidence", "[STUB] Evidence submitted successfully");

      // Simulate WebSocket connection
      setState(prev => ({
        ...prev,
        oracleConnectionState: "connected",
        oracleMessage: "[STUB] Connected to Oracle Gateway",
      }));
      logApiCall("success", "WebSocket", "[STUB] Connected to Oracle Gateway");

      // Simulate oracle verification flow
      setState(prev => ({
        ...prev,
        oracleVerificationState: "requested",
        oracleMessage: "[STUB] Oracle verification requested...",
      }));
      logApiCall("event", "Oracle", "[STUB] Verification requested by oracle");
      await new Promise(resolve => setTimeout(resolve, 800));

      setState(prev => ({
        ...prev,
        oracleVerificationState: "processing",
        oracleMessage: "[STUB] Oracle is processing evidence...",
      }));
      logApiCall("event", "Oracle", "[STUB] Oracle processing evidence");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate stub attestation UAL
      const stubAttestationUAL = `ual:stub:${address}:${Date.now()}`;

      setState(prev => ({
        ...prev,
        oracleVerificationState: "success",
        oracleMessage: "[STUB] Verification successful!",
        oracleConfidence: 1.0,
      }));
      logApiCall("success", "Oracle", "[STUB] Verification successful!", {
        confidence: 1.0,
        passedChallenges: ["all"],
      });

      // Complete verification
      logApiCall("success", "verifyIdentity", "[STUB] MFSSIA verification completed", {
        attestationUAL: stubAttestationUAL,
      });

      setState(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: true,
        attestationUAL: stubAttestationUAL,
        currentStep: "token",
      }));

      return true;
    }

    logApiCall("info", "verifyIdentity", "Starting MFSSIA identity verification", { address });

    setState(prev => ({
      ...prev,
      isVerifying: true,
      verificationError: null,
      oracleConnectionState: "disconnected",
      oracleVerificationState: "idle",
    }));

    try {
      const mfssia = getMFSSIAService();
      const did = `did:web:mkmpol21:${address}`;
      const challengeSet: ChallengeSet = "mfssia:Example-A";

      // Step 1: Register DID
      logApiCall("info", "POST /api/identities/register", `Registering DID: ${did}`);
      await mfssia.registerDID(did, challengeSet, {
        purpose: "user-onboarding",
        walletAddress: address,
        roleKey,
        timestamp: new Date().toISOString(),
      });
      logApiCall("success", "POST /api/identities/register", "DID registration completed");

      // Step 2: Create challenge instance
      logApiCall("info", "POST /api/challenge-instances", `Creating challenge instance for ${challengeSet}`);
      const instance = await mfssia.createChallengeInstance(did, challengeSet);
      const instanceId = instance.id || (instance as any).instanceId || (instance as any)._id;
      const nonce = instance.nonce || (instance as any).challengeNonce;

      if (!instanceId || !nonce) {
        throw new Error("Challenge instance response missing required fields");
      }

      logApiCall("success", "POST /api/challenge-instances", "Challenge instance created", {
        instanceId,
        nonce,
        state: instance.state,
      });

      setState(prev => ({
        ...prev,
        instanceId,
        did,
        nonce,
      }));

      // Update ref
      verificationDataRef.current = { instanceId, did, nonce };

      // Step 3: Generate and submit evidence
      logApiCall("info", "Evidence", "Generating wallet ownership proof");

      const message = `MFSSIA Identity Verification\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
      const signature = await signMessageAsync({ message });

      logApiCall("success", "Evidence", "Wallet signature obtained", { messageLength: message.length });

      // Build evidence payload for Example-A challenges
      const evidencePayload = {
        challengeInstanceId: instanceId,
        responses: [
          {
            challengeId: "mfssia:C-A-1",
            evidence: {
              sourceDomainHash: await hashString(`mkmpol21:${address}`),
              contentHash: await hashString(message + signature),
            },
          },
          {
            challengeId: "mfssia:C-A-2",
            evidence: {
              contentHash: await hashString(message),
              semanticFingerprint: await hashString(`identity:${address}:${nonce}`),
              similarityScore: 0,
            },
          },
        ],
      };

      logApiCall("info", "POST /api/challenge-evidence", "Submitting evidence batch", {
        challengeCount: evidencePayload.responses.length,
      });

      await mfssia.submitEvidenceBatch(evidencePayload);

      logApiCall("success", "POST /api/challenge-evidence", "Evidence submitted successfully");

      // Step 4: Connect to WebSocket and wait for oracle verification
      logApiCall("info", "WebSocket", "Connecting to Oracle Gateway...");
      const ws = getMFSSIAWebSocket();
      await ws.connect();

      setState(prev => ({
        ...prev,
        oracleConnectionState: "connected",
        oracleMessage: "Connected to Oracle Gateway",
      }));

      logOracleEvent("oracle.connected", { socketId: ws.getSocketId() });
      logApiCall("success", "WebSocket", "Connected to Oracle Gateway");

      logApiCall("info", "WebSocket", `Subscribing to instance: ${instanceId}`);
      ws.subscribeToInstance(instanceId);

      // Wait for oracle verification
      const attestationUAL = await new Promise<string>((resolve, reject) => {
        const cleanup = () => {
          ws.off("oracle.verification.requested", handleRequested);
          ws.off("oracle.verification.processing", handleProcessing);
          ws.off("oracle.verification.success", handleSuccess);
          ws.off("oracle.verification.failed", handleFailed);
          ws.off("oracle.verification.error", handleError);
          ws.unsubscribeFromInstance(instanceId);
          logApiCall("info", "WebSocket", "Cleaned up event handlers");
        };

        wsCleanupRef.current = cleanup;

        const handleRequested = (data: OracleRequestedPayload) => {
          if (data.verificationInstanceId !== instanceId) return;
          logOracleEvent("oracle.verification.requested", data);
          logApiCall("event", "Oracle", "Verification requested by oracle", data);
          setState(prev => ({
            ...prev,
            oracleVerificationState: "requested",
            oracleMessage: "Oracle has received verification request...",
          }));
        };

        const handleProcessing = (data: OracleProcessingPayload) => {
          if (data.verificationInstanceId !== instanceId) return;
          logOracleEvent("oracle.verification.processing", data);
          logApiCall("event", "Oracle", `Processing: ${data.step || "in progress"}`, data);
          setState(prev => ({
            ...prev,
            oracleVerificationState: "processing",
            oracleMessage: data.step ? `Processing: ${data.step}` : "Oracle is processing...",
          }));
        };

        const handleSuccess = async (data: OracleSuccessPayload) => {
          if (data.verificationInstanceId !== instanceId) return;

          logOracleEvent("oracle.verification.success", data);
          logApiCall("success", "Oracle", "Verification successful!", {
            confidence: data.confidence,
            passedChallenges: data.passedChallenges,
          });

          console.log(`[ONBOARDING ORACLE SUCCESS] ========================================`);
          console.log(`[ONBOARDING ORACLE SUCCESS] Instance ID: ${data.verificationInstanceId}`);
          console.log(`[ONBOARDING ORACLE SUCCESS] Confidence: ${data.confidence}`);
          console.log(`[ONBOARDING ORACLE SUCCESS] Passed: ${data.passedChallenges?.join(", ")}`);
          console.log(`[ONBOARDING ORACLE SUCCESS] Full data:`, JSON.stringify(data, null, 2));
          console.log(`[ONBOARDING ORACLE SUCCESS] ========================================`);

          setState(prev => ({
            ...prev,
            oracleVerificationState: "success",
            oracleMessage: "Verification successful!",
            oracleConfidence: data.confidence,
          }));

          try {
            await new Promise(r => setTimeout(r, 1000));
            logApiCall("info", "Attestation", `Fetching attestation for DID: ${did}`);
            const attestation = await mfssia.getAttestation(did);

            if (!attestation || !attestation.ual) {
              throw new Error("Attestation not found");
            }

            logApiCall("success", "Attestation", "Attestation acquired", {
              ual: attestation.ual,
              confidence: attestation.oracleProof?.confidence,
            });

            console.log(`[ONBOARDING ATTESTATION] ========================================`);
            console.log(`[ONBOARDING ATTESTATION] UAL: ${attestation.ual}`);
            console.log(`[ONBOARDING ATTESTATION] Full:`, JSON.stringify(attestation, null, 2));
            console.log(`[ONBOARDING ATTESTATION] ========================================`);

            cleanup();
            resolve(attestation.ual);
          } catch (err: any) {
            logApiCall("error", "Attestation", "Failed to fetch attestation", { error: err.message });
            cleanup();
            reject(err);
          }
        };

        const handleFailed = (data: OracleFailedPayload) => {
          if (data.verificationInstanceId !== instanceId) return;

          logOracleEvent("oracle.verification.failed", data);
          logApiCall("error", "Oracle", `Verification failed: ${data.reason}`, {
            failedChallenges: data.failedChallenges,
          });

          console.error(`[ONBOARDING ORACLE FAILED] ========================================`);
          console.error(`[ONBOARDING ORACLE FAILED] Reason: ${data.reason}`);
          console.error(`[ONBOARDING ORACLE FAILED] Failed: ${data.failedChallenges?.join(", ")}`);
          console.error(`[ONBOARDING ORACLE FAILED] ========================================`);

          setState(prev => ({
            ...prev,
            oracleVerificationState: "failed",
            oracleMessage: `Verification failed: ${data.reason}`,
          }));

          cleanup();
          reject(new Error(`Verification failed: ${data.reason}`));
        };

        const handleError = (data: OracleErrorPayload) => {
          if (data.verificationInstanceId !== instanceId) return;

          logOracleEvent("oracle.verification.error", data);
          logApiCall("error", "Oracle", `Oracle error: ${data.error}`, data);

          console.error(`[ONBOARDING ORACLE ERROR] ========================================`);
          console.error(`[ONBOARDING ORACLE ERROR] Error: ${data.error}`);
          console.error(`[ONBOARDING ORACLE ERROR] ========================================`);

          setState(prev => ({
            ...prev,
            oracleVerificationState: "error",
            oracleMessage: `Oracle error: ${data.error}`,
          }));

          cleanup();
          reject(new Error(`Oracle error: ${data.error}`));
        };

        ws.on("oracle.verification.requested", handleRequested);
        ws.on("oracle.verification.processing", handleProcessing);
        ws.on("oracle.verification.success", handleSuccess);
        ws.on("oracle.verification.failed", handleFailed);
        ws.on("oracle.verification.error", handleError);

        logApiCall("info", "WebSocket", "Registered all oracle event handlers");

        setState(prev => ({
          ...prev,
          oracleVerificationState: "requested",
          oracleMessage: "Waiting for oracle verification...",
        }));
      });

      // Verification complete
      logApiCall("success", "verifyIdentity", "MFSSIA verification completed", { attestationUAL });

      setState(prev => ({
        ...prev,
        isVerifying: false,
        isVerified: true,
        attestationUAL,
        currentStep: "token",
      }));

      wsCleanupRef.current = null;
      return true;
    } catch (error: any) {
      logApiCall("error", "verifyIdentity", "Verification failed", {
        error: error.message,
        stack: error.stack,
      });

      console.error(`[ONBOARDING ERROR] ========================================`);
      console.error(`[ONBOARDING ERROR] Error: ${error.message}`);
      console.error(`[ONBOARDING ERROR] Stack:`, error.stack);
      console.error(`[ONBOARDING ERROR] ========================================`);

      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isVerifying: false,
        verificationError: error.message || "Identity verification failed. Please try again.",
        oracleConnectionState: "error",
        oracleVerificationState: "error",
      }));

      return false;
    }
  }, [address, roleKey, mfssiaEnabled, mfssiaStubMode, signMessageAsync, logApiCall, logOracleEvent]);

  /**
   * Simple hash function for generating SHA-256 hashes
   */
  const hashString = async (data: string): Promise<string> => {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
    return `hash_${data.substring(0, 20)}`;
  };

  /**
   * MFSSIA access token acquisition
   * Uses the attestation UAL as the access token
   */
  const acquireAccessToken = useCallback(async () => {
    logApiCall("info", "acquireAccessToken", "Starting token acquisition");

    setState(prev => ({
      ...prev,
      isAcquiringToken: true,
      tokenError: null,
    }));

    try {
      // If we have an attestation UAL, use it as the token
      let token: string;

      if (state.attestationUAL) {
        token = state.attestationUAL;
        logApiCall("success", "acquireAccessToken", "Using attestation UAL as access token", { token });
      } else {
        // Generate a mock token as fallback
        token = `mfssia_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        logApiCall("warning", "acquireAccessToken", "No attestation available, using mock token", { token });
      }

      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX

      setState(prev => ({
        ...prev,
        isAcquiringToken: false,
        accessToken: token,
        currentStep: "assign",
      }));

      logApiCall("success", "acquireAccessToken", "Token acquired successfully");
      return token;
    } catch (error: any) {
      logApiCall("error", "acquireAccessToken", "Failed to acquire token", { error: error.message });

      setState(prev => ({
        ...prev,
        isAcquiringToken: false,
        tokenError: "Failed to acquire access token. Please try again.",
      }));

      return null;
    }
  }, [state.attestationUAL, logApiCall]);

  /**
   * Assign role to the user
   * Calls the appropriate MKMPOL21 self-onboarding function based on role type
   */
  const assignRole = useCallback(async () => {
    if (!address) {
      logApiCall("error", "assignRole", "Wallet not connected");
      setState(prev => ({
        ...prev,
        assignmentError: "Wallet not connected",
      }));
      return false;
    }

    logApiCall("info", "assignRole", "Starting role assignment", {
      address,
      role: targetRole.name,
      value: targetRole.value,
      attestationUAL: state.attestationUAL,
    });

    setState(prev => ({
      ...prev,
      isAssigning: true,
      assignmentError: null,
    }));

    try {
      let txHash: string | undefined;

      // Use the appropriate self-onboarding function based on role type
      // The contract has dedicated functions that allow self-assignment
      if (roleKey === "ORDINARY_USER") {
        if (state.attestationUAL) {
          // Use attestation-based onboarding
          logApiCall("info", "assignRole", "Calling onboard_ordinary_user_with_attestation");
          txHash = await writeContractAsync({
            functionName: "onboard_ordinary_user_with_attestation",
            args: [state.attestationUAL],
          });
        } else {
          // Fallback to basic onboarding (no attestation)
          logApiCall("info", "assignRole", "Calling onboard_ordinary_user (no attestation)");
          txHash = await writeContractAsync({
            functionName: "onboard_ordinary_user",
          });
        }
      } else if (roleKey === "MEMBER_INSTITUTION") {
        if (state.attestationUAL) {
          // Use attestation-based onboarding
          logApiCall("info", "assignRole", "Calling onboard_institution_with_attestation");
          txHash = await writeContractAsync({
            functionName: "onboard_institution_with_attestation",
            args: [state.attestationUAL],
          });
        } else {
          // Fallback to basic onboarding (no attestation)
          logApiCall("info", "assignRole", "Calling onboard_institution (no attestation)");
          txHash = await writeContractAsync({
            functionName: "onboard_institution",
          });
        }
      } else {
        // For other roles (admin-assigned roles), use assignRole
        // Note: This will only work if called by an authorized account
        logApiCall(
          "warning",
          "assignRole",
          "Using assignRole for non-self-onboarding role - requires admin privileges",
        );
        txHash = await writeContractAsync({
          functionName: "assignRole",
          args: [address, targetRole.value],
        });
      }

      logApiCall("success", "assignRole", "Role assigned successfully", { txHash });

      setState(prev => ({
        ...prev,
        isAssigning: false,
        isComplete: true,
        currentStep: "complete",
        txHash: txHash ?? null,
      }));

      return true;
    } catch (error: any) {
      const errorMessage = error?.shortMessage || error?.message || "Role assignment failed";
      logApiCall("error", "assignRole", "Role assignment failed", {
        error: errorMessage,
        details: error,
      });

      setState(prev => ({
        ...prev,
        isAssigning: false,
        assignmentError: errorMessage,
      }));

      return false;
    }
  }, [address, roleKey, targetRole.value, targetRole.name, state.attestationUAL, writeContractAsync, logApiCall]);

  /**
   * Reset the onboarding flow
   */
  const reset = useCallback(() => {
    logApiCall("info", "reset", "Resetting onboarding flow");

    if (wsCleanupRef.current) {
      wsCleanupRef.current();
      wsCleanupRef.current = null;
    }

    verificationDataRef.current = {
      instanceId: null,
      did: null,
      nonce: null,
    };

    setState({
      currentStep: isConnected ? "verify" : "connect",
      isVerifying: false,
      isVerified: false,
      verificationError: null,
      accessToken: null,
      isAcquiringToken: false,
      tokenError: null,
      isAssigning: false,
      assignmentError: null,
      isComplete: false,
      txHash: null,
      instanceId: null,
      did: null,
      nonce: null,
      attestationUAL: null,
      oracleConnectionState: "disconnected",
      oracleVerificationState: "idle",
      oracleMessage: null,
      oracleConfidence: null,
      apiCallLog: [],
      oracleEventLog: [],
      serviceEvents: [],
    });
  }, [isConnected, logApiCall]);

  /**
   * Get the current step number (1-based)
   */
  const getStepNumber = useCallback(() => {
    const steps: OnboardingStep[] = ["connect", "verify", "token", "assign", "complete"];
    return steps.indexOf(state.currentStep) + 1;
  }, [state.currentStep]);

  return {
    // State
    ...state,
    isMining,
    targetRole,

    // Actions
    verifyIdentity,
    acquireAccessToken,
    assignRole,
    reset,
    updateStep,
    getStepNumber,

    // Connection status
    address,
    isConnected,

    // Event logging helpers (for UI display)
    logApiCall,
    logOracleEvent,
  };
}

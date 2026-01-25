/**
 * API Route: Submit Evidence for MFSSIA Challenge
 * POST /api/mfssia/submit-evidence
 * Body: { challengeInstanceId: string, challengeId: string, evidence: any }
 *
 * This route handles evidence submission for MFSSIA challenge verification.
 * It includes state checking to prevent submissions to already-verified instances.
 */
import { NextRequest, NextResponse } from "next/server";

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const MFSSIA_ENABLED = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";
// NOTE: MFSSIA API does NOT require an API key - it is a public API

/**
 * Challenge definition mapping
 * The MFSSIA API accepts challenge codes directly (e.g., "mfssia:C-A-1")
 *
 * mfssia:Example-A (Individual User Authentication) - ACTIVE
 * Mandatory challenges:
 *   - C-A-1: Wallet Ownership - expects: { signature, message, publicKey }
 *   - C-A-2: Liveness Check - expects: { interactionTime, userAgent, timestamp }
 */
const CHALLENGE_CODE_TO_UUID: Record<string, string> = {
  // mfssia:Example-A challenge definitions (Individual User Authentication)
  "mfssia:C-A-1": "mfssia:C-A-1", // Wallet Ownership (signature, message, publicKey)
  "mfssia:C-A-2": "mfssia:C-A-2", // Liveness Check (interactionTime, userAgent, timestamp)
  // Legacy C-U-* mappings (deprecated - Example-U not properly configured on server)
  "mfssia:C-U-1": "mfssia:C-U-1",
  "mfssia:C-U-2": "mfssia:C-U-2",
};

/**
 * Submit evidence for a challenge instance
 */
export async function POST(request: NextRequest) {
  if (!MFSSIA_ENABLED) {
    return NextResponse.json({ error: "MFSSIA service is not enabled" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { challengeInstanceId, challengeId, evidence } = body;

    // Validate required fields
    if (!challengeInstanceId || !challengeId || !evidence) {
      console.log("[MFSSIA API] Submit evidence failed: missing required fields", {
        hasChallengeInstanceId: !!challengeInstanceId,
        hasChallengeId: !!challengeId,
        hasEvidence: !!evidence,
      });
      return NextResponse.json(
        { error: "challengeInstanceId, challengeId, and evidence are required" },
        { status: 400 },
      );
    }

    console.log(`[MFSSIA API] Submitting evidence for challenge ${challengeId} on instance ${challengeInstanceId}`);
    console.log(`[MFSSIA API] Evidence payload:`, JSON.stringify(evidence, null, 2));

    // First, check the challenge instance state before submitting
    // This prevents errors when trying to submit to auto-verified instances
    try {
      const instanceResponse = await fetch(`${MFSSIA_API_URL}/api/challenge-instances/${challengeInstanceId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (instanceResponse.ok) {
        const instanceData = await instanceResponse.json();
        const instance = instanceData.data || instanceData;

        console.log(`[MFSSIA API] Challenge instance state: ${instance.state}`);
        console.log(`[MFSSIA API] Challenge instance details:`, JSON.stringify(instance, null, 2));

        // Check if instance is in a state that accepts evidence
        if (instance.state === "VERIFIED" || instance.state === "COMPLETED") {
          console.log(
            `[MFSSIA API] Instance ${challengeInstanceId} is already ${instance.state} - cannot accept evidence`,
          );
          return NextResponse.json(
            {
              error: `Challenge instance is in state "${instance.state}" and cannot accept evidence.`,
              instanceState: instance.state,
              isAutoVerified: true,
              hint:
                "This challenge set is auto-verified by MFSSIA. " +
                "Connect to WebSocket (wss://api.dymaxion-ou.co/ws/oracle) and listen for " +
                "oracle.verification.success event to receive the attestation.",
              recommendation: "Use WebSocket integration instead of polling for auto-verified challenge sets.",
            },
            { status: 409 }, // Conflict - instance state prevents operation
          );
        }

        if (instance.state === "FAILED") {
          console.log(`[MFSSIA API] Instance ${challengeInstanceId} has FAILED - cannot accept evidence`);
          return NextResponse.json(
            {
              error: `Challenge instance has failed and cannot accept evidence.`,
              instanceState: instance.state,
              hint: "Create a new challenge instance to retry verification.",
            },
            { status: 409 },
          );
        }

        if (instance.state === "EXPIRED") {
          console.log(`[MFSSIA API] Instance ${challengeInstanceId} has EXPIRED`);
          return NextResponse.json(
            {
              error: `Challenge instance has expired.`,
              instanceState: instance.state,
              expiresAt: instance.expiresAt,
              hint: "Create a new challenge instance to continue.",
            },
            { status: 410 }, // Gone - resource is no longer available
          );
        }

        // Instance is in a valid state (PENDING_CHALLENGE or IN_PROGRESS)
        console.log(`[MFSSIA API] Instance in valid state: ${instance.state} - proceeding with evidence submission`);
      } else {
        // Could not check instance state - log but continue with submission
        console.warn(
          `[MFSSIA API] Could not verify instance state: ${instanceResponse.status} ${instanceResponse.statusText}`,
        );
        console.warn(`[MFSSIA API] Proceeding with evidence submission anyway`);
      }
    } catch (stateCheckError: any) {
      // State check failed - log but continue with submission attempt
      console.warn(`[MFSSIA API] Instance state check failed:`, stateCheckError.message);
      console.warn(`[MFSSIA API] Proceeding with evidence submission anyway`);
    }

    // Submit evidence to MFSSIA API
    // MFSSIA API now uses unified batch format with responses array
    // Even single submissions must use the responses array format
    const resolvedChallengeId = CHALLENGE_CODE_TO_UUID[challengeId] || challengeId;

    // Build the payload using the new responses array format
    const payload = {
      challengeInstanceId,
      responses: [
        {
          challengeId: resolvedChallengeId,
          evidence,
        },
      ],
    };

    console.log(`[MFSSIA API] Sending evidence to ${MFSSIA_API_URL}/api/challenge-evidence`);
    console.log(`[MFSSIA API] Challenge ID: ${challengeId} -> Resolved: ${resolvedChallengeId}`);
    console.log(`[MFSSIA API] Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(`${MFSSIA_API_URL}/api/challenge-evidence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));

      console.error("[MFSSIA API] Submit evidence failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        challengeInstanceId,
        challengeId,
      });

      // Provide more detailed error messages based on status code and error content
      const userFriendlyError = errorData.message || errorData.error || "Failed to submit evidence";
      let hint = "";
      let serverSideIssue = false;

      if (response.status === 400) {
        hint = "Check that the evidence format matches the challenge requirements.";
      } else if (response.status === 404) {
        // Check for specific "Challenge Set not found" error
        const errorMsg = (errorData.message || errorData.error || "").toLowerCase();
        if (errorMsg.includes("challenge set") && errorMsg.includes("not found")) {
          serverSideIssue = true;
          hint =
            "MFSSIA SERVER-SIDE ISSUE: The challenge set exists (verified via GET /api/challenge-sets) " +
            "but the evidence endpoint cannot find it. This is likely a database synchronization issue " +
            "on the MFSSIA server. Please report this to the MFSSIA team.";
        } else {
          hint = "Challenge instance or challenge definition not found. Verify the IDs are correct.";
        }
      } else if (response.status === 409) {
        hint = "Instance may be in a state that does not accept evidence. Check instance state.";
      } else if (response.status === 500) {
        hint = "MFSSIA API internal error. This may be a temporary issue - try again later.";
      }

      return NextResponse.json(
        {
          error: userFriendlyError,
          details: errorData,
          challengeId,
          resolvedChallengeId,
          challengeInstanceId,
          hint,
          httpStatus: response.status,
          serverSideIssue,
        },
        { status: response.status },
      );
    }

    const responseData = await response.json();
    console.log("[MFSSIA API] Submit evidence response:", JSON.stringify(responseData, null, 2));

    // MFSSIA API wraps responses in { success, message, data, statusCode, timestamp }
    // Extract the actual data from the "data" field
    const data = responseData.data || responseData;

    // Log success
    console.log("[MFSSIA API] Evidence submitted successfully:", {
      challengeId,
      instanceId: challengeInstanceId,
      responseMessage: responseData.message,
    });

    return NextResponse.json({
      ...data,
      success: true,
      message: responseData.message || "Evidence submitted successfully",
    });
  } catch (error: any) {
    console.error("[MFSSIA API] Submit evidence error:", error);
    console.error("[MFSSIA API] Error stack:", error.stack);

    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? {
                name: error.name,
                stack: error.stack,
              }
            : undefined,
        hint: "An unexpected error occurred. Check the server logs for details.",
      },
      { status: 500 },
    );
  }
}

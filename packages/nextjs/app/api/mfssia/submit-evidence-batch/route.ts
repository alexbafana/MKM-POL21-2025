/**
 * API Route: Submit Batch Evidence for MFSSIA Challenge
 * POST /api/mfssia/submit-evidence-batch
 * Body: { challengeInstanceId: string, responses: [{ challengeId: string, evidence: any }, ...] }
 *
 * This route handles batch evidence submission for multiple MFSSIA challenges at once.
 */
import { NextRequest, NextResponse } from "next/server";

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const MFSSIA_ENABLED = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";

/**
 * Submit batch evidence for a challenge instance
 */
export async function POST(request: NextRequest) {
  if (!MFSSIA_ENABLED) {
    return NextResponse.json({ error: "MFSSIA service is not enabled" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { challengeInstanceId, responses } = body;

    // Validate required fields
    if (!challengeInstanceId || !responses || !Array.isArray(responses) || responses.length === 0) {
      console.log("[MFSSIA API] Batch submit failed: missing required fields", {
        hasChallengeInstanceId: !!challengeInstanceId,
        hasResponses: !!responses,
        isArray: Array.isArray(responses),
        responseCount: responses?.length || 0,
      });
      return NextResponse.json({ error: "challengeInstanceId and responses array are required" }, { status: 400 });
    }

    // Validate each response has required fields
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response.challengeId || !response.evidence) {
        console.log(`[MFSSIA API] Batch submit failed: response ${i} missing fields`, {
          hasChallengeId: !!response.challengeId,
          hasEvidence: !!response.evidence,
        });
        return NextResponse.json(
          { error: `Response at index ${i} is missing challengeId or evidence` },
          { status: 400 },
        );
      }
    }

    console.log(`[MFSSIA API] Batch submitting ${responses.length} evidence items for instance ${challengeInstanceId}`);

    // First, check the challenge instance state
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

        if (instance.state === "VERIFIED" || instance.state === "COMPLETED") {
          console.log(`[MFSSIA API] Instance ${challengeInstanceId} is already ${instance.state}`);
          return NextResponse.json(
            {
              error: `Challenge instance is in state "${instance.state}" and cannot accept evidence.`,
              instanceState: instance.state,
              isAutoVerified: true,
              hint: "This challenge set is auto-verified by MFSSIA. Connect to WebSocket to receive attestation.",
            },
            { status: 409 },
          );
        }

        if (instance.state === "FAILED" || instance.state === "EXPIRED") {
          return NextResponse.json(
            {
              error: `Challenge instance is in state "${instance.state}".`,
              instanceState: instance.state,
              hint: "Create a new challenge instance to retry.",
            },
            { status: instance.state === "EXPIRED" ? 410 : 409 },
          );
        }
      }
    } catch (stateCheckError: any) {
      console.warn(`[MFSSIA API] Instance state check failed:`, stateCheckError.message);
    }

    // Submit batch using the unified /api/challenge-evidence endpoint
    // The MFSSIA API now uses a single endpoint with responses array format
    const batchPayload = {
      challengeInstanceId,
      responses: responses.map((r: { challengeId: string; evidence: any }) => ({
        challengeId: r.challengeId,
        evidence: r.evidence,
      })),
    };

    console.log(`[MFSSIA API] Submitting batch to ${MFSSIA_API_URL}/api/challenge-evidence`);
    console.log(`[MFSSIA API] Batch payload:`, JSON.stringify(batchPayload, null, 2));

    const submitResponse = await fetch(`${MFSSIA_API_URL}/api/challenge-evidence`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batchPayload),
    });

    if (submitResponse.ok) {
      const responseData = await submitResponse.json();
      console.log("[MFSSIA API] Batch submission successful:", responseData);
      return NextResponse.json({
        success: true,
        message: "All evidence submitted successfully",
        data: responseData.data || responseData,
      });
    }

    // Handle error response
    const errorData = await submitResponse.json().catch(() => ({
      message: `HTTP ${submitResponse.status}: ${submitResponse.statusText}`,
    }));

    console.error("[MFSSIA API] Batch submission failed:", {
      status: submitResponse.status,
      statusText: submitResponse.statusText,
      error: errorData,
    });

    // Provide helpful error messages
    const userFriendlyError = errorData.message || errorData.error || "Failed to submit evidence";
    let hint = "";

    if (submitResponse.status === 400) {
      hint = "Check that the evidence format matches the challenge requirements.";
    } else if (submitResponse.status === 404) {
      hint = "Challenge instance or challenge definition not found.";
    } else if (submitResponse.status === 409) {
      hint = "Instance may be in a state that does not accept evidence.";
    } else if (submitResponse.status === 422) {
      hint = "Evidence format validation failed. Check required fields.";
    } else if (submitResponse.status === 500) {
      hint = "MFSSIA API internal error. Try again later.";
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
        details: errorData,
        hint,
        httpStatus: submitResponse.status,
      },
      { status: submitResponse.status },
    );
  } catch (error: any) {
    console.error("[MFSSIA API] Batch submit evidence error:", error);

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
      },
      { status: 500 },
    );
  }
}

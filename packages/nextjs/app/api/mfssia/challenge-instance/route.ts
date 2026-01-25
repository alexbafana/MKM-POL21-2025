/**
 * API Route: MFSSIA Challenge Instance
 * POST /api/mfssia/challenge-instance - Create new instance
 * GET /api/mfssia/challenge-instance?id=xxx - Get instance details
 * Body: { did: string, challengeSet: "mfssia:Example-U" | ... }
 */
import { NextRequest, NextResponse } from "next/server";

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const MFSSIA_ENABLED = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";
// NOTE: MFSSIA API does NOT require an API key - it is a public API

export async function POST(request: NextRequest) {
  if (!MFSSIA_ENABLED) {
    return NextResponse.json({ error: "MFSSIA service is not enabled" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { did, challengeSet } = body;

    if (!did || !challengeSet) {
      return NextResponse.json({ error: "DID and challengeSet are required" }, { status: 400 });
    }

    const validChallengeSets = [
      "mfssia:Example-U",
      "mfssia:Example-A",
      "mfssia:Example-B",
      "mfssia:Example-C",
      "mfssia:Example-D",
    ];
    if (!validChallengeSets.includes(challengeSet)) {
      return NextResponse.json(
        { error: `Invalid challenge set. Must be one of: ${validChallengeSets.join(", ")}` },
        { status: 400 },
      );
    }

    const response = await fetch(`${MFSSIA_API_URL}/api/challenge-instances`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        did,
        challengeSet,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { error: errorData.message || errorData.error || "Failed to create challenge instance" },
        { status: response.status },
      );
    }

    const responseData = await response.json();

    // Log the actual response for debugging
    console.log("[MFSSIA API] Challenge instance response:", JSON.stringify(responseData, null, 2));

    // Validate response structure
    if (!responseData || typeof responseData !== "object") {
      console.error("[MFSSIA API] Invalid response structure:", responseData);
      return NextResponse.json({ error: "Invalid response from MFSSIA API" }, { status: 500 });
    }

    // MFSSIA API wraps responses in { success, message, data, statusCode, timestamp }
    // Extract the actual challenge instance from the "data" field
    const data = responseData.data || responseData;

    // Check for required fields in the actual data
    if (!data.id && !data.instanceId) {
      console.error("[MFSSIA API] Response missing id/instanceId. Full response:", responseData);
      console.error("[MFSSIA API] Extracted data:", data);
    }
    if (!data.nonce) {
      console.error("[MFSSIA API] Response missing nonce. Full response:", responseData);
      console.error("[MFSSIA API] Extracted data:", data);
    }

    // Return the unwrapped data
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[MFSSIA API] Challenge instance error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!MFSSIA_ENABLED) {
    return NextResponse.json({ error: "MFSSIA service is not enabled" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get("id");

    if (!instanceId) {
      return NextResponse.json({ error: "Instance ID is required" }, { status: 400 });
    }

    const apiUrl = `${MFSSIA_API_URL}/api/challenge-instances/${instanceId}`;
    console.log("[MFSSIA API] Fetching challenge instance from:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Log raw response for debugging
    const responseText = await response.text();
    console.log("[MFSSIA API] GET challenge instance raw response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 500), // First 500 chars for debugging
    });

    if (!response.ok) {
      // Try to parse error as JSON
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          rawResponse: responseText.substring(0, 200),
        };
      }

      console.error("[MFSSIA API] GET challenge instance failed:", {
        status: response.status,
        error: errorData,
        instanceId,
      });

      // For 500 errors from MFSSIA API, provide a more helpful message
      if (response.status === 500) {
        return NextResponse.json(
          {
            error:
              "MFSSIA API returned an internal error. The challenge instance may have expired or the API is experiencing issues.",
            details: errorData.message || errorData.error,
            instanceId,
            hint: "Try creating a new challenge instance if this persists.",
          },
          { status: 502 }, // Bad Gateway - upstream server error
        );
      }

      return NextResponse.json(
        {
          error: errorData.message || errorData.error || "Failed to get challenge instance",
          details: errorData,
          instanceId,
        },
        { status: response.status },
      );
    }

    // Parse successful response
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error("[MFSSIA API] Failed to parse response as JSON:", responseText);
      return NextResponse.json({ error: "Invalid JSON response from MFSSIA API" }, { status: 502 });
    }

    console.log("[MFSSIA API] Get challenge instance response:", JSON.stringify(responseData, null, 2));

    // MFSSIA API wraps responses in { success, message, data, statusCode, timestamp }
    // Extract the actual data from the "data" field
    const data = responseData.data || responseData;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[MFSSIA API] Get challenge instance error:", error);
    console.error("[MFSSIA API] Error stack:", error.stack);
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        type: "network_error",
        hint: "Check if MFSSIA API is accessible",
      },
      { status: 500 },
    );
  }
}

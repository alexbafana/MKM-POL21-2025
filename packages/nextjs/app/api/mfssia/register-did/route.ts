/**
 * API Route: Register DID with MFSSIA
 * POST /api/mfssia/register-did
 * Body: { did: string, metadata: any }
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
    const { did, requestedChallengeSet } = body;

    if (!did) {
      return NextResponse.json({ error: "DID is required" }, { status: 400 });
    }

    if (!requestedChallengeSet) {
      return NextResponse.json({ error: "requestedChallengeSet is required" }, { status: 400 });
    }

    console.log(`[MFSSIA API Route] Registering DID: ${did} with challenge set: ${requestedChallengeSet}`);

    // MFSSIA API only accepts 'did' and 'requestedChallengeSet' - NO metadata field per API spec
    const response = await fetch(`${MFSSIA_API_URL}/api/identities/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        did,
        requestedChallengeSet,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      console.error(`[MFSSIA API Route] Register DID failed (${response.status}):`, JSON.stringify(errorData, null, 2));

      // If DID is already registered (409 Conflict), treat it as success
      if (
        response.status === 409 &&
        (errorData.message?.includes("already registered") || errorData.error?.includes("Conflict"))
      ) {
        console.log(`[MFSSIA API Route] DID already registered - returning success`);
        return NextResponse.json(
          {
            id: did, // Use DID as ID since we don't have the actual entity ID
            identifier: did,
            requestedChallengeSet,
            registrationState: "ALREADY_REGISTERED",
            message: "DID was already registered - continuing",
          },
          { status: 200 },
        ); // Return 200 OK instead of 409
      }

      // For other errors, return the error
      return NextResponse.json(
        { error: errorData.message || errorData.error || "Failed to register DID" },
        { status: response.status },
      );
    }

    const responseData = await response.json();
    console.log("[MFSSIA API] Register DID response:", JSON.stringify(responseData, null, 2));

    // MFSSIA API wraps responses in { success, message, data, statusCode, timestamp }
    // Extract the actual data from the "data" field
    const data = responseData.data || responseData;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[MFSSIA API] Register DID error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

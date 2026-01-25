/**
 * API Route: Get MFSSIA Attestation
 * GET /api/mfssia/attestation/[did]
 */
import { NextRequest, NextResponse } from "next/server";

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";
const MFSSIA_ENABLED = process.env.NEXT_PUBLIC_MFSSIA_ENABLED === "true";
// NOTE: MFSSIA API does NOT require an API key - it is a public API

export async function GET(request: NextRequest, { params }: { params: Promise<{ did: string }> }) {
  if (!MFSSIA_ENABLED) {
    return NextResponse.json({ error: "MFSSIA service is not enabled" }, { status: 503 });
  }

  try {
    const { did } = await params;

    if (!did) {
      return NextResponse.json({ error: "DID is required" }, { status: 400 });
    }

    const response = await fetch(`${MFSSIA_API_URL}/api/attestations/did/${encodeURIComponent(did)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      return NextResponse.json(
        { error: errorData.message || errorData.error || "Failed to retrieve attestation" },
        { status: response.status },
      );
    }

    const responseData = await response.json();
    console.log("[MFSSIA API] Get attestation response:", JSON.stringify(responseData, null, 2));

    // MFSSIA API wraps responses in { success, message, data, statusCode, timestamp }
    // Extract the actual data from the "data" field
    const data = responseData.data || responseData;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[MFSSIA API] Get attestation error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

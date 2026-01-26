/**
 * TTL Storage Link API
 *
 * POST /api/ttl-storage/link
 *
 * Links a storageId with an on-chain graphId after successful blockchain submission.
 * This enables retrieval of TTL content by graphId.
 *
 * Request body:
 * {
 *   "storageId": "ttl-1234567890-abc123",
 *   "graphId": "0x... (bytes32 from contract)"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "storageId": "ttl-1234567890-abc123",
 *   "graphId": "0x..."
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { getTTLStorageService } from "~~/services/TTLStorageService";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { storageId, graphId } = body;

    // Validate required fields
    if (!storageId || typeof storageId !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid 'storageId' field" }, { status: 400 });
    }

    if (!graphId || typeof graphId !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid 'graphId' field" }, { status: 400 });
    }

    // Validate storageId format
    if (!storageId.startsWith("ttl-")) {
      return NextResponse.json({ success: false, error: "Invalid storageId format" }, { status: 400 });
    }

    // Validate graphId format (bytes32 hex)
    if (!/^0x[a-fA-F0-9]{64}$/.test(graphId)) {
      return NextResponse.json(
        { success: false, error: "Invalid graphId format: expected bytes32 hex string" },
        { status: 400 },
      );
    }

    // Link the storageId to graphId
    const storageService = getTTLStorageService();
    await storageService.linkGraphId(storageId, graphId);

    console.log(`[TTL Link API] Linked storageId ${storageId} to graphId ${graphId}`);

    return NextResponse.json({
      success: true,
      storageId,
      graphId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[TTL Link API Error]", message);

    // Check for not found error
    if (message.includes("not found")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET handler - Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "TTL Storage Link API",
    method: "POST",
    description: "Link storageId with on-chain graphId after blockchain submission",
    requestBody: {
      storageId: "string (required) - Storage identifier from upload",
      graphId: "string (required) - Bytes32 graph ID from contract",
    },
    response: {
      success: "boolean",
      storageId: "string",
      graphId: "string",
    },
  });
}

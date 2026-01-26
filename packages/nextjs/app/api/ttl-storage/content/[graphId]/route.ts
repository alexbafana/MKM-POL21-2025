/**
 * TTL Storage Content Retrieval API
 *
 * GET /api/ttl-storage/content/[graphId]
 *
 * Retrieves decrypted TTL content by graphId.
 * Used by BDI agents to fetch TTL for validation.
 *
 * Query parameters:
 *   agentAddress: Ethereum address for access control (optional)
 *   includeContent: "true" to include full content (default: true)
 *
 * Response:
 * {
 *   "success": true,
 *   "graphId": "0x...",
 *   "storageId": "ttl-...",
 *   "contentHash": "0x...",
 *   "content": "TTL content...",
 *   "metadata": { ... }
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { getTTLStorageService } from "~~/services/TTLStorageService";

export async function GET(request: NextRequest, { params }: { params: Promise<{ graphId: string }> }) {
  try {
    const { graphId } = await params;

    // Validate graphId format (bytes32 hex)
    if (!/^0x[a-fA-F0-9]{64}$/.test(graphId)) {
      return NextResponse.json(
        { success: false, error: "Invalid graphId format: expected bytes32 hex string" },
        { status: 400 },
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const includeContent = url.searchParams.get("includeContent") !== "false";

    // Retrieve content
    const storageService = getTTLStorageService();

    if (includeContent) {
      // Full retrieval with decryption
      const result = await storageService.getByGraphId(graphId);

      return NextResponse.json({
        success: true,
        graphId,
        storageId: result.storageId,
        contentHash: result.contentHash,
        content: result.content,
        metadata: result.metadata,
        contentLength: result.content.length,
      });
    } else {
      // Metadata only (no decryption)
      const entry = await storageService.getEntryByGraphId(graphId);

      if (!entry) {
        return NextResponse.json(
          { success: false, error: `No storage entry found for graphId: ${graphId}` },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        graphId,
        storageId: entry.storageId,
        contentHash: entry.contentHash,
        fileSize: entry.fileSize,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
        linkedAt: entry.linkedAt,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[TTL Content API Error]", message);

    // Check for not found error
    if (message.includes("not found") || message.includes("No storage entry")) {
      return NextResponse.json({ success: false, error: message }, { status: 404 });
    }

    // Check for integrity error
    if (message.includes("integrity")) {
      return NextResponse.json({ success: false, error: "Content integrity check failed" }, { status: 500 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST handler - Alternative method for content retrieval
 * Useful when graphId contains special characters
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ graphId: string }> }) {
  // Delegate to GET handler
  return GET(request, { params });
}

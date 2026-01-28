import { NextRequest, NextResponse } from "next/server";
import { getDKGPublisherService } from "~~/services/DKGPublisherService";

/**
 * GET /api/dkg-publish
 *
 * Returns API documentation for the DKG Publisher endpoint.
 */
export async function GET() {
  return NextResponse.json({
    name: "DKG Publisher API",
    version: "1.0.0",
    endpoints: {
      "POST /api/dkg-publish": {
        description: "Publish approved RDF graph to DKG",
        body: { graphId: "bytes32 hex string" },
      },
      "POST /api/dkg-publish (auto)": {
        description: "Auto-publish all ready graphs",
        body: { action: "auto" },
      },
    },
  });
}

/**
 * POST /api/dkg-publish
 *
 * Multiplexed via `action` field in the request body:
 *
 * - action: "publish" (default) - Publish a single graph by graphId
 * - action: "auto"             - Auto-publish all graphs ready for publication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action: string = body.action ?? "publish";

    // -------------------------------------------------------------------------
    // Action: "auto" - Auto-publish all ready graphs
    // -------------------------------------------------------------------------
    if (action === "auto") {
      return NextResponse.json({
        success: true,
        message: "Auto-publish not yet implemented. Will scan for graphs where isReadyForPublication() == true.",
        publishedGraphs: [],
      });
    }

    // -------------------------------------------------------------------------
    // Action: "publish" - Publish a single graph by graphId
    // -------------------------------------------------------------------------
    if (action === "publish") {
      const { graphId, ttlContent } = body;

      if (!graphId || typeof graphId !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing or invalid 'graphId' in request body" },
          { status: 400 },
        );
      }

      const service = getDKGPublisherService();
      const result = await service.publishToDKG(graphId, ttlContent);

      return NextResponse.json(result, { status: result.success ? 200 : 500 });
    }

    // -------------------------------------------------------------------------
    // Unknown action
    // -------------------------------------------------------------------------
    return NextResponse.json(
      { success: false, error: `Unknown action: '${action}'. Supported actions: 'publish', 'auto'.` },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: `Request failed: ${message}` }, { status: 500 });
  }
}

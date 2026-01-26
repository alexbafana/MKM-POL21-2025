/**
 * TTL Storage Upload API
 *
 * POST /api/ttl-storage/upload
 *
 * Uploads and encrypts TTL content for server-side storage.
 * This allows BDI agents to later retrieve and validate the content.
 *
 * Request body:
 * {
 *   "content": "TTL file content as string",
 *   "expectedHash": "0x... SHA-256 hash (optional, for verification)",
 *   "metadata": {
 *     "graphType": 0,
 *     "datasetVariant": 1,
 *     "year": 2024,
 *     "modelVersion": "EstBERT-1.0",
 *     "graphURI": "urn:mkm:articles:1:2024",
 *     "submitter": "0x..."
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "storageId": "ttl-1234567890-abc123",
 *   "contentHash": "0x...",
 *   "fileSize": 12345
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { getTTLStorageService } from "~~/services/TTLStorageService";

// Rate limiting - simple in-memory store (use Redis in production)
const uploadAttempts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = uploadAttempts.get(ip);

  if (!record || now > record.resetTime) {
    uploadAttempts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, expectedHash, metadata } = body;

    // Validate required fields
    if (!content || typeof content !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid 'content' field" }, { status: 400 });
    }

    // Validate content is not empty
    if (content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Content cannot be empty" }, { status: 400 });
    }

    // Check content size (10MB limit)
    const contentSize = Buffer.byteLength(content, "utf-8");
    if (contentSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: `Content too large: ${contentSize} bytes exceeds 10MB limit` },
        { status: 413 },
      );
    }

    // Basic TTL validation - check for @prefix or @base declarations
    if (!content.includes("@prefix") && !content.includes("@base") && !content.includes("PREFIX")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid TTL content: missing @prefix, @base, or PREFIX declarations",
        },
        { status: 400 },
      );
    }

    // Store the content
    const storageService = getTTLStorageService();
    const result = await storageService.store(content, expectedHash, metadata);

    console.log(`[TTL Upload API] Stored TTL: ${result.storageId} (${result.fileSize} bytes)`);

    return NextResponse.json({
      success: true,
      storageId: result.storageId,
      contentHash: result.contentHash,
      fileSize: result.fileSize,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[TTL Upload API Error]", message);

    // Check for hash mismatch error
    if (message.includes("Hash mismatch")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * GET handler - Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "TTL Storage Upload API",
    method: "POST",
    description: "Upload and encrypt TTL content for server-side storage",
    requestBody: {
      content: "string (required) - TTL file content",
      expectedHash: "string (optional) - SHA-256 hash for verification",
      metadata: {
        graphType: "number (optional) - Graph type enum value",
        datasetVariant: "number (optional) - Dataset variant enum value",
        year: "number (optional) - Dataset year",
        modelVersion: "string (optional) - NLP model version",
        graphURI: "string (optional) - Graph URI",
        submitter: "string (optional) - Submitter address",
      },
    },
    response: {
      success: "boolean",
      storageId: "string - Unique storage identifier",
      contentHash: "string - SHA-256 hash of content",
      fileSize: "number - Size in bytes",
    },
    limits: {
      maxSize: "10MB",
      rateLimit: "10 requests per minute per IP",
    },
  });
}

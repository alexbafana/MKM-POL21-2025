/**
 * TTL Storage Stats API
 *
 * GET /api/ttl-storage/stats
 *
 * Returns statistics about TTL storage usage.
 *
 * Response:
 * {
 *   "success": true,
 *   "stats": {
 *     "totalEntries": 5,
 *     "linkedEntries": 3,
 *     "totalSize": 123456
 *   }
 * }
 */
import { NextResponse } from "next/server";
import { getTTLStorageService } from "~~/services/TTLStorageService";

export async function GET() {
  try {
    const storageService = getTTLStorageService();
    const stats = await storageService.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("[TTL Stats API Error]", message);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { CHALLENGE_SETS, getActiveChallengeSets, getChallengeSetsForRole } from "~~/types/mfssia";

const MFSSIA_API_URL = process.env.MFSSIA_API_URL || "https://api.dymaxion-ou.co";

/**
 * GET /api/mfssia/challenge-sets
 * Returns available challenge sets, optionally filtered by role
 *
 * Query params:
 * - role: Filter by applicable role (e.g., "ORDINARY_USER")
 * - activeOnly: Only return active sets (default: true)
 * - includeRemote: Also fetch from MFSSIA API (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const activeOnly = searchParams.get("activeOnly") !== "false";
    const includeRemote = searchParams.get("includeRemote") === "true";

    // Get local challenge sets
    let challengeSets = activeOnly ? getActiveChallengeSets() : CHALLENGE_SETS;

    // Filter by role if specified
    if (role) {
      challengeSets = getChallengeSetsForRole(role);
    }

    // Optionally fetch from MFSSIA API to get any new sets
    let remoteSets: any[] = [];
    if (includeRemote) {
      try {
        const response = await fetch(`${MFSSIA_API_URL}/api/challenge-sets`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          remoteSets = data.data || data || [];
        }
      } catch (error: any) {
        console.warn("[API] Failed to fetch remote challenge sets:", error.message);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        local: challengeSets,
        remote: remoteSets,
        merged: challengeSets, // In future, could merge local and remote
      },
      meta: {
        totalLocal: challengeSets.length,
        totalRemote: remoteSets.length,
        role: role || "all",
        activeOnly,
      },
    });
  } catch (error: any) {
    console.error("[API] Error fetching challenge sets:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch challenge sets",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/mfssia/challenge-sets
 * Create a new challenge set on the MFSSIA API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { id, name, description, challengeDefinitionIds, requiredConfidence } = body;

    if (!id || !name || !challengeDefinitionIds) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: id, name, challengeDefinitionIds",
        },
        { status: 400 },
      );
    }

    // Create on MFSSIA API
    const response = await fetch(`${MFSSIA_API_URL}/api/challenge-sets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        name,
        description,
        challengeDefinitionIds,
        requiredConfidence: requiredConfidence || 0.85,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || data.error || `Failed to create challenge set: ${response.status}`,
          details: data,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: data.data || data,
      message: "Challenge set created successfully",
    });
  } catch (error: any) {
    console.error("[API] Error creating challenge set:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create challenge set",
      },
      { status: 500 },
    );
  }
}

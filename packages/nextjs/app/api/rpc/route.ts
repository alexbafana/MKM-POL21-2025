import { NextRequest, NextResponse } from "next/server";

/**
 * RPC Proxy - forwards JSON-RPC requests to the local Hardhat node.
 * This allows the frontend to communicate with Hardhat through port 4000
 * when port 8545 is not externally accessible.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch("http://localhost:8545", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("RPC Proxy error:", error);
    return NextResponse.json({ error: "RPC request failed", details: String(error) }, { status: 500 });
  }
}

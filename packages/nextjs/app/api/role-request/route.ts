import { NextResponse } from "next/server";

// Super simple in-memory store (replace with DB/email/Discord webhooks)
const mem: any[] = [];

export async function POST(req: Request) {
  const body = await req.json();
  // Basic shape validation
  if (!body?.user || !body?.role || !body?.signature || !body?.contract) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  mem.push({ ...body, receivedAt: Date.now() });

  // TODO: send a notification to the owner (email, Slack/Discord webhook, etc.)
  // e.g. await fetch(process.env.DISCORD_WEBHOOK!, { method: "POST", body: JSON.stringify({...}) })

  return NextResponse.json({ ok: true });
}

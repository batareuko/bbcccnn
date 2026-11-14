import { NextResponse } from "next/server";
import { handlePaddleEvent, verifyPaddleSignature } from "@/lib/billing/paddle";

export const dynamic = "force-dynamic";

/** Paddle notification destination. Public, authenticated by the Paddle-Signature HMAC over the raw body. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaddleSignature(raw, req.headers.get("paddle-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const ev = JSON.parse(raw);
  try {
    const result = await handlePaddleEvent(ev);
    console.log("[paddle]", ev.event_type, ev.data?.id, "→", result);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[paddle] webhook failed", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // Paddle retries
  }
}

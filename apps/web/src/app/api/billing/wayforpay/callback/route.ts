import { NextResponse } from "next/server";
import { handleWfpCallback, verifyWfpCallback, wfpAccept, type WfpCallback } from "@/lib/billing/wayforpay";

export const dynamic = "force-dynamic";

/** serviceUrl: WayForPay server-to-server notification. Public, authenticated by HMAC signature. */
export async function POST(req: Request) {
  const raw = await req.text();
  let body: WfpCallback;
  try {
    // WayForPay sends JSON; some setups send it as the only key of a form body.
    body = JSON.parse(raw.trim().startsWith("{") ? raw : decodeURIComponent(Object.keys(Object.fromEntries(new URLSearchParams(raw)))[0] ?? ""));
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }
  if (!verifyWfpCallback(body)) {
    console.warn("[wayforpay] bad signature for", body?.orderReference);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  try {
    const result = await handleWfpCallback(body);
    console.log("[wayforpay]", body.orderReference, body.transactionStatus, "→", result);
  } catch (e) {
    console.error("[wayforpay] callback failed", e);
    // no "accept" → WayForPay retries later
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json(wfpAccept(body.orderReference));
}

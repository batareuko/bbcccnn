import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/bot";

export const dynamic = "force-dynamic";

/** Telegram webhook. Authenticated by the secret_token we passed to setWebhook. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const update = (await req.json()) as TgUpdate;
    const result = await handleUpdate(update);
    if (result !== "ignored") console.log("[telegram] update", update.update_id, "→", result);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[telegram] webhook failed", e);
    // 200 anyway: a non-2xx makes Telegram retry the same broken update forever
    return NextResponse.json({ ok: false });
  }
}

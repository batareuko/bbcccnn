/**
 * Shared Telegram bot helpers.
 *   npm run telegram setup   — register the webhook ({NEXT_PUBLIC_SITE_URL}/api/telegram/webhook)
 *   npm run telegram poll    — local development without a public URL (long polling)
 *   npm run telegram info    — show webhook status
 */
import { handleUpdate, tgCall, type TgUpdate } from "../src/lib/telegram/bot";
import { SITE_URL } from "../src/lib/site";

const ALLOWED = ["message", "channel_post", "my_chat_member"];

async function main() {
  const cmd = process.argv[2] ?? "info";
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  if (cmd === "setup") {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set");
    const url = `${SITE_URL}/api/telegram/webhook`;
    await tgCall("setWebhook", { url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ALLOWED });
    await tgCall("setMyCommands", { commands: [{ command: "connect", description: "Connect this channel to PostFlow" }] });
    console.log("Webhook set to", url);
  } else if (cmd === "poll") {
    await tgCall("deleteWebhook", {});
    console.log("Polling for updates… (Ctrl+C to stop; run `setup` again for production)");
    let offset = 0;
    for (;;) {
      const updates = await tgCall<TgUpdate[]>("getUpdates", { offset, timeout: 30, allowed_updates: ALLOWED });
      for (const u of updates) {
        offset = u.update_id + 1;
        console.log(u.update_id, await handleUpdate(u));
      }
    }
  } else {
    console.log(await tgCall("getWebhookInfo", {}));
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

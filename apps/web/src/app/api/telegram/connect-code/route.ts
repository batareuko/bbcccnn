import { HttpError, requireAuth, assertActive } from "@/lib/auth";
import { handler } from "@/lib/api";
import { addBotLinks, createConnectCode, sharedBotConfigured, sharedBotUsername } from "@/lib/telegram/bot";

export const POST = handler(async () => {
  const a = await requireAuth();
  if (!sharedBotConfigured()) throw new HttpError(503, "Telegram bot is not configured");
  assertActive(a);
  const { code, expiresAt } = await createConnectCode(a.workspaceId);
  return { code, expiresAt, username: sharedBotUsername(), links: addBotLinks() };
});

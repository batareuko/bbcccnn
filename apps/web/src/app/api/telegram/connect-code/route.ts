import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { planOf } from "@/lib/plans";
import { addBotLinks, createConnectCode, sharedBotConfigured, sharedBotUsername } from "@/lib/telegram/bot";

export const POST = handler(async () => {
  const a = await requireAuth();
  if (!sharedBotConfigured()) throw new HttpError(503, "Telegram bot is not configured");
  if (!planOf(a.plan).active) throw new HttpError(402, "Your plan is not active — choose a plan to continue");
  const { code, expiresAt } = await createConnectCode(a.workspaceId);
  return { code, expiresAt, username: sharedBotUsername(), links: addBotLinks() };
});

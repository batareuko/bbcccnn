import { requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { addBotLinks, sharedBotConfigured, sharedBotUsername } from "@/lib/telegram/bot";

/** Is the shared bot available? (the UI falls back to "use your own bot" otherwise) */
export const GET = handler(async () => {
  await requireAuth();
  return sharedBotConfigured() ? { enabled: true, username: sharedBotUsername(), links: addBotLinks() } : { enabled: false };
});

import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { publishDuePosts } from "@/lib/scheduler";
import { syncAllSources } from "@/lib/sources";
import { reconcileWfpSubscriptions } from "@/lib/billing/wayforpay";
import { setStatus } from "@/lib/system";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Call every minute from Vercel Cron / any external scheduler with `Authorization: Bearer $CRON_SECRET`. */
export const GET = handler(async (req: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "Unauthorized");
  const sources = await syncAllSources();
  const published = await publishDuePosts();
  const billing = await reconcileWfpSubscriptions();
  await setStatus("scheduler.lastTick", { via: "cron", published: published.length, at: new Date() });
  return { sources, published, billing };
});

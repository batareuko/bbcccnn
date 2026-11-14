/**
 * Long-running scheduler process: `npm run worker`.
 * Every minute it imports new WordPress items and publishes due posts.
 * On serverless hosting use the /api/cron endpoint instead.
 */
import { publishDuePosts } from "../src/lib/scheduler";
import { syncAllSources } from "../src/lib/sources";
import { reconcileWfpSubscriptions } from "../src/lib/billing/wayforpay";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 60_000);

async function tick() {
  try {
    const sources = await syncAllSources();
    const created = sources.reduce((n, s) => n + ("created" in s ? s.created ?? 0 : 0), 0);
    const published = await publishDuePosts();
    const billing = await reconcileWfpSubscriptions();
    if (billing.length) console.log(new Date().toISOString(), { billing });
    if (created || published.length)
      console.log(new Date().toISOString(), { imported: created, published });
  } catch (e) {
    console.error("worker tick failed", e);
  }
}

console.log(`Worker started, interval ${INTERVAL_MS}ms`);
tick();
setInterval(tick, INTERVAL_MS);

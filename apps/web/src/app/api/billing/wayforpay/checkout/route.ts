import { z } from "zod";
import { HttpError, requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { MAX_PACKS } from "@/lib/billing/catalog";
import { createWfpCheckout, wfpConfigured } from "@/lib/billing/wayforpay";
import { getLocale } from "@/i18n/server";

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("plan"), plan: z.enum(["starter", "pro", "agency"]), interval: z.enum(["month", "year"]) }),
  z.object({ kind: z.literal("credits"), packs: z.number().int().min(1).max(MAX_PACKS) }),
]);

/** Returns a signed form; the browser POSTs it to WayForPay. */
export const POST = handler(async (req: Request) => {
  const a = await requireAuth();
  if (!wfpConfigured()) throw new HttpError(503, "WayForPay is not configured");
  const b = Body.parse(await req.json());
  const locale = await getLocale();
  return createWfpCheckout({ id: a.workspaceId }, { email: a.email }, b, locale === "en" ? "EN" : "UA");
});

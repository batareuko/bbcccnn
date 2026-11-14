import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai/providers";
import { requireAuth } from "@/lib/auth";
import { handler } from "@/lib/api";
import { effectivePlanId, planOf, trialDaysLeft } from "@/lib/plans";

export const GET = handler(async () => {
  const a = await requireAuth();
  const ws = await db.workspace.findUniqueOrThrow({ where: { id: a.workspaceId } });
  return {
    user: { id: a.userId, email: a.email },
    workspace: {
      id: ws.id,
      name: ws.name,
      plan: effectivePlanId(ws),
      trialEndsAt: ws.trialEndsAt,
      trialDaysLeft: trialDaysLeft(ws),
      timezone: ws.timezone,
      aiCredits: ws.aiCredits,
      limits: planOf(effectivePlanId(ws)),
    },
    aiConfigured: isAiConfigured(),
  };
});

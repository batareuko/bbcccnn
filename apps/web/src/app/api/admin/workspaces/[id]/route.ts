import { z } from "zod";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handler } from "@/lib/api";
import { logAction, requireAdmin } from "@/lib/admin";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("suspend"), reason: z.string().min(3).max(500) }),
  z.object({ action: z.literal("unsuspend") }),
  z.object({ action: z.literal("grant_credits"), amount: z.number().int().min(-10000).max(10000), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("extend_trial"), days: z.number().int().min(1).max(365) }),
  /** complimentary plan, not billed (partners, support compensation…) */
  z.object({ action: z.literal("set_plan"), plan: z.enum(["starter", "pro", "agency"]), days: z.number().int().min(1).max(3650) }),
]);

export const POST = handler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const { id } = await params;
  const b = Body.parse(await req.json());
  const ws = await db.workspace.findUnique({ where: { id } });
  if (!ws) throw new HttpError(404, "Workspace not found");

  switch (b.action) {
    case "suspend":
      await db.workspace.update({ where: { id }, data: { suspendedAt: new Date(), suspendReason: b.reason } });
      break;
    case "unsuspend":
      await db.workspace.update({ where: { id }, data: { suspendedAt: null, suspendReason: null } });
      break;
    case "grant_credits":
      if (ws.aiCredits + b.amount < 0) throw new HttpError(400, "Balance can't go below zero");
      await db.$transaction([
        db.workspace.update({ where: { id }, data: { aiCredits: { increment: b.amount } } }),
        db.aiUsage.create({ data: { workspaceId: id, kind: "admin_grant", credits: b.amount } }),
      ]);
      break;
    case "extend_trial": {
      if (ws.plan !== "trial") throw new HttpError(400, "Workspace is not on a trial");
      const base = ws.trialEndsAt && ws.trialEndsAt > new Date() ? ws.trialEndsAt : new Date();
      await db.workspace.update({ where: { id }, data: { trialEndsAt: new Date(base.getTime() + b.days * 864e5) } });
      break;
    }
    case "set_plan":
      if (ws.billingStatus === "active" && ws.billingProvider && ws.billingProvider !== "manual")
        throw new HttpError(409, "Workspace has a paid subscription — cancel it first");
      await db.workspace.update({
        where: { id },
        data: {
          plan: b.plan,
          billingProvider: "manual",
          billingStatus: "active",
          billingInterval: null,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(Date.now() + b.days * 864e5),
        },
      });
      break;
  }
  const { action, ...details } = b;
  await logAction(admin, `workspace.${action}`, "workspace", id, { name: ws.name, ...details });
  return { ok: true };
});

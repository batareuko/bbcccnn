import { db } from "../db";
import { HttpError } from "../auth";
import { aiProvider } from "./providers";

export const TRIAL_AI_CREDITS = 30;

/** Atomically takes `n` credits; throws 402 if the balance is too low. */
export async function chargeCredits(workspaceId: string, n: number, kind: string) {
  const r = await db.workspace.updateMany({
    where: { id: workspaceId, aiCredits: { gte: n } },
    data: { aiCredits: { decrement: n } },
  });
  if (!r.count) throw new HttpError(402, "Not enough AI credits — top up to continue");
  await db.aiUsage.create({ data: { workspaceId, kind, credits: -n, provider: aiProvider() } });
}

/** Gives credits back (e.g. the AI call failed). */
export async function refundCredits(workspaceId: string, n: number) {
  if (n <= 0) return;
  await db.workspace.update({ where: { id: workspaceId }, data: { aiCredits: { increment: n } } });
  await db.aiUsage.create({ data: { workspaceId, kind: "refund", credits: n } });
}

/** Charges, runs `fn`, refunds on failure (or partially when fn reports fewer units used). */
export async function withCredits<T>(
  workspaceId: string,
  n: number,
  kind: string,
  fn: () => Promise<T>,
  used?: (result: T) => number,
): Promise<T> {
  await chargeCredits(workspaceId, n, kind);
  try {
    const result = await fn();
    if (used) await refundCredits(workspaceId, n - Math.min(n, used(result)));
    return result;
  } catch (e) {
    await refundCredits(workspaceId, n);
    throw e;
  }
}

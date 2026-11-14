import { db } from "./db";

/** Technical state shown in /admin (worker heartbeat, last cron run…). */
export async function setStatus(key: string, value: unknown) {
  const v = JSON.stringify(value);
  await db.systemStatus.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}

export async function getStatus<T = unknown>(key: string): Promise<{ value: T; updatedAt: Date } | null> {
  const row = await db.systemStatus.findUnique({ where: { key } });
  return row ? { value: JSON.parse(row.value) as T, updatedAt: row.updatedAt } : null;
}

/**
 * Lightweight automatic moderation: posts containing any of MODERATION_KEYWORDS are flagged.
 * With MODERATION_HOLD=true flagged scheduled posts go to "review" and are not published
 * until a moderator approves them in /admin/content.
 */
export function moderationKeywords() {
  return (process.env.MODERATION_KEYWORDS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const holdFlagged = () => process.env.MODERATION_HOLD === "true";

export function checkContent(texts: (string | null | undefined)[]) {
  const words = moderationKeywords();
  if (!words.length) return { flagged: false, reason: null as string | null };
  const hay = texts.filter(Boolean).join("\n").toLowerCase();
  const hits = words.filter((w) => hay.includes(w));
  return hits.length ? { flagged: true, reason: `keywords: ${hits.slice(0, 5).join(", ")}` } : { flagged: false, reason: null };
}

/** Status/flag fields to store for a post that is being saved by its author. */
export function moderationFields(status: string, texts: (string | null | undefined)[]) {
  const c = checkContent(texts);
  return {
    flagged: c.flagged,
    flagReason: c.reason,
    status: c.flagged && holdFlagged() && status === "scheduled" ? "review" : status,
  };
}

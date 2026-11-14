import { db } from "./db";
import { getAuth, HttpError } from "./auth";

/** Platform admin guard for /api/admin/*. Non-admins get 404 so the panel isn't discoverable. */
export async function requireAdmin() {
  const a = await getAuth();
  if (!a || a.role !== "admin") throw new HttpError(404, "Not found");
  return a;
}

export async function logAction(
  admin: { userId: string; email: string },
  action: string,
  targetType: "user" | "workspace" | "post",
  targetId: string,
  details?: unknown,
) {
  await db.adminAction.create({
    data: {
      adminId: admin.userId,
      adminEmail: admin.email,
      action,
      targetType,
      targetId,
      details: details === undefined ? null : JSON.stringify(details),
    },
  });
}

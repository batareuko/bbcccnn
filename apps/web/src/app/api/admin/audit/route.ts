import { db } from "@/lib/db";
import { handler } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";

export const GET = handler(async (req: Request) => {
  await requireAdmin();
  const target = new URL(req.url).searchParams.get("target");
  return db.adminAction.findMany({
    where: target ? { targetId: target } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
});

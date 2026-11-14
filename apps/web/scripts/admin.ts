/**
 * Platform admins (access to /admin).
 *   npm run admin grant you@example.com
 *   npm run admin revoke you@example.com
 *   npm run admin list
 */
import { db } from "../src/lib/db";

async function main() {
  const [cmd = "list", email] = process.argv.slice(2);
  if (cmd === "list") {
    const admins = await db.user.findMany({ where: { role: "admin" }, select: { email: true, createdAt: true } });
    console.table(admins);
    return;
  }
  if (!email) throw new Error("email is required");
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No user ${email} — register first`);
  await db.user.update({ where: { id: user.id }, data: { role: cmd === "grant" ? "admin" : "user" } });
  console.log(`${email}: ${cmd === "grant" ? "is now an admin" : "is no longer an admin"}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

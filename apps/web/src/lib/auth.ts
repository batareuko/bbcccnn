import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { effectivePlanId, planOf } from "./plans";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "pf_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(pw, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  return timingSafeEqual(hash, Buffer.from(hashHex, "hex"));
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Creates a session and returns the raw token (only time it exists in plain form). */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
    },
  });
  return token;
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
}

async function readToken() {
  const auth = (await headers()).get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export type AuthContext = {
  userId: string;
  email: string;
  /** user | admin */
  role: string;
  /** workspace suspended by a moderator */
  suspended: boolean;
  workspaceId: string;
  /** Effective plan id: a trial becomes "expired" after its 14 days. */
  plan: string;
};

/** Resolves user + current workspace from cookie or Bearer token. Returns null if not signed in. */
export async function getAuth(): Promise<AuthContext | null> {
  const token = await readToken();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { memberships: { include: { workspace: true } } } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.blockedAt) return null;
  const hdrWs = (await headers()).get("x-workspace-id");
  const m =
    session.user.memberships.find((x) => x.workspaceId === hdrWs) ?? session.user.memberships[0];
  if (!m) return null;
  return {
    userId: session.userId,
    email: session.user.email,
    role: session.user.role,
    suspended: !!m.workspace.suspendedAt,
    workspaceId: m.workspaceId,
    plan: effectivePlanId(m.workspace),
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireAuth() {
  const a = await getAuth();
  if (!a) throw new HttpError(401, "Unauthorized");
  return a;
}

/** Throws a clear error when the workspace can't schedule/publish/use AI right now. */
export function assertActive(a: AuthContext) {
  if (a.suspended) throw new HttpError(403, "This workspace is suspended by a moderator. Please contact support.");
  if (!planOf(a.plan).active) throw new HttpError(402, "Your plan is not active — choose a plan to continue");
}

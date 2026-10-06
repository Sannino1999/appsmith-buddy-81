import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import {
  getCookie,
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";

import {
  createAdminSession,
  deleteAdminSession,
  getAdminById,
  getAdminByUsername,
} from "./mysql.repository";

const SESSION_COOKIE =
  process.env["NODE_ENV"] === "production"
    ? "__Host-lubrano-admin-session"
    : "lubrano-admin-session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, number[]>();

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function now() {
  return Date.now();
}

function pruneAttempts(key: string) {
  const cutoff = now() - WINDOW_MS;
  const current = attempts.get(key) ?? [];
  const recent = current.filter((timestamp) => timestamp > cutoff);
  if (recent.length === 0) attempts.delete(key);
  else attempts.set(key, recent);
  return recent;
}

export function isLoginRateLimited(key: string) {
  return pruneAttempts(key).length >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string) {
  const recent = pruneAttempts(key);
  recent.push(now());
  attempts.set(key, recent);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

function sessionCookie(token: string, maxAge: number) {
  return [
    SESSION_COOKIE + "=" + token,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=" + maxAge,
  ].join("; ");
}

function setSessionCookie(token: string) {
  setResponseHeader("Set-Cookie", sessionCookie(token, SESSION_TTL_SECONDS));
}

function clearSessionCookie() {
  setResponseHeader("Set-Cookie", sessionCookie("", 0));
}

function readSessionToken() {
  return getCookie(SESSION_COOKIE) ?? null;
}

function clientKey() {
  return (
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    getRequestHeader("x-real-ip") ||
    "unknown"
  );
}

const loginSchema = z.object({
  username: z.string().trim().min(1).max(190),
  password: z.string().min(1).max(200),
});

export async function authenticateAdmin(input: unknown) {
  const data = loginSchema.parse(input);
  const key = clientKey();

  if (isLoginRateLimited(key)) {
    return { ok: false as const, reason: "rate_limited" as const };
  }

  const admin = await getAdminByUsername(data.username);
  const passwordHash = admin?.password_hash ?? null;
  const valid = !!admin && !!passwordHash && admin.is_active && (await bcrypt.compare(data.password, passwordHash));

  if (!valid) {
    recordLoginFailure(key);
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  clearLoginFailures(key);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now() + SESSION_TTL_SECONDS * 1000);
  await createAdminSession({
    id: hashSessionToken(token),
    adminUserId: admin.id,
    expiresAt,
    ipAddress: clientKey(),
    userAgent: getRequestHeader("user-agent"),
  });
  setSessionCookie(token);

  return {
    ok: true as const,
    admin: {
      id: admin.id,
      username: admin.username,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role,
    },
  };
}

export async function getCurrentAdmin() {
  const token = readSessionToken();
  if (!token) return null;

  const session = await getAdminSession(hashSessionToken(token));
  if (!session) {
    clearSessionCookie();
    return null;
  }

  const admin = await getAdminById(session.admin_user_id);
  if (!admin || !admin.is_active) {
    await deleteAdminSession(hashSessionToken(token));
    clearSessionCookie();
    return null;
  }

  return {
    id: admin.id,
    username: admin.username,
    firstName: admin.first_name,
    lastName: admin.last_name,
    role: admin.role,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Response("Unauthorized", { status: 401 });
  return admin;
}

export async function logoutAdmin() {
  const token = readSessionToken();
  if (token) await deleteAdminSession(hashSessionToken(token));
  clearSessionCookie();
  return { ok: true as const };
}

// Imported lazily to keep the auth module's public surface small.
async function getAdminSession(id: string) {
  const { getAdminSessionById, touchAdminSession } = await import("./mysql.repository");
  const session = await getAdminSessionById(id);
  if (!session) return null;
  if (session.expires_at.getTime() <= now()) {
    await deleteAdminSession(id);
    return null;
  }
  await touchAdminSession(id);
  return session;
}

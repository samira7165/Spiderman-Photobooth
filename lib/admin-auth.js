import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "./prisma.js";

const COOKIE_NAME = "admin_session";

// =============================================================
// SESSION COOKIE
// =============================================================
// Cookie value is "<adminId>.<hmac-signature>" so we can trust the
// adminId without needing a server-side session store.
// =============================================================

function sign(value) {
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");
  return `${value}.${sig}`;
}

function unsign(token) {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const value = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(value)
    .digest("hex");

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return value;
}

export function createSessionCookieValue(adminId) {
  return sign(adminId);
}

/**
 * Returns the currently logged-in admin ({ id, email, createdAt }) or null.
 */
export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const adminId = unsign(cookieStore.get(COOKIE_NAME)?.value);
  if (!adminId) return null;

  return prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, createdAt: true },
  });
}

export async function isAdminAuthenticated() {
  return !!(await getCurrentAdmin());
}

// =============================================================
// PASSWORD HASHING
// =============================================================

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export { COOKIE_NAME };

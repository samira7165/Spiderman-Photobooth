import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  COOKIE_NAME,
  createSessionCookieValue,
  verifyPassword,
} from "@/lib/admin-auth";

// =============================================================
// POST /api/admin/login
// =============================================================
// Body: { email, password }
// Sets an httpOnly admin_session cookie on success.
// =============================================================

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const admin = await prisma.admin.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!admin || !(await verifyPassword(password, admin.password))) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, createSessionCookieValue(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return response;
}

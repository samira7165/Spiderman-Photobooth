import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/admin-auth";

// =============================================================
// POST /api/admin/logout
// =============================================================

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";

// =============================================================
// GET /api/admin/me — returns the currently logged-in admin
// =============================================================

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ admin });
}

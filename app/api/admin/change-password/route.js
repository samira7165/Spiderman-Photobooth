import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentAdmin, verifyPassword, hashPassword } from "@/lib/admin-auth";

// =============================================================
// PUT /api/admin/change-password
// =============================================================
// Body: { currentPassword, newPassword }
// Changes the logged-in admin's own password.
// =============================================================

export async function PUT(request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = await prisma.admin.findUnique({ where: { id: currentAdmin.id } });

  if (!admin || !(await verifyPassword(currentPassword, admin.password))) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  await prisma.admin.update({
    where: { id: admin.id },
    data: { password: await hashPassword(newPassword) },
  });

  return NextResponse.json({ success: true });
}

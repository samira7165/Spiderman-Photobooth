import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteFile } from "@/lib/storage";

// =============================================================
// DELETE /api/admin/photos/[id]
// =============================================================
// Deletes a PhotoRequest record and its associated files (original
// photo, generated image, QR code). File cleanup is best-effort —
// the database record is removed regardless of whether the files
// were found.
// =============================================================

export async function DELETE(request, { params }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photoRequest = await prisma.photoRequest.findUnique({ where: { id } });
  if (!photoRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  await Promise.all([
    deleteFile(photoRequest.userPhotoUrl),
    deleteFile(photoRequest.imageUrl),
    deleteFile(photoRequest.qrCodeUrl),
  ]);

  await prisma.photoRequest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

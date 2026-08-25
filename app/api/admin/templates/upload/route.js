import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { saveFile, deleteFile } from "@/lib/storage";
import { detectImageFormat } from "@/lib/image-format";

// =============================================================
// POST /api/admin/templates/upload
// =============================================================
// Body: { id, image }
// image is a data URL (from an <input type="file"> read via
// FileReader in the admin dashboard).
// Saves the file and updates the template's referenceImage.
//
// DELETE /api/admin/templates/upload
// =============================================================
// Body: { id }
// Removes the template's current reference image file and clears
// referenceImage on the record. The template won't work for guest
// generation again until a new reference image is uploaded.
// =============================================================

const IMAGE_DATA_URL = /^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/]+=*)$/i;

export async function POST(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, image } = await request.json();

  if (!id) {
    return NextResponse.json(
      { error: "Template id is required" },
      { status: 400 }
    );
  }

  const match = typeof image === "string" && image.match(IMAGE_DATA_URL);
  if (!match) {
    return NextResponse.json(
      { error: "A valid image (data URL) is required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(match[1], "base64");

  // The declared subtype in the data URL prefix is client-supplied and not
  // always accurate. Vercel Blob serves files with
  // X-Content-Type-Options: nosniff, so a stored file whose Content-Type
  // doesn't match its real bytes fails to render in browsers at all —
  // detecting the actual format here guarantees they always match.
  const format = detectImageFormat(buffer);
  if (!format) {
    return NextResponse.json(
      { error: "Uploaded file is not a valid PNG, JPEG, or WEBP image" },
      { status: 400 }
    );
  }

  const referenceImage = await saveFile(
    `template-${id}-reference.${format.ext}`,
    buffer,
    format.mimeType
  );

  const updated = await prisma.template.update({
    where: { id },
    data: { referenceImage },
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json(
      { error: "Template id is required" },
      { status: 400 }
    );
  }

  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await deleteFile(template.referenceImage);

  const updated = await prisma.template.update({
    where: { id },
    data: { referenceImage: "" },
  });

  return NextResponse.json({ template: updated });
}

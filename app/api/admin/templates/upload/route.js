import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { saveFile } from "@/lib/storage";

// =============================================================
// POST /api/admin/templates/upload
// =============================================================
// Body: { id, image }
// image is a data URL (from an <input type="file"> read via
// FileReader in the admin dashboard).
// Saves the file and updates the template's referenceImage.
// =============================================================

const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+=*)$/;

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

  const [, ext, base64Data] = match;
  const mimeExt = ext === "jpg" ? "jpeg" : ext;
  const buffer = Buffer.from(base64Data, "base64");

  const referenceImage = await saveFile(
    `template-${id}-reference.${mimeExt}`,
    buffer,
    `image/${mimeExt}`
  );

  const updated = await prisma.template.update({
    where: { id },
    data: { referenceImage },
  });

  return NextResponse.json({ template: updated });
}

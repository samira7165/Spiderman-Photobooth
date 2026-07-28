import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { withCors } from "@/lib/cors";
import { nanoid } from "nanoid";

// =============================================================
// POST /api/generate
// =============================================================
// Body: { name, phone, hall, templateId, photo | userPhoto }
// The photo field accepts either name (photo or userPhoto) and
// either format: a full data URL ("data:image/jpeg;base64,...")
// or a raw base64 string with no prefix — the image type is then
// detected from its magic bytes.
//
// hall (1-4) comes from the frontend, which reads it from its own
// URL query param (e.g. ?hall=2) — one per physical hall device.
// This lets 4 halls run simultaneously against one shared backend
// without any server-side "current hall" setting.
// Returns: { requestId, position }
//
// This endpoint is FAST — it just saves to DB and returns.
// The actual AI processing happens when /api/status is polled.
//
// Open to any origin — callable from a separate frontend/domain.
// =============================================================

// Accepts ANY declared image subtype (jpeg, jpg, png, webp, avif, heic,
// gif, pjpeg, ...) — browsers/OSes don't all agree on what to call a
// given format, so we don't want to reject a valid photo just because
// its declared MIME subtype isn't one we anticipated.
const PHOTO_DATA_URL = /^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]+=*)$/;
const BASE64_ONLY = /^[A-Za-z0-9+/]+=*$/;

function normalizeExt(subtype) {
  const s = subtype.toLowerCase();
  return s === "jpg" || s === "pjpeg" ? "jpeg" : s;
}

function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpeg", mimeType: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: "png", mimeType: "image/png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mimeType: "image/webp" };
  }
  return null;
}

/**
 * Accepts either a full data URL or a raw base64 string.
 * Returns { buffer, mimeExt, mimeType } or null if invalid.
 */
function parsePhotoInput(rawPhoto) {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;

  const dataUrlMatch = rawPhoto.match(PHOTO_DATA_URL);
  if (dataUrlMatch) {
    const [, subtype, base64Data] = dataUrlMatch;
    const mimeExt = normalizeExt(subtype);
    return {
      buffer: Buffer.from(base64Data, "base64"),
      mimeExt,
      mimeType: `image/${mimeExt}`,
    };
  }

  const cleaned = rawPhoto.replace(/\s/g, "");
  if (!BASE64_ONLY.test(cleaned)) return null;

  const buffer = Buffer.from(cleaned, "base64");
  const detected = detectImageType(buffer);
  if (!detected) return null;

  return { buffer, mimeExt: detected.ext, mimeType: detected.mimeType };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, hall, templateId } = body;
    const rawPhoto = body.photo || body.userPhoto;

    // --- Validation ---
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return withCors(
        NextResponse.json({ error: "Name is required" }, { status: 400 })
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return withCors(
        NextResponse.json({ error: "Phone number is required" }, { status: 400 })
      );
    }

    if (!hall || ![1, 2, 3, 4].includes(hall)) {
      return withCors(
        NextResponse.json({ error: "Hall must be 1, 2, 3, or 4" }, { status: 400 })
      );
    }

    if (!templateId || ![1, 2, 3, 4].includes(templateId)) {
      return withCors(
        NextResponse.json({ error: "Template must be 1, 2, 3, or 4" }, { status: 400 })
      );
    }

    const parsedPhoto = parsePhotoInput(rawPhoto);
    if (!parsedPhoto) {
      return withCors(
        NextResponse.json(
          { error: "A photo (photo or userPhoto, as a data URL or raw base64) is required" },
          { status: 400 }
        )
      );
    }

    // --- Save the guest's captured photo ---
    const userPhotoUrl = await saveFile(
      `input-${nanoid(10)}.${parsedPhoto.mimeExt}`,
      parsedPhoto.buffer,
      parsedPhoto.mimeType
    );

    // --- Create the request in DB (queued status) ---
    const photoRequest = await prisma.photoRequest.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        hall,
        templateId,
        userPhotoUrl,
        status: "queued",
      },
    });

    // --- Get queue position ---
    const queuedCount = await prisma.photoRequest.count({
      where: { status: "queued" },
    });

    const processingCount = await prisma.photoRequest.count({
      where: { status: "processing" },
    });

    return withCors(
      NextResponse.json({
        requestId: photoRequest.id,
        position: queuedCount + processingCount,
        message: "Photo request queued successfully",
      })
    );
  } catch (err) {
    console.error("[/api/generate] Error:", err);
    return withCors(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

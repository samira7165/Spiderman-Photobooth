import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { withCors } from "@/lib/cors";
import { nanoid } from "nanoid";
import { detectImageFormat } from "@/lib/image-format";

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

/**
 * Accepts either a full data URL or a raw base64 string.
 * Returns { buffer, mimeExt, mimeType } or null if invalid.
 */
function parsePhotoInput(rawPhoto) {
  if (!rawPhoto || typeof rawPhoto !== "string") return null;

  const dataUrlMatch = rawPhoto.match(PHOTO_DATA_URL);
  if (dataUrlMatch) {
    const [, subtype, base64Data] = dataUrlMatch;
    const buffer = Buffer.from(base64Data, "base64");

    // The declared subtype is client-supplied and not always accurate
    // (a mislabeled file, or a caller on another domain — this endpoint
    // is open to any origin). Vercel Blob serves files with
    // X-Content-Type-Options: nosniff, so a mismatched Content-Type makes
    // the saved photo fail to render anywhere it's displayed, rather than
    // browsers just sniffing the real format — detect it from the bytes
    // and only fall back to the declared subtype for formats (heic, avif,
    // gif, ...) this detector doesn't recognize.
    const detected = detectImageFormat(buffer);
    const mimeExt = detected ? detected.ext : normalizeExt(subtype);
    return {
      buffer,
      mimeExt,
      mimeType: detected ? detected.mimeType : `image/${mimeExt}`,
    };
  }

  const cleaned = rawPhoto.replace(/\s/g, "");
  if (!BASE64_ONLY.test(cleaned)) return null;

  const buffer = Buffer.from(cleaned, "base64");
  const detected = detectImageFormat(buffer);
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

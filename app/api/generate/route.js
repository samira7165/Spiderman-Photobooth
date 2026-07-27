import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =============================================================
// POST /api/generate
// =============================================================
// Body: { name, phone, hall, templateId }
// Returns: { requestId, position }
//
// This endpoint is FAST — it just saves to DB and returns.
// The actual AI processing happens when /api/status is polled.
// =============================================================

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, hall, templateId } = body;

    // --- Validation ---
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    if (!hall || ![1, 2, 3, 4].includes(hall)) {
      return NextResponse.json(
        { error: "Hall must be 1, 2, 3, or 4" },
        { status: 400 }
      );
    }

    if (!templateId || ![1, 2, 3, 4].includes(templateId)) {
      return NextResponse.json(
        { error: "Template must be 1, 2, 3, or 4" },
        { status: 400 }
      );
    }

    // --- Create the request in DB (queued status) ---
    const photoRequest = await prisma.photoRequest.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        hall,
        templateId,
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

    return NextResponse.json({
      requestId: photoRequest.id,
      position: queuedCount + processingCount,
      message: "Photo request queued successfully",
    });
  } catch (err) {
    console.error("[/api/generate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

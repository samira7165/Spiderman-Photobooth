import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// =============================================================
// GET /api/images/[code]
// =============================================================
// Returns the photo data for a given code (e.g., SP-A1B2C3).
// Used by the public viewer page and for verification.
// =============================================================

export async function GET(request, { params }) {
  try {
    const { code } = await params;

    const photo = await prisma.photoRequest.findUnique({
      where: { code },
      select: {
        code: true,
        name: true,
        imageUrl: true,
        qrCodeUrl: true,
        templateId: true,
        hall: true,
        createdAt: true,
        status: true,
      },
    });

    if (!photo || photo.status !== "completed") {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(photo);
  } catch (err) {
    console.error("[/api/images] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

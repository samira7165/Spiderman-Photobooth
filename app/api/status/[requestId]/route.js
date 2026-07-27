import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { tryProcessNext, getQueuePosition } from "@/lib/queue";

// =============================================================
// GET /api/status/[requestId]
// =============================================================
// Called by frontend every 3 seconds to check status.
// Also triggers queue processing if nothing is running.
//
// Returns:
//   { status: "queued", position: 3 }
//   { status: "processing", position: 0 }
//   { status: "completed", imageUrl, qrCodeUrl, code }
//   { status: "failed", error: "..." }
// =============================================================

export const maxDuration = 60; // Vercel Pro: allow up to 60s

export async function GET(request, { params }) {
  try {
    const { requestId } = await params;

    // Fetch the request
    const photoRequest = await prisma.photoRequest.findUnique({
      where: { id: requestId },
    });

    if (!photoRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    // If completed, return the result
    if (photoRequest.status === "completed") {
      return NextResponse.json({
        status: "completed",
        code: photoRequest.code,
        imageUrl: photoRequest.imageUrl,
        qrCodeUrl: photoRequest.qrCodeUrl,
      });
    }

    // If failed, return error
    if (photoRequest.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: photoRequest.errorMsg || "Image generation failed",
      });
    }

    // If queued or processing, try to kick off processing
    // This is non-blocking — it fires and we return status immediately
    tryProcessNext().catch((err) =>
      console.error("[Status] Queue process error:", err)
    );

    // Get queue position
    const queueInfo = await getQueuePosition(requestId);

    return NextResponse.json({
      status: photoRequest.status,
      position: queueInfo?.position || 0,
    });
  } catch (err) {
    console.error("[/api/status] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

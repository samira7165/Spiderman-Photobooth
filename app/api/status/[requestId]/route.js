import { NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { tryProcessNext, getQueuePosition } from "@/lib/queue";
import { withCors } from "@/lib/cors";

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
//
// Open to any origin — callable from a separate frontend/domain.
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
      return withCors(
        NextResponse.json({ error: "Request not found" }, { status: 404 })
      );
    }

    // If completed, return the result
    if (photoRequest.status === "completed") {
      return withCors(
        NextResponse.json({
          status: "completed",
          code: photoRequest.code,
          imageUrl: photoRequest.imageUrl,
          qrCodeUrl: photoRequest.qrCodeUrl,
        })
      );
    }

    // If failed, return error
    if (photoRequest.status === "failed") {
      return withCors(
        NextResponse.json({
          status: "failed",
          error: photoRequest.errorMsg || "Image generation failed",
        })
      );
    }

    // If queued or processing, try to kick off processing. This must not
    // block the response, but a bare unawaited call here isn't safe on
    // Vercel — a serverless invocation can be frozen the moment the
    // response is sent, silently killing the AI call mid-flight and
    // leaving the job stuck in "processing" forever (which then blocks
    // the whole queue, since MAX_CONCURRENT sees it as still running).
    // after() extends the invocation's lifetime via Vercel's waitUntil so
    // this actually finishes, while still returning the response now.
    after(() =>
      tryProcessNext().catch((err) =>
        console.error("[Status] Queue process error:", err)
      )
    );

    // Get queue position
    const queueInfo = await getQueuePosition(requestId);

    return withCors(
      NextResponse.json({
        status: photoRequest.status,
        position: queueInfo?.position || 0,
      })
    );
  } catch (err) {
    console.error("[/api/status] Error:", err);
    return withCors(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { tryProcessNext } from "@/lib/queue";

// =============================================================
// POST /api/admin/photos/[id]/regenerate
// =============================================================
// Re-queues a failed PhotoRequest so the normal queue processor
// picks it up again. createdAt is bumped to now so it joins the
// back of the queue rather than jumping ahead of genuinely new
// submissions. Kicks the processor immediately (fire-and-forget)
// in case nothing else is currently polling it along.
// =============================================================

export async function POST(request, { params }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const photoRequest = await prisma.photoRequest.findUnique({ where: { id } });
  if (!photoRequest) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (photoRequest.status !== "failed") {
    return NextResponse.json(
      { error: "Only failed requests can be regenerated" },
      { status: 400 }
    );
  }

  await prisma.photoRequest.update({
    where: { id },
    data: {
      status: "queued",
      errorMsg: null,
      createdAt: new Date(),
    },
  });

  tryProcessNext().catch((err) =>
    console.error("[Regenerate] Queue process error:", err)
  );

  return NextResponse.json({ success: true });
}

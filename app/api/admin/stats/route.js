import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// =============================================================
// GET /api/admin/stats
// =============================================================
// Protected. Returns aggregate stats for the admin dashboard.
// =============================================================

const HALLS = [1, 2, 3, 4];
const TEMPLATE_IDS = [1, 2, 3, 4];

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, completed, processing, queued, failed] = await Promise.all([
    prisma.photoRequest.count(),
    prisma.photoRequest.count({ where: { status: "completed" } }),
    prisma.photoRequest.count({ where: { status: "processing" } }),
    prisma.photoRequest.count({ where: { status: "queued" } }),
    prisma.photoRequest.count({ where: { status: "failed" } }),
  ]);

  const byHall = await Promise.all(
    HALLS.map(async (hall) => {
      const [hallTotal, hallCompleted] = await Promise.all([
        prisma.photoRequest.count({ where: { hall } }),
        prisma.photoRequest.count({ where: { hall, status: "completed" } }),
      ]);
      return { hall, total: hallTotal, completed: hallCompleted };
    })
  );

  const byTemplate = await Promise.all(
    TEMPLATE_IDS.map(async (templateId) => {
      const [templateTotal, templateCompleted] = await Promise.all([
        prisma.photoRequest.count({ where: { templateId } }),
        prisma.photoRequest.count({
          where: { templateId, status: "completed" },
        }),
      ]);
      return { templateId, total: templateTotal, completed: templateCompleted };
    })
  );

  const recentPhotos = await prisma.photoRequest.findMany({
    where: { status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      name: true,
      phone: true,
      hall: true,
      templateId: true,
      code: true,
      userPhotoUrl: true,
      imageUrl: true,
      qrCodeUrl: true,
      usedApi: true,
      createdAt: true,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const recentPhotosWithUrl = recentPhotos.map((photo) => ({
    ...photo,
    viewerUrl: `${baseUrl}/view/${photo.code}`,
  }));

  const queuedItems = await prisma.photoRequest.findMany({
    where: { status: { in: ["queued", "processing"] } },
    orderBy: { createdAt: "asc" },
  });

  const templates = await prisma.template.findMany({
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
  const templateNames = templates.map((t) => ({ id: t.id, name: t.name }));

  return NextResponse.json({
    total,
    completed,
    processing,
    queued,
    failed,
    byHall,
    byTemplate,
    recentPhotos: recentPhotosWithUrl,
    queuedItems,
    templateNames,
  });
}

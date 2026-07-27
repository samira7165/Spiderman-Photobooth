import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { seedTemplates } from "@/lib/seed-templates";

// =============================================================
// GET /api/admin/templates — full template data (auth required)
// PUT /api/admin/templates — edit a template (auth required)
// =============================================================

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await seedTemplates();

  const templates = await prisma.template.findMany({
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ templates });
}

export async function PUT(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, prompt, referenceImage } = await request.json();

  if (!id || !name || !prompt || !referenceImage) {
    return NextResponse.json(
      { error: "id, name, prompt, and referenceImage are all required" },
      { status: 400 }
    );
  }

  const updated = await prisma.template.update({
    where: { id },
    data: { name, prompt, referenceImage },
  });

  return NextResponse.json({ template: updated });
}

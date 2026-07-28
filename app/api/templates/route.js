import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/templates";
import { seedTemplates } from "@/lib/seed-templates";
import { withCors } from "@/lib/cors";

// =============================================================
// GET /api/templates
// =============================================================
// Returns list of available templates for the frontend to display.
// Open to any origin — callable from a separate frontend/domain.
// =============================================================

export async function GET() {
  await seedTemplates();

  const templates = await getAllTemplates();

  // Only send what the frontend needs (not the AI prompt)
  const publicTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    referenceImage: t.referenceImage,
  }));

  return withCors(NextResponse.json(publicTemplates));
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

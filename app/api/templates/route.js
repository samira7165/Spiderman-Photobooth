import { NextResponse } from "next/server";
import { getAllTemplates } from "@/lib/templates";
import { seedTemplates } from "@/lib/seed-templates";

// =============================================================
// GET /api/templates
// =============================================================
// Returns list of available templates for the frontend to display.
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

  return NextResponse.json(publicTemplates);
}

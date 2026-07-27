import prisma from "./prisma.js";

// =============================================================
// TEMPLATE CONFIGURATION
// =============================================================
// Templates now live in the database (Template model) and are
// editable from the admin dashboard. See lib/seed-templates.js
// for the defaults used to populate an empty table.
// =============================================================

export async function getTemplate(id) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) throw new Error("Template " + id + " not found");
  return template;
}

export async function getAllTemplates() {
  return prisma.template.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
  });
}

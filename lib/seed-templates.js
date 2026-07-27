import prisma from "./prisma.js";

// =============================================================
// DEFAULT TEMPLATES
// =============================================================
// Seeded once into the Template table if it's empty. After that,
// templates are edited from the admin dashboard, not this file.
// =============================================================

const DEFAULT_TEMPLATES = [
  {
    id: 1,
    name: "Classic Spiderman",
    prompt:
      "Using the provided photo of the person, transform them into wearing a classic red and blue Spiderman suit. They should be in a dynamic pose on top of a New York City skyscraper at sunset. Keep the person's face and features recognizable. Use the reference image as a style guide for the suit and pose. Cinematic lighting, highly detailed, photorealistic.",
    referenceImage: "/references/template-1.jpg",
  },
  {
    id: 2,
    name: "Miles Morales",
    prompt:
      "Using the provided photo of the person, transform them into wearing the Miles Morales Spider-Verse suit (black with red accents). Graffiti art background with neon colors. Keep the person's face and features recognizable. Use the reference image as a style guide. Comic book style with halftone dots, dynamic web-slinging pose.",
    referenceImage: "/references/template-2.jpg",
  },
  {
    id: 3,
    name: "Iron Spider",
    prompt:
      "Using the provided photo of the person, transform them into wearing the Iron Spider suit with mechanical spider arms extended. Futuristic lab background. Keep the person's face and features recognizable. Use the reference image as a style guide. Metallic red and gold suit, dramatic lighting, photorealistic.",
    referenceImage: "/references/template-3.jpg",
  },
  {
    id: 4,
    name: "Symbiote Spiderman",
    prompt:
      "Using the provided photo of the person, transform them into wearing the black symbiote Spiderman suit. Dark moody cityscape at night with rain reflections. Keep the person's face and features recognizable. Use the reference image as a style guide. Dramatic noir lighting, cinematic composition.",
    referenceImage: "/references/template-4.jpg",
  },
];

/**
 * Ensures the default templates exist. Safe to call on every
 * request — it's a no-op once templates already exist.
 */
export async function seedTemplates() {
  const count = await prisma.template.count();
  if (count > 0) return;

  for (const template of DEFAULT_TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }
}

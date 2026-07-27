import { put } from "@vercel/blob";

// =============================================================
// STORAGE
// =============================================================
// Local dev: writes to /public/generated and returns a local URL.
// Production (Vercel): uploads to Vercel Blob and returns its public URL.
// Switches based on BLOB_READ_WRITE_TOKEN so it works the same way
// whether running on Vercel or pulling the token into a local .env.
// =============================================================

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Save a file (image, QR code, etc.) and return its public URL.
 * @param {string} filename - e.g. "SP-A1B2C3.png"
 * @param {Buffer} buffer
 * @param {string} contentType - e.g. "image/png"
 * @returns {Promise<string>} public URL
 */
export async function saveFile(filename, buffer, contentType = "image/png") {
  if (useBlob) {
    const blob = await put(`generated/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const fs = await import("fs/promises");
  const path = await import("path");

  const outputDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, filename), buffer);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  return `${baseUrl}/generated/${filename}`;
}

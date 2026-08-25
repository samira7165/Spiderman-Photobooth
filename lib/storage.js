import { put, del } from "@vercel/blob";

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
    // addRandomSuffix: false gives every save of the same filename
    // (e.g. a template's reference image) a stable, predictable key —
    // which means the second upload to that same key fails outright
    // unless allowOverwrite is set; Vercel Blob otherwise refuses to
    // replace an existing blob.
    const blob = await put(`generated/${filename}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
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

/**
 * Delete a previously-saved file by its public URL. Best-effort —
 * failures are logged but not thrown, so a missing/already-gone
 * file never blocks deleting the database record that pointed to it.
 * @param {string} url
 */
export async function deleteFile(url) {
  if (!url) return;

  try {
    if (useBlob) {
      await del(url);
      return;
    }

    const fs = await import("fs/promises");
    const path = await import("path");

    const filename = url.split("/generated/")[1];
    if (!filename) return;

    await fs.unlink(path.join(process.cwd(), "public", "generated", filename));
  } catch (err) {
    console.warn("[Storage] Could not delete file:", url, err.message);
  }
}

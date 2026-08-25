// =============================================================
// IMAGE FORMAT DETECTION
// =============================================================
// Detects an image's real format from its magic bytes rather than
// trusting a client-declared MIME type. Vercel Blob serves files with
// X-Content-Type-Options: nosniff, so a stored file whose Content-Type
// doesn't match its actual bytes fails to decode in browsers entirely —
// nosniff means they won't fall back to guessing the real format, they
// just refuse to render it.
// =============================================================

/**
 * @param {Buffer} buffer
 * @returns {{ ext: string, mimeType: string } | null}
 */
export function detectImageFormat(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpeg", mimeType: "image/jpeg" };
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { ext: "png", mimeType: "image/png" };
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { ext: "webp", mimeType: "image/webp" };
  }
  return null;
}

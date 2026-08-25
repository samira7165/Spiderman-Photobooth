"use client";

// =============================================================
// CLIENT-SIDE IMAGE RESIZE
// =============================================================
// Vercel Serverless Functions hard-cap request bodies at 4.5MB, and every
// upload in this app sends the photo as a base64 data URL inside a JSON
// body (base64 inflates size by ~33%). An unresized phone photo (commonly
// 3-8MB) blows past that limit and gets rejected with a 413
// FUNCTION_PAYLOAD_TOO_LARGE before any of our own code runs. Downscaling
// client-side before encoding keeps every upload well under that ceiling.
// =============================================================

/**
 * Reads an image File, downscales it to fit within maxDimension on its
 * longest side (if larger), and returns a JPEG data URL.
 * @param {File} file
 * @param {number} maxDimension
 * @param {number} quality - 0..1
 * @returns {Promise<string>}
 */
export function resizeImageToDataUrl(file, maxDimension = 2000, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file"));
    };

    img.src = objectUrl;
  });
}

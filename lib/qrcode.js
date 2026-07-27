import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL (base64 PNG).
 * @param {string} url - The URL to encode
 * @returns {Promise<string>} Data URL string
 */
export async function generateQRCode(url) {
  return QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "M",
  });
}

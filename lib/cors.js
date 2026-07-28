// =============================================================
// CORS
// =============================================================
// These three endpoints (/api/templates, /api/generate,
// /api/status/[requestId]) are meant to be called from any
// frontend, including ones hosted on a different domain — so
// they're open to all origins. There is no API key check, so
// don't put anything sensitive behind them.
// =============================================================

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function withCors(response) {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

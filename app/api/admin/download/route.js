import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// =============================================================
// GET /api/admin/download?url=...&filename=...
// =============================================================
// Proxies an image through the server with a Content-Disposition
// header so it actually downloads instead of just opening in the
// browser — necessary once images live on Vercel Blob (a
// different origin), where the <a download> attribute is ignored
// for cross-origin links.
// =============================================================

export async function GET(request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const filename = searchParams.get("filename") || "photo.jpg";

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Invalid url protocol" }, { status: 400 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get("content-type") || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

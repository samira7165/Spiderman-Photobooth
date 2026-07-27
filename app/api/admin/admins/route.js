import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentAdmin, hashPassword } from "@/lib/admin-auth";

// =============================================================
// GET /api/admin/admins — list all admins (auth required)
// POST /api/admin/admins — add a new admin (auth required)
// =============================================================
// There is no public signup route. The only way to create an
// admin account is from here, while already logged in as one.
// =============================================================

export async function GET() {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admins = await prisma.admin.findMany({
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ admins });
}

export async function POST(request) {
  const currentAdmin = await getCurrentAdmin();
  if (!currentAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, password } = await request.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "A valid email is required" },
      { status: 400 }
    );
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An admin with this email already exists" },
      { status: 409 }
    );
  }

  const newAdmin = await prisma.admin.create({
    data: {
      email: normalizedEmail,
      password: await hashPassword(password),
    },
    select: { id: true, email: true, createdAt: true },
  });

  return NextResponse.json({ admin: newAdmin });
}

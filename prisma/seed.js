// =============================================================
// BOOTSTRAP SEED — creates the first admin account
// =============================================================
// There is no public signup route by design. This script is the
// only way to create the very first admin; every admin after
// that is added from inside the dashboard (Admins section) by
// someone already logged in.
//
// Run with: node prisma/seed.js
// Reads ADMIN_EMAIL / ADMIN_BOOTSTRAP_PASSWORD from .env.
// =============================================================

process.loadEnvFile(); // reads .env (Node 20.6+)
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!email || !password) {
    console.log(
      "Set ADMIN_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env, then re-run this script."
    );
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.admin.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    console.log(`Admin ${normalizedEmail} already exists — skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.create({
    data: { email: normalizedEmail, password: passwordHash },
  });

  console.log(`Created first admin: ${normalizedEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

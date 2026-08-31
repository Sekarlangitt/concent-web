/**
 * Admin provisioning seed (STEP 9).
 *
 * Creates or safely updates the initial admin account from environment
 * variables:
 *
 *   ADMIN_EMAIL     — the admin email (trimmed + lowercased before storage)
 *   ADMIN_PASSWORD  — the admin password, bcrypt-hashed before storage
 *
 * Run with:
 *
 *   npm run db:seed
 *
 * The script is idempotent: re-running it with the same ADMIN_EMAIL never
 * creates a duplicate admin (upsert). If ADMIN_PASSWORD changed in the
 * environment, the stored password hash is updated to match — convenient for
 * manual password rotation.
 *
 * The database stores ONLY the bcrypt password hash. Plaintext passwords are
 * never written to the database, logs, or output. ADMIN_EMAIL / ADMIN_PASSWORD
 * come from the environment (see .env.example) and are never hardcoded here.
 *
 * No fake students are seeded — this seed provisions admins only.
 */

import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { BCRYPT_SALT_ROUNDS } from "../lib/auth/config";
import { normalizeEmail } from "../lib/auth/normalize-email";
import { PrismaClient } from "../lib/generated/prisma/client";

async function main(): Promise<void> {
  const rawEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!rawEmail) {
    throw new Error(
      "ADMIN_EMAIL is not set. Add it to .env (see .env.example).",
    );
  }
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is not set. Add it to .env (see .env.example).",
    );
  }

  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new Error("ADMIN_EMAIL must be a non-empty email address.");
  }

  if (password.length < 12) {
    console.warn(
      "[seed] WARNING: ADMIN_PASSWORD is shorter than 12 characters. " +
        "Use a long, unique password for the admin account.",
    );
  }

  const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase connection string to .env " +
        "(see .env.example).",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const admin = await prisma.admin.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
      select: { id: true, email: true, createdAt: true, updatedAt: true },
    });

    console.log(`[seed] Admin ready: ${admin.email}`);
    console.log(
      `[seed] Password hashed with bcrypt (cost ${BCRYPT_SALT_ROUNDS}) and ` +
        "stored as passwordHash. The plaintext password was not stored.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed] Failed to provision the admin account:", error);
  process.exit(1);
});

/**
 * Full database seed (admin provisioning + initial questionnaires).
 *
 * Two idempotent, non-destructive parts:
 *
 *  1. Admin provisioning (below): creates or safely updates the initial admin
 *     account from environment variables.
 *  2. Questionnaire seeding (prisma/seed-questionnaires.ts): creates Version 1
 *     (PUBLISHED) of each major's questionnaire from the freshman-friendly
 *     question bank — unless a published version already exists (admin content
 *     is never silently overwritten).
 *
 * Run with:
 *
 *   npm run db:seed
 *
 * Individual parts can be run separately:
 *   npx tsx prisma/seed-questionnaires.ts   (questionnaire seed only)
 *   npx tsx prisma/backfill-snapshots.ts    (legacy backfill, run once)
 *
 * The database stores ONLY the bcrypt password hash. Plaintext passwords are
 * never written to the database, logs, or output. ADMIN_EMAIL / ADMIN_PASSWORD
 * come from the environment (see .env.example) and are never hardcoded here.
 *
 * No fake students are seeded — this seed provisions admins and questionnaires.
 */

import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

import { BCRYPT_SALT_ROUNDS } from "../lib/auth/config";
import { normalizeEmail } from "../lib/auth/normalize-email";
import { normalizeUsername } from "../lib/auth/normalize-username";
import { PrismaClient } from "../lib/generated/prisma/client";

async function provisionAdmin(): Promise<void> {
  const rawUsername = process.env.ADMIN_USERNAME;
  const rawEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!rawUsername && !rawEmail) {
    throw new Error(
      "ADMIN_USERNAME or ADMIN_EMAIL is not set. Add it to .env (see .env.example).",
    );
  }
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD is not set. Add it to .env (see .env.example).",
    );
  }

  // Login is username-based. The username defaults to the local part of the
  // email for backwards compatibility with the email-only provisioning flow.
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  let username = rawUsername ? normalizeUsername(rawUsername) : null;
  if (!username && email) {
    username = email.split("@")[0] || null;
  }
  if (!username) {
    throw new Error(
      "ADMIN_USERNAME must be a non-empty username (or ADMIN_EMAIL must be set so a username can be derived).",
    );
  }
  const resolvedEmail =
    email ?? normalizeEmail(`${username}@president.ac.id`) ?? "";

  if (password.length < 12) {
    console.warn(
      "[seed] WARNING: ADMIN_PASSWORD is shorter than 12 characters. " +
        "Use a long, unique password for the admin account.",
    );
  }

  // Use DIRECT_URL (session-mode pooler) for interactive transactions — the
  // transaction-mode pooler (DATABASE_URL) does not support them.
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DIRECT_URL is not set. Add your Supabase connection string to .env " +
        "(see .env.example).",
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existingByUsername = await prisma.admin.findFirst({
      where: { username },
      select: { id: true },
    });

    let admin;
    if (existingByUsername) {
      admin = await prisma.admin.update({
        where: { id: existingByUsername.id },
        data: { passwordHash, email: resolvedEmail, username },
        select: { id: true, username: true, email: true, updatedAt: true },
      });
    } else {
      const existingByEmail = await prisma.admin.findFirst({
        where: { email: resolvedEmail },
        select: { id: true },
      });
      admin = existingByEmail
        ? await prisma.admin.update({
            where: { id: existingByEmail.id },
            data: { passwordHash, username },
            select: { id: true, username: true, email: true, updatedAt: true },
          })
        : await prisma.admin.create({
            data: { username, email: resolvedEmail, passwordHash },
            select: { id: true, username: true, email: true, createdAt: true, updatedAt: true },
          });
    }

    console.log(`[seed] Admin ready: ${admin.username} (${admin.email})`);
    console.log(
      `[seed] Password hashed with bcrypt (cost ${BCRYPT_SALT_ROUNDS}) and ` +
        "stored as passwordHash. The plaintext password was not stored.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  // Part 1: admin provisioning.
  await provisionAdmin();

  // Part 2: initial questionnaires (idempotent, never overwrites existing
  // published versions).
  await import("./seed-questionnaires");
}

main().catch((error) => {
  console.error("[seed] Failed to provision:", error);
  process.exit(1);
});


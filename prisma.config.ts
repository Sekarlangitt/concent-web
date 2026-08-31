import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Connection URL used by the Prisma CLI for database commands
 * (migrate, db push, db execute, studio, introspection).
 *
 * CLI commands connect through the Supabase session-mode pooler (DIRECT_URL,
 * port 5432) because the transaction-mode pooler (DATABASE_URL, port 6543,
 * ?pgbouncer=true) does not support everything Prisma Migrate requires
 * (e.g. advisory locks and shadow-database setup).
 *
 * The URL is intentionally empty when DIRECT_URL is unset: non-database
 * commands such as `prisma generate` and `prisma validate` work fine without
 * it, and database commands fail with a clear error until the connection
 * string has been added to `.env`.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma runs this command for `prisma db seed` (STEP 9 admin provisioning).
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { admin: { findUnique } },
}));

import { verifyAdminCredentials } from "@/lib/auth/credentials";

/**
 * Credential verification tests (STEP 9, requirements 55 items 1–4):
 * correct password succeeds, wrong password fails, unknown email fails, and
 * the email is normalized before the database lookup.
 *
 * The Prisma client is mocked; bcrypt hashing/comparison is real.
 */

const EMAIL = "admin@president.ac.id";

describe("verifyAdminCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("succeeds with the correct password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      email: EMAIL,
      passwordHash,
    });

    const result = await verifyAdminCredentials(EMAIL, "correct-password");
    expect(result).toEqual({ id: "cm_123", email: EMAIL });
  });

  it("fails with the wrong password (same generic null)", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      email: EMAIL,
      passwordHash,
    });

    expect(await verifyAdminCredentials(EMAIL, "wrong-password")).toBeNull();
  });

  it("fails for an unknown email (same generic null)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await verifyAdminCredentials(EMAIL, "correct-password")).toBeNull();
  });

  it("normalizes the email before querying the database", async () => {
    findUnique.mockResolvedValue(null);
    await verifyAdminCredentials("  Admin@President.AC.ID  ", "whatever");

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique.mock.calls[0][0]).toEqual({
      where: { email: EMAIL },
      select: { id: true, email: true, passwordHash: true },
    });
  });

  it("queries with the same normalized email for an existing mixed-case admin", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      email: EMAIL,
      passwordHash,
    });

    // Admin seeded as Admin@University.edu logs in as admin@university.edu.
    const result = await verifyAdminCredentials("  Admin@President.AC.ID  ", "correct-password");
    expect(result).toEqual({ id: "cm_123", email: EMAIL });
  });

  it("returns null immediately for an empty normalized email", async () => {
    expect(await verifyAdminCredentials("   ", "whatever")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("never returns the passwordHash to the caller", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      email: EMAIL,
      passwordHash,
    });

    const result = await verifyAdminCredentials(EMAIL, "correct-password");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

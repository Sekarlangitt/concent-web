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
 * Credential verification tests (username-based login): correct password
 * succeeds, wrong password fails, unknown username fails, and the username is
 * normalized before the database lookup.
 *
 * The Prisma client is mocked; bcrypt hashing/comparison is real.
 */

const USERNAME = "admin";
const EMAIL = "admin@president.ac.id";

describe("verifyAdminCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("succeeds with the correct password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    });

    const result = await verifyAdminCredentials(USERNAME, "correct-password");
    expect(result).toEqual({ id: "cm_123", username: USERNAME, email: EMAIL });
  });

  it("fails with the wrong password (same generic null)", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    });

    expect(await verifyAdminCredentials(USERNAME, "wrong-password")).toBeNull();
  });

  it("fails for an unknown username (same generic null)", async () => {
    findUnique.mockResolvedValue(null);
    expect(await verifyAdminCredentials(USERNAME, "correct-password")).toBeNull();
  });

  it("normalizes the username before querying the database", async () => {
    findUnique.mockResolvedValue(null);
    await verifyAdminCredentials("  Admin  ", "whatever");

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(findUnique.mock.calls[0][0]).toEqual({
      where: { username: USERNAME },
      select: { id: true, username: true, email: true, passwordHash: true },
    });
  });

  it("queries with the same normalized username for a mixed-case admin", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    });

    // Admin seeded as "Admin" logs in as "admin".
    const result = await verifyAdminCredentials("  Admin  ", "correct-password");
    expect(result).toEqual({ id: "cm_123", username: USERNAME, email: EMAIL });
  });

  it("returns null immediately for an empty normalized username", async () => {
    expect(await verifyAdminCredentials("   ", "whatever")).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("never returns the passwordHash to the caller", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "cm_123",
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    });

    const result = await verifyAdminCredentials(USERNAME, "correct-password");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

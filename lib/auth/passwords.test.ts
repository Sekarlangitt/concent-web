import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

/**
 * Password hashing tests (STEP 9, requirements 55 items 1–2 and 47).
 * Uses a reduced bcrypt cost only to keep the test suite fast; the production
 * cost stays at BCRYPT_SALT_ROUNDS (12) via the default parameter.
 */

const HASH_PREFIX = /^\$2[abxy]\$/;

describe("hashPassword / verifyPassword", () => {
  it("hashes a password into a bcrypt hash (never plaintext)", async () => {
    const hash = await hashPassword("a-strong-admin-password", 4);

    expect(hash).toMatch(HASH_PREFIX);
    expect(hash).not.toContain("a-strong-admin-password");
    expect(hash.length).toBeGreaterThan(50);
  });

  it("uses the default production cost of 12 when no cost is given", async () => {
    const hash = await hashPassword("a-strong-admin-password");
    // bcrypt hashes embed the cost factor after the `$2b$` prefix.
    expect(hash.startsWith("$2b$12$")).toBe(true);
  });

  it("the correct password succeeds against its own hash", async () => {
    const hash = await hashPassword("correct-password", 4);
    expect(await verifyPassword("correct-password", hash)).toBe(true);
  });

  it("a wrong password fails against a hash", async () => {
    const hash = await hashPassword("correct-password", 4);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("two hashes of the same password differ (salting)", async () => {
    const hashA = await hashPassword("same-password", 4);
    const hashB = await hashPassword("same-password", 4);
    expect(hashA).not.toBe(hashB);
  });

  it("an empty/malformed stored hash fails without throwing", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "not-a-bcrypt-hash")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { normalizeEmail } from "@/lib/auth/normalize-email";

/**
 * Email normalization tests (STEP 9, requirements 14 and 75):
 * seeding, login, and database lookups all use the same normalization.
 */

describe("normalizeEmail", () => {
  it("lowercases an email", () => {
    expect(normalizeEmail("Admin@University.edu")).toBe("admin@university.edu");
    expect(normalizeEmail("ADMIN@PRESIDENT.AC.ID")).toBe("admin@president.ac.id");
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeEmail("  admin@president.ac.id  ")).toBe(
      "admin@president.ac.id",
    );
    expect(normalizeEmail("\tAdmin@University.edu\n")).toBe(
      "admin@university.edu",
    );
  });

  it("combines trimming and lowercasing", () => {
    expect(normalizeEmail("  Admin@University.Edu  ")).toBe(
      "admin@university.edu",
    );
  });

  it("leaves an already-normalized email unchanged", () => {
    expect(normalizeEmail("admin@president.ac.id")).toBe("admin@president.ac.id");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail("\t\n")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { normalizeUsername } from "@/lib/auth/normalize-username";

describe("normalizeUsername", () => {
  it("trims and lowercases a username", () => {
    expect(normalizeUsername("  Admin  ")).toBe("admin");
    expect(normalizeUsername("Admin")).toBe("admin");
    expect(normalizeUsername("admin")).toBe("admin");
  });

  it("preserves dots, underscores, and hyphens", () => {
    expect(normalizeUsername("concentration.admin")).toBe("concentration.admin");
    expect(normalizeUsername("Admin_1")).toBe("admin_1");
    expect(normalizeUsername("admin-user")).toBe("admin-user");
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername("   ")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(normalizeUsername(null as unknown as string)).toBeNull();
    expect(normalizeUsername(undefined as unknown as string)).toBeNull();
    expect(normalizeUsername(42 as unknown as string)).toBeNull();
  });
});

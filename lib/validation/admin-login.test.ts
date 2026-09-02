import { describe, expect, it } from "vitest";

import { adminLoginSchema } from "@/lib/validation/admin-login";

/**
 * Login form validation tests: username required + normalized, password
 * required — all enforced server-side.
 */

describe("adminLoginSchema", () => {
  it("accepts valid input and normalizes the username", () => {
    const result = adminLoginSchema.safeParse({
      username: "  Admin  ",
      password: "a-strong-password",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("admin");
      expect(result.data.password).toBe("a-strong-password");
    }
  });

  it("rejects a missing username", () => {
    const result = adminLoginSchema.safeParse({
      username: "",
      password: "a-strong-password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a username with disallowed characters", () => {
    const result = adminLoginSchema.safeParse({
      username: "admin name!",
      password: "a-strong-password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a username longer than 50 characters", () => {
    const result = adminLoginSchema.safeParse({
      username: "a".repeat(51),
      password: "a-strong-password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = adminLoginSchema.safeParse({
      username: "admin",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string inputs", () => {
    const result = adminLoginSchema.safeParse({
      username: 123,
      password: null,
    });
    expect(result.success).toBe(false);
  });
});

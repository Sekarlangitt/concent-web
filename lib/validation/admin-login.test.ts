import { describe, expect, it } from "vitest";

import { adminLoginSchema } from "@/lib/validation/admin-login";

/**
 * Login form validation tests (STEP 9, requirement 12): email required +
 * valid format + normalized, password required — all enforced server-side.
 */

describe("adminLoginSchema", () => {
  it("accepts valid input and normalizes the email", () => {
    const result = adminLoginSchema.safeParse({
      email: "  Admin@University.edu  ",
      password: "a-strong-password",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("admin@university.edu");
      expect(result.data.password).toBe("a-strong-password");
    }
  });

  it("rejects a missing email", () => {
    const result = adminLoginSchema.safeParse({
      email: "",
      password: "a-strong-password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an email that is not a valid format", () => {
    const result = adminLoginSchema.safeParse({
      email: "not-an-email",
      password: "a-strong-password",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing password", () => {
    const result = adminLoginSchema.safeParse({
      email: "admin@president.ac.id",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-string inputs", () => {
    const result = adminLoginSchema.safeParse({
      email: 123,
      password: null,
    });
    expect(result.success).toBe(false);
  });
});

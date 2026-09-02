import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createAdminSession = vi.fn();
  const verifyAdminCredentials = vi.fn();
  const isLoginRateLimited = vi.fn();
  const recordLoginFailure = vi.fn();
  const clearLoginRateLimit = vi.fn();
  const redirect = vi.fn();
  return {
    createAdminSession,
    verifyAdminCredentials,
    isLoginRateLimited,
    recordLoginFailure,
    clearLoginRateLimit,
    redirect,
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({
  createAdminSession: mocks.createAdminSession,
}));
vi.mock("@/lib/auth/credentials", () => ({
  verifyAdminCredentials: mocks.verifyAdminCredentials,
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  isLoginRateLimited: mocks.isLoginRateLimited,
  recordLoginFailure: mocks.recordLoginFailure,
  clearLoginRateLimit: mocks.clearLoginRateLimit,
}));

import { loginAdmin } from "@/app/admin/login/actions";

/**
 * Login server action tests: the form reads the `username` + `password`
 * fields, successful authentication creates the session and redirects, and
 * failures return generic messages without leaking whether the username or
 * password was wrong.
 */

function formData(username: string, password: string): FormData {
  const data = new FormData();
  data.set("username", username);
  data.set("password", password);
  return data;
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.isLoginRateLimited.mockReturnValue(false);
});

describe("loginAdmin (username-based)", () => {
  it("creates the admin session and redirects on success", async () => {
    mocks.verifyAdminCredentials.mockResolvedValue({
      id: "cm_1",
      username: "admin",
      email: "admin@president.ac.id",
    });

    await loginAdmin({ status: "idle" }, formData("admin", "Admin123!"));

    expect(mocks.verifyAdminCredentials).toHaveBeenCalledWith(
      "admin",
      "Admin123!",
    );
    expect(mocks.createAdminSession).toHaveBeenCalledWith({
      id: "cm_1",
      username: "admin",
      email: "admin@president.ac.id",
    });
    expect(mocks.clearLoginRateLimit).toHaveBeenCalledWith("admin");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("normalizes the username before verifying credentials", async () => {
    mocks.verifyAdminCredentials.mockResolvedValue(null);

    await loginAdmin({ status: "idle" }, formData("  Admin  ", "x"));

    expect(mocks.verifyAdminCredentials).toHaveBeenCalledWith("admin", "x");
    expect(mocks.recordLoginFailure).toHaveBeenCalledWith("admin");
  });

  it("returns a generic message for invalid credentials", async () => {
    mocks.verifyAdminCredentials.mockResolvedValue(null);

    const result = await loginAdmin(
      { status: "idle" },
      formData("admin", "wrong"),
    );
    expect(result).toEqual({
      status: "error",
      message: "Invalid username or password.",
    });
    expect(mocks.createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects a missing username via Zod before any lookup", async () => {
    const result = await loginAdmin(
      { status: "idle" },
      formData("", "anything"),
    );
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.username?.[0]).toContain("Username");
    expect(mocks.verifyAdminCredentials).not.toHaveBeenCalled();
  });

  it("honors the rate limiter", async () => {
    mocks.isLoginRateLimited.mockReturnValue(true);

    const result = await loginAdmin(
      { status: "idle" },
      formData("admin", "x"),
    );
    expect(result.status).toBe("error");
    expect(String(result.message)).toContain("Too many sign-in attempts");
    expect(mocks.verifyAdminCredentials).not.toHaveBeenCalled();
  });
});

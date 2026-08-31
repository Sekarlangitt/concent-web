import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet, cookieSet, cookieDelete } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: cookieGet,
    set: cookieSet,
    delete: cookieDelete,
  }),
}));

import {
  createAdminSession,
  destroyAdminSession,
  getAdminSession,
} from "@/lib/auth/session";
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_DURATION_SECONDS,
} from "@/lib/auth/config";
import { signSessionToken } from "@/lib/auth/session-token";

/**
 * Session cookie-layer tests (STEP 9, requirements 55 items 5–8 and 16):
 * missing / valid / tampered / expired sessions, plus cookie attributes.
 * The next/headers cookies() store is mocked; token signing is real (jose).
 */

const SECRET = "unit-test-secret-0123456789-abcdefghijklmnop";
const ADMIN = { adminId: "cm_123", email: "admin@president.ac.id" };

describe("admin session cookie", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    cookieSet.mockReset();
    cookieDelete.mockReset();
    process.env.AUTH_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.AUTH_SECRET;
  });

  it("returns null when the session cookie is absent", async () => {
    cookieGet.mockReturnValue(undefined);
    expect(await getAdminSession()).toBeNull();
  });

  it("returns the session for a valid cookie", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    cookieGet.mockReturnValue({ name: ADMIN_SESSION_COOKIE_NAME, value: token });

    expect(await getAdminSession()).toEqual(ADMIN);
  });

  it("returns null for a tampered cookie", async () => {
    const token = await signSessionToken(ADMIN, SECRET, 3600);
    const suffix = token.slice(-4);
    const tampered = token.slice(0, -4) + (suffix === "AAAA" ? "BBBB" : "AAAA");
    cookieGet.mockReturnValue({
      name: ADMIN_SESSION_COOKIE_NAME,
      value: tampered,
    });

    expect(await getAdminSession()).toBeNull();
  });

  it("returns null for an expired cookie", async () => {
    const token = await signSessionToken(ADMIN, SECRET, -10);
    cookieGet.mockReturnValue({ name: ADMIN_SESSION_COOKIE_NAME, value: token });

    expect(await getAdminSession()).toBeNull();
  });

  it("returns null for a garbage cookie value (never crashes)", async () => {
    cookieGet.mockReturnValue({ name: ADMIN_SESSION_COOKIE_NAME, value: "garbage" });
    expect(await getAdminSession()).toBeNull();
  });

  it("sets an HttpOnly, SameSite=Lax, path=/ cookie with a maxAge", async () => {
    await createAdminSession({ id: ADMIN.adminId, email: ADMIN.email });

    expect(cookieSet).toHaveBeenCalledTimes(1);
    const [name, value, options] = cookieSet.mock.calls[0];

    expect(name).toBe(ADMIN_SESSION_COOKIE_NAME);
    expect(typeof value).toBe("string");
    expect(value.length).toBeGreaterThan(0);

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.maxAge).toBe(ADMIN_SESSION_DURATION_SECONDS);
    // NODE_ENV === "test" in vitest → not secure; production forces secure.
    expect(options.secure).toBe(false);
  });

  it("sets secure=true when NODE_ENV is production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const mutableEnv = process.env as Record<string, string | undefined>;
    mutableEnv.NODE_ENV = "production";
    try {
      await createAdminSession({ id: ADMIN.adminId, email: ADMIN.email });
      const [, , options] = cookieSet.mock.calls[0];
      expect(options.secure).toBe(true);
    } finally {
      mutableEnv.NODE_ENV = originalNodeEnv;
    }
  });

  it("deletes the session cookie on logout", async () => {
    await destroyAdminSession();
    expect(cookieDelete).toHaveBeenCalledTimes(1);
    expect(cookieDelete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE_NAME);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearLoginRateLimit,
  isLoginRateLimited,
  recordLoginFailure,
  resetLoginRateLimitStore,
} from "@/lib/auth/rate-limit";

/**
 * Lightweight in-memory login rate limit tests (STEP 9, requirement 48).
 */

describe("login rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T10:00:00.000Z"));
    resetLoginRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetLoginRateLimitStore();
  });

  it("allows attempts below the limit", () => {
    for (let i = 0; i < 9; i++) {
      recordLoginFailure("admin@president.ac.id");
    }
    expect(isLoginRateLimited("admin@president.ac.id")).toBe(false);
  });

  it("blocks once the limit is reached", () => {
    for (let i = 0; i < 10; i++) {
      recordLoginFailure("admin@president.ac.id");
    }
    expect(isLoginRateLimited("admin@president.ac.id")).toBe(true);
  });

  it("tracks keys independently", () => {
    recordLoginFailure("admin@president.ac.id");
    recordLoginFailure("admin@president.ac.id");
    expect(isLoginRateLimited("other@president.ac.id")).toBe(false);
  });

  it("resets after the window passes (no permanent lockout)", () => {
    for (let i = 0; i < 10; i++) {
      recordLoginFailure("admin@president.ac.id");
    }
    expect(isLoginRateLimited("admin@president.ac.id")).toBe(true);

    vi.setSystemTime(new Date("2026-08-31T10:20:00.000Z")); // +20 min
    expect(isLoginRateLimited("admin@president.ac.id")).toBe(false);
  });

  it("clearLoginRateLimit resets a key immediately", () => {
    for (let i = 0; i < 10; i++) {
      recordLoginFailure("admin@president.ac.id");
    }
    clearLoginRateLimit("admin@president.ac.id");
    expect(isLoginRateLimited("admin@president.ac.id")).toBe(false);
  });
});

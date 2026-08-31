import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ASSESSMENT_SESSION_KEY } from "@/lib/assessment-session";

/** Minimal in-memory Storage implementation for testing sessionStorage paths. */
function createMemoryStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key)
        ? store[key]
        : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

let storage: Storage;

/**
 * These tests exercise the real `lib/assessment-session.ts` module against a
 * mocked sessionStorage. `vi.resetModules()` + dynamic import give each test a
 * fresh module instance (simulating a fresh page load / refresh), and the
 * mocked `window` makes the storage helpers usable in the node test env.
 */
describe("assessment session storage (sessionStorage)", () => {
  beforeEach(() => {
    vi.resetModules();
    storage = createMemoryStorage();
    vi.stubGlobal("window", { sessionStorage: storage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and restores a session", async () => {
    const { saveAssessmentSession, getAssessmentSession } = await import(
      "@/lib/assessment-session"
    );
    const session = {
      fullName: "Budi Santoso",
      major: "INFORMATICS" as const,
      answers: { INF_Q01: "INF_Q01_C", INF_Q02: "INF_Q02_D" },
      currentQuestion: 4,
    };

    expect(saveAssessmentSession(session)).toBe(true);
    expect(getAssessmentSession()).toEqual(session);
  });

  it("preserves answers and position across a simulated refresh", async () => {
    const { saveAssessmentSession } = await import("@/lib/assessment-session");
    const session = {
      fullName: "Sari Wijaya",
      major: "INFORMATION_SYSTEMS" as const,
      answers: { IS_Q03: "IS_Q03_B", IS_Q04: "IS_Q04_E" },
      currentQuestion: 9,
    };
    expect(saveAssessmentSession(session)).toBe(true);

    // Simulate a page refresh: fresh module instance re-reads storage.
    vi.resetModules();
    const fresh = await import("@/lib/assessment-session");
    expect(fresh.getAssessmentSession()).toEqual(session);
  });

  it("returns null for malformed JSON instead of crashing", async () => {
    storage.setItem(ASSESSMENT_SESSION_KEY, "{not valid json");
    const { getAssessmentSession } = await import("@/lib/assessment-session");
    expect(getAssessmentSession()).toBeNull();
  });

  it("returns null for a session with an invalid major", async () => {
    storage.setItem(
      ASSESSMENT_SESSION_KEY,
      JSON.stringify({
        fullName: "Budi Santoso",
        major: "MEDICINE",
        answers: {},
        currentQuestion: 0,
      }),
    );
    const { getAssessmentSession } = await import("@/lib/assessment-session");
    expect(getAssessmentSession()).toBeNull();
  });

  it("returns null when no session exists", async () => {
    const { getAssessmentSession } = await import("@/lib/assessment-session");
    expect(getAssessmentSession()).toBeNull();
  });

  it("clears the session and storage (Start Over behavior)", async () => {
    const { saveAssessmentSession, getAssessmentSession, clearAssessmentSession } =
      await import("@/lib/assessment-session");
    saveAssessmentSession({
      fullName: "Budi Santoso",
      major: "INFORMATICS",
      answers: { INF_Q01: "INF_Q01_A" },
      currentQuestion: 1,
    });
    expect(getAssessmentSession()).not.toBeNull();

    clearAssessmentSession();
    expect(getAssessmentSession()).toBeNull();
    expect(storage.getItem(ASSESSMENT_SESSION_KEY)).toBeNull();
  });
});

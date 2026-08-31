import { describe, expect, it } from "vitest";
import { formatSuitabilityScore } from "@/lib/results/format-score";

describe("formatSuitabilityScore", () => {
  it("formats whole values with one decimal place", () => {
    expect(formatSuitabilityScore(84)).toBe("84.0%");
    expect(formatSuitabilityScore(100)).toBe("100.0%");
    expect(formatSuitabilityScore(0)).toBe("0.0%");
  });

  it("rounds to one decimal place deterministically", () => {
    expect(formatSuitabilityScore(84.456)).toBe("84.5%");
    expect(formatSuitabilityScore(84.44)).toBe("84.4%");
    expect(formatSuitabilityScore(99.96)).toBe("100.0%");
  });

  it("clamps out-of-range values into 0-100", () => {
    expect(formatSuitabilityScore(-5)).toBe("0.0%");
    expect(formatSuitabilityScore(120)).toBe("100.0%");
  });

  it("degrades non-finite values safely to 0.0%", () => {
    expect(formatSuitabilityScore(Number.NaN)).toBe("0.0%");
    expect(formatSuitabilityScore(Number.POSITIVE_INFINITY)).toBe("0.0%");
  });

  it("is deterministic for the same input", () => {
    expect(formatSuitabilityScore(73.05)).toBe(formatSuitabilityScore(73.05));
  });
});

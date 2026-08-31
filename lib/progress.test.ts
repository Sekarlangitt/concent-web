import { describe, expect, it } from "vitest";
import { getProgressPercent } from "@/lib/progress";

describe("getProgressPercent", () => {
  it("maps Question 1 of 20 to 5%", () => {
    expect(getProgressPercent(0, 20)).toBe(5);
  });

  it("maps Question 5 of 20 to 25%", () => {
    expect(getProgressPercent(4, 20)).toBe(25);
  });

  it("maps Question 10 of 20 to 50%", () => {
    expect(getProgressPercent(9, 20)).toBe(50);
  });

  it("maps Question 15 of 20 to 75%", () => {
    expect(getProgressPercent(14, 20)).toBe(75);
  });

  it("maps Question 20 of 20 to 100%", () => {
    expect(getProgressPercent(19, 20)).toBe(100);
  });

  it("never exceeds 100% or falls below the first question", () => {
    expect(getProgressPercent(99, 20)).toBe(100);
    expect(getProgressPercent(-5, 20)).toBe(5);
  });

  it("handles an empty question set without dividing by zero", () => {
    expect(getProgressPercent(0, 0)).toBe(0);
  });
});

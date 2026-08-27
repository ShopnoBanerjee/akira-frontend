import { describe, expect, it } from "vitest";

import { pct, sparklinePath } from "./api";

describe("pct", () => {
  it("renders a percentage", () => {
    expect(pct(87.4)).toBe("87%");
  });

  it("shows an em dash rather than inventing a zero", () => {
    expect(pct(null)).toBe("—");
    expect(pct(undefined)).toBe("—");
  });

  it("keeps a real zero", () => {
    expect(pct(0)).toBe("0%");
  });
});

describe("sparklinePath", () => {
  it("draws nothing from a single point", () => {
    // One day of approvals is not a trend, and a line through it would imply
    // a stability nobody has evidence for.
    expect(sparklinePath([92], 220, 40)).toBeNull();
    expect(sparklinePath([], 220, 40)).toBeNull();
  });

  it("spans the full width and height", () => {
    const path = sparklinePath([0, 100], 200, 40);
    // Lowest score sits on the baseline, highest on the ceiling.
    expect(path).toBe("M0.0,40.0 L200.0,0.0");
  });

  it("puts a flat run down the middle rather than dividing by zero", () => {
    const path = sparklinePath([90, 90, 90], 200, 40);
    expect(path).toBe("M0.0,40.0 L100.0,40.0 L200.0,40.0");
    expect(path).not.toContain("NaN");
  });

  it("scales between the observed min and max, not 0-100", () => {
    // Three near-identical good days should still show their shape.
    const path = sparklinePath([90, 95, 92], 200, 40);
    expect(path).toBe("M0.0,40.0 L100.0,0.0 L200.0,24.0");
  });

  it("emits one point per score", () => {
    const path = sparklinePath([80, 85, 90, 95, 100], 200, 40);
    expect(path?.split(" ")).toHaveLength(5);
  });
});

import { describe, expect, it } from "vitest";

import { formatPaise, formatPaiseShort, formatPaiseWhole } from "./money";

describe("formatPaise", () => {
  it("groups the Indian way", () => {
    // A manager reads this as four lakh eighty-six thousand. Western grouping
    // makes them stop and count digits.
    expect(formatPaise(48_607_635)).toBe("₹4,86,076.35");
  });

  it("keeps the paise, because this is the figure that must reconcile", () => {
    expect(formatPaise(8160)).toBe("₹81.60");
    expect(formatPaise(1)).toBe("₹0.01");
  });

  it("renders an em dash rather than a zero it was never given", () => {
    expect(formatPaise(null)).toBe("—");
    expect(formatPaise(undefined)).toBe("—");
  });

  it("keeps a real zero", () => {
    expect(formatPaise(0)).toBe("₹0.00");
  });

  it("handles a refund", () => {
    expect(formatPaise(-25_050)).toContain("250.50");
  });
});

describe("formatPaiseWhole", () => {
  it("drops the paise for headline figures", () => {
    expect(formatPaiseWhole(48_607_635)).toBe("₹4,86,076");
  });
});

describe("formatPaiseShort", () => {
  it("uses lakh and crore, not K and M", () => {
    expect(formatPaiseShort(48_607_635)).toBe("₹4.86L");
    expect(formatPaiseShort(1_00_00_000_00)).toBe("₹1.00Cr");
  });

  it("falls back to thousands and units below a lakh", () => {
    expect(formatPaiseShort(8_564_00)).toBe("₹8.6k");
    expect(formatPaiseShort(250_00)).toBe("₹250");
  });

  it("keeps the sign", () => {
    expect(formatPaiseShort(-48_607_635)).toBe("-₹4.86L");
  });
});

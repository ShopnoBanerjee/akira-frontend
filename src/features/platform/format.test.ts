import { describe, expect, it } from "vitest";

import { SLUG_PATTERN, formatCount, slugFrom } from "./format";

describe("formatCount", () => {
  it("groups the Indian way", () => {
    expect(formatCount(100000)).toBe("1,00,000");
    expect(formatCount(10000)).toBe("10,000");
    expect(formatCount(0)).toBe("0");
  });
});

describe("slugFrom", () => {
  it("makes a slug the API will accept from an ordinary name", () => {
    expect(slugFrom("Sakura Kitchens")).toBe("sakura-kitchens");
    expect(SLUG_PATTERN.test(slugFrom("Sakura Kitchens"))).toBe(true);
  });

  it("drops what a slug cannot hold and never ends on a hyphen", () => {
    expect(slugFrom("  AKIRA (Park St.) #2  ")).toBe("akira-park-st-2");
    expect(slugFrom("Café Noir")).toBe("cafe-noir");
    const long = slugFrom("a".repeat(39) + " b");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("-")).toBe(false);
  });

  it("leaves nothing for a name with no letters or digits", () => {
    expect(slugFrom("!!!")).toBe("");
    expect(SLUG_PATTERN.test("")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  formatBusinessDate,
  formatBusinessDateLong,
  formatOutletClock,
  formatOutletTime,
} from "./dates";

describe("formatBusinessDate", () => {
  it("renders the day the API decided, not one shifted by the viewer's zone", () => {
    // new Date("2026-08-22") is UTC midnight, which is the 21st for anyone west
    // of Greenwich. A date with no time is not an instant.
    expect(formatBusinessDate("2026-08-22")).toBe("Sat, 22 Aug");
  });

  it("does not move across a month boundary", () => {
    // en-IN abbreviates September as "Sept", not "Sep".
    expect(formatBusinessDate("2026-09-01")).toBe("Tue, 1 Sept");
  });

  it("gives back anything it cannot read", () => {
    expect(formatBusinessDate("not-a-date")).toBe("not-a-date");
  });

  it("has a long form for headings", () => {
    expect(formatBusinessDateLong("2026-08-22")).toBe("22 August 2026");
  });
});

describe("formatOutletTime", () => {
  it("renders a UTC instant in the outlet's clock", () => {
    // 18:35Z is 00:05 the next morning in Kolkata — the bill that belongs to
    // the previous trading day.
    expect(formatOutletTime("2026-08-21T18:35:00Z")).toContain("22 Aug");
    expect(formatOutletClock("2026-08-21T18:35:00Z")).toBe("00:05");
  });

  it("renders midnight as 00, not 24", () => {
    // hour12:false resolves to the h24 cycle in several locales and produces
    // "24:05". Midnight is the hour this whole system turns on.
    expect(formatOutletClock("2026-08-21T18:30:00Z")).toBe("00:00");
    expect(formatOutletClock("2026-08-21T18:35:00Z")).not.toContain("24:");
  });

  it("uses a 24-hour clock, because a kitchen rota does", () => {
    expect(formatOutletClock("2026-08-22T14:07:00Z")).toBe("19:37");
  });

  it("renders an em dash for nothing", () => {
    expect(formatOutletTime(null)).toBe("—");
    expect(formatOutletClock(undefined)).toBe("—");
  });
});

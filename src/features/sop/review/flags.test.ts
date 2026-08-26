import { describe, expect, it } from "vitest";

import { FLAG_COPY, FLAG_LABEL, flagEvidence, formatMinutes, verdictCopy } from "./flags";

/**
 * The evidence sentences are the whole reason a manager can act on a flag
 * rather than either believing it or ignoring it. They are built from whatever
 * the engine recorded, which means they have to survive a payload that is
 * missing the field they wanted — the flag is still true, only its explanation
 * is unavailable.
 */

describe("flag copy", () => {
  const FLAGS = [
    "duplicate_photo",
    "burst_upload",
    "out_of_geofence",
    "late",
    "stale_capture",
    "too_dark",
    "ai_mismatch",
  ];

  it("has a plain-language line and a short label for every flag the API can emit", () => {
    for (const flag of FLAGS) {
      expect(FLAG_COPY[flag], flag).toBeTruthy();
      expect(FLAG_LABEL[flag], flag).toBeTruthy();
    }
  });

  it("shortens the labels a reader would otherwise have to decode", () => {
    expect(FLAG_LABEL.duplicate_photo).toBe("re-used photo");
    expect(FLAG_LABEL.out_of_geofence).toBe("off-site");
    expect(FLAG_LABEL.stale_capture).toBe("not taken now");
    // `late` is already the plain word; renaming it would be worse.
    expect(FLAG_LABEL.late).toBe("late");
  });
});

describe("flagEvidence — duplicate_photo", () => {
  const evidence = {
    distance: 0,
    max_distance: 5,
    matched_run_id: "abc",
    matched_business_date: "2026-08-26",
    matched_template_name: "Washroom & Waste — Daily",
  };

  it("names the run it matched, by date and checklist", () => {
    const text = flagEvidence("duplicate_photo", evidence);
    expect(text).toContain("2026-08-26");
    expect(text).toContain("Washroom & Waste — Daily");
  });

  it("calls a zero distance the same image rather than a near match", () => {
    expect(flagEvidence("duplicate_photo", evidence)).toContain("the same image");
  });

  it("quantifies a near match instead of asserting identity", () => {
    const text = flagEvidence("duplicate_photo", { ...evidence, distance: 3 });
    expect(text).toContain("3 bits");
    expect(text).not.toContain("the same image");
  });

  it("says nothing rather than inventing detail when the date is missing", () => {
    expect(flagEvidence("duplicate_photo", { distance: 2 })).toBeNull();
  });
});

describe("flagEvidence — too_dark", () => {
  it("gives the measurement and the floor it fell below", () => {
    const text = flagEvidence("too_dark", { luminance: 14.03, minimum: 40 });
    expect(text).toContain("14");
    expect(text).toContain("40");
    expect(text).toContain("255");
  });

  it("copes with a missing floor", () => {
    expect(flagEvidence("too_dark", { luminance: 9 })).toContain("9");
  });
});

describe("flagEvidence — burst_upload", () => {
  it("reports the share and the window", () => {
    const text = flagEvidence("burst_upload", {
      photos: 4,
      share_in_window: 1,
      window_minutes: 3,
      implausibly_fast: false,
    });
    expect(text).toContain("100%");
    expect(text).toContain("4 photo");
    expect(text).toContain("3 minutes");
  });

  it("leads with the speed when the run itself was implausibly fast", () => {
    const text = flagEvidence("burst_upload", {
      photos: 0,
      share_in_window: 0,
      implausibly_fast: true,
      completed_in_seconds: 41,
    });
    expect(text).toContain("41 seconds");
  });

  it("gets the singular right", () => {
    const text = flagEvidence("burst_upload", {
      photos: 1,
      share_in_window: 1,
      window_minutes: 3,
    });
    expect(text).toContain("1 photo ");
  });
});

describe("flagEvidence — late", () => {
  it("reads minutes as minutes", () => {
    expect(flagEvidence("late", { minutes_late: 45, grace_minutes: 30 })).toContain("45 min");
  });

  it("reads a long delay in hours and days rather than thousands of minutes", () => {
    // 1979 minutes is 32h 59m — over a day, so it reads in days.
    const text = flagEvidence("late", { minutes_late: 1979, grace_minutes: 30 });
    expect(text).toContain("1d 8h");
    expect(text).not.toContain("1979");
  });
});

describe("flagEvidence — ai_mismatch", () => {
  it("carries the model's own words, not a restatement", () => {
    const text = flagEvidence("ai_mismatch", {
      rationale: "Grease visible along the back edge of the hob.",
      confidence: 0.91,
    });
    expect(text).toContain("Grease visible along the back edge of the hob.");
    expect(text).toContain("91%");
  });
});

describe("flagEvidence — absent or unknown", () => {
  it("returns null for a flag with no evidence recorded", () => {
    expect(flagEvidence("too_dark", undefined)).toBeNull();
  });

  it("returns null for a flag it does not know, rather than throwing", () => {
    expect(flagEvidence("something_new", { anything: 1 })).toBeNull();
  });
});

describe("formatMinutes", () => {
  it("keeps small values in minutes", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(59)).toBe("59 min");
  });

  it("switches to hours on the hour", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(95)).toBe("1h 35m");
  });

  it("switches to days past a day", () => {
    expect(formatMinutes(60 * 23)).toBe("23h");
    expect(formatMinutes(1979)).toBe("1d 8h");
    expect(formatMinutes(60 * 30)).toBe("1d 6h");
  });
});

describe("verdictCopy", () => {
  it("says what the verdict was judged against", () => {
    expect(verdictCopy("pass", true)).toContain("reference standard");
    expect(verdictCopy("pass", false)).toContain("no reference standard captured yet");
  });

  it("has wording for every displayable verdict", () => {
    expect(verdictCopy("pass", true)).toContain("looks done");
    expect(verdictCopy("fail", true)).toContain("does not look done");
    expect(verdictCopy("uncertain", true)).toContain("could not tell");
  });
});

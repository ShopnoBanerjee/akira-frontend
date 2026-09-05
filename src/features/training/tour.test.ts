import { describe, expect, it } from "vitest";

import { FLOOR_STEPS, FLOOR_VERSION, MANAGEMENT_STEPS, MANAGEMENT_VERSION } from "./content";
import { describeTraining } from "./people";
import {
  placeCard,
  progressLabel,
  spotlightRect,
  stepsFor,
  validateSteps,
  type TourStep,
} from "./tour";

const step = (id: string, extra: Partial<TourStep> = {}): TourStep => ({
  id,
  anchor: null,
  route: "/app",
  title: { en: "t", bn: "শিরোনাম" },
  body: { en: "b", bn: "বিবরণ" },
  ...extra,
});

describe("the shipped content", () => {
  it("is valid on both tracks", () => {
    expect(validateSteps(MANAGEMENT_STEPS)).toEqual([]);
    expect(validateSteps(FLOOR_STEPS)).toEqual([]);
  });

  it("names its version after its track", () => {
    expect(MANAGEMENT_VERSION).toMatch(/^management\.v\d+$/);
    expect(FLOOR_VERSION).toMatch(/^floor\.v\d+$/);
  });

  it("gives every role a real tour that starts and ends on its own shell", () => {
    for (const role of ["owner", "ops_manager", "outlet_manager"] as const) {
      const steps = stepsFor(MANAGEMENT_STEPS, role);
      expect(steps.length).toBeGreaterThanOrEqual(8);
      expect(steps.every((s) => s.route === null || s.route.startsWith("/app"))).toBe(true);
      expect(steps[0]!.id).toBe("welcome");
      expect(steps.at(-1)!.id).toBe("done");
    }
    for (const role of ["shift_lead", "staff"] as const) {
      const steps = stepsFor(FLOOR_STEPS, role);
      expect(steps.length).toBeGreaterThanOrEqual(6);
      expect(steps.every((s) => s.route === null || s.route.startsWith("/floor"))).toBe(true);
    }
  });

  it("keeps the admin-only steps from an outlet manager", () => {
    const ids = stepsFor(MANAGEMENT_STEPS, "outlet_manager").map((s) => s.id);
    expect(ids).not.toContain("tablets");
    expect(ids).not.toContain("settings");
    expect(stepsFor(MANAGEMENT_STEPS, "owner").map((s) => s.id)).toContain("tablets");
  });

  it("tells staff the photo goes to an AI service, in both languages", () => {
    const photos = FLOOR_STEPS.find((s) => s.id === "photos")!;
    expect(photos.body.en).toMatch(/AI service/);
    expect(photos.body.bn).toMatch(/AI/);
  });
});

describe("validateSteps", () => {
  it("catches duplicate ids, bad anchors, relative routes and empty Bengali", () => {
    const problems = validateSteps([
      step("a"),
      step("a"),
      step("b", { anchor: "Nav Review" }),
      step("c", { route: "app" }),
      step("d", { body: { en: "x", bn: "  " } }),
    ]);
    expect(problems).toEqual([
      "duplicate id: a",
      "anchor is not a token: Nav Review",
      "route not absolute: c",
      "d: empty bn body",
    ]);
  });
});

describe("progressLabel", () => {
  it("is one-based and clamped", () => {
    expect(progressLabel(0, 9, "en")).toBe("1 of 9");
    expect(progressLabel(8, 9, "en")).toBe("9 of 9");
    expect(progressLabel(-1, 9, "en")).toBe("1 of 9");
    expect(progressLabel(40, 9, "en")).toBe("9 of 9");
    expect(progressLabel(2, 9, "bn")).toBe("9-এর মধ্যে 3");
  });
});

describe("placeCard", () => {
  const viewport = { width: 400, height: 800 };
  const card = { width: 340, height: 220 };

  it("centres when there is nothing to point at", () => {
    const p = placeCard(null, viewport, card);
    expect(p.placement).toBe("centre");
    expect(p.left).toBe(30);
  });

  it("goes below a control near the top", () => {
    const p = placeCard({ top: 40, left: 10, width: 100, height: 40 }, viewport, card);
    expect(p.placement).toBe("below");
    expect(p.top).toBe(92);
  });

  it("goes above a control near the bottom", () => {
    const p = placeCard({ top: 700, left: 10, width: 100, height: 40 }, viewport, card);
    expect(p.placement).toBe("above");
    expect(p.top).toBe(700 - 12 - 220);
  });

  it("never runs off the right edge", () => {
    const p = placeCard({ top: 40, left: 380, width: 20, height: 20 }, viewport, card);
    expect(p.left + card.width).toBeLessThanOrEqual(viewport.width - 12);
  });

  it("centres vertically when the control fills the screen", () => {
    const p = placeCard({ top: 10, left: 0, width: 400, height: 780 }, viewport, card);
    expect(p.placement).toBe("centre");
  });
});

describe("spotlightRect", () => {
  it("pads without going negative", () => {
    expect(spotlightRect({ top: 2, left: 0, width: 10, height: 10 })).toEqual({
      top: 0,
      left: 0,
      width: 22,
      height: 22,
    });
  });
});

describe("describeTraining", () => {
  const base = {
    profile_id: "p",
    full_name: "A",
    global_role: "staff" as const,
    is_active: true,
    track: "floor" as const,
    version: "floor.v1",
    language: "en" as const,
    last_step: 0,
    total_steps: 9,
    started_at: null,
    completed_at: null,
    skipped_at: null,
    triggered_by_name: null,
    reset_at: null,
    can_reset: false,
  };
  const today = new Date("2026-09-06T12:00:00+05:30");

  it("reads like a status column", () => {
    expect(describeTraining(undefined)).toBe("—");
    expect(describeTraining({ ...base, status: "not_started" })).toBe("Not yet");
    expect(describeTraining({ ...base, status: "in_progress", last_step: 3 })).toBe("Step 3 of 9");
    expect(
      describeTraining(
        { ...base, status: "completed", completed_at: "2026-09-06T04:30:00Z" },
        today,
      ),
    ).toBe("Done 6 Sept");
    expect(describeTraining({ ...base, status: "reset", triggered_by_name: "Shopno" })).toBe(
      "Restart by Shopno",
    );
    expect(describeTraining({ ...base, status: "reset" })).toBe("Restart requested");
  });

  it("adds the year when it is not this year, judged in Kolkata time", () => {
    // 31 Dec 2025 20:00 UTC is 1 Jan 2026 in Kolkata: this year, so no year.
    expect(
      describeTraining({ ...base, status: "skipped", skipped_at: "2025-12-31T20:00:00Z" }, today),
    ).toBe("Skipped 1 Jan");
    expect(
      describeTraining({ ...base, status: "skipped", skipped_at: "2025-06-01T10:00:00Z" }, today),
    ).toMatch(/^Skipped 1 Jun 2025$/);
  });
});

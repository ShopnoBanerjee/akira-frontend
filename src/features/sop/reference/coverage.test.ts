import { describe, expect, it } from "vitest";

import { coverage, type ReferencePhoto } from "./coverage";

function row(captured: boolean, id = crypto.randomUUID()): ReferencePhoto {
  return {
    id: captured ? id : null,
    template_item_id: id,
    title: "Sink clean",
    title_bn: null,
    instruction: null,
    requires_photo: true,
    is_critical: false,
    template_id: "t",
    template_name: "Washroom & Waste — Daily",
    photo_path: captured ? `reference/o/${id}.jpg` : null,
    photo_view_url: captured ? "https://example.test/signed" : null,
    caption: null,
    caption_bn: null,
    luminance_mean: captured ? 120 : null,
    captured_by_name: captured ? "Riya Sen" : null,
    captured_at: captured ? "2026-08-27T10:00:00Z" : null,
  };
}

describe("coverage", () => {
  it("counts captured standards against every item that takes a photo", () => {
    expect(coverage([row(true), row(false), row(false), row(true)])).toEqual({
      captured: 2,
      total: 4,
      pct: 50,
    });
  });

  it("reports zero rather than dividing by nothing when no item takes a photo", () => {
    expect(coverage([])).toEqual({ captured: 0, total: 0, pct: 0 });
    expect(coverage(undefined)).toEqual({ captured: 0, total: 0, pct: 0 });
  });

  it("only reaches 100 when nothing is missing", () => {
    expect(coverage([row(true), row(true)]).pct).toBe(100);
    // 99 rounds up to 100 in a naive implementation; one gap must not read as
    // complete, because "complete" is what turns the AI reviewer on.
    const rows = [
      ...Array<null>(199)
        .fill(null)
        .map(() => row(true)),
      row(false),
    ];
    expect(coverage(rows).pct).toBeLessThan(100);
  });
});

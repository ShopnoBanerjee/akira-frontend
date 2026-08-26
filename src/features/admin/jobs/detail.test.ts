import { describe, expect, it } from "vitest";

import { summariseJobDetail } from "./detail";

/**
 * The payloads below are the shapes the API really writes into
 * job_runs.detail — copied from live rows, not invented — because the column
 * is loose jsonb and this function is the only thing that knows how to read it.
 */

describe("summariseJobDetail", () => {
  it("reads a materialisation", () => {
    const text = summariseJobDetail({
      business_date: "2026-08-27",
      created: 14,
      already_existed: 0,
    });
    expect(text).toContain("14 created");
  });

  it("mentions skipped rows only when there were some", () => {
    expect(summariseJobDetail({ created: 0, already_existed: 14 })).toContain("14 already existed");
    expect(summariseJobDetail({ created: 14, already_existed: 0 })).not.toContain(
      "already existed",
    );
  });

  it("reads a missed-run sweep, including one that found nothing", () => {
    expect(summariseJobDetail({ marked_missed: 13, runs: [] })).toContain("13 marked missed");
    expect(summariseJobDetail({ marked_missed: 0, runs: [] })).toContain("0 marked missed");
  });

  it("names the flags a photo pass raised", () => {
    const text = summariseJobDetail({
      run_item_id: "x",
      phash: "b23ec1c39ec1874d",
      luminance: 160.1,
      item_flags: ["duplicate_photo"],
      run_flags: [],
    });
    expect(text).toContain("duplicate_photo");
  });

  it("reports a delivered digest with its channel", () => {
    const text = summariseJobDetail({
      outlet: "AKR-NT01",
      delivery: { channel: "email", delivered: true, recipients: ["a@b.test"] },
    });
    expect(text).toContain("AKR-NT01");
    expect(text).toContain("sent via email");
  });

  it("makes a downgraded digest visible rather than passing it off as sent", () => {
    const text = summariseJobDetail({
      outlet: "AKR-NT01",
      delivery: {
        channel: "log_only",
        delivered: true,
        configured_channel: "email",
        downgraded_because: "smtp_not_configured",
      },
    });
    expect(text).toContain("smtp_not_configured");
  });

  it("says why nothing was sent", () => {
    const text = summariseJobDetail({
      delivery: { channel: "email", delivered: false, reason: "no_recipients" },
    });
    expect(text).toContain("not sent");
    expect(text).toContain("no_recipients");
  });

  it("never renders [object Object] when a field is not the shape it expected", () => {
    const text = summariseJobDetail({
      delivery: { delivered: false, reason: { nested: "surprise" } },
    });
    expect(text).not.toContain("[object Object]");
    expect(text).toContain("unknown");
  });

  it("survives a shape it has never seen", () => {
    expect(summariseJobDetail({ something: "new" })).toBeTruthy();
    expect(summariseJobDetail(null)).toBe("—");
    expect(summariseJobDetail("a string")).toBe("—");
  });
});

/**
 * Rendering dates and times the API has already decided.
 *
 * The one rule: **a business date is never computed here.** AKIRA's trading day
 * rolls over at 05:00 IST, so a bill at 00:45 belongs to the night before, and
 * that arithmetic lives in exactly two places — `app/core/business_date.py` and
 * the Postgres `business_date()` function, tested against each other. The
 * browser's job is to display what those produced, and any client-side
 * derivation would be a third implementation that quietly disagrees.
 *
 * So everything here takes a value the API sent and formats it. Nothing here
 * takes "now" and works out which trading day it is.
 */

const OUTLET_TZ = "Asia/Kolkata";

/**
 * A `business_date` from the API — always `YYYY-MM-DD` — as "Sat 22 Aug".
 *
 * Parsed field by field rather than through `new Date(string)`, which would
 * read it as UTC midnight and render the previous day for anyone west of
 * Greenwich. A date with no time is not an instant.
 */
export function formatBusinessDate(
  businessDate: string,
  options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" },
): string {
  const [year, month, day] = businessDate.split("-").map(Number);
  if (!year || !month || !day) return businessDate;
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** A business date with its year, for headings: "22 August 2026". */
export function formatBusinessDateLong(businessDate: string): string {
  return formatBusinessDate(businessDate, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * An instant from the API, in the outlet's own clock.
 *
 * Timestamps arrive UTC and are read by people standing in Kolkata. Rendering
 * a 00:05 bill as 18:35 the previous day is the same class of error as getting
 * the business date wrong, and just as hard to spot.
 */
export function formatOutletTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: OUTLET_TZ,
  }).format(at);
}

/** Just the clock part, for dense tables: "00:05". */
export function formatOutletClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  // hourCycle h23, not hour12: false. The latter resolves to the h24 cycle in
  // several locales, which renders midnight as "24:05" — and midnight is
  // exactly the hour this system cares most about getting right.
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: OUTLET_TZ,
  }).format(at);
}

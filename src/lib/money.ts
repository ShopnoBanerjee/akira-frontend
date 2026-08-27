/**
 * Money, formatted at the render edge and nowhere else.
 *
 * The API sends integer paise and every column ends `_paise` (CLAUDE.md).
 * Nothing in this app should ever hold a rupee float: 486076.35 cannot be
 * represented exactly, and the moment one enters a calculation the totals stop
 * reconciling with the database that produced them.
 *
 * Indian digit grouping is not cosmetic here. A manager in Kolkata reads
 * ₹4,86,076 as four lakh eighty-six thousand; ₹486,076 makes them stop and
 * count digits.
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INR_WHOLE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₹4,86,076.35 — the exact figure, for anything that must reconcile. */
export function formatPaise(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return INR.format(paise / 100);
}

/** ₹4,86,076 — for headline numbers where the paise are noise. */
export function formatPaiseWhole(paise: number | null | undefined): string {
  if (paise == null) return "—";
  return INR_WHOLE.format(Math.round(paise / 100));
}

/**
 * ₹4.86L / ₹1.2Cr — for axis labels and tight columns.
 *
 * Lakh and crore rather than K and M, because that is how the number will be
 * said out loud in the room where it is discussed.
 */
export function formatPaiseShort(paise: number | null | undefined): string {
  if (paise == null) return "—";
  const rupees = paise / 100;
  const sign = rupees < 0 ? "-" : "";
  const value = Math.abs(rupees);
  if (value >= 1_00_00_000) return `${sign}₹${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (value >= 1_00_000) return `${sign}₹${(value / 1_00_000).toFixed(2)}L`;
  if (value >= 1_000) return `${sign}₹${(value / 1_000).toFixed(1)}k`;
  return `${sign}₹${Math.round(value)}`;
}

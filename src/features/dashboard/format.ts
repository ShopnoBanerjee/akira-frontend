/**
 * Rendering helpers for the health card.
 *
 * Deliberately a sibling of `api.ts` rather than part of it. Anything that
 * imports `api.ts` transitively imports the Supabase client, which throws at
 * module load when its environment is not configured — correct for the app,
 * fatal for a unit test. Pure functions live apart so they can be tested
 * without standing up a client that the maths does not need.
 */

export type Band = "green" | "amber" | "red" | "none";

/** Brand colours per health band. Red is a band here, not chrome. */
export const BAND_COLOUR: Record<Band, string> = {
  green: "var(--color-health-green)",
  amber: "var(--color-health-amber)",
  red: "var(--color-health-red)",
  none: "rgba(35,31,32,0.25)",
};

export const BAND_TEXT: Record<Band, string> = {
  green: "text-health-green",
  amber: "text-[#8a6414]",
  red: "text-akira-red",
  none: "text-akira-ink/40",
};

/** A percentage, or an em dash — never a fabricated zero. */
export function pct(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value)}%`;
}

/**
 * An SVG path through the trend points, scaled into the given box.
 *
 * Returns null when there is nothing worth drawing: a single point is not a
 * trend, and a flat line through one value would imply a stability nobody has
 * evidence for.
 */
export function sparklinePath(scores: number[], width: number, height: number): string | null {
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // A perfectly flat run would divide by zero; draw it down the middle.
  const span = max - min || 1;
  const step = width / (scores.length - 1);
  return scores
    .map((score, i) => {
      const x = i * step;
      const y = height - ((score - min) / span) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

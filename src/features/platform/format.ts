/** Counts as an owner in India reads them: 1,00,000, never 100,000. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}

/** The shape the API and the database both enforce for an organisation slug. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** A readable slug from a name, until somebody types their own. */
export function slugFrom(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** What a new customer may have until the vendor says otherwise (D33, D34). */
export const DEFAULT_ALLOWANCES = {
  max_outlets: 100000,
  max_people: 100000,
  max_devices: 10000,
} as const;

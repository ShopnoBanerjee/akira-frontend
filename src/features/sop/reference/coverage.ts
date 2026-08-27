/**
 * How much of an outlet's photographic standard has been captured.
 *
 * A sibling of `api.ts` rather than part of it: anything importing `api.ts`
 * transitively imports the Supabase client, which throws at module load
 * without its environment. Pure arithmetic should not need a client.
 */

import type { components } from "@/types/api";

export type ReferencePhoto = components["schemas"]["ReferencePhoto"];

export function coverage(rows: ReferencePhoto[] | undefined): {
  captured: number;
  total: number;
  pct: number;
} {
  const total = rows?.length ?? 0;
  const captured = rows?.filter((r) => r.photo_path).length ?? 0;
  if (total === 0) return { captured, total, pct: 0 };
  // Floored, not rounded. 199 of 200 rounds to 100%, and a bar reading 100%
  // with a gap behind it is exactly the wrong thing to show before switching
  // on a reviewer that depends on the standards being there.
  const exact = (100 * captured) / total;
  return { captured, total, pct: captured === total ? 100 : Math.floor(exact) };
}

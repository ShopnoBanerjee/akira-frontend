/**
 * Reading a job_runs detail blob back as one line.
 *
 * Each job counts different things — rows created, photos hashed, mail sent —
 * so the column is deliberately loose jsonb. This is the small amount of
 * knowledge needed to render the common cases without a schema, and it is a
 * pure function so it can be tested against the shapes the jobs really emit.
 */

/** Narrow an unknown jsonb value to a string, or null. */
function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** A one-line reading of a job's detail blob. Click the row for the whole thing. */
export function summariseJobDetail(detail: unknown): string {
  if (detail === null || typeof detail !== "object") return "—";
  const record = detail as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.created === "number") parts.push(`${record.created} created`);
  if (typeof record.already_existed === "number" && record.already_existed > 0)
    parts.push(`${record.already_existed} already existed`);
  if (typeof record.marked_missed === "number") parts.push(`${record.marked_missed} marked missed`);
  if (Array.isArray(record.item_flags) && record.item_flags.length)
    parts.push(`flags: ${record.item_flags.join(", ")}`);
  if (Array.isArray(record.run_flags) && record.run_flags.length)
    parts.push(`run flags: ${record.run_flags.join(", ")}`);
  if (typeof record.outlet === "string") parts.push(record.outlet);
  if (typeof record.luminance === "number")
    parts.push(`brightness ${Math.round(record.luminance)}`);
  const delivery = record.delivery as Record<string, unknown> | undefined;
  if (delivery) {
    parts.push(
      delivery.delivered
        ? `sent via ${text(delivery.channel) ?? "unknown channel"}`
        : `not sent (${text(delivery.reason) ?? "unknown"})`,
    );
    const downgraded = text(delivery.downgraded_because);
    if (downgraded) parts.push(`downgraded: ${downgraded}`);
  }
  return parts.length ? parts.join(" · ") : JSON.stringify(detail).slice(0, 120);
}

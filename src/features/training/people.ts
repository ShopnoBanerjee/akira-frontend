import type { PersonTraining } from "./api";

/** One line for the People table: where this person's training stands. */
export function describeTraining(p: PersonTraining | undefined, today = new Date()): string {
  if (!p) return "—";
  switch (p.status) {
    case "completed":
      return `Done ${shortDate(p.completed_at, today)}`;
    case "skipped":
      return `Skipped ${shortDate(p.skipped_at, today)}`;
    case "in_progress":
      return `Step ${p.last_step} of ${p.total_steps ?? "?"}`;
    case "reset": {
      const who = p.reset_by_name ?? p.triggered_by_name;
      return who ? `Restart by ${who}` : "Restart requested";
    }
    default:
      return "Not yet";
  }
}

function shortDate(iso: string | null | undefined, today: Date): string {
  if (!iso) return "";
  const d = new Date(iso);
  // Compare years as Kolkata sees them: 31 Dec 20:00 UTC is already 1 Jan.
  const yearOf = (x: Date) =>
    x.toLocaleDateString("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" });
  const sameYear = yearOf(d) === yearOf(today);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "Asia/Kolkata",
  });
}

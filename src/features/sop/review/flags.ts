/**
 * Turning an integrity flag into something a manager can act on.
 *
 * A red chip nobody understands is noise, and a red chip nobody can check is
 * an accusation. So every flag carries two things: a plain-language line about
 * what the check does, and a sentence built from the evidence the engine
 * actually recorded — which photo it matched, how dark it measured, how much
 * of the run landed in the last three minutes.
 *
 * Kept as pure functions so they are testable without rendering anything.
 */

export const FLAG_COPY: Record<string, string> = {
  duplicate_photo:
    "This photo closely matches one submitted before for the same item — it may be re-used.",
  burst_upload: "Most photos in this run were uploaded in the last few minutes before submission.",
  out_of_geofence: "Submitted from outside the outlet's location radius.",
  late: "Submitted after the due time plus grace period.",
  stale_capture: "The photo was taken outside the window this run was open.",
  too_dark: "The photo is too dark to show what it claims to.",
  ai_mismatch: "Automated review disagreed with the recorded result.",
};

export const FLAG_LABEL: Record<string, string> = {
  duplicate_photo: "re-used photo",
  burst_upload: "batch upload",
  out_of_geofence: "off-site",
  late: "late",
  stale_capture: "not taken now",
  too_dark: "too dark",
  ai_mismatch: "AI disagrees",
};

type Evidence = Record<string, unknown> | undefined;

function num(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * The one sentence that turns a flag into a question a manager can ask.
 * Returns null when the engine recorded no usable evidence, in which case the
 * UI shows the generic copy alone rather than inventing detail.
 */
export function flagEvidence(flag: string, evidence: Evidence): string | null {
  if (!evidence) return null;

  switch (flag) {
    case "duplicate_photo": {
      const distance = num(evidence.distance);
      const date = str(evidence.matched_business_date);
      const template = str(evidence.matched_template_name);
      if (date === null) return null;
      const how =
        distance === 0 ? "It is the same image" : `It differs by only ${distance} bits out of 64`;
      return `${how} as the photo submitted on ${date}${template ? ` for ${template}` : ""}.`;
    }
    case "too_dark": {
      const luminance = num(evidence.luminance);
      const minimum = num(evidence.minimum);
      if (luminance === null) return null;
      return `Measured brightness ${Math.round(luminance)} out of 255${
        minimum !== null ? `, against a floor of ${Math.round(minimum)}` : ""
      }.`;
    }
    case "stale_capture": {
      const uploaded = str(evidence.photo_uploaded_at);
      const started = str(evidence.run_started_at);
      if (!uploaded || !started) return null;
      return `The photo arrived at ${localTime(uploaded)}; the run was started at ${localTime(started)}.`;
    }
    case "burst_upload": {
      const photos = num(evidence.photos);
      const share = num(evidence.share_in_window);
      const window = num(evidence.window_minutes);
      const seconds = num(evidence.completed_in_seconds);
      if (evidence.implausibly_fast === true && seconds !== null) {
        return `The whole run was completed in ${seconds} seconds.`;
      }
      if (photos === null || share === null) return null;
      return `${Math.round(share * 100)}% of the run's ${photos} photo${
        photos === 1 ? "" : "s"
      } arrived in the final ${window ?? 3} minutes before submission.`;
    }
    case "late": {
      const minutes = num(evidence.minutes_late);
      const grace = num(evidence.grace_minutes);
      if (minutes === null) return null;
      return `Submitted ${formatMinutes(minutes)} past the due time${
        grace ? ` and its ${grace}-minute grace` : ""
      }.`;
    }
    case "out_of_geofence":
      return "The device reported a position outside the outlet's radius.";
    case "ai_mismatch": {
      const rationale = str(evidence.rationale);
      const confidence = num(evidence.confidence);
      if (!rationale) return null;
      return `${rationale}${confidence !== null ? ` (${Math.round(confidence * 100)}% confident)` : ""}`;
    }
    default:
      return null;
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function localTime(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleString();
}

/** How an advisory verdict should read on screen. */
export function verdictCopy(shown: string, comparedToReference: boolean): string {
  const basis = comparedToReference
    ? "against this outlet's reference standard"
    : "on the item's instruction alone, with no reference standard captured yet";
  switch (shown) {
    case "pass":
      return `Automated review thinks this looks done, judged ${basis}.`;
    case "fail":
      return `Automated review thinks this does not look done, judged ${basis}.`;
    default:
      return `Automated review could not tell, judged ${basis}.`;
  }
}

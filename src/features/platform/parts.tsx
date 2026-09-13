import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Allowance } from "./api";
import { formatCount } from "./format";

const TONES = {
  green: "bg-health-green/12 text-[#1f6e42]",
  amber: "bg-health-amber/18 text-[#8a6414]",
  red: "bg-health-red/10 text-akira-red",
  grey: "bg-akira-ink/8 text-akira-ink/70",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Whether a customer is live, and whether it can sign in at all. */
export function StatusBadges({
  isActive,
  onboardedAt,
}: {
  isActive: boolean;
  onboardedAt: string | null | undefined;
}) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {isActive ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}
      {onboardedAt ? (
        <Badge tone="green">Onboarded</Badge>
      ) : (
        <Badge tone="amber">In development</Badge>
      )}
    </span>
  );
}

export function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-akira-ink/10 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-akira-ink/45">
        {label}
      </p>
      <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {hint && <p className="mt-0.5 text-xs text-akira-ink/55">{hint}</p>}
    </div>
  );
}

/**
 * Used against allowed, on one line that never wraps. The bar turns amber at
 * 80% and red at the limit, because the limit is where the customer is
 * refused and the vendor should see it coming.
 */
export function AllowanceBar({ allowance }: { allowance: Allowance }) {
  const share = allowance.allowed > 0 ? allowance.used / allowance.allowed : 1;
  const tone = share >= 1 ? "bg-health-red" : share >= 0.8 ? "bg-health-amber" : "bg-akira-blue";
  return (
    <div className="min-w-[7rem]">
      <p className="text-sm whitespace-nowrap tabular-nums">
        {formatCount(allowance.used)}
        <span className="text-akira-ink/45"> / {formatCount(allowance.allowed)}</span>
      </p>
      <div
        className="mt-1 h-1 w-full overflow-hidden rounded-full bg-akira-ink/10"
        role="meter"
        aria-valuenow={allowance.used}
        aria-valuemin={0}
        aria-valuemax={allowance.allowed}
      >
        <div
          className={cn("h-full", tone)}
          style={{ width: `${Math.max(Math.min(share, 1) * 100, allowance.used > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

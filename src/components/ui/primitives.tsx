/**
 * Small shared primitives for the admin screens. Hand-rolled rather than
 * shadcn-generated for now: the P3 surface needs five components, and pulling
 * in the generator midway through an epic is its own change. When shadcn
 * components are generated later they land beside this file and screens
 * migrate one at a time.
 */

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Button({
  variant = "default",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "default" &&
          "border border-akira-ink/15 bg-white text-akira-ink hover:bg-akira-ink/5",
        variant === "primary" && "bg-akira-red text-white hover:opacity-90",
        variant === "danger" &&
          "border border-akira-red/30 bg-white text-akira-red hover:bg-akira-red/5",
        variant === "ghost" && "text-akira-blue hover:bg-akira-blue/5",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-9 w-full rounded-md border border-akira-ink/15 bg-white px-3 text-sm outline-none placeholder:text-akira-ink/35 focus-visible:border-akira-blue focus-visible:ring-2 focus-visible:ring-akira-blue/25",
        props.className,
      )}
    />
  );
}

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-xs font-semibold uppercase tracking-wider text-akira-ink/55"
    >
      {children}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-akira-ink text-white",
  ops_manager: "bg-akira-blue/10 text-akira-blue",
  outlet_manager: "bg-akira-blue/10 text-akira-blue",
  shift_lead: "bg-health-amber/15 text-[#8a6414]",
  staff: "bg-akira-ink/8 text-akira-ink/70",
};

export function RoleBadge({ role, label }: { role: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-[11px] font-semibold",
        ROLE_STYLES[role] ?? ROLE_STYLES.staff,
      )}
    >
      {label}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          active ? "bg-health-green" : "bg-akira-ink/25",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

/**
 * Modal dialog on the native <dialog> element, which brings focus trapping,
 * Escape handling and a ::backdrop for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Click on the backdrop (the dialog element itself) closes.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-full max-w-md rounded-lg border border-akira-ink/10 bg-white p-0 shadow-xl backdrop:bg-akira-ink/40"
    >
      <div className="flex items-center justify-between border-b border-akira-ink/10 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-akira-ink/45 hover:bg-akira-ink/5 hover:text-akira-ink"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-akira-red/25 bg-akira-red/5 px-3 py-2 text-sm text-akira-red"
    >
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-akira-ink/20 bg-white p-8 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-akira-ink/55">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-akira-ink/5 px-4 py-3.5 last:border-0"
        >
          <div className="h-3.5 w-1/4 animate-pulse rounded bg-akira-ink/8 motion-reduce:animate-none" />
          <div className="h-3.5 w-1/6 animate-pulse rounded bg-akira-ink/8 motion-reduce:animate-none" />
          <div className="h-3.5 w-1/5 animate-pulse rounded bg-akira-ink/8 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

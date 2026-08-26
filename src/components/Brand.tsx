export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-jp text-xs font-bold tracking-[0.35em] text-akira-red">アキラ</span>
      {!compact && (
        <span className="text-sm font-semibold tracking-tight text-akira-ink">Ops Suite</span>
      )}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full flex-col items-center justify-center gap-3"
    >
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-akira-ink/15 border-t-akira-red motion-reduce:animate-none" />
      <p className="text-sm text-akira-ink/50">{label}</p>
    </div>
  );
}

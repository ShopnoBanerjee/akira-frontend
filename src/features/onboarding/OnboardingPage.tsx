import { Button, EmptyState, TableSkeleton } from "@/components/ui/primitives";
import { navigate } from "@/app/navigate";
import { cn } from "@/lib/utils";
import { useOnboarding, type OnboardingStep } from "./api";

/**
 * Getting started: what this outlet still needs before AKIRA Ops can do its
 * job, and the screen that does each one.
 *
 * A new organisation starts empty (D33), and an empty system reads as a broken
 * one — every screen says "no data yet" without saying which of a dozen causes
 * it is. This is that list, computed from the data itself, so it ticks off as
 * soon as the work is actually done.
 */
export function OnboardingPage() {
  const { data, isPending, isError, refetch } = useOnboarding();

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Getting started</h1>
      <p className="mt-1 text-sm text-akira-ink/55">
        What this outlet still needs. Each step ticks itself off once the work is done — there is
        nothing here to mark complete by hand.
      </p>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={4} />}
        {isError && (
          <EmptyState
            title="Could not load your setup list"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}

        {data && (
          <>
            <div
              className={cn(
                "rounded-lg border p-4",
                data.ready
                  ? "border-health-green/30 bg-health-green/5"
                  : "border-akira-ink/10 bg-white",
              )}
            >
              <p className="text-sm font-semibold">
                {data.ready
                  ? "Everything essential is in place."
                  : `${data.required_done} of ${data.required_total} essentials done`}
              </p>
              <p className="mt-1 text-sm text-akira-ink/60">
                {data.ready
                  ? `The optional steps (${data.recommended_done} of ${data.recommended_total} done) unlock more of the picture — theoretical stock usage, the restaurant guard, the shared tablet.`
                  : "The essentials are what the daily score and the floor screens depend on. The optional ones below unlock more once these are done."}
              </p>
              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-akira-ink/10"
                role="progressbar"
                aria-valuenow={data.required_done}
                aria-valuemin={0}
                aria-valuemax={data.required_total}
                aria-label="Essential setup steps completed"
              >
                <div
                  className={cn("h-full", data.ready ? "bg-health-green" : "bg-akira-blue")}
                  style={{
                    width: `${Math.round((data.required_done / Math.max(data.required_total, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <Section
              title="Essential"
              steps={data.steps.filter((s) => s.required)}
              hint="Without these the daily score has no input and the floor has nothing to open."
            />
            <Section
              title="Worth doing next"
              steps={data.steps.filter((s) => !s.required)}
              hint="Nothing breaks without these; each one fills in a part of the picture."
            />
          </>
        )}
      </div>
    </main>
  );
}

function Section({ title, hint, steps }: { title: string; hint: string; steps: OnboardingStep[] }) {
  if (steps.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-akira-ink/45">{title}</h2>
      <p className="mt-1 text-xs text-akira-ink/50">{hint}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((step) => (
          <li
            key={step.key}
            className={cn(
              "rounded-lg border bg-white p-4",
              step.done ? "border-health-green/25" : "border-akira-ink/10",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  step.done
                    ? "bg-health-green text-white"
                    : "border border-akira-ink/20 text-transparent",
                )}
              >
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {step.title}
                  <span className="sr-only">{step.done ? " — done" : " — still to do"}</span>
                </p>
                <p className="mt-1 text-sm text-akira-ink/70">{step.why}</p>
                <p className="mt-1.5 text-sm text-akira-ink/55">{step.how}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => navigate(step.href)}
                    className="min-h-[32px] text-xs font-semibold text-akira-blue hover:underline"
                  >
                    {step.done ? "Open" : "Do this"}
                  </button>
                  {step.done && (
                    <span className="text-xs text-akira-ink/45">
                      {step.count.toLocaleString("en-IN")} found
                    </span>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

import { useState } from "react";

import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFloorStaff, useIdentify, type FloorStaffMember } from "./api";

/**
 * The shared-tablet sign-in: pick your name, enter your PIN. Everything is
 * thumb-sized — this is used standing up, one-handed, mid-shift.
 */
export function PinScreen({ onIdentified }: { onIdentified: () => void }) {
  const { data: staff, isPending } = useFloorStaff(true);
  const identify = useIdentify();
  const [selected, setSelected] = useState<FloorStaffMember | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function press(digit: string) {
    if (pin.length >= 8) return;
    setError(null);
    setPin(pin + digit);
  }

  function submit(fullPin: string) {
    if (!selected) return;
    identify.mutate(
      { profile_id: selected.profile_id, pin: fullPin },
      {
        onSuccess: onIdentified,
        onError: (e) => {
          setPin("");
          setError(e instanceof ApiError ? e.problem.detail : e.message);
        },
      },
    );
  }

  if (!selected) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <h1 className="text-xl font-semibold tracking-tight">Who are you?</h1>
        <p className="text-sm text-akira-ink/55">Tap your name, then enter your PIN.</p>
        <div className="flex flex-col gap-2">
          {isPending && (
            <div className="h-14 animate-pulse rounded-lg bg-akira-ink/8 motion-reduce:animate-none" />
          )}
          {(staff ?? []).map((person) => (
            <button
              key={person.profile_id}
              disabled={!person.has_pin}
              onClick={() => setSelected(person)}
              className={cn(
                "flex min-h-[56px] items-center justify-between rounded-lg border px-4 text-left",
                person.has_pin
                  ? "border-akira-ink/15 bg-white active:bg-akira-ink/5"
                  : "cursor-not-allowed border-akira-ink/8 bg-white text-akira-ink/35",
              )}
            >
              <span className="text-[16px] font-semibold">{person.full_name}</span>
              <span className="text-xs text-akira-ink/45">
                {person.has_pin ? person.role.replace("_", " ") : "no PIN set"}
              </span>
            </button>
          ))}
          {staff && staff.length === 0 && (
            <p className="rounded-lg border border-dashed border-akira-ink/20 bg-white p-6 text-center text-sm text-akira-ink/55">
              No floor staff are assigned to this outlet yet. A manager adds people and PINs from
              the management app.
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-5 px-4 py-6">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight">{selected.full_name}</h1>
        <button
          onClick={() => {
            setSelected(null);
            setPin("");
            setError(null);
          }}
          className="mt-1 min-h-[44px] text-sm font-semibold text-akira-blue"
        >
          Not you? Go back
        </button>
      </div>

      {/* PIN dots */}
      <div
        className="flex justify-center gap-3"
        role="status"
        aria-label={`${pin.length} digits entered`}
      >
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-3.5 rounded-full",
              i < pin.length ? "bg-akira-ink" : "border-2 border-akira-ink/25",
            )}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm font-medium text-akira-red">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <Key key={digit} onClick={() => press(digit)}>
            {digit}
          </Key>
        ))}
        <Key
          onClick={() => {
            setPin("");
            setError(null);
          }}
          subtle
        >
          Clear
        </Key>
        <Key onClick={() => press("0")}>0</Key>
        <Key subtle disabled={pin.length < 4 || identify.isPending} onClick={() => submit(pin)}>
          {identify.isPending ? "…" : "Go"}
        </Key>
      </div>
    </main>
  );
}

function Key({
  children,
  subtle = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { subtle?: boolean }) {
  return (
    <button
      className={cn(
        "min-h-[64px] rounded-xl text-2xl font-semibold transition-colors active:scale-[0.98] disabled:opacity-30",
        subtle
          ? "bg-akira-ink/5 text-base text-akira-ink/70"
          : "border border-akira-ink/12 bg-white text-akira-ink active:bg-akira-ink/5",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

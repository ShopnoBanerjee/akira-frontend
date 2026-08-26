import { useAuth } from "@/features/auth/AuthProvider";

/**
 * Today's runs land here in P5. For now this confirms the staff shell renders
 * and that the signed-in person is scoped to their own outlet.
 */
export function FloorHomePage() {
  const { me } = useAuth();
  if (!me) return null;

  return (
    <main className="flex flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-semibold tracking-tight">Today</h1>
      <div className="rounded-lg border border-dashed border-akira-ink/20 bg-white p-6 text-center">
        <p className="text-[15px] font-medium">No checklists yet</p>
        <p className="mt-1 text-sm text-akira-ink/55">
          Runs are created automatically at 05:00 each day. The checklist runner arrives in a later
          epic.
        </p>
      </div>
      {me.has_pin && (
        <p className="text-center text-xs text-akira-ink/45">Your PIN is set for this device.</p>
      )}
    </main>
  );
}

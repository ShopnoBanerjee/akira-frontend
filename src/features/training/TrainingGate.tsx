import { useEffect, useState, type ReactNode } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { useActor } from "@/features/floor/FloorHomePage";
import { useTrainingStatus } from "./api";
import { FLOOR_STEPS, FLOOR_VERSION, MANAGEMENT_STEPS, MANAGEMENT_VERSION } from "./content";
import { Tour } from "./TourOverlay";
import { stepsFor } from "./tour";

/** Fire this to run the tour again by choice (the menu's "Show me around"). */
export const TOUR_RERUN_EVENT = "akira:tour-rerun";

function useRerunRequested(): [boolean, () => void] {
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    const on = () => setRequested(true);
    window.addEventListener(TOUR_RERUN_EVENT, on);
    return () => window.removeEventListener(TOUR_RERUN_EVENT, on);
  }, []);
  return [requested, () => setRequested(false)];
}

/**
 * Blocks the management shell until the signed-in manager has finished the
 * walkthrough (or, for the owner, skipped it). The page underneath still
 * renders, because the tour points at its controls.
 */
export function ManagementTrainingGate({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const enabled = me != null && me.device == null;
  const status = useTrainingStatus(MANAGEMENT_VERSION, me?.profile_id ?? null, enabled);
  const [rerun, clearRerun] = useRerunRequested();

  const steps = me ? stepsFor(MANAGEMENT_STEPS, me.global_role) : [];
  const required = status.data?.required === true;

  return (
    <>
      {children}
      {me && status.data && (required || rerun) && steps.length > 0 && (
        <Tour
          key={`${status.data.profile_id}:${rerun ? "rerun" : "required"}`}
          steps={steps}
          version={MANAGEMENT_VERSION}
          canSkip={status.data.can_skip}
          record={status.data.record}
          optional={!required && rerun}
          onDone={() => {
            clearRerun();
            void status.refetch();
          }}
        />
      )}
    </>
  );
}

/**
 * The floor shell's gate. On a shared tablet the trainee is whoever entered
 * their PIN, so the status is keyed on the actor and re-read at every
 * handover; a staff member signed in directly is keyed on themselves.
 */
export function FloorTrainingGate({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const actorRaw = useActor();
  const actor = actorRaw ? (JSON.parse(actorRaw) as { profile_id: string; role: string }) : null;
  const isDevice = me?.device != null;
  const traineeKey = isDevice ? (actor?.profile_id ?? null) : (me?.profile_id ?? null);
  const role = isDevice ? actor?.role : me?.global_role;
  const enabled = traineeKey != null;
  const status = useTrainingStatus(FLOOR_VERSION, traineeKey, enabled);

  const steps = role ? stepsFor(FLOOR_STEPS, role as "staff" | "shift_lead") : [];
  const required = status.data?.required === true;

  return (
    <>
      {children}
      {enabled && status.data && required && steps.length > 0 && (
        <Tour
          key={status.data.profile_id}
          steps={steps}
          version={FLOOR_VERSION}
          canSkip={status.data.can_skip}
          record={status.data.record}
          onDone={() => void status.refetch()}
        />
      )}
    </>
  );
}

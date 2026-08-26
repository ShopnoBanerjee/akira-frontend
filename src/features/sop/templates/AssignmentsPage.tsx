import { useState } from "react";

import {
  Button,
  Dialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  TableSkeleton,
} from "@/components/ui/primitives";
import { useHasRole } from "@/components/RoleGate";
import { useOutlets } from "@/features/admin/api";
import { ApiError } from "@/lib/api";
import {
  useAssignments,
  useCreateAssignment,
  useDeleteAssignment,
  useTemplates,
  type Assignment,
} from "./api";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function scheduleLabel(assignment: Assignment): string {
  if (assignment.interval_days === 2) return "alt. days";
  if (assignment.interval_days === 14) return "fortnightly";
  if (assignment.interval_days) return `every ${assignment.interval_days}d`;
  if (assignment.active_weekdays.length === 7) return "daily";
  return assignment.active_weekdays.map((d) => WEEKDAY_LABELS[d]).join(" ");
}

export function AssignmentsPage() {
  const { data: assignments, isPending, isError, refetch } = useAssignments();
  const { data: templates } = useTemplates();
  const { data: outlets } = useOutlets();
  const isAdmin = useHasRole("owner", "ops_manager");
  const [cell, setCell] = useState<{ templateId: string; outletId: string } | null>(null);
  const [removing, setRemoving] = useState<Assignment | null>(null);

  const byCell = new Map((assignments ?? []).map((a) => [`${a.template_id}:${a.outlet_id}`, a]));

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Assignments</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Which outlet runs which checklist, and when. Runs are created each morning from this matrix.
      </p>

      <div className="mt-6">
        {isPending && <TableSkeleton rows={6} />}
        {isError && (
          <EmptyState
            title="Could not load assignments"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        )}
        {templates && outlets && (
          <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                  <th className="px-4 py-2.5 font-semibold">Template</th>
                  {outlets.map((outlet) => (
                    <th key={outlet.id} className="px-4 py-2.5 text-center font-semibold">
                      {outlet.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-akira-ink/5 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-akira-ink/45">
                        {template.category_label} · {template.item_count} items
                      </p>
                    </td>
                    {outlets.map((outlet) => {
                      const assignment = byCell.get(`${template.id}:${outlet.id}`);
                      return (
                        <td key={outlet.id} className="px-2 py-2.5 text-center">
                          {assignment ? (
                            <button
                              disabled={!isAdmin}
                              onClick={() => setRemoving(assignment)}
                              title={isAdmin ? "Click to remove this assignment" : undefined}
                              className="rounded-md bg-akira-blue/8 px-2 py-1 text-xs font-medium text-akira-blue hover:bg-akira-red/10 hover:text-akira-red disabled:hover:bg-akira-blue/8 disabled:hover:text-akira-blue"
                            >
                              {assignment.due_time_local.slice(0, 5)}
                              <span className="ml-1 text-[10px] opacity-70">
                                {scheduleLabel(assignment)}
                              </span>
                            </button>
                          ) : isAdmin ? (
                            <button
                              onClick={() =>
                                setCell({ templateId: template.id, outletId: outlet.id })
                              }
                              className="rounded-md px-2 py-1 text-xs text-akira-ink/30 hover:bg-akira-ink/5 hover:text-akira-ink"
                            >
                              + assign
                            </button>
                          ) : (
                            <span className="text-akira-ink/25">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssignDialog cell={cell} onClose={() => setCell(null)} />
      <RemoveDialog assignment={removing} onClose={() => setRemoving(null)} />
    </main>
  );
}

function AssignDialog({
  cell,
  onClose,
}: {
  cell: { templateId: string; outletId: string } | null;
  onClose: () => void;
}) {
  const create = useCreateAssignment();
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [dueTime, setDueTime] = useState("17:00");
  const [role, setRole] = useState("staff");
  const [grace, setGrace] = useState(30);

  function close() {
    setError(null);
    setDays([0, 1, 2, 3, 4, 5, 6]);
    setDueTime("17:00");
    onClose();
  }

  function submit() {
    if (!cell) return;
    create.mutate(
      {
        template_id: cell.templateId,
        outlet_id: cell.outletId,
        assigned_role: role as never,
        active_weekdays: days,
        due_time_local: dueTime,
        grace_minutes: grace,
      },
      {
        onSuccess: close,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={cell !== null} onClose={close} title="Assign to outlet">
      <div className="flex flex-col gap-4">
        <Field label="Weekdays">
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() =>
                  setDays((current) =>
                    current.includes(day)
                      ? current.filter((d) => d !== day)
                      : [...current, day].sort(),
                  )
                }
                className={
                  "h-9 w-9 rounded-md border text-xs font-semibold " +
                  (days.includes(day)
                    ? "border-akira-ink bg-akira-ink text-white"
                    : "border-akira-ink/15 text-akira-ink/50 hover:bg-akira-ink/5")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Due time (local)">
            <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </Field>
          <Field label="Grace (min)">
            <Input
              type="number"
              min={0}
              max={480}
              value={grace}
              onChange={(e) => setGrace(Number(e.target.value))}
            />
          </Field>
          <Field label="Who runs it">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-2 text-sm"
            >
              <option value="staff">Staff</option>
              <option value="shift_lead">Shift lead</option>
              <option value="outlet_manager">Outlet manager</option>
            </select>
          </Field>
        </div>
        <p className="text-xs text-akira-ink/50">
          A due time after midnight (like 00:30) still belongs to the previous trading day — the
          system handles the rollover.
        </p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            disabled={days.length === 0 || !dueTime || create.isPending}
            onClick={submit}
          >
            {create.isPending ? "Assigning…" : "Assign"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RemoveDialog({
  assignment,
  onClose,
}: {
  assignment: Assignment | null;
  onClose: () => void;
}) {
  const remove = useDeleteAssignment();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={assignment !== null} onClose={onClose} title="Remove assignment?">
      {assignment && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-akira-ink/70">
            <strong>{assignment.template_name}</strong> will stop being scheduled at{" "}
            {assignment.outlet_code}. Runs already created are untouched.
          </p>
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(assignment.id, {
                  onSuccess: onClose,
                  onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
                })
              }
            >
              {remove.isPending ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

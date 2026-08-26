import { useState } from "react";

import {
  Button,
  Dialog,
  EmptyState,
  ErrorNote,
  Input,
  TableSkeleton,
} from "@/components/ui/primitives";
import { useHasRole } from "@/components/RoleGate";
import { ApiError } from "@/lib/api";
import { useSetSetting, useSettingHistory, useSettings, type SettingView } from "../api";

const GROUP_META: Record<string, { title: string; note: string }> = {
  scoring: {
    title: "Scoring & health bands",
    note: "Owner-only. Changes apply from now on; past periods keep the values that were live then.",
  },
  integrity: {
    title: "Photo integrity",
    note: "Thresholds for the duplicate, burst, geofence and size checks.",
  },
  ai_review: {
    title: "AI photo review",
    note: "Advisory only — the AI never blocks a submission and never approves a run.",
  },
  jobs: {
    title: "Jobs & notifications",
    note: "Schedule times and delivery. Jobs themselves arrive in a later epic.",
  },
};

const GROUP_ORDER = ["scoring", "integrity", "ai_review", "jobs"];

export function SettingsPage() {
  const { data: settings, isPending, isError, refetch } = useSettings();
  const [editing, setEditing] = useState<SettingView | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  const isOwner = useHasRole("owner");

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: (settings ?? []).filter((s) => s.group === group),
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 max-w-2xl text-sm text-akira-ink/55">
        Every change is kept as history with who made it and why. A change never rewrites the past:
        reports over old periods use the values that were in force then.
      </p>

      {isPending && (
        <div className="mt-6">
          <TableSkeleton rows={8} />
        </div>
      )}
      {isError && (
        <div className="mt-6">
          <EmptyState
            title="Could not load settings"
            hint="The API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        </div>
      )}

      {grouped.map(
        ({ group, items }) =>
          items.length > 0 && (
            <section key={group} className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-akira-ink/50">
                {GROUP_META[group]?.title ?? group}
              </h2>
              <p className="mt-1 text-xs text-akira-ink/45">{GROUP_META[group]?.note}</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-akira-ink/10 bg-white">
                {items.map((setting) => {
                  const locked = group === "scoring" && !isOwner;
                  return (
                    <div
                      key={setting.key}
                      className="flex items-center justify-between gap-4 border-b border-akira-ink/5 px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{setting.label}</p>
                        <p className="mt-0.5 text-xs text-akira-ink/50">{setting.description}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <code className="rounded bg-akira-ink/[0.05] px-2 py-1 font-mono text-xs tabular-nums">
                          {formatValue(setting)}
                        </code>
                        {!setting.is_set && (
                          <span className="text-[10px] uppercase tracking-wide text-akira-ink/40">
                            default
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          disabled={locked}
                          title={locked ? "Scoring settings are owner-only." : undefined}
                          onClick={() => setEditing(setting)}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" onClick={() => setHistoryKey(setting.key)}>
                          History
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ),
      )}

      <EditSettingDialog setting={editing} onClose={() => setEditing(null)} />
      <HistoryDialog settingKey={historyKey} onClose={() => setHistoryKey(null)} />
    </main>
  );
}

function formatValue(setting: SettingView): string {
  if (setting.type === "boolean") return setting.value ? "on" : "off";
  return String(setting.value);
}

function EditSettingDialog({
  setting,
  onClose,
}: {
  setting: SettingView | null;
  onClose: () => void;
}) {
  const save = useSetSetting();
  const [raw, setRaw] = useState<string>("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setRaw("");
    setNote("");
    setError(null);
    onClose();
  }

  function submit() {
    if (!setting) return;
    let value: unknown = raw;
    if (setting.type === "number" || setting.type === "integer") {
      value = Number(raw);
      if (Number.isNaN(value)) {
        setError("Enter a number.");
        return;
      }
    } else if (setting.type === "boolean") {
      value = raw === "true";
    }
    save.mutate(
      { key: setting.key, value, note: note.trim() || null },
      {
        onSuccess: close,
        onError: (e) => setError(e instanceof ApiError ? e.problem.detail : e.message),
      },
    );
  }

  return (
    <Dialog open={setting !== null} onClose={close} title={setting?.label ?? ""}>
      {setting && (
        <div className="flex flex-col gap-4" key={setting.key}>
          <p className="text-sm text-akira-ink/60">{setting.description}</p>
          <div className="flex items-center gap-2 text-xs text-akira-ink/50">
            <span>
              Current: <code className="font-mono">{formatValue(setting)}</code>
            </span>
            {setting.minimum !== null && setting.maximum !== null && (
              <span>
                · Range {setting.minimum}–{setting.maximum}
              </span>
            )}
          </div>

          {setting.type === "boolean" ? (
            <div className="flex gap-2">
              {["true", "false"].map((option) => (
                <label
                  key={option}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-akira-ink/15 px-3 py-2 text-sm has-[:checked]:border-akira-ink has-[:checked]:bg-akira-ink has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="bool-value"
                    value={option}
                    checked={raw === option}
                    onChange={(e) => setRaw(e.target.value)}
                    className="sr-only"
                  />
                  {option === "true" ? "On" : "Off"}
                </label>
              ))}
            </div>
          ) : setting.choices.length > 0 ? (
            <select
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="h-9 rounded-md border border-akira-ink/15 bg-white px-3 text-sm"
            >
              <option value="" disabled>
                Choose…
              </option>
              {setting.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={String(setting.value)}
              inputMode={
                setting.type === "number" || setting.type === "integer" ? "decimal" : undefined
              }
              aria-label="New value"
            />
          )}

          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this changing? (kept in history)"
            aria-label="Change note"
          />

          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            <Button onClick={close}>Cancel</Button>
            <Button variant="primary" disabled={raw === "" || save.isPending} onClick={submit}>
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function HistoryDialog({
  settingKey,
  onClose,
}: {
  settingKey: string | null;
  onClose: () => void;
}) {
  const { data: history, isPending } = useSettingHistory(settingKey);

  return (
    <Dialog open={settingKey !== null} onClose={onClose} title="Change history">
      {isPending && <p className="text-sm text-akira-ink/50">Loading…</p>}
      {history && history.length === 0 && (
        <p className="text-sm text-akira-ink/60">
          Never changed — the built-in default has always applied.
        </p>
      )}
      {history && history.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {history.map((row) => (
            <li key={row.id} className="rounded-md border border-akira-ink/10 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <code className="font-mono text-xs">{JSON.stringify(row.value)}</code>
                <span className="text-xs text-akira-ink/45">
                  from {new Date(row.effective_from).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-akira-ink/55">
                {row.set_by_name ?? "System"}
                {row.scope === "outlet" && " · outlet override"}
                {row.note && ` — ${row.note}`}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}

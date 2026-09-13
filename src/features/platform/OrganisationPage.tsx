import { useState } from "react";

import {
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  StatusDot,
  TableSkeleton,
} from "@/components/ui/primitives";
import { navigate } from "@/app/navigate";
import { useAuth } from "@/features/auth/AuthProvider";
import { ROLE_LABELS, type UserRole } from "@/features/auth/types";
import { ApiError } from "@/lib/api";
import { formatOutletTime } from "@/lib/dates";
import { formatPaiseShort } from "@/lib/money";
import {
  useOrganisation,
  useUpdateOrganisation,
  type OrganisationDetail,
  type UpdateOrganisation,
} from "./api";
import { formatCount } from "./format";
import { AllowanceBar, StatusBadges, Tile } from "./parts";

/**
 * One customer, as its vendor sees it (D35): usage against allowance, the
 * details and allowances the vendor controls, onboarding per outlet, owners,
 * and what has happened lately. "Open organisation" goes inside to use the
 * customer's own screens as its owner.
 */
export function OrganisationPage({ organisationId }: { organisationId: string }) {
  const { data, isPending, isError, refetch } = useOrganisation(organisationId);
  const { enterOrganisation } = useAuth();

  function openInside(path: string, detail: OrganisationDetail) {
    enterOrganisation({
      id: detail.organisation_id,
      name: detail.name,
      slug: detail.slug,
      onboarded: detail.onboarded_at != null,
    });
    navigate(path);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <a
        href="/platform"
        onClick={(e) => {
          e.preventDefault();
          navigate("/platform");
        }}
        className="text-xs font-semibold text-akira-blue hover:underline"
      >
        ← All organisations
      </a>

      {isPending && (
        <div className="mt-6">
          <TableSkeleton rows={5} />
        </div>
      )}
      {isError && (
        <div className="mt-6">
          <EmptyState
            title="Could not load this organisation"
            hint="It may have been removed, or the API did not respond."
            action={<Button onClick={() => void refetch()}>Try again</Button>}
          />
        </div>
      )}

      {data && (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-akira-ink/55">
                <span className="font-mono text-xs">{data.slug}</span>
                <StatusBadges isActive={data.is_active} onboardedAt={data.onboarded_at} />
              </p>
            </div>
            <Button onClick={() => openInside("/app", data)}>Open organisation</Button>
          </div>

          <UsageSection detail={data} />

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <DetailsForm
              key={`${data.name}|${data.is_active}|${data.onboarded_at ?? ""}`}
              detail={data}
            />
            <AllowancesForm
              key={`${data.usage.outlets.allowed}|${data.usage.people.allowed}|${data.usage.tablets.allowed}`}
              detail={data}
            />
          </div>

          <OutletsSection detail={data} onOpen={(path) => openInside(path, data)} />

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <OwnersSection detail={data} />
            <ActivitySection detail={data} />
          </div>
        </>
      )}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-akira-ink/45">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function UsageSection({ detail }: { detail: OrganisationDetail }) {
  const u = detail.usage;
  return (
    <Section title="Usage">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile label="Outlets" value={<AllowanceBar allowance={u.outlets} />} />
        <Tile label="People" value={<AllowanceBar allowance={u.people} />} />
        <Tile label="Tablets" value={<AllowanceBar allowance={u.tablets} />} />
        <Tile
          label="Checklists"
          value={formatCount(u.checklist_templates)}
          hint={`${formatCount(u.active_assignments)} assigned to outlets`}
        />
        <Tile
          label="Runs, 30 days"
          value={formatCount(u.runs_30d)}
          hint={`${formatCount(u.runs_approved_30d)} approved · ${formatCount(u.runs_missed_30d)} missed`}
        />
        <Tile
          label="Sales, 30 days"
          value={formatPaiseShort(u.net_sales_30d_paise)}
          hint={`${formatCount(u.bills_30d)} bills · ${formatCount(u.uploads_30d)} uploads`}
        />
      </div>
      <p className="mt-2 text-xs text-akira-ink/50">
        Last upload {u.last_upload_at ? formatOutletTime(u.last_upload_at) : "never"} · last
        activity {u.last_activity_at ? formatOutletTime(u.last_activity_at) : "never"}
      </p>
    </Section>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-akira-ink/10 bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function SaveRow({
  pending,
  disabled,
  saved,
  label,
  onSave,
}: {
  pending: boolean;
  disabled: boolean;
  saved: boolean;
  label: string;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {saved && <span className="text-xs text-akira-ink/55">Saved</span>}
      <Button disabled={disabled || pending} onClick={onSave}>
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

function errorText(e: unknown): string {
  return e instanceof ApiError ? e.problem.detail : (e as Error).message;
}

function DetailsForm({ detail }: { detail: OrganisationDetail }) {
  const update = useUpdateOrganisation(detail.organisation_id);
  const wasOnboarded = detail.onboarded_at != null;
  const [name, setName] = useState(detail.name);
  const [isActive, setIsActive] = useState(detail.is_active);
  const [onboarded, setOnboarded] = useState(wasOnboarded);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const changes: UpdateOrganisation = {};
  if (name.trim() && name.trim() !== detail.name) changes.name = name.trim();
  if (isActive !== detail.is_active) changes.is_active = isActive;
  if (onboarded !== wasOnboarded) changes.onboarded = onboarded;
  const dirty = Object.keys(changes).length > 0;

  return (
    <Panel title="Details">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-semibold">Active</span>
          <span className="block text-xs text-akira-ink/55">
            {isActive
              ? "Its people can sign in and use the app."
              : `Suspended: every one of ${detail.name}'s logins is refused from their next click. Nothing is deleted.`}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={onboarded}
          onChange={(e) => setOnboarded(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-semibold">Onboarded</span>
          <span className="block text-xs text-akira-ink/55">
            {onboarded
              ? "Live. Its owners are asked for an authenticator app from their next sign-in."
              : "In development. Owners are not asked for a second factor yet."}
          </span>
        </span>
      </label>

      <ErrorNote>{error}</ErrorNote>
      <SaveRow
        pending={update.isPending}
        disabled={!dirty}
        saved={saved && !dirty}
        label={changes.is_active === false ? "Save and suspend" : "Save details"}
        onSave={() => {
          setError(null);
          setSaved(false);
          update.mutate(changes, {
            onSuccess: () => setSaved(true),
            onError: (e) => setError(errorText(e)),
          });
        }}
      />
    </Panel>
  );
}

const ALLOWANCE_FIELDS = [
  { key: "max_outlets", usage: "outlets", label: "Outlets" },
  { key: "max_people", usage: "people", label: "People" },
  { key: "max_devices", usage: "tablets", label: "Tablets" },
] as const;

function AllowancesForm({ detail }: { detail: OrganisationDetail }) {
  const update = useUpdateOrganisation(detail.organisation_id);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALLOWANCE_FIELDS.map((f) => [f.key, String(detail.usage[f.usage].allowed)])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const problems: string[] = [];
  const changes: UpdateOrganisation = {};
  for (const f of ALLOWANCE_FIELDS) {
    const raw = values[f.key] ?? "";
    const n = Number(raw);
    const inUse = detail.usage[f.usage].used;
    if (!/^\d+$/.test(raw) || n < 1 || n > 100000) {
      problems.push(`${f.label}: a whole number from 1 to 1,00,000.`);
    } else if (n < inUse) {
      problems.push(`${f.label}: ${formatCount(inUse)} already in use, so not below that.`);
    } else if (n !== detail.usage[f.usage].allowed) {
      changes[f.key] = n;
    }
  }
  const dirty = Object.keys(changes).length > 0;

  return (
    <Panel title="Allowances">
      <p className="-mt-2 text-xs text-akira-ink/55">
        How much this customer may have. Reaching an allowance stops them adding more; it never
        removes anything they already have.
      </p>
      {ALLOWANCE_FIELDS.map((f) => (
        <Field key={f.key} label={`${f.label} (${formatCount(detail.usage[f.usage].used)} in use)`}>
          <Input
            type="number"
            min={Math.max(detail.usage[f.usage].used, 1)}
            max={100000}
            value={values[f.key] ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </Field>
      ))}
      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-akira-red">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <ErrorNote>{error}</ErrorNote>
      <SaveRow
        pending={update.isPending}
        disabled={!dirty || problems.length > 0}
        saved={saved && !dirty}
        label="Save allowances"
        onSave={() => {
          setError(null);
          setSaved(false);
          update.mutate(changes, {
            onSuccess: () => setSaved(true),
            onError: (e) => setError(errorText(e)),
          });
        }}
      />
    </Panel>
  );
}

function OutletsSection({
  detail,
  onOpen,
}: {
  detail: OrganisationDetail;
  onOpen: (path: string) => void;
}) {
  return (
    <Section title="Outlets and onboarding">
      {detail.outlets.length === 0 ? (
        <EmptyState
          title="No outlets yet"
          hint="Open the organisation and add its first outlet under Outlets; its onboarding checklist appears here as soon as it exists."
          action={<Button onClick={() => onOpen("/app/settings/outlets")}>Add an outlet</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-akira-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-akira-ink/10 text-left text-[11px] uppercase tracking-wider text-akira-ink/45">
                <th className="px-4 py-2.5 font-semibold">Outlet</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Onboarding</th>
                <th className="px-4 py-2.5 font-semibold">Tablets</th>
                <th className="px-4 py-2.5 font-semibold">Checklists</th>
                <th className="px-4 py-2.5 font-semibold">Runs, 30d</th>
                <th className="px-4 py-2.5 font-semibold">Sales, 30d</th>
                <th className="px-4 py-2.5 font-semibold">Last upload</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {detail.outlets.map((o) => {
                const complete = o.onboarding_done >= o.onboarding_total;
                return (
                  <tr key={o.outlet_id} className="border-b border-akira-ink/6 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{o.name}</p>
                      <p className="font-mono text-xs text-akira-ink/45">
                        {o.code}
                        {o.city ? ` · ${o.city}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDot active={o.is_active} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={complete ? "text-[#1f6e42]" : undefined}>
                        {o.onboarding_done} of {o.onboarding_total} essentials
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(o.tablets)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(o.active_assignments)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCount(o.runs_30d)}</td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                      {formatPaiseShort(o.net_sales_30d_paise)}
                    </td>
                    <td className="px-4 py-3 text-akira-ink/60 whitespace-nowrap">
                      {o.last_upload_at ? formatOutletTime(o.last_upload_at) : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onOpen("/app/onboarding")}
                        className="min-h-[32px] text-xs font-semibold text-akira-blue whitespace-nowrap hover:underline"
                      >
                        {complete ? "Open" : "Continue onboarding"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function OwnersSection({ detail }: { detail: OrganisationDetail }) {
  const roles = Object.entries(detail.people_by_role).sort((a, b) => b[1] - a[1]);
  return (
    <Panel title="Owners and people">
      {roles.length > 0 ? (
        <p className="-mt-2 text-xs text-akira-ink/55">
          {roles
            .map(([role, n]) => `${formatCount(n)} ${ROLE_LABELS[role as UserRole] ?? role}`)
            .join(" · ")}
        </p>
      ) : (
        <p className="-mt-2 text-xs text-akira-ink/55">Nobody yet.</p>
      )}
      {detail.owner_logins.length === 0 ? (
        <p className="text-sm text-akira-ink/65">
          No owner login. Open the organisation and invite one under People.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-akira-ink/6">
          {detail.owner_logins.map((owner) => (
            <li key={owner.profile_id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{owner.full_name}</p>
                <p className="truncate text-xs text-akira-ink/55">{owner.email ?? "No email"}</p>
              </div>
              <div className="text-right">
                <StatusDot active={owner.is_active} />
                <p className="text-[11px] text-akira-ink/45">
                  {owner.last_seen_at
                    ? `seen ${formatOutletTime(owner.last_seen_at)}`
                    : "never signed in"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ActivitySection({ detail }: { detail: OrganisationDetail }) {
  return (
    <Panel title="Recent activity">
      {detail.recent_activity.length === 0 ? (
        <p className="text-sm text-akira-ink/65">Nothing recorded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-akira-ink/6">
          {detail.recent_activity.map((a, i) => (
            <li key={`${a.at}-${i}`} className="py-2 text-sm">
              <span className="font-medium">{a.actor_name ?? "System"}</span>{" "}
              <span className="text-akira-ink/65">
                {a.action} · {a.entity_table.replace(/_/g, " ")}
                {a.outlet_code ? ` · ${a.outlet_code}` : ""}
              </span>
              <p className="text-[11px] text-akira-ink/45">{formatOutletTime(a.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

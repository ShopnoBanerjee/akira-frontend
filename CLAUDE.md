# CLAUDE.md — AKIRA Ops Suite Web

Constitution for the frontend repo. Read this before writing any feature code,
then read `docs/STAGE1_SPEC.md`. When a request conflicts with this file, say so
and ask — do not silently deviate.

**This is one of two repos.** The API lives in a separate repository,
`akira-backend` (`../akira-backend` locally,
`github.com/ShopnoBanerjee/akira-backend`). It owns the database schema, all
business logic, and the OpenAPI contract. See `docs/DECISIONS.md`.

---

## Architecture boundary

- This app calls **the FastAPI backend** for all business data.
- It uses the Supabase JS client for exactly three things:
  1. auth session management,
  2. direct-to-Storage uploads using a signed URL **the API minted**,
  3. realtime subscriptions.
- It **never** queries application tables with the Supabase client. If a screen
  seems to want that, the endpoint is missing — ask for it, do not reach around
  the API.

This is a Vite SPA. There is no `utils/supabase/server.ts` and no
`middleware.ts` — neither has any meaning here. Session refresh is handled by
the Supabase JS client. See `docs/DECISIONS.md` D2.

---

## Layering

Feature-sliced under `src/features/<name>/` with `api/`, `components/`,
`hooks/`, `types.ts`.

**Two shells, different ergonomics, shared auth:**

| Shell      | Audience                                              | Design                                                                               |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/app/*`   | Management (`owner`, `ops_manager`, `outlet_manager`) | Desktop-first. Sidebar, data tables, dashboards.                                     |
| `/floor/*` | Floor and kitchen staff                               | Mobile-first. Single column, thumb-reach actions, large tap targets, minimal chrome. |

- `src/components/ui/` holds shadcn/ui primitives and is **never hand-edited**.
  Extend by composition in `src/components/`.
- Server state is **TanStack Query only**, keyed like
  `['sop', 'runs', outletId, businessDate]`. No global store for server data.
- Zustand is for genuine client UI state only — the offline queue and the active
  run draft. Nothing else.
- Forms use react-hook-form + zod.
- `src/types/api.ts` is **GENERATED** from the API's OpenAPI schema. Never
  hand-edit it. Run `pnpm gen:api` after copying a fresh `openapi.json` from the
  API repo.
- All date handling goes through `src/lib/dates.ts`. No inline date maths in
  feature code — ESLint blocks the common `new Date().toISOString()` form.

---

## The one rule most likely to be broken

**BUSINESS DATE.** This restaurant trades past midnight. A trading night
starting 18:00 Saturday and ending 01:30 Sunday is ONE business day, rolling
over at 05:00 IST — not midnight. Every dated view groups by `business_date` as
returned by the API. Never derive a date from `created_at` in the client.
`src/lib/dates.ts` exposes `formatBusinessDate`, `toBusinessDate` and
`outletNow(outlet)`; use them.

**MONEY.** The API sends integer paise. Format at the render edge only, through
one formatter in `src/lib/`, using Indian digit grouping (₹1,07,500).

---

## The floor shell is used on a shared tablet

Floor staff do not have individual phones. Each outlet has one shared tablet
that holds a single outlet-bound Supabase session; individual staff identify
with a PIN to start and submit a run. See `docs/DECISIONS.md` D3.

Consequences for the UI:

- The floor shell must always make the **current actor** visible — who the app
  believes is performing this run — and make switching cheap.
- Never persist a staff member's identity beyond the run. The next person picks
  up the same tablet.
- A PIN authorises floor actions only. Approvals and anything under `/app`
  require an individual manager login, always.
- Assume the device is shared and public: no personal data on screen at rest,
  and the session should return to the run list when idle.

---

## Design

Brand: red `#ee3345` (primary accent) · blue `#326fb7` (secondary) · ink
`#231f20` · white ground. Health bands: green `#2f9e5f`, amber `#e0a020`, red
`#ee3345`. Typeface Noto Sans, Noto Sans JP for katakana. Flat colour, no
gradients. **Red is for the primary action and the red health band — not for
chrome.** Tokens live in `src/index.css` under `@theme`.

**Empty, loading, offline and error states are designed, not afterthoughts.**
In-store wifi will drop. Every list, chart and detail screen gets a loading
skeleton, an empty state that names the next action, and an error state with
retry. No raw error strings in the UI.

Accessibility on the floor shell is functional, not decorative: minimum 48px tap
targets, no hover-only affordances, one-handed operation, readable at arm's
length in a bright kitchen (high contrast, 16px+ body).

---

## Working rules

- Prefer boring, explicit code over clever abstraction. Small team, internal tool.
- Every non-trivial hook and utility gets a vitest.
- The checklist runner must never lose a half-finished run. Treat that as a
  correctness requirement, not a nicety.

## Commands

```bash
pnpm install
pnpm dev            # http://localhost:5173
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm gen:api        # regenerate src/types/api.ts from openapi.json
```

To refresh the API contract, copy the API repo's `openapi.json` to this repo's
root and re-run `pnpm gen:api`:

```bash
cp ../akira-backend/openapi.json . && pnpm gen:api
```

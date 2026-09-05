# AKIRA Ops Suite — Web

React web client for AKIRA's internal multi-outlet restaurant operations
platform. Two shells share one auth layer: `/app` is the desktop-first
management UI, `/floor` is the mobile-first staff UI used on a shared outlet
tablet.

The API is a separate repository:
[akira-backend](https://github.com/ShopnoBanerjee/akira-backend).

- **Constitution:** [CLAUDE.md](CLAUDE.md) — read first
- **Specification:** [docs/STAGE1_SPEC.md](docs/STAGE1_SPEC.md)
- **Decisions and deviations:** [docs/DECISIONS.md](docs/DECISIONS.md)

## Stack

Vite 6 · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui ·
TanStack Query · TanStack Router · Supabase JS (auth and storage only)

## Setup

```bash
pnpm install
cp .env.example .env.local
```

Both values in `.env.example` are browser-safe by design and work as-is against
the shared Supabase project. You also need the API running on port 8000 — see
the backend repo's README.

## Run

```bash
pnpm dev
```

http://localhost:5173

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deploy

A static build. `public/_headers` and `public/_redirects` configure
Cloudflare Pages or Netlify; `vercel.json` configures Vercel. Set the three
`VITE_*` variables in the host's project settings. The API repo's
`docs/RUNBOOK_DEPLOY.md` §3 has the values and the CSP note.

## API types

`src/types/api.ts` is generated from `openapi.json`, which is copied from the
API repo. Never hand-edit either file. After a backend endpoint change:

```bash
cp ../akira-backend/openapi.json . && pnpm gen:api
```

CI fails if the committed types drift from `openapi.json`.

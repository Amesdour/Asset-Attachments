# Landfill Discharges & Waste Operations Analytics Dashboard

A French-language operations control centre for landfill waste management, tracking discharges, capacity, revenue, and client invoicing for EWGCET Jijel.

## Run & Operate

- `bash scripts/start.sh` — start both the API server (port 3001) and Vite frontend (port 5000)
- `pnpm --filter @workspace/api-server run dev` — run the API server only
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned by Replit)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 3001)
- Frontend: React 19 + Vite (port 5000, proxies /api → 3001)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)
- Charts: Recharts
- UI: Radix UI + Tailwind CSS 4 + shadcn-style components

## Where things live

- `artifacts/api-server/src/routes/dashboard/` — all API endpoints (KPIs, analytics, forecast, logs, AI insights)
- `artifacts/landfill-dashboard/src/` — React frontend
- `lib/db/src/schema/` — Drizzle table definitions
- `lib/api-spec/openapi.yaml` — OpenAPI 3.1 spec (source of truth for API shape)
- `lib/api-client-react/` — generated React Query hooks (run codegen to regenerate)

## Database tables

The app uses both Drizzle-managed tables and raw SQL tables:
- **Drizzle-managed:** `waste_logs`, `landfill_config`
- **Raw SQL (created on import):** `discharges`, `sites`, `waste_types`, `clients`, `users`, `invoices`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Vite dev server proxies `/api/*` to `http://localhost:3001` — keep the API on port 3001
- `pnpm install` must be run from the workspace root, not from individual artifact directories
- The `scripts/start.sh` builds the API before starting, so changes to API code are picked up on restart

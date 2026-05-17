# Ayodhya Police Duty Manager

Full-stack web app for managing police personnel duty assignments, attendance, leave, and reports at Ayodhya Police Line.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Charts: Recharts 2
- PDF: jsPDF + jsPDF-autotable

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (source of truth for DB schema)
  - `events.ts` — special/festival events table
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-zod/src/generated/` — generated Zod schemas from OpenAPI
- `lib/api-client-react/src/generated/` — generated React Query hooks from OpenAPI
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/duty-manager/src/pages/` — React pages
- `artifacts/duty-manager/src/components/layout.tsx` — Admin sidebar nav

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives codegen for both Zod validators (server) and React Query hooks (client). Always edit the spec first, then run codegen.
- **Date storage as text**: The `events.date` column is `text` (ISO date string `YYYY-MM-DD`). Orval generates `zod.coerce.date()` for `format: date` fields, so route handlers convert `Date → toISOString().split("T")[0]` before DB writes.
- **Hooks ordering in React**: `form.watch()` calls must come after `useForm()` declaration. All data-fetching hooks are declared before the form to keep hook order stable.
- **Query options pattern**: Orval-generated hooks require `queryKey` in the `query` options object. Use the generated `getXxxQueryKey()` helpers, or pass a plain array literal.
- **No `console.log` in server**: Use `req.log` in route handlers and the singleton `logger` for non-request code.

## Product

- **Live Board** — real-time view of all on-duty personnel with location/status; PDF download of daily duty report; WhatsApp-ready duty slip sharing
- **Assign Duty** — form to assign personnel to duty points, with conflict detection banner if the selected officer is already on active duty
- **Roster** — full assignment history with filters
- **Events & Festivals** — CRUD for special events/VIP bandobast with required headcount
- **Rotation Fairness** — ranked table of officers by duty frequency; highlights those overdue or never assigned
- **Duty Trends** — bar chart of daily active duties + new assignments (7-day / 30-day view) on the officer dashboard
- **Leave Management** — leave request tracking with active-today summary
- **Biometric** — daily attendance summary

## User preferences

- Hindi labels on admin login panel (गणना कार्यालय)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`, before writing client code that uses the new endpoints.
- Always run `pnpm --filter @workspace/db run push` after adding a new table or column to `lib/db/src/schema/`.
- Do not call `pnpm run dev` at workspace root — use `restart_workflow` instead.
- Vite `server.allowedHosts: true` is required for the Replit proxy iframe to work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

# Sudarshan ERP — Project Overview (for agents)

Read this file first. It exists so an agent can understand the whole system without re-reading every file. It complements, not replaces, `README.md` (setup/run) and `docs/HRMS-Module-Guide.md` (HRMS module from a non-technical user's POV).

## What this is

A custom ERP for **Sudarshan Group** (plastics/manufacturing business), covering inventory, procurement, sales/orders, dispatch/logistics, field sales, HR/attendance/payroll, and admin/RBAC. Two apps in one repo:

- **Web app** (this directory root) — Next.js 16 (App Router), the primary product, backed by MongoDB.
- **`sudarshan-mobile/`** — a separate Expo/React Native app (attendance punch-in/out, owner dashboard, field visits, notifications). It is **git-ignored from this repo** (`/sudarshan-mobile` in `.gitignore`) — it's managed as its own project even though it lives in this folder. It talks to the web app's `/api/*` routes as its backend. See `sudarshan-mobile/AGENTS.md` before touching it — Expo SDK 56 has changed a lot since typical training data; read `node_modules/next/dist/docs/` equivalent (Expo's versioned docs) before writing code there.

**Root `AGENTS.md` warns the same thing about Next.js**: this is *not* the Next.js you remember from training — check `node_modules/next/dist/docs/` for this exact version's APIs/conventions before writing App Router code (route handlers, middleware, params-as-Promise, etc.).

## Stack

- Next.js 16.2.6 (App Router, React 19.2.4), TypeScript
- MongoDB via Mongoose (no Prisma)
- Auth: `iron-session` (cookie sessions, web) + a custom bearer-token scheme (mobile) — see Auth section
- UI: **antd v6** (`antd`, `@ant-design/icons`) is the current/real UI kit; also a large amount of legacy hand-rolled UI in `src/components/erp/ui.tsx` used by the ported prototype screens
- Charts: `recharts`; PDF export: `jspdf`/`jspdf-autotable`; spreadsheets: `xlsx`
- Package manager: repo has `pnpm-lock.yaml`, `bun.lock`, and `yarn.lock` all present — check which one is actually in use before adding a dependency (ask the user; don't assume). `.pnpm-store` exists, suggesting pnpm is primary.

## The two-generation architecture (important, easy to get confused by)

The app was ported from an original single-page prototype (`Sudarshan ERP.html`, referenced in code comments) and is mid-migration to idiomatic Next.js routes. Both generations are live simultaneously:

1. **Legacy/ported generation** — huge monolithic component files in `src/components/erp/`:
   - `dashboards.tsx` (~4200 lines), `modules.tsx`, `modules2.tsx`, `modules3.tsx`, `modules4.tsx`, `admin.tsx`, `auth.tsx`, `shell.tsx`, `ui.tsx`, `mobile.tsx`/`mobile2.tsx` — most marked `// @ts-nocheck`.
   - These are rendered through a **client-side switch**, not file-based routes: `src/app/(erp)/[...segments]/page.tsx` → `ErpApp` (`src/components/erp-app.tsx`) → `renderErpRoute(route, navigate)` (`src/components/erp/render-route.tsx`), which is a big `switch` over path strings.
   - Covers: dashboards (master/admin/owner/production/dispatch), raw material/packaging/spare-parts inventory listing, vendors/PO, invoice verify, customers/orders listing, legacy field-sales screens, legacy HR screens (superseded — see below), reports, user management, design system.
   - Routing/permission gating for this generation is duplicated in `src/lib/erp-routes.ts` (`ERP_ROUTES` allowlist + `pathToRoute`) and `src/lib/nav-permissions.ts`.

2. **New generation** — real Next.js App Router pages under `src/app/(erp)/...` with dedicated components/hooks/lib, used for: all of **HRMS** (`hrms/employees`, `hrms/leave/*`, `hrms/salary/*`, `hrms/payroll`, `hrms/reports/*`, `hrms/holidays`, `hrms/notifications`), **dispatch** (`dispatch/*`, including live tracking, driver check-in, plans), field-sales visit creation/detail (`src/components/field-sales/*`), and the `add` forms for customers/orders/vendors/PO/inventory.
   - `ErpAppInner` (in `erp-app.tsx`) detects these paths (`/hrms/`, `/inventory/`, `/procurement/`, `/dispatch/` prefixes, or exact matches in `ERP_ROUTES`) and lets Next.js render the real page/children instead of going through `renderErpRoute`. New pages still get wrapped in the same `Sidebar`/`Topbar`/`PageShell` chrome from `ErpAppInner`.

**Implication for future work:** when asked to modify a dashboard/module screen, check `render-route.tsx` first to see if it's still legacy (`modules*.tsx`/`dashboards.tsx`) — if so, edit there, don't assume a `src/app/(erp)/<route>/page.tsx` exists. HRMS/dispatch/field-sales-visits are safe to treat as normal Next.js pages.

## Data layer

- **Two Mongo connection helpers exist — use `src/lib/mongodb.ts` (reads `MONGODB_URI`), not `src/lib/db.ts` (reads `MONGO_URI`).** `db.ts` looks like dead/legacy code (only `test-emp.ts`-style scratch scripts might use the other var name). `.env` currently defines both `MONGO_URI` and `MONGODB_URI` — the app's real code path is `MONGODB_URI`.
- **Two `User` model files exist** — `src/models/User.ts` (real one: `email`, `passwordHash`, OTP/reset fields, named export `User`) vs `src/lib/models/User.ts` (older shape: `password` field, default export). `src/models/User.ts` is the one used by session/auth/seed code. Don't import the `src/lib/models/User.ts` one for new work.
- **Generic entity store**: most "simple CRUD" ERP data (customers, orders, vendors, purchase orders, invoices, dispatches, inventory, companies, roles, permissions, notifications, revenue/production chart data) is stored as one Mongo doc per entity key in the `entitystores` collection (model: `src/models/EntityStore.ts`), not as separate collections/models. Key mapping lives in `src/lib/db-entities.ts` (`KEY_MAP`/`REVERSE_KEY_MAP`) and entity shapes in `src/lib/entity-types.ts`. Generic REST is `src/app/api/entities/[key]/route.ts` (GET/POST/PATCH/DELETE), consumed via `useEntityMutation()` (`src/hooks/use-entity-mutation.ts`), which POSTs/PATCHes then refreshes `/api/bootstrap`.
- **HRMS/dispatch/field-sales have real dedicated Mongoose models** instead (more mature subsystems): `src/lib/models/{Employee,EmployeeDraft,LeavePolicy,LeaveRequest,Holiday,SalarySheet,AttendancePunch,AttendanceDevice,AttendanceImportJob,Notification,Role,Driver,DispatchDriverOtp,FieldVisitAssignment}.ts`, each with dedicated API routes under `src/app/api/hrms/*`, `src/app/api/dispatch/*`, `src/app/api/field-sales/*`.
- `/api/bootstrap` (GET) returns the full merged ERP dataset (entity-store data) for the client `ErpDataProvider` (`src/context/erp-data-provider.tsx`), plus `meta.source`/`dbConfigured`/`isEmpty`/`warning` describing whether data came from Mongo, was empty, or fell back to in-memory mock (`USE_MOCK_DATA=true`, dev-only).
- All API JSON responses use the `{ data, error }` envelope (`src/lib/api-response.ts`).

## Auth & authorization

- **Web session**: `iron-session` cookie (`sudarshan_session`), configured in `src/lib/session.ts`. `SESSION_SECRET` must be ≥32 chars in production (falls back to a dev default otherwise).
- **Mobile session**: bearer token verified via `src/lib/mobile-auth.ts` (checked in `src/middleware.ts` for `Authorization: Bearer <token>` on `/api/*`, and again in Node runtime inside each route via `getUserFromRequest`/`api-auth.ts` — middleware runs on the Edge runtime so it does a best-effort check only).
- **`src/middleware.ts`** is the central gate: redirects unauthenticated users to `/login`, forces `/reset-password` when `mustResetPassword` is set, blocks manager-role users from certain routes (`manager-scope-shared.ts`), and enforces per-route module permissions via `canAccessRoute`/`getDefaultLandingRoute` (`nav-permissions.ts`) before letting a dashboard-area request through.
- **RBAC model**: permissions are a `PermissionsMap` — one `{view, add, edit, approve, export}` block per `ModuleKey` (17 modules: dashboard, hr, payroll, inventory_raw/packaging/spares, procurement_vendors/po/invoice, sales_customers/orders, operations_production/quality, dispatch, settings, user_management, reports). Defined in `src/lib/permission-types.ts`; matrix/labels/normalization helpers in `src/lib/rbac-permissions.ts`; route→module mapping in `nav-permissions.ts` (`ROUTE_RULES`); entity-key→module mapping in `src/lib/entity-permissions.ts` (also has `sanitizeEntityPatch`, a denylist stopping generic entity PATCH from touching `role`/`permissions`/`passwordHash`/etc — important security boundary, don't weaken it without checking `src/app/api/entities/[key]/route.ts`).
- Roles referenced in code/docs: `owner`, `admin`, `hr`, `manager`, plus generic `staff`/employee self-service. Manager scoping ("only see employees whose Reporting Manager points to them") lives in `src/lib/manager-scope.ts` / `manager-scope-shared.ts`.

## HRMS module (biggest subsystem — see `docs/HRMS-Module-Guide.md` for the functional/non-technical description)

- Attendance punch-in/out is **mobile-app-only** (GPS required); the old web punch page was intentionally removed (`/hrms/attendance`, `/hrms/attendance/my` — gone on purpose, don't recreate).
- Leave flow: apply (`hrms/leave/apply`) → single-step approval by HR/Admin/Owner/Manager (`hrms/leave/approval`, bulk actions supported) → recorded (`hrms/leave/record`). Balance/policy logic in `src/lib/leave-apply.ts`, `leave-approval-rules.ts`, `hrms-leave-kpi.ts`, `src/lib/models/LeavePolicy.ts`/`LeaveRequest.ts`.
- Payroll: generate → draft → approve → disbursed, monthly salary vs bulk sheet vs daily-wage variants (`src/lib/salary-calc.ts`, `payroll-sheet.ts`, `src/lib/models/SalarySheet.ts`, routes under `api/hrms/salary/*`).
- Biometric device integration exists as a separate ingestion path: `src/app/api/integrations/biometric/{events,import}/route.ts`, `src/lib/biometric-auth.ts`, `src/lib/models/AttendanceDevice.ts`/`AttendanceImportJob.ts`.

## Dispatch / logistics

Real-time-ish delivery tracking: driver check-in/OTP verification, live location updates, public tracking link (`src/app/dispatch/track/[token]/page.tsx`, no auth — in `middleware.ts` PUBLIC_PATHS), Google Maps integration (`src/lib/google-maps-loader.ts`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). Core logic in `src/lib/dispatch-*.ts` (planning service/types, check-in service, driver OTP service, driver session, order filters).

## Field sales

Visit creation/logging/detail with location capture (`src/components/field-sales/*`, `src/lib/field-visit-*.ts`), an activity dashboard, and mobile map view (`field-employee-google-map.tsx`). API under `src/app/api/field-sales/*`.

## Environment variables (`.env` / `.env.local`)

`MONGODB_URI` (the one actually used — see Data layer caveat above), `SESSION_SECRET` (≥32 chars, prod-required), `USE_MOCK_DATA` (dev-only in-memory fallback), `EMAIL_ID`/`EMAIL_PASS` (nodemailer, leave/forgot-password emails), `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`/`APP_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. There is no `.env.example` currently in the repo despite the README referencing one — check with the user before assuming its contents.

## Running / verifying

```bash
npm run dev            # local dev
npm run seed            # populate MongoDB from src/lib/seed-data.ts (idempotent)
npm run seed:employees   # HRMS-specific employee seed (scripts/seed-employees.ts)
npm run build && npm run lint
```
Demo logins (after seed): `rajiv@sudarshan.co.in` / `priya@sudarshan.co.in` / `anil@sudarshan.co.in`, password `sudarshan123`. Full details, data-empty-vs-seeded behavior, and API examples are in the root `README.md` — don't duplicate them here, read that file too.

## Known rough edges (don't be surprised)

- Legacy `src/components/erp/*` files are `// @ts-nocheck` — type errors there are expected/ignored.
- `src/lib/db.ts` and `src/lib/models/User.ts` look like dead code shadowing the real `src/lib/mongodb.ts` / `src/models/User.ts` — verify which is actually imported before trusting either as ground truth.
- Three lockfiles (`pnpm-lock.yaml`, `bun.lock`, `yarn.lock`) coexist; confirm the intended package manager before installing.
- CSV/file upload (import, invoice upload) are metadata-only stubs, not fully wired (per README "Known gaps").
- Some dashboard widgets still use static/hardcoded layout data rather than live Mongo data (per README "Known gaps").

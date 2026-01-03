# Architecture (Prototype)

## High-Level

- **Frontend & routing**: Next.js App Router under `web/src/app/[locale]/*`
- **Localization**: locale segment (`/en`, `/ar`) plus RTL/LTR handling
- **Auth (demo)**: cookie-backed demo persona session
- **Data**:
  - Read-only seed JSON bundled at build time
  - Writable “overlay” in localStorage to simulate editing and governance workflows

## Request Flow (Demo Auth)

1. User selects a persona on `/<locale>/auth/login`
2. App calls `POST /api/session/login` with `{ "userId": "..." }`
3. Server sets `murtakaz_demo_user` cookie
4. Middleware (`web/src/middleware.ts`) gates protected routes based on that cookie and role

## Data Flow (Seed + Local Overlay)

- Seed model is built from JSON via `web/src/lib/seed-adapter.ts`.
- Interactive pages read a base entity from the seed model and then hydrate an “effective” entity from localStorage via `web/src/lib/prototype-store.ts`.

This pattern allows demos of:

- KPI measurement entry and trends
- Risk mitigation notes and escalation flags
- Project milestone updates and execution updates
- Governance change requests and approvals

## Target Data Model (Future DB-backed)

The intended relational model is captured in `prisma/schema.prisma` and described in `docs/prisma-schema.md`.


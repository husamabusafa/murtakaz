# Murtakaz — Strategy Execution & Performance Management (Prototype)

This repository contains an executive-grade **Next.js prototype** for a Strategy Execution & Performance Management System (strategy → initiatives → projects → KPIs → risks → governance), with bilingual **English/Arabic** support.

## What’s In This Repo

- `web/`: Next.js 15 (App Router) UI prototype (demo auth + in-browser persistence).
- `docs/`: Business/product documentation (BRD/PRD/dashboard catalog) plus additional user/developer/ops docs.
- `prisma/`: Prisma schema for the target data model (not yet wired into the prototype UI).
- `docker-compose.yml`: Local PostgreSQL container (for future DB-backed implementation).
- `nixpacks.toml`: Deployment recipe (e.g., Coolify/Nixpacks).

## Quick Start (Prototype UI)

1. Install dependencies and run the web app:
   - `cd web`
   - `npm install`
   - `npm run dev`

2. Open `http://localhost:3000`
   - `/` redirects to `/<locale>` (`/en` default).
   - Protected pages redirect to `/<locale>/auth/login`.

### Demo Login

- Sign in via `/<locale>/auth/login` by selecting a demo persona (Admin, Executive, PMO, Manager, Employee).
- The demo session is stored in a cookie: `murtakaz_demo_user` (client-readable for the prototype).

### Demo Data Persistence

- The prototype reads “seed” data from `web/src/content/seed/*`.
- User edits (KPI measurements, risk notes, project milestone updates, change requests) are stored in `localStorage` under keys like:
  - `murtakaz:kpi:<id>`
  - `murtakaz:risk:<id>`
  - `murtakaz:project:<id>`
  - `murtakaz:cr:<id>`

## Local Postgres (Optional / Future)

The current UI prototype does not read from Postgres yet, but the repo includes a ready-to-run database container:

- Copy `.env.example` to `.env` and adjust if desired
- `docker-compose up -d`

## Documentation

- Docs index: `docs/README.md`
- Product docs: `docs/brd.md`, `docs/PRD.md`, `docs/Dashboards.md`
- User journeys (prototype): `docs/user-guide/user-journeys.md`
- Developer guide: `docs/development.md`
- Deployment guide: `docs/deployment.md`

# murtakaz

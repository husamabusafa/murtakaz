# Development Guide

## Prerequisites

- Node.js (the deployment recipe pins Node 22; recent LTS should work for local development)
- npm

## Install & Run

- `cd web`
- `npm install` (or `npm ci`)
- `npm run dev`
- Open `http://localhost:3000`

## Scripts

Defined in `web/package.json`:

- `npm run dev` — Next.js dev server (Turbopack)
- `npm run build` — Production build
- `npm run start` — Start the production server
- `npm run lint` — Next.js lint

## Environment Variables

See `web/.env.example`. In the current prototype:

- Demo auth does not require external providers.
- `DATABASE_URL` and `NEXTAUTH_*` variables are placeholders for the DB-backed Phase 1 implementation.

## Database & Prisma (Planned)

The repo includes a target schema at `prisma/schema.prisma`, but does not include migrations yet.

If you want to stand up Postgres locally for future work:

- Start Postgres: `docker-compose up -d`
- Set `DATABASE_URL` (see `.env.example` or `web/.env.example`)

When Prisma is integrated (Phase 1), the expected workflow is:

- Generate client: `npx prisma generate`
- Create migrations: `npx prisma migrate dev`
- Apply migrations in production: `npx prisma migrate deploy`

## Repo Layout (Key Paths)

- UI routes: `web/src/app/[locale]/*`
- Locale + translations: `web/src/providers/locale-provider.tsx`
- Demo auth session: `web/src/providers/auth-provider.tsx`, `web/src/app/api/session/*`, `web/src/middleware.ts`
- Seed adapter and model building: `web/src/lib/seed-adapter.ts`, `web/src/content/seed/*`
- Prototype persistence: `web/src/lib/prototype-store.ts`

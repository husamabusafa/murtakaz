# Tech Stack Overview

Target implementation stack for the Strategy Execution & Performance Management System. This document explains the choices, how they fit together, and what to standardize before coding.

---

## Core Stack

- **Next.js** (React, App Router) for the web app, server actions, and API routes.
- **TypeScript** everywhere (strict mode).
- **Tailwind CSS** for styling and design system tokens/utilities.
- **Prisma** as the ORM and migration tool.
- **PostgreSQL** as the primary datastore.
- **NextAuth** for authentication (SSO-ready), with RBAC enforced in app logic.
- **i18n**: App-level internationalization with Arabic (RTL) and English (LTR) support; all copy sourced from translation dictionaries and locale-aware formatting.

---

## Why This Stack

- Next.js + TypeScript: full-stack DX, file-system routing, server actions for secure mutations, strong typing.
- Tailwind: fast UI iteration with consistent spacing/color/typography tokens.
- PostgreSQL: relational integrity for strategy → initiative → project → KPI hierarchy and audits.
- Prisma: type-safe queries, schema-as-code, and migrations tied to Git history.
- NextAuth: battle-tested auth flows with provider flexibility (SSO/OAuth) and session management.
- i18n: Required to serve Arabic and English; RTL-aware layout for Arabic.

---

## High-Level Architecture

- **Frontend/UI**: Next.js App Router pages; Tailwind for styling; component-level RBAC checks to gate actions.
- **i18n**: Locale routing or detection; translation dictionaries for UI copy; RTL handling for Arabic (direction-aware components/layouts).
- **API/Server**: Next.js route handlers and server actions calling Prisma; Zod (or similar) for input validation.
- **Data**: PostgreSQL with Prisma schema derived from the data model in `docs/prisma-schema.md`.
- **Auth**: NextAuth with chosen provider (SSO/OAuth). Sessions stored in a secure cookie; JWT or database adapter as needed.
- **State**: Server components preferred; client components only for interactive widgets. React Query/Server Actions for data fetching/mutations.
- **Observability**: Add request logging and basic metrics (e.g., OpenTelemetry) in Phase 2.

---

## Standards & Conventions

- TypeScript strict; ESLint + Prettier aligned to Next.js defaults.
- Tailwind config defines brand palette, typography scale, spacing, and RAG status colors.
- Component library: prefer headless patterns; keep design system tokens in Tailwind theme.
- Prisma: one `schema.prisma` (PostgreSQL provider). Use `prisma migrate` for schema changes; no manual DB edits.
- Environment config via `.env.local` (app) and `.env` (dev container/CI); never commit secrets.
- Testing: add lint + type checks; integration tests for critical flows (auth, CRUD for initiatives/projects/KPIs).
- i18n testing: snapshot/visual checks for both Arabic (RTL) and English (LTR); ensure bidirectional layout fidelity.

---

## Authentication (NextAuth)

- Provider: finalize (e.g., Azure AD/Google/Okta). Configure client ID/secret and issuer in env.
- Session strategy: JWT by default; switch to database adapter if we need session revocation/audit.
- User model: map provider profile → local User record with role and department. Enforce RBAC in middleware and server actions.
- Protected routes: Next.js middleware to redirect unauthenticated users; role checks in server actions before mutations.

---

## Database & ORM (PostgreSQL + Prisma)

- Schema source: `docs/prisma-schema.md` blueprint. Generate `schema.prisma` from it once open questions are resolved (orgId, soft-delete, RAG rules).
- Migrations: `prisma migrate dev` for local; `prisma migrate deploy` in CI/CD.
- Seeding: seed initial pillars/initiatives/KPIs for demo dashboards.
- Performance: add indexes per blueprint; verify query plans for dashboard filters.

---

## Styling (Tailwind)

- Configure custom theme tokens: colors (including RAG), font stack, spacing scale, border radius.
- Global styles: use Tailwind base/components/utilities; avoid ad-hoc CSS files.
- Components: build primitives (Button, Input, Card, Table, Badge) and compose dashboard views.

---

## Local Development

- Dependencies: Node LTS, pnpm/npm/yarn (choose one and standardize), PostgreSQL instance (local Docker or cloud).
- Useful scripts (to be added): `dev` (Next.js), `lint`, `type-check`, `test`, `prisma:generate`, `prisma:migrate`.
- `.env.local` placeholders (to define): `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, provider-specific keys (e.g., `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`).

---

## Security & Compliance Notes

- Enforce HTTPS in production; secure cookies for NextAuth.
- RBAC checks server-side; never trust client roles.
- Audit: persist change logs per PRD (strategy/KPI changes, ownership/status changes).
- Backups: configure Postgres backups; retention aligned with PRD (≥24 months for KPI measurements/audit logs).

---

## Open Decisions

- Auth provider selection and session storage mode (JWT vs DB adapter).
- Multi-tenancy (orgId in schema) and soft-delete requirements.
- Observability stack (logging/metrics) for Phase 1 vs Phase 2.
- Package manager choice and CI pipeline (lint/type/test/migrate) specifics. 

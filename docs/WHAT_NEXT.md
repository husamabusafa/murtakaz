# What Next: Path to Production

This document outlines the remaining steps to transition the **Murtakaz** system from a prototype (mock data) to a fully functional, database-backed application.

## 1. Core Architecture & Backend Wiring (Critical Path)

The current application uses a `prototype-store` based on `localStorage` and static JSON files. The immediate priority is to replace this with the real backend.

### 1.1. Database Setup
- [ ] **Provision Database**: Ensure a local or cloud PostgreSQL instance is running.
- [ ] **Prisma Setup**:
  - [ ] Verify `prisma/schema.prisma` matches the latest requirements.
  - [ ] Run `npx prisma migrate dev` to create the database schema.
  - [ ] Create `web/src/lib/prisma.ts` to export a global `PrismaClient` singleton (prevent connection exhaustion in dev).
- [ ] **Seeding**:
  - [ ] Write a script (`prisma/seed.ts`) to populate the database with the initial "seed" data currently found in `docs/data/seed/`.
  - [ ] Ensure default users and organizations are created.

### 1.2. Authentication (NextAuth / Auth.js)
The current auth is a mock cookie-based system (`demo-users.ts`).
- [ ] **Install Dependencies**: Add `next-auth@beta` (Auth.js v5) or v4.
- [ ] **Configuration**:
  - [ ] Create `auth.config.ts` and `auth.ts`.
  - [ ] Configure providers (e.g., Azure AD for corporate, or Credentials/Google for dev).
  - [ ] Implement the **Prisma Adapter** to persist sessions and users in Postgres.
- [ ] **Middleware**: Update `web/src/middleware.ts` to use NextAuth session validation instead of `SESSION_COOKIE_NAME`.
- [ ] **Session Management**: Replace `useUser` hook to consume the real NextAuth session.

### 1.3. Server Actions & Data Access
Replace client-side mock store calls with Next.js Server Actions.
- [ ] **Create Action Architecture**: Establish a pattern for server actions (e.g., `web/src/actions/`).
- [ ] **Migrate Read Operations**:
  - [ ] Fetch Pillars/Goals via Prisma.
  - [ ] Fetch Initiatives/Projects via Prisma.
  - [ ] Fetch KPIs and Measurements via Prisma.
- [ ] **Migrate Write Operations**:
  - [ ] Create/Edit/Delete Initiatives.
  - [ ] Update KPI measurements.
  - [ ] Log Contributions (Status updates).
- [ ] **Validation**: Integrate `zod` for input validation in Server Actions.

---

## 2. Feature Implementation (Phase 1 Gaps)

Once the backend is wired, ensure these specific PRD features are fully implemented.

### 2.1. Role-Based Access Control (RBAC)
- [ ] **Enforcement**: Ensure Server Actions check `user.role` before allowing writes (e.g., only Admin/PMO can create Strategy items).
- [ ] **Data Scoping**: Ensure "Manager" and "Employee" roles only see relevant data (if strict scoping is required per PRD).

### 2.2. KPI Governance
- [ ] **History Tracking**: Implement the `KPIChange` logic to track who changed a target/formula and when.
- [ ] **Attachments**: Implement file upload for KPI measurements (currently just a placeholder).

### 2.3. Dashboards & Reporting
- [ ] **Data Aggregation**: Implement efficient queries for dashboard counters (e.g., "At Risk Initiatives").
- [ ] **Filters**: Wire up the dashboard filters (Timeframe, Owner, Status) to real database queries.
- [ ] **Export**: Implement CSV/PDF export functionality using the real data.

---

## 3. DevOps & Deployment

- [ ] **Environment Variables**: Define all required env vars in `.env.example` (DATABASE_URL, AUTH_SECRET, etc.).
- [ ] **CI/CD**: Set up a pipeline to run `prisma migrate deploy` on build.
- [ ] **Dockerfile**: Ensure the Docker setup builds the Next.js app with the Prisma client generated.

---

## 4. Immediate Next Steps (Recommended)

1.  **Install `next-auth`** and configure the basic session provider.
2.  **Create `lib/prisma.ts`** and connect to a local Postgres.
3.  **Migrate one vertical**: Take "Pillars" or "Initiatives" and rewrite the "List" view to fetch from the DB instead of the mock store.

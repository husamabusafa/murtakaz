# Strategy Execution & Performance Management System

A unified platform to align company strategy with execution, track initiatives, projects, and KPIs.

## Overview

This system allows organizations to:
- Define strategic goals and pillars.
- Manage initiatives and projects.
- Track KPIs with role-based dashboards.
- Monitor risk and governance.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: NextAuth.js

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- PostgreSQL (running locally or cloud)

### Installation

1.  **Clone and install dependencies:**

    ```bash
    cd web
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

2.  **Environment Setup:**

    Copy the example environment file:

    ```bash
    cp .env.example .env.local
    ```

    Update `.env.local` with your database credentials and auth secrets.

3.  **Database Setup:**

    Run Prisma migrations to set up the database schema:

    ```bash
    npx prisma migrate dev
    ```

4.  **Run Development Server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to view the application.

## Demo Navigation

- The app uses locale routes: visiting `/` redirects to `/en` (or `/ar`).
- Landing page: `/[locale]` (public).
- Primary app pages: `/[locale]/overview`, `/[locale]/strategy`, `/[locale]/projects`, `/[locale]/kpis`, `/[locale]/risks`, `/[locale]/dashboards`, `/[locale]/approvals`, `/[locale]/admin`.
- Demo auth pages: `/[locale]/auth/login`, `/[locale]/auth/forgot-password`, `/[locale]/profile`, `/[locale]/admin/users`.
- Dashboard catalog (enhanced): `/[locale]/dashboards/executive`, `/[locale]/dashboards/pmo`, `/[locale]/dashboards/pillar`, `/[locale]/dashboards/initiative-health`, `/[locale]/dashboards/kpi-performance`, `/[locale]/dashboards/project-execution`, `/[locale]/dashboards/manager`, `/[locale]/dashboards/employee-contribution`, `/[locale]/dashboards/risk-escalation`, `/[locale]/dashboards/governance`.

## Documentation

- [Product Requirements (PRD)](../docs/PRD.md)
- [Business Requirements (BRD)](../docs/brd.md)
- [Tech Stack](../docs/tech-stack.md)
- [Dashboards](../docs/Dashboards.md)
- [UI/UX](../docs/ui-ux.md)

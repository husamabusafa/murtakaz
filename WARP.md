# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Murtakaz is a bilingual (English/Arabic) Strategy Execution & Performance Management System prototype built with Next.js 15. The current implementation is a UI prototype using seed JSON data with localStorage persistence, with a target Prisma/PostgreSQL data model ready for Phase 1 implementation.

## Development Commands

### Running the Application
```bash
cd web
npm install
npm run dev          # Start dev server (without Turbopack)
npm run dev:turbo    # Start dev server with Turbopack
```
Open `http://localhost:3000` (redirects to `/en` or `/ar` based on locale).

### Building and Production
```bash
cd web
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run Next.js linter
```

### Database (Future Phase 1)
The Prisma schema exists but is not yet wired to the UI:
```bash
# From root:
docker-compose up -d              # Start local Postgres container
npx prisma generate               # Generate Prisma client
npx prisma migrate dev            # Create and apply migrations
npx prisma migrate deploy         # Apply migrations in production
npm run prisma:seed               # Seed database (when implemented)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Radix UI components
- **Charts**: ECharts
- **Target ORM**: Prisma (not yet connected)
- **Target Auth**: better-auth (partially implemented)

### Core Architecture Pattern

**Dual-layer data system (prototype mode)**:
1. **Seed layer**: Read-only JSON files in `web/src/content/seed/` (organizations, users, pillars, goals, initiatives, projects, kpis, kpi_values, risks)
2. **Overlay layer**: User edits stored in localStorage with keys like `murtakaz:kpi:<id>`, `murtakaz:risk:<id>`, `murtakaz:project:<id>`, `murtakaz:cr:<id>`

Key files:
- `web/src/lib/seed-adapter.ts` - Builds in-memory model from seed JSON
- `web/src/lib/prototype-store.ts` - Manages localStorage overlay and provides hooks like `useStoredEntity()`
- `web/src/lib/mock-data.ts` - Exports the built seed model

### Routing Structure

Localized routes under `web/src/app/[locale]/`:
- `/[locale]` - Landing page
- `/[locale]/auth/login` - Demo auth (cookie-based)
- `/[locale]/overview` - Main dashboard
- `/[locale]/strategy` - Strategy view (unused in current impl)
- `/[locale]/nodes/[code]/[nodeId]` - Node drill-down (STRATEGY, PILLAR, OBJECTIVE, INITIATIVE, PROJECT, TASK)
- `/[locale]/projects/[projectId]` - Project details
- `/[locale]/kpis/[kpiId]` - KPI details and measurement entry
- `/[locale]/risks` - Risk management
- `/[locale]/approvals` - Change request approvals
- `/[locale]/dashboards/*` - Role-based dashboards (executive, pmo, manager, employee, etc.)
- `/[locale]/admin/*` - Admin pages (users, organizations)

### Authentication (Demo Mode)

Current implementation uses `better-auth` with cookie-based sessions:
- Middleware (`web/src/middleware.ts`) checks for `better-auth.session_token` cookie
- Demo users defined in `web/src/lib/demo-users.ts`
- Session managed via `web/src/providers/auth-provider.tsx`
- Protected routes redirect to `/[locale]/auth/login` if no session

**Roles**: SUPER_ADMIN, ADMIN, EXECUTIVE, PMO, MANAGER, EMPLOYEE

### Localization

- Supported locales: `en` (default), `ar`
- Locale provider: `web/src/providers/locale-provider.tsx`
- RTL support for Arabic
- All content has bilingual fields (e.g., `title` and `titleAr`)

### Data Model (Target - Not Yet Connected)

The Prisma schema (`prisma/schema.prisma`) defines the production data model:
- **Hierarchical nodes**: Organization → Department → User
- **Strategy hierarchy**: Node (STRATEGY → PILLAR → OBJECTIVE → INITIATIVE → PROJECT → TASK)
- **Performance tracking**: KpiDefinition, KpiValuePeriod, KpiVariable
- **Risk management**: Risk model with severity, mitigation, escalation
- **Governance**: ChangeRequest, ChangeApproval workflows
- **Responsibilities**: ResponsibilityNodeAssignment, ResponsibilityKpiAssignment

Key enums: `Role`, `Status`, `ApprovalStatus`, `NodeTypeCode`, `KpiPeriodType`, `KpiDirection`

## Common Development Patterns

### Adding a New Page
1. Create route under `web/src/app/[locale]/your-route/page.tsx`
2. Add to middleware public routes if not protected (line 26-34 in `web/src/middleware.ts`)
3. Use locale from URL params: `params: { locale: string }`
4. Access translations via `LocaleProvider` context

### Working with Prototype Data
```typescript
// Read base data
import { pillars, kpis } from '@/lib/mock-data';

// Add localStorage overlay for editable entity
import { useStoredEntity, kpiStorageKey } from '@/lib/prototype-store';
const { value, update, hydrated } = useStoredEntity(kpiStorageKey(kpiId), baseKpi);
```

### Creating Components
- UI components in `web/src/components/ui/` (shadcn/ui pattern)
- Feature components in `web/src/components/`
- Use `cn()` utility from `web/src/lib/utils.ts` for className merging

## Known Limitations (Prototype Phase)

1. **No real database**: Prisma schema exists but UI reads from seed JSON + localStorage
2. **Demo auth only**: Cookie-based session is NOT production-secure
3. **No file uploads**: KPI attachments, user avatars are placeholders
4. **No real-time updates**: localStorage changes don't sync across tabs
5. **Limited data scoping**: Role-based filtering is partial; most views show all data
6. **No actual SSO/OAuth**: better-auth is configured but not fully implemented

## Migration to Phase 1 (Database-Backed)

When transitioning from prototype to production (see `docs/WHAT_NEXT.md`):
1. Wire Prisma client (`web/src/lib/prisma.ts` exists but unused)
2. Create Next.js Server Actions in `web/src/actions/` for data operations
3. Replace `mock-data` imports with Prisma queries
4. Implement proper authentication with better-auth providers
5. Add Prisma migrations workflow to deployment pipeline
6. Create `prisma/seed.ts` to migrate seed JSON to database

## Key Documentation

- **README.md** - Quick start and overview
- **docs/development.md** - Detailed development guide
- **docs/architecture.md** - Prototype architecture explanation
- **docs/PRD.md** - Product requirements
- **docs/brd.md** - Business requirements
- **docs/Dashboards.md** - Dashboard catalog and requirements
- **docs/prisma-schema.md** - Data model decisions
- **docs/known-gaps.md** - Intentional prototype limitations
- **docs/WHAT_NEXT.md** - Roadmap to production

## Testing

No test framework is currently configured. When adding tests:
- Check for existing test scripts in `web/package.json`
- Follow Next.js testing conventions (Jest + React Testing Library typical)
- Consult `docs/` for any test strategy documentation

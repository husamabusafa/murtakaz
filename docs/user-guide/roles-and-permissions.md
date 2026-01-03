# Roles & Permissions (Prototype vs Intended System)

## Roles

The prototype defines these roles (see `prisma/schema.prisma` and `web/src/lib/demo-users.ts`):

- `ADMIN`
- `EXECUTIVE`
- `PMO`
- `MANAGER`
- `EMPLOYEE`

## Prototype Access Rules (Implemented)

The Next.js middleware enforces a minimal set of rules (see `web/src/middleware.ts`):

- Marketing pages are public:
  - `/`, `/pricing`, `/faq`, `/about`, `/contact`, `/careers`, `/privacy`, `/terms`
- All other non-API routes require a demo session cookie (`murtakaz_demo_user`)
- `/admin/*` is restricted to `ADMIN` only

## Intended Access Rules (PRD Direction)

The PRD describes richer RBAC and scoping (organization-wide vs department vs assigned work). In the current prototype:

- Many dashboard pages show organization-wide data for demonstration.
- “Owned” and “assigned” filtering is described in UI text but not fully implemented yet.


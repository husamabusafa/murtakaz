# Demo Data & Reset

## What Is “Seed Data”?

The prototype ships with read-only seed content embedded in the app bundle:

- `web/src/content/seed/*` — pillars, goals, initiatives, projects, KPIs, KPI values, risks, users
- `web/src/content/*` — landing page, footer, FAQs, testimonials

## What Gets Saved in Your Browser?

The prototype persists edits in `localStorage` so you can demo workflows without a backend:

- KPI measurements and change log: `murtakaz:kpi:<kpiId>`
- Risk notes and mitigation: `murtakaz:risk:<riskId>`
- Project milestones and updates: `murtakaz:project:<projectId>`
- Governance requests: `murtakaz:cr:<requestId>`

## How to Reset the Prototype

1. Sign out (clears the demo session cookie):
   - Use the user menu → Sign out, or call `POST /api/session/logout`
2. Clear stored demo edits:
   - Open browser devtools → Application/Storage → Local Storage
   - Delete keys beginning with `murtakaz:`

After reset, refresh the page and sign in again.


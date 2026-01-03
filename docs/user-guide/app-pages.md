# App Pages (Prototype)

This is a page-by-page guide to what exists in the current prototype.

## Marketing / Public

- `/<locale>` — Landing page with product positioning and section anchors
- `/<locale>/pricing`, `/<locale>/faq`, `/<locale>/about`, `/<locale>/contact`, `/<locale>/careers`
- `/<locale>/privacy`, `/<locale>/terms`

## Authentication (Demo)

- `/<locale>/auth/login` — Select a demo user and set the session cookie
- `/<locale>/auth/forgot-password` — Placeholder UI

## Workspace (Authenticated)

### Overview

- `/<locale>/overview`
  - Key metrics snapshot (pillars / initiatives / projects / KPIs)
  - “Needs attention” queue (open risks, escalations, stale KPIs, pending approvals)
  - Quick links into Strategy, KPI drill-down, and Approvals

### Strategy

- `/<locale>/strategy` — Pillar catalog
- `/<locale>/strategy/<pillarId>` — Pillar drill-down (initiatives/projects/KPIs/risks)
- `/<locale>/strategy/initiatives/<initiativeId>` — Initiative drill-down (projects/KPIs/risks/updates)

### Projects

- `/<locale>/projects` — Portfolio list (search input is demo-only)
- `/<locale>/projects/<projectId>` — Project details:
  - Summary and health badges
  - Milestone status updates (stored locally)
  - Project update log (stored locally)
  - Linked KPIs/risks from the related initiative

### KPIs

- `/<locale>/kpis` — KPI catalog (search input is demo-only)
- `/<locale>/kpis/<kpiId>` — KPI detail:
  - Trend chart (seeded from demo values, augmented by local measurements)
  - Add measurement (stored locally)
  - Create KPI target change request (stored locally; appears in Approvals)
  - Change log (prototype audit timeline)

### Risks

- `/<locale>/risks` — Risk register
- `/<locale>/risks/<riskId>` — Risk detail:
  - Escalate/de-escalate
  - Close/reopen
  - Mitigation steps and notes (stored locally)
  - Activity log

### Dashboards

- `/<locale>/dashboards` — Dashboard catalog
- `/<locale>/dashboards/executive`
- `/<locale>/dashboards/pmo`
- `/<locale>/dashboards/pillar`
- `/<locale>/dashboards/initiative-health`
- `/<locale>/dashboards/project-execution`
- `/<locale>/dashboards/kpi-performance`
- `/<locale>/dashboards/risk-escalation`
- `/<locale>/dashboards/governance`
- `/<locale>/dashboards/manager`
- `/<locale>/dashboards/employee-contribution`

### Approvals (Governance)

- `/<locale>/approvals` — Queue list
- `/<locale>/approvals/<requestId>` — Detail view (comments + approve/reject)

### Admin

- `/<locale>/admin` — Placeholder org settings and audit highlights
- `/<locale>/admin/users` — Demo users directory (restricted to `ADMIN`)
- `/<locale>/admin/users/<userId>` — Demo user detail (restricted to `ADMIN`)

### Profile

- `/<locale>/profile` — Current persona and access scope summary (prototype)

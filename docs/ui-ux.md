# UI/UX Architecture (Information Architecture & Screens)

A role-based navigation, page catalog, and component map for the Strategy Execution & Performance Management System. This aligns with the BRD/PRD and dashboard requirements.

---

## Primary Navigation (Top-Level)

- **Home / Overview**: personalized landing (RAG summary, assigned items, alerts).
- **Strategy**: Pillars, Goals, Initiatives hierarchy.
- **Projects**: Project list/board, milestones, dependencies.
- **KPIs**: KPI catalog, measurements, governance.
- **Risks & Escalations**: risk list, escalations, mitigation tracking.
- **Dashboards**: role-based dashboards (CEO, PMO, Pillar, Initiative, KPI, Manager, Project, Employee, Risk, Governance).
- **Approvals**: change requests and approvals queue.
- **Admin**: org settings, roles, SSO, audit logs.

Secondary navigation (within pages) uses tabs for sub-views (Summary, KPIs, Risks, Milestones, Team, Updates, History).

---

## Key Pages by Domain

### 1) Home / Overview
- Personalized RAG summary (initiatives/projects owned or contributed).
- “Needs attention” cards (overdue KPIs, at-risk milestones, pending approvals, open risks).
- Quick links to dashboards and recent items.

### 2) Strategy (Pillars/Goals/Initiatives)
- Pillars list with RAG and owner.
- Goal list (optional layer) filtered by pillar.
- Initiative list with health, owner, timeframe, status; inline filters (pillar, owner, status).
- Initiative detail:
  - Summary (health, score, status, dates, owner).
  - KPIs tab (linked KPIs with variance and trend mini-charts).
  - Projects tab (child projects with milestone progress).
  - Risks tab (severity, owner, escalated flag).
  - Updates tab (contribution timeline).
  - History tab (audited changes).

### 3) Projects
- Project list/board view with filters (pillar, initiative, owner, status, tags).
- Project detail:
  - Summary (health, status, dates, dependencies, tags).
  - Milestones tab (timeline with statuses).
  - Team tab (owner, contributors, reviewers; role badges).
  - KPIs tab (linked KPIs, variance).
  - Risks tab (linked risks).
  - Updates tab (contributions feed).
  - History tab (audits).

### 4) KPIs
- KPI catalog with filters (pillar, initiative, project, owner, frequency, status).
- KPI detail:
  - Summary (target, unit, frequency, baseline, owners).
  - Trend chart (measurements over time).
  - Variance cards (current vs target, streaks below target).
  - Lineage (pillar/goal/initiative/project).
  - Change log tab (formula/target changes).
  - Measurements tab (table with add/edit).

### 5) Risks & Escalations
- Risk list with severity, status, owner, context (initiative/project), escalated flag.
- Filters by severity, pillar, initiative, project, status, owner.
- Risk detail with mitigation steps, dates, escalation history.

### 6) Dashboards
- CEO/Executive (strategy health, top risks, KPI attainment, trend direction).
- PMO (alignment coverage, orphaned projects, KPIs without owners, change requests).
- Pillar, Initiative, Project dashboards (health, KPI trends, milestones, risks).
- KPI Performance (variance, trend, freshness).
- Manager/Department (owned items, at-risk KPIs, pending approvals).
- Employee Contribution (assigned projects, contributions, alignment).
- Risk & Escalation (critical risks, aging, mitigation owners).
- Strategy Change & Governance (change log, pending approvals, approval times).
- All dashboards support filters (time range, pillar, owner, status) and drill-down.

### 7) Approvals
- Queue of change requests (entity type, summary, requester, age, status).
- Detail view with before/after payload, comments, approve/reject action.

### 8) Admin
- Organization settings (name, domain).
- SSO/NextAuth provider config placeholders.
- Roles & permissions (assign roles to users).
- Audit log viewer (filter by entity, actor, date).

---

## Reusable Components (Primitives & Patterns)

- App shell (top nav + left rail), breadcrumb, page header with actions.
- Cards with RAG badges and mini-metrics.
- Data tables: sortable, filterable, paginated; bulk actions.
- Filters/Chips: status, pillar, initiative, owner, severity.
- Tabs for subviews.
- KPI trend chart (line), variance badge, freshness indicator.
- Timeline for milestones and history (audits).
- Contribution feed (updates with timestamps, links).
- Risk list items with severity pill and escalation marker.
- Change request diff viewer (before/after).
- Toasts for actions; modal dialogs for confirmations.
- Form components: dropdowns with search, date pickers, tag input, role selector.

---

## Navigation Flows (Drill-Down)

- Dashboard → Pillar → Initiative → Project → KPI/Contribution/Risk.
- KPI list → KPI detail → Measurements/Change log.
- Risk list → Risk detail → Escalation history.
- Approvals queue → Change request detail → Audit/History.

---

## Role-Based Visibility (UI Gates)

- Executive/PMO: all dashboards, all strategy objects.
- Manager: initiatives/projects they own; can create projects under owned initiatives.
- Employee: assigned projects/initiatives; contribute updates; view KPIs linked to assigned work.
- Admin: full access, settings, approvals configuration.

---

## State & UX Considerations

- RAG badges everywhere strategy objects appear.
- Empty states guiding to next action (add KPI, add milestone, log update).
- Loading states with skeletons on dashboards and tables.
- Error states with retry/context links.
- Form validation on critical fields (owner, target, frequency for KPIs; owner for projects).
- Soft-delete awareness: hide deleted items by default; show restore control only for Admin.
- Localization: support Arabic and English. All text strings must be sourced from i18n dictionaries; layout should handle RTL for Arabic. Date/time/number formatting should respect locale.

---

## Exports & Reporting UX

- Dashboard export buttons (CSV/PDF) respecting current filters.
- Watermark exports with user + timestamp.

---

## Open UX Items

- Final chart library choice (e.g., recharts, chart.js).
- Exact empty-state copy per role.
- Whether to include board view (kanban) for projects in Phase 1 or list-only.

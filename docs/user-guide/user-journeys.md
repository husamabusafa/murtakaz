# User Journeys (Prototype)

This document describes the end-to-end “happy paths” that are supported by the current UI prototype in `web/`.

## Journey A — Executive (Situational Awareness → Drill-down)

1. Enter the product at `/<locale>`
2. Sign in via `/<locale>/auth/login` as an `EXECUTIVE`
3. Review the snapshot at `/<locale>/overview`
4. Open dashboards at `/<locale>/dashboards` and select:
   - `/<locale>/dashboards/executive`
   - `/<locale>/dashboards/risk-escalation`
   - `/<locale>/dashboards/kpi-performance`
5. Drill down to an initiative when needed:
   - `/<locale>/strategy/initiatives/<initiativeId>`
6. Drill down to a KPI at `/<locale>/kpis/<kpiId>`
7. Review measurements and trend, then optionally request a KPI target change (creates a governance request)
8. Hand off to PMO to review and apply the request via the Approvals queue

## Journey B — PMO (Governance Queue → Approve/Reject → Apply)

1. Sign in as `PMO`
2. Open `/<locale>/approvals`
3. Select a request: `/<locale>/approvals/<requestId>`
4. Review the Before/After payload and add comments
5. Approve:
   - Sets request status to `APPROVED`
   - Applies the change (for KPI target change requests) to the stored KPI in localStorage
6. Or reject:
   - Sets request status to `REJECTED`

## Journey C — Manager (Execution Tracking → Updates)

1. Sign in as `MANAGER`
2. Open `/<locale>/projects`
3. Pick a project: `/<locale>/projects/<projectId>`
4. Update milestone statuses and post execution updates (stored locally for the demo)
5. Review linked KPIs and risks for the related initiative in the “KPIs & risks” tab

## Journey D — Employee (Assigned Work → Contribution Updates)

1. Sign in as `EMPLOYEE`
2. Open `/<locale>/dashboards/employee-contribution`
3. Choose a project and open its detail page: `/<locale>/projects/<projectId>`
4. Post updates / adjust milestones as a contribution record (stored locally for the demo)

## Journey E — Admin (Directory & Org Settings)

1. Sign in as `ADMIN`
2. Open `/<locale>/admin`
3. Open the users directory: `/<locale>/admin/users`

Notes:

- This is a demo directory backed by seed users (not a full CRUD workflow yet).
- In production, this is expected to be backed by SSO + role assignment.

# Data Model (Target / Prisma)

The target relational model is defined in `prisma/schema.prisma`. The current UI prototype in `web/` does not yet query Postgres/Prisma, but the schema captures the intended Phase 1 backend shape.

## Core Entities

- **Organization**
  - Top-level tenant boundary; owns users, strategy objects, and governance artifacts.
- **User**
  - Belongs to an organization; has a role (`ADMIN`, `EXECUTIVE`, `PMO`, `MANAGER`, `EMPLOYEE`).

## Strategy → Execution

- **Pillar**
  - Strategic pillar owned by a user; contains goals and initiatives.
- **Goal**
  - Optional layer between pillar and initiatives; can also own KPIs directly.
- **Initiative**
  - Execution program under a pillar (optionally linked to a goal); contains projects, KPIs, risks, and contributions.
- **Project**
  - Delivery unit under an initiative; contains milestones, team assignments, KPIs, risks, and contributions.
- **Milestone**
  - Project milestone tracking and delivery status.
- **TeamAssignment**
  - Maps users to projects with a role (`OWNER`, `CONTRIBUTOR`, `REVIEWER`).

## KPIs

- **KPI**
  - Can be attached to a goal, initiative, and/or project; has an owner and optional reviewer.
- **KPIValue**
  - Time-series measurements for KPI readings (`measuredAt`, `value`, optional note/attachment).
- **KPIChange**
  - Audit log entry capturing before/after deltas for important KPI configuration changes.

## Risks

- **Risk**
  - Can be attached to an initiative and/or project; has severity, status, owner, and an escalation flag.

## Governance & Audit

- **ChangeRequest**
  - Tracks proposed changes to governed entities (payload stored as JSON), with an approval status.
- **ChangeApproval**
  - Records an approver’s decision and optional comment per change request.
- **Contribution**
  - Captures progress updates and narrative reporting for initiatives/projects (author + summary + blockers/links).


# Prisma Schema Design (Decisions Locked)

This document captures the finalized design decisions for the Prisma schema (implemented in `prisma/schema.prisma`). It aligns with the BRD/PRD data model and Phase 1 scope.

---

## Locked Decisions

- **Goal layer**: Keep Goal as an optional layer between Pillar and Initiative; Initiative always belongs to Pillar, may also belong to Goal.
- **Multi-tenancy**: Include `Organization` and `orgId` on all primary entities for tenant scoping; queries must filter by `orgId`.
- **Soft-delete**: Use `deletedAt` on primary entities (org, user, pillar, goal, initiative, project, KPI, risk, change request) to preserve history; unique constraints include `deletedAt` to allow recreation after soft-delete.
- **RAG rules**: Health is computed, not user-set. Weighted score = 0.5 (KPI variance) + 0.3 (milestone progress) + 0.2 (risk severity). Thresholds: `GREEN` ≥0.75, `AMBER` 0.5–0.74, `RED` <0.5. Store `health` and `healthScore` for reporting; recompute via business logic.

---

## Modeling Conventions

- Every entity has `id`, `createdAt`, `updatedAt` (UTC). Soft-delete applied to primary entities via `deletedAt`.
- One owner per project; multiple contributors/reviewers allowed.
- RAG health is computed in logic; store snapshots only if needed for reporting.
- Attachments stored as URLs (object storage handled by the app layer).
- Favor explicit FK names and indexes on drill paths (pillar/goal → initiative → project → KPI).

---

## Enumerations (planned)

- Role: ADMIN, EXECUTIVE, PMO, MANAGER, EMPLOYEE
- Status: PLANNED, ACTIVE, AT_RISK, COMPLETED
- MilestoneStatus: PLANNED, IN_PROGRESS, BLOCKED, DONE
- Health: GREEN, AMBER, RED
- RiskSeverity: LOW, MEDIUM, HIGH, CRITICAL
- ApprovalStatus: PENDING, APPROVED, REJECTED
- TeamRole: OWNER, CONTRIBUTOR, REVIEWER

---

## Entities & Key Fields

**User**
- id, email (unique), name, role, department?
- Relations: assignments, updates, approvals, risksOwned.

**Pillar**
- id, title, description, ownerId, timeframe?, status.
- Relations: initiatives.

**Goal** (optional layer; can be omitted if pillars map directly to initiatives)
- id, title, description, pillarId?, ownerId, timeframe?, status.
- Relations: initiatives, kpis.

**Initiative**
- id, title, description, goalId?, pillarId?, ownerId, status, health?, startDate?, endDate?.
- Relations: projects, kpis, risks, updates.

**Project**
- id, title, description, initiativeId, ownerId, status, startDate?, endDate?, dependencies[], tags[].
- Relations: assignments, milestones, kpis, updates, risks.

**Milestone**
- id, projectId, title, dueDate?, status.

**TeamAssignment**
- id, projectId, userId, role (OWNER/CONTRIBUTOR/REVIEWER).
- Constraint: unique (projectId, userId, role) to avoid duplicates; enforce one OWNER per project in logic or constraint.

**KPI**
- id, name, description?, formula?, target, unit?, frequency, baseline?, dataSource?, ownerId, reviewerId?.
- Lineage: goalId?, initiativeId?, projectId? (only one should be set per KPI).
- Relations: measurements, changeLog.

**KPIValue (Measurement)**
- id, kpiId, measuredAt, value, note?, attachment?.
- Index: (kpiId, measuredAt) for time-series queries.

**KPIChange**
- id, kpiId, changedBy (userId), before (json), after (json), reason?, createdAt.

**Contribution (Update)**
- id, authorId, projectId?, initiativeId?, progressPct?, summary, blockers?, risks?, links[].
- Notes: immutable entries; corrections are appended, not edited in place.

**Risk**
- id, title, description?, severity, status, initiativeId?, projectId?, ownerId, escalated (bool).
- Indexes on initiativeId and projectId for dashboard filters.

**ChangeRequest**
- id, entityType (KPI/INITIATIVE/PROJECT/GOAL/etc.), entityId, payload (json before/after), status, requestedBy.
- Relations: approvals.

**ChangeApproval**
- id, changeRequestId, approverId, status, comment?, decidedAt?.
- Constraint: unique (changeRequestId, approverId).

**(Optional) UserPreference**
- id, userId, notification settings (e.g., reminders for KPI updates), locale/timezone.

---

## Relationships (primary paths)

- Pillar → Goal (optional) → Initiative → Project → KPI
- Initiative/Project ↔ Risk
- Project ↔ TeamAssignment ↔ User
- KPI ↔ KPIValue (1-to-many)
- KPI ↔ KPIChange (1-to-many audit)
- ChangeRequest ↔ ChangeApproval (1-to-many)
- Contribution linked to Initiative or Project and authored by User

---

## Indexing & Performance Notes

- Time-series: KPIValue index on (kpiId, measuredAt).
- Drill filters: indexes on initiativeId/projectId/goalId for KPI, Risk, Contribution.
- Ownership filters: optional index on Project.ownerId and Initiative.ownerId if query volume warrants.
- Uniqueness: TeamAssignment (projectId, userId, role); ChangeApproval (changeRequestId, approverId).

---

## Governance & Audit

- Strategy/KPI changes go through ChangeRequest + ChangeApproval; payload stores before/after snapshot.
- KPIChange captures formula/target edits even outside approval flow (for audit history).
- All entities timestamped; consider soft-delete if compliance requires.

---

## Open Decisions Before Implementing Prisma

All listed decisions above are now locked. Remaining optional item: whether to persist notification preferences (`UserPreference`) versus handling externally; not critical to Phase 1 schema.

---

## Next Steps to Generate `schema.prisma`

Completed. See `prisma/schema.prisma` for the generated schema. 

# Known Gaps (Prototype)

This repo contains a working UI prototype plus product/technical documents that describe a fuller Phase 1 system. The gaps below are intentional.

## Backend & Auth

- Postgres/Prisma are not yet wired into the UI (`web/` uses seed JSON + `localStorage`).
- NextAuth / SSO providers are documented but not implemented in the prototype.
- Demo auth uses a client-readable cookie and must not be treated as production security.

## Navigation / Routes

- Some UI areas describe future filtering/scoping (e.g., “owned” initiatives, assignment-based views) that are not fully implemented yet.
  - The prototype prioritizes demonstrating workflows and drill-down over strict data scoping.

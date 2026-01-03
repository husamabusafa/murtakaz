# Getting Started (Prototype)

## Supported Languages

The UI supports:

- English (LTR): `/en`
- Arabic (RTL): `/ar`

Visiting `/` redirects to `/en` by default.

## Sign In (Demo)

1. Open `/<locale>/auth/login`
2. Choose a demo persona (role-based)
3. Click **Continue**

After signing in, you’ll be redirected to the requested destination (or `/<locale>/overview`).

## Primary Navigation

Once signed in, the left navigation exposes:

- Overview
- Strategy
- Projects
- KPIs
- Risks
- Dashboards
- Approvals
- Admin (Admins only)

## What This Prototype Stores

The prototype is intentionally “server-light”:

- Seed data is bundled from JSON files in `web/src/content/seed/*`.
- Your edits are stored in your browser’s `localStorage`.

If you want a clean slate, see `docs/user-guide/demo-data-and-reset.md`.


# Troubleshooting

## App redirects to login unexpectedly

- Protected routes require a demo session cookie.
- Sign in via `/<locale>/auth/login` and select a demo persona.

## Admin pages show “Access denied”

- `/admin/*` is restricted to `ADMIN`.
- Sign in as `System Admin` (demo user `user-admin`).

## Changes “disappear” after refresh

- Demo edits persist in browser `localStorage`.
- If you switched browsers/profiles or cleared storage, the app falls back to seed data.

## Reset to a clean demo state

- See `docs/user-guide/demo-data-and-reset.md`.


# Deployment

## Nixpacks / Coolify

This repo includes `nixpacks.toml` with a deployment pipeline that:

- Installs dependencies in `web/` via `npm ci`
- Builds the Next.js app via `npm run build`
- Starts the server via `npm run start -- -H 0.0.0.0 -p ${PORT:-3000}`

## Environment

- Ensure `PORT` is set by the platform (defaults to `3000` if not)
- If you later enable DB-backed features, you’ll need to set `DATABASE_URL` and any auth provider secrets

## Notes About the Current Prototype

- The current UI prototype does not require Postgres to run.
- Demo authentication uses a client-readable cookie; do not treat this as production security.


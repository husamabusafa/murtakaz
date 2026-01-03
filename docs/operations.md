# Operations (Prototype + Phase 1 Direction)

## Prototype Reality (Today)

- The running service is the Next.js app in `web/`.
- “State” is stored in the browser (cookie + `localStorage`), so the server is effectively stateless.
- There is no production database dependency for the prototype demo.

## Deployment Checklist (Today)

- Ensure the service listens on `0.0.0.0` and uses the platform `PORT` (see `nixpacks.toml`).
- Treat demo authentication as non-secure (client-readable cookie).

## Phase 1 Operational Needs (When DB/Auth Are Enabled)

When Prisma/Postgres and SSO are enabled, operations should cover:

- **Secrets management**: store `NEXTAUTH_SECRET` and provider secrets in the platform secret store.
- **Database**: managed Postgres preferred; backups and PITR enabled.
- **Migrations**: run `prisma migrate deploy` during release.
- **Observability**: app logs + error reporting; track response times for dashboard queries.
- **Access control**: enforce RBAC server-side (not just middleware/UI gating).


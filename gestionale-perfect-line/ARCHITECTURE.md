# Architecture

- Multi-tenant: every business record has tenantId.
- PostgreSQL + Prisma.
- Server-side authorization on every read/write.
- OWNER-only first release.
- Money stored as integer cents.
- Expiry engine: ACTIVE -> EXPIRING -> EXPIRED.
- Idempotent notifications and audit trail.
- Tenant branding/configuration separated from domain logic.
- GDPR retention/export/deletion workflows required before production.
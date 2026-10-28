# Roadmap

1. Foundation — local shell, dependency lockfile and CI setup.
2. First safe domain slice — synthetic-only month/kWh entry, transparent arithmetic, validation, local review and deletion; no actual utility data or tariff claims.
3. Durable workflow — define local protection, consent, retention and recovery before actual data; add PostgreSQL migrations/repository tests only for reviewed non-sensitive metadata.
4. Offline workflow — local writes, outbox, idempotency and conflict UX.
5. Release readiness — access control, audit, accessibility, backups, threat review and deployment.

Thin MVP estimate after foundation: 7-12 focused engineering days; excludes external approval.

# Architecture

- Web: Next.js App Router and server-only route handlers.
- UI: React, Tailwind CSS, React Icons, semantic HTML and explicit status.
- Offline: service worker for public shell; Dexie v2 stores one synthetic-only comparison with two month labels and observed kWh totals. No bill documents, identifiers, costs or estimated causes are stored.
- Database: PostgreSQL 18 in Compose; ordered SQL migrations under db/migrations.
- Domain belongs in src/domain; server access in src/server; view code in app.
- External providers use server-side adapters and environment-only secrets.
- Docker multi-stage build; isolated web/database services per project.

First product record: a synthetic-only monthly usage comparison in IndexedDB. The UI shows current minus previous kWh and relative change without explaining causes or estimating a bill. PostgreSQL mapping, sync and actual bill data remain gated on local protection, recovery and consent requirements.

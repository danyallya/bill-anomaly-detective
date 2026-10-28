# Bill Anomaly Detective

A utility-usage prototype that shows an arithmetic comparison without guessing causes or tariff rules.

Today, it accepts only synthetic monthly kWh totals; it does not import submitted bills or support actual utility records.

> Status: synthetic-only local comparison prototype. It compares two manually entered month labels and kWh totals without estimating causes or tariff terms. Do not enter actual utility-bill data.

## Start locally

- Node.js 24 LTS and Docker Desktop with Compose.
- Copy .env.example to .env and set a development password.
- Install with `npm ci`.
- Start with docker compose up --build.
- App: http://localhost:3111 · PostgreSQL: localhost:5551

For lower-bandwidth installs, use [Offline Dev Vault](https://github.com/danyallya/offline-dev-vault); see docs/DEPENDENCIES.md.

## Foundation

Next.js App Router, TypeScript, React, Tailwind CSS, React Icons, PostgreSQL, Docker Compose, PWA manifest, conservative offline shell, Dexie v2 local comparison drafts, health endpoint, unit tests and CI. English interface.

The service worker caches only the public shell and versioned static files. It does not cache API responses or comparison records. Local IndexedDB values have no application-level encryption, backup or recovery. Use invented values only; delete a comparison in the app or clear the browser profile. Browser backups and secure erasure are outside the prototype's guarantee.

Read AGENTS.md, TASK.md and docs/PROGRESS.md before work.

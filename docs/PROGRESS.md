# Progress log

## 2026-10-27 — foundation

**Done:** localized Next/TypeScript/Tailwind/React Icons/PostgreSQL/Docker/PWA shell, Dexie/outbox starter, health route, metadata test, CI, product brief, task/backlog and operations/security notes.

**Not done:** product workflow, auth, domain tables, sync, release security review, provider, dependency install and lockfile.

**Next:** Import monthly meter use and show transparent comparison.

**Blocker:** GitHub returned “You have created too many repositories, too quickly. Please try again later” after the first public repositories. This project remains committed locally with its intended origin.


## Environment check — 2026-10-27

**Update:** Compose now passes PostgreSQL host, database, user and password as separate environment fields so local password characters do not break a connection URL. docker compose config --quiet passes for all 30 projects; runtime verification is pending Docker access.

Docker service com.docker.service is stopped; Start-Service cannot open it with current permissions. The npm cache registry at localhost:4873 is unavailable. Offline lockfile generation returned ETARGET for eslint-config-next@16.4.3 from the host cache. No dependency install, tests or production build ran; CI reports a warning and skips dependency installation, tests, lint and build until a lockfile is committed.

## 2026-10-28 — Day 1 synthetic comparison

**Done:** added a typed two-period kWh comparison, strict month/value validation, chronological draft/review/reopen lifecycle, exact arithmetic, Dexie v2 persistence, visible unsaved/saved/local-only state, empty/storage-error handling and local deletion. Marked BILL-ANOMALY-002 complete. BILL-ANOMALY-001 remains in progress: actual utility records stay disabled until local protection, recovery and consent are designed.

**Privacy and offline:** the prototype only stores synthetic values in browser IndexedDB. It sends no comparison to PostgreSQL or a server and does not collect bills, provider/tariff data, IDs, address, cost or inferred cause. There is no application-level encryption, backup, access control or secure erasure; do not enter actual utility data.

**Verification:** `npm ci --audit=false --fetch-retries=1 --registry=https://registry.npmjs.org/` installed 403 packages. `npm run verify` passed typecheck, 6 tests across 2 files, lint (0 errors; one existing `postcss.config.mjs` warning) and production build. Vitest emitted an existing config-loader warning. `npm audit --audit-level=moderate --registry=https://registry.npmjs.org/` found 0 vulnerabilities. `docker compose config --quiet` passed; Docker build, app HTTP 200, `/api/health` database-ready and both container health checks passed. Services were stopped without deleting the Postgres volume.

The local Offline Dev Vault answered health checks but cold package tarballs took several minutes. A stale npm packument caused one transient ETARGET during the first public-registry retry; online revalidation and a fresh `npm ci` succeeded. Docker build used the official npm registry for this verification; `.npmrc` remains ignored and configured for the local vault.

**GitHub triage:** the origin initially returned 404 before the public repository was created. After creation, there were 0 open Issues and six open PRs: preparation #1 and Dependabot #2–#6. They had no comments or reviews. Their green `verify` conclusion was not a test pass: `setup-node`, `npm ci` and `npm run verify` were skipped because the base branch had no lockfile. Preparation PR #1 is draft; dependency PRs remain open for review and a real CI run after a lockfile reaches main.

**Next:** keep BILL-ANOMALY-001 open until protection, recovery and consent are designed. The task PR is stacked on preparation PR #1; after #1 is reviewed and merged with authorization, retarget the task PR to `main`. Re-triage Dependabot #2–#6; do not count their skipped checks as verification. Browser end-to-end, screen-reader, cross-browser and PostgreSQL record-flow checks remain open.

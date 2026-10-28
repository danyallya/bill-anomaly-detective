# Verification scope

`npm run verify` runs TypeScript checking, Vitest, ESLint and a production Next.js build.

The domain tests cover month format and ordering, non-negative kWh precision and bounds, zero-baseline percentage handling, draft/review/reopen transitions, chronology, runtime-invalid records and JSON round-tripping. The current UI uses IndexedDB in the browser. No browser end-to-end, screen-reader, cross-browser, PostgreSQL integration or real-bill import test has been run for the synthetic-only slice. Do not use actual utility data in manual checks.

For the Docker smoke check, start the local Offline Dev Vault and Docker Desktop, then run `docker compose config --quiet` and `docker compose up --build -d`. Confirm the web health endpoint and the PostgreSQL health check, then stop with `docker compose down` without removing volumes.

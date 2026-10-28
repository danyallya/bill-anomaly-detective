# Security and data policy

- Collect the minimum data; treat user content as private by default.
- No authentication, authorization, encryption-at-rest or production backup policy exists yet. Do not enter real sensitive data.
- Keep secrets in untracked .env; never expose DB/provider keys to browsers.
- Never cache APIs, authenticated pages or personal records in the service worker.
- Define export, deletion, retention, access logs and incident response before launch.
- Domain guardrail: Separate observed differences from estimated causes; never invent tariff terms.
- Review threat model, roles and offline-device recovery before launch.
- The prototype stores synthetic kWh totals in browser IndexedDB without application-level encryption, access control, backup or recovery. Never enter actual bill values or identifiers. No tariff, currency, provider, account number or cause is estimated. Deletion is limited to the local object store; browser backups and secure erasure are not guaranteed.

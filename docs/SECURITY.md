# Security and data policy

- Collect the minimum data; treat user content as private by default.
- No authentication, authorization, encryption-at-rest or production backup policy exists yet. Do not enter real sensitive data.
- Keep secrets in untracked .env; never expose DB/provider keys to browsers.
- Never cache APIs, authenticated pages or personal records in the service worker.
- Define export, deletion, retention, access logs and incident response before launch.
- Domain guardrail: Separate observed differences from estimated causes; never invent tariff terms.
- Review threat model, roles and offline-device recovery before launch.

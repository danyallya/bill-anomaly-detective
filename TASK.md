# Active task

**ID:** BILL-ANOMALY-001  
**Title:** Import monthly meter use and show transparent comparison.

## Context

The technical shell exists; the product workflow does not. Build the first safe, end-to-end domain slice for Bill Anomaly Detective.

## Acceptance criteria

- Type the bill-periods domain record, validation rules and lifecycle.
- Add a create/review flow that works without a server round-trip.
- Persist a draft with Dexie and show saved, unsaved and sync state truthfully.
- Test valid/invalid input, date/order boundaries and serialization.
- Document retention, deletion and limitations of the offline slice.
- Respect this guardrail: Separate observed differences from estimated causes; never invent tariff terms.

## Status

In progress: added a synthetic-only local comparison prototype with month ordering, kWh validation, a transparent difference formula, review and deletion. Actual utility bill values are not supported because browser storage has no application-level protection, backup or recovery. No bill files, provider, tariff, account, address or cost are collected.

Next: keep BILL-ANOMALY-001 active until safe local protection/recovery and consent requirements are designed. Then consider real bill-period import without inventing causes or tariff terms.

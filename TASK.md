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

Not started. Use insight/001-bill-anomaly. After acceptance passes, update progress and set the next task.

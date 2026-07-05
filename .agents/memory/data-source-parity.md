---
name: Movement map vs report trail data parity
description: Why the Movement Tracking map and Operational Report page must share one query, and where fake geocoding used to hide as real.
---

## Shared query for marker/row parity
The Movement Tracking map and the Operational Report employee-trail view must show
the exact same set of location points for a given employee/date. They previously used
two different SQL queries (one attendance-gated, one a broad raw UNION ALL over a date
range) and produced different counts.

**Why:** any feature that renders the "same" location trail in two places (map markers
vs. table rows, dashboard vs. export, etc.) is at risk of drifting apart if each view
queries independently. The fix was to extract one canonical server-side function
(daily per-employee history for a date) and have both endpoints call it — never let a
report/export view re-derive trail data with different filtering logic than the
live map view.

**How to apply:** when adding a new view of already-tracked data (exports, reports,
summaries), reuse the existing canonical query/helper rather than writing a new SQL
query "for the report." If the numbers must match a source of truth elsewhere in the
app, share the actual function, not just the general logic.

## Fake/mocked utilities can hide as production code
This project had a fully-fake deterministic pseudo-random "geocoder" utility
(deterministic based on lat/lng hash) that looked like a real reverse-geocoding call
but never contacted any geocoding service — it silently generated plausible-looking
but fake address strings.

**Why:** fake data generators that mimic real API shapes are easy to miss during
review since they don't error and "look right" at a glance. Always verify: does this
utility actually call an external API, or does it synthesize output locally?

**How to apply:** when a user reports "garbage" or suspicious-looking data (fake
street names, implausible values, repeating patterns), grep for the function
generating it and check whether it performs a real network/DB call or just computes
a value from inputs with no external source of truth.

---
name: api-map-writing
description: Use when producing or reviewing an API map — the functional-spec artifact that records, per capability, what the codebase must do to deliver it and whether that work already exists. Loaded by the Specification Agent when translating an epic's capabilities into technical touchpoints against the codebase.
---

# Skill: api-map-writing

Defines what a well-formed **API map** looks like for this team. The API map
is the functional-spec artifact: it takes an epic's capabilities (business
intent, already sliced) and records, per capability, what the system must do
to deliver it — and critically, whether that work already exists or is new.

This is a **team-forked template**. The *format* below is what varies by team
— columns, granularity, what counts as a touchpoint, what the resolution
states are named. The *discipline* does not vary and does not live here; it
lives in the Specification Agent: the machine drafts, only the architect
resolves existence, and unresolved rows block decomposition.

You are consumed by the Specification Agent. It reads the codebase; you tell
it what a finished map should contain and how a row is shaped.

The map is rendered as an **attached document** on the epic, not as a comment
— it is a wide table that must stay readable and resolvable across multiple
passes. The Specification Agent authors and regenerates that document in
place; reviewers resolve rows by replying in the thread, never by editing the
document. Design the format for that home: a table that reads cleanly as a
standalone document.

---

## What the map records

One row per technical touchpoint implied by the epic's capabilities. A
capability may produce several touchpoints (a "filter the merchant list"
capability may touch a list endpoint's query parameters and a saved-filter
persistence path — two rows).

| Capability | Touchpoint | Existence | Notes |
|---|---|---|---|
| \<from the epic\> | \<endpoint / data model / integration / client-only behavior\> | `confirm` | \<what the codebase shows, or the open question\> |

*(Variant: teams add columns — payload shape, auth requirement, owning
service, migration flag. Teams may rename the existence states. Keep one
touchpoint per row.)*

## Touchpoint granularity

*(Variant.)* A touchpoint is one thing the system does that either exists or
must be built. Default granularity for this team: one row per endpoint-method
(GET /merchants and POST /merchants are two rows), one row per data-model
change, one row per external integration, one row per distinct client-only
behavior. Split read and write sides when their existence differs.

## Existence states

- `confirm` — the machine has identified a touchpoint from the capability and
  the codebase but cannot determine on its own whether it already exists in a
  usable form. **Every touchpoint is born `confirm`. The machine never
  resolves one.** Only the architect resolves it, because existence is a
  judgment about the real system and its usable surface, not a string match.
- `existing` — the architect confirms the touchpoint exists and is usable as
  is (note any constraints: "exists; do not change payload").
- `extend` — exists but needs additive change (new field, new parameter) that
  preserves the existing contract.
- `new` — must be built.

*(Variant: teams may collapse `extend` into `new`, or add states like
`deprecated` or `blocked-on-migration`.)*

## What a well-formed map guarantees

- Every capability in the epic is accounted for by at least one row (coverage).
- No touchpoint appears twice (no overlap).
- Every row's Notes cite what the codebase actually showed — the file, the
  route, the model — as a relative path within a named surface/repo base
  (e.g. `frontend: features/gateways/gateways.page.ts:233-237`), never an
  absolute URL. The app composes absolute links from the surface's recorded
  base. A row whose Notes say only "probably exists" is not well-formed; it
  should name where it looked.
- Rows that touch a stated hard constraint (an endpoint that must not change)
  flag it explicitly.

## Readiness

The map is ready for architect review when every capability is covered, every
row is a single touchpoint grounded in a codebase citation, and the only
unresolved judgment left is the existence call itself — which is exactly what
the architect is being asked to make.

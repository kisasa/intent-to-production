---
name: api-map-writing
description: Use when producing or reviewing an API map — the functional-spec artifact for an epic, in two sections: the design touchpoints the designer resolves and the technical touchpoints the architect resolves, with a references footer. Loaded by the Specification Agent when translating an epic's capabilities and its area's design assets into touchpoints against the codebase.
---

# Skill: api-map-writing

Defines what a well-formed **API map** looks like for this team. The API map
is the functional-spec artifact for an epic: it takes the epic's capabilities
(business intent, already sliced) and the designer's assets for the epic's
area, and records what the user will see and do, what the system must do to
deliver it, and — critically — whether that work already exists or is new.

This is a **team-forked template**. The *format* below is what varies by team
— columns, granularity, what counts as a touchpoint, what the resolution
states are named. The *discipline* does not vary and does not live here; it
lives in the Specification Agent: the machine drafts, only the architect
resolves existence, and unresolved rows block decomposition.

You are consumed by the Specification Agent. It reads the design assets and
the codebase; you tell it what a finished map should contain and how a row is
shaped.

The map is rendered as an **attached document** on the epic, not as a comment
— it is a wide table that must stay readable and resolvable across multiple
passes. The Specification Agent authors and regenerates that document in
place; reviewers resolve rows by replying in the thread, never by editing the
document. Design the format for that home: two tables that each read cleanly
to the one person who resolves them.

---

## Two sections, one document

The map is read by two people who need different things, so it is written as
two sections addressed to them, plus a references footer for the pipeline.
The Specification Agent authors all of it from one reading of the design
assets and the codebase; the two sections are two views of the same work, not
two documents to keep in step.

Every row, in both sections, is plain English a person can read straight
through (per `tracker-writing`): no file paths, no identifiers, no argument
for the row inside the row. Paths and names go in the footer.

### Section 1 — Design touchpoints (resolved by the designer)

What the user sees and does in this epic's area, read from the designer's
assets. One row per screen element or behavior.

| Screen / view | Touchpoint | What it does | Source | Backed by | Status |
|---|---|---|---|---|---|
| \<the screen or view, in the designer's words\> | \<a form, a field, a link, a list, a state\> | \<plain-language behavior: what shows, what happens, what the default is\> | `asset: <which>` or `inferred` | \<technical touchpoint row(s)\> or `client-only` | `confirm` |

- **Source** says where the reading came from: the named asset (a frame, a
  prototype screen, a findings doc, a transcript), or `inferred` when the
  asset is silent and the behavior has to exist anyway. Inferred rows say what
  was inferred and why, briefly.
- **Backed by** names the technical touchpoint(s) in Section 2 that this
  behavior needs, or `client-only` when it needs nothing behind it. It is
  never blank. A design touchpoint with an empty Backed-by column is a
  missing technical row, not a formatting gap.
- **Status**: `confirm` until the designer resolves it to `confirmed` or
  `corrected` (with the correction applied to the row). The designer may also
  add touchpoints the reading missed, in the thread; the agent adds the rows.

*(Variant: teams may add columns — validation rules, accessibility notes,
copy — or split "What it does" into shown / on-action / default. Keep one
touchpoint per row.)*

### Section 2 — Technical touchpoints (resolved by the architect)

What the system must do to deliver the capabilities and back the design
touchpoints, and whether that work already exists. One row per touchpoint.

| Capability | Touchpoint | Found | Existence | Notes |
|---|---|---|---|---|
| \<from the epic\> | \<endpoint-method / data model / integration / client-only behavior, in plain words\> | \<what discovery found, in a sentence\> | `confirm` | \<constraints, open questions\> |

- **Found** states the discovery result in ordinary words: "found — the
  merchant settings page already has this form"; "found a list endpoint, but
  it has no filter parameter"; "nothing like this exists yet." It is the
  evidence the architect resolves from. It does not contain paths or line
  numbers; those are in the footer.
- **Existence** is the architect's call (states below). The machine never
  sets it.

*(Variant: teams add columns — payload shape, auth requirement, owning
service, migration flag. Teams may rename the existence states. Keep one
touchpoint per row.)*

### Footer — `## References`

Where the agent looked, for the Decompose Agent (which turns these into story
anchors) and for anyone checking the reading. One entry per technical
touchpoint that has a codebase location, as a relative path within a named
surface's recorded repo base, anchored to a **symbol, route, or component
name — never a line range** (`web: features/gateways/GatewaysPage`;
`api: MerchantsController.List`). Line ranges go stale when a sibling story
lands; names survive edits. Never an absolute URL. Design-asset references
(which frame, which page of the findings doc) belong here too, one per design
touchpoint whose Source names an asset.

## Touchpoint granularity

*(Variant.)* A technical touchpoint is one thing the system does that either
exists or must be built. Default granularity for this team: one row per
endpoint-method (GET /merchants and POST /merchants are two rows), one row per
data-model change, one row per external integration, one row per distinct
client-only behavior. Split read and write sides when their existence differs.

A design touchpoint is one thing the user sees or does: a form (with its
fields listed in "What it does"), a link or button, a list with its sort and
filters, a state (empty, loading, error). Split a form into several rows when
its fields have different sources or are backed by different technical
touchpoints.

## Existence states

- `confirm` — the machine has identified a touchpoint from the capability,
  the design touchpoints, and the codebase, but cannot determine on its own
  whether it already exists in a usable form. **Every touchpoint is born
  `confirm`. The machine never resolves one.** Only the architect resolves it,
  because existence is a judgment about the real system and its usable
  surface, not a string match.
- `existing` — the architect confirms the touchpoint exists and is usable as
  is (note any constraints: "exists; do not change payload").
- `extend` — exists but needs additive change (new field, new parameter) that
  preserves the existing contract.
- `new` — must be built.

*(Variant: teams may collapse `extend` into `new`, or add states like
`deprecated` or `blocked-on-migration`.)*

## What a well-formed map guarantees

- Every capability in the epic is accounted for by at least one technical
  touchpoint (coverage).
- Every design touchpoint that needs data or an action behind it names the
  technical touchpoint(s) that back it, or is marked `client-only`
  (cross-section coverage). This is the check that catches a screen designed
  with nothing behind it, and it runs before every checkpoint and after every
  designer addition.
- No touchpoint appears twice in either section (no overlap).
- Every technical row's Found column says what discovery actually showed, in
  words; every location it rests on is in the footer as a symbol or route, not
  a line range. A row whose Found says only "probably exists" is not
  well-formed; the footer should say where it looked.
- Every design row's Source names an asset or says `inferred`; nothing is
  asserted as design without a source.
- Rows that touch a stated hard constraint (an endpoint that must not change)
  flag it explicitly.
- Both sections read as plain English without the footer.

## Readiness

The map is ready for review when every capability is covered, every design
touchpoint is backed or marked client-only, every row rests on a stated source
or a stated discovery result, and the only unresolved judgments left are the
two the reviewers are being asked to make — existence for the architect,
design intent for the designer. Each reviewer's rows are then walked one at a
time in the thread, with a candidate answer offered for each.

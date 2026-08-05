---
name: story-contract
description: The output spec for a well-formed story. Use when producing stories during epic decomposition or checking whether a story is ready for a Specialist. Triggers include 'write a story', 'decompose this epic' (as the output bar), or reviewing story quality.
---

# Story Contract

Defines what a well-formed story looks like in this pipeline. The Evaluation
Agent produces stories against this contract when decomposing an epic.
Stories that do not meet this contract are not ready for a Specialist.

This is a team-forked template: adapt examples and thresholds to your domain;
keep the structure.

---

## What a story is responsible for

A story is the smallest unit of work a Specialist can complete independently.
It is not a task list. It is a scoped, testable slice of behavior with enough
context that a Specialist can write a failing test before touching any code.

---

## Required components

**User value statement**
Identifies who the story serves, what they need to do, and why it matters.
The user type must come from the epic — never a generic "user."

Format: As a [specific user type], I want [action or capability] so that
[outcome or benefit].

- Good: "As an account manager, I want to see current payment status for my
  invoices so that I can answer customer questions without involving
  finance."
- Bad: "As a user, I want to see payment status."

**Component breakdown**
A defined list of what needs to be built or configured for the story to work.
Not prose. Each requirement specific enough that a Specialist knows exactly
what to build.

Includes two parts:
- Requirements: the discrete things that must be built
- Fringe cases: conditions outside the primary flow that must be handled —
  missing data, failed dependencies, unexpected user actions, permission
  boundaries

If a requirement cannot be stated specifically, the story is not ready.

**Acceptance criteria**
Each criterion follows an if/when/then structure.
- If: the condition that must exist
- When: the action the user or system takes
- Then: the outcome that should result

Minimum three criteria per story:
- One for the happy path
- One for an error or failure state
- One for an edge case identified in the fringe cases

A story with only a happy path criterion is not complete.

**Unit tests — intrinsic, but the scenarios are enumerated in the story**
Implementation stories include unit tests as part of done: the specialist
writes the tests during development, where the context is richest. Unit tests
are never separate requirements or separate stories.

But the story must tell the specialist *what* to cover — do not leave scenario
selection to be re-derived at implementation time. Every implementation story
(backend or frontend) carries a **"Unit test scenarios"** section: an
enumerated list of the cases the unit tests must cover, one line each. This is
not new judgment — it is the acceptance criteria and fringe cases restated as
a coverage checklist. Each acceptance criterion is at least one scenario
(happy path, error/failure, edge); each fringe case in the component breakdown
is a scenario. State scenarios, never test code — "adding a tool with a
duplicate name returns a validation error" is a scenario; writing the test is
the specialist's job, with full implementation context.

The point is reviewability: a reader can see what will and will not be tested
before any code exists, and the specialist implements against an explicit list
rather than guessing at coverage. A story missing this section is not ready
for an implementation specialist.

Dedicated test stories still exist only for integration tests (Tests
Specialist) and E2E flows (E2E Specialist), which verify across stories and
carry dependencies on the development they verify.

**Codebase anchors**
Required whenever the story was drafted with codebase access. Requirements
that say "follow the existing pattern" must name the pattern: the file
paths, component names, endpoint routes, or modules the work touches or
mirrors. "Following the existing list+modal pattern" is abstract; "following
the list+modal pattern in \`GatewaysSection\`/\`GatewayModal\`" is a starting
point a developer can open. A story is not ready for a specialist if its
grounding lives only in the drafter's session.

Anchors are relative paths within a named surface/repo base (carried down
from the Specification Agent's recorded bases), e.g. `frontend:
features/gateways/gateways.page.ts:233-237` — never absolute URLs. The base is
recorded on the epic, so a relative anchor resolves for both readers: a human
composes the link, and the specialist — which works in a local checkout of that
surface — opens the path directly. Neither the story nor the anchor has to know
the repo's absolute location.

**Evidence pointers**
Expected for any story with a user-facing surface; optional elsewhere. Names
the specific artifacts from the project's evidence that anchor this story —
screenshot filenames with what each shows, quoted lines from source notes.
For UI work the design asset is the spec: prose describes it,
the image resolves it. A pointer must be specific enough that the specialist
can retrieve the artifact itself through the tracker — nothing is pre-resolved
and handed to it.

**Scope boundary**
State what this story does not cover if anything adjacent might be assumed in
scope. Prevents scope creep at the Specialist stage.

**Blocking dependencies**
Lists the sibling stories that must be complete before this story can begin
— each entry carrying the blocker's issue identifier and title (the tracker
auto-links identifiers, so every entry is one click from the blocker) — or
"No blocking dependencies." This section has one author: the Decompose Agent
renders it from its own dependency graph, in dependency order so identifiers
exist at render time. The specialist honors it, and looks each entry's state up
itself through the tracker — completion status is never handed to it.

Format, one requirement added for mechanical readability: each entry is its
own bullet line, and the blocker's bare issue identifier is the first token
on that line — e.g. `- PROJ-42 — Add refund data model`. Whatever prose
follows the identifier is free; the identifier's position is the only fixed
part, and it's what lets a pre-dispatch check confirm every blocker is Done
without depending on any particular wording after it.

**Assignment metadata**
Every story carries three assignment fields, applied as labels at
decomposition time:

- `specialist` — backend, frontend, tests, or e2e. Which specialists exist
  and what their domains cover is engagement context, not part of this
  contract.
- `size` — small, medium, or large: relative effort within this epic. A story
  dramatically larger than its siblings fails the decomposition size band
  even when the count passes.
- `tier` — small, mid, or large: which execution tier (model class) runs the
  specialist for this story. This is cost control applied per story — routine
  stories run on cheaper tiers; stories with architectural surface run on
  stronger ones. Specialists are dispatched by a developer, not routed by the
  app, so today this label informs a human's model choice rather than driving
  automated routing.

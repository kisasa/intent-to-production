---
name: story-contract
description: The output spec for a well-formed story. Use when producing stories during epic decomposition or checking whether a story is ready for a Specialist. Triggers include 'write a story', 'decompose this epic' (as the output bar), or reviewing story quality.
---

# Story Contract

Defines what a well-formed story looks like in this pipeline. The Evaluation
Agent produces stories against this contract when decomposing an epic.
Stories that do not meet this contract are not ready for a Specialist.

This is a team-forked template. Adapt examples and thresholds to your domain.
Keep the structure.

---

## What a story is responsible for

A story is the smallest unit of work a Specialist can complete independently.
It is a scoped, testable slice of behavior. It is not a task list. It carries
enough context that a Specialist can write a failing test before touching any
code.

---

## Required components

**Title**
Prefixed `Story: `, then a verb phrase naming the change being made. Epics are
noun phrases naming an area. Stories are verbs naming work. The grammar alone
tells a reader which one they are looking at.

The prefix carries the hierarchy into the places the tracker's own display does
not reach. Those places are a flat search, a filtered list, a Slack unfurl, and
a notification.

**Sibling stories must be distinguishable by their first few words.** This is
the rule that matters most in practice and the one most often broken.
Decomposition produces stories that share a subject, so they come out sharing
an opening. Five titles that all begin "Add payment status…" are five identical
rows in every truncated view. Front-load the word that separates this story
from the ones next to it.

- Good: "Story: Seed the employee roster with role and department"
- Good: "Story: Resolve role and department at login"
- Bad: "Story: Employee roster" — no verb, and it names an area, so it reads as
  an epic.
- Bad: "Story: Add employee roster data model and seed it with multiple records
  spanning all four tiers" — the body's job.
- Bad: "Story: API: expose payment status" — one prefix only. The
  `surface:*` label already says which surface this is. The tracker shows
  labels wherever it shows titles.

Do not repeat the epic's title in the story's. A reader arriving at the story
can see its parent. The words spent restating it are words not spent saying
what makes this story different.

Linear derives `gitBranchName` from the title, so the prefix appears in the
branch name too. That is fine and mildly useful. It marks the branch's level
in the chain.

**User value statement**
Identifies who the story serves, what they need to do, and why it matters.
The user type must come from the epic. Never use a generic "user."

Format: As a [specific user type], I want [action or capability] so that
[outcome or benefit].

- Good: "As an account manager, I want to see current payment status for my
  invoices so that I can answer customer questions without involving
  finance."
- Bad: "As a user, I want to see payment status."

**Component breakdown**
A defined list of what needs to be built or configured for the story to work.
Write it as a list rather than prose. Each requirement is specific enough that
a Specialist knows exactly what to build.

Includes two parts:
- Requirements: the discrete things that must be built
- Fringe cases: conditions outside the primary flow that must be handled, such
  as missing data, failed dependencies, unexpected user actions, and permission
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
Implementation stories include unit tests as part of done. The specialist
writes the tests during development, where the context is richest. Unit tests
are never separate requirements or separate stories.

But the story must tell the specialist *what* to cover. Do not leave scenario
selection to be re-derived at implementation time. Every implementation story
carries a **"Unit test scenarios"** section. This applies to backend and
frontend stories alike. The section is an enumerated list of the cases the
unit tests must cover, one line each. It is the acceptance criteria and fringe
cases restated as a coverage checklist. Each acceptance criterion is at least
one scenario, whether it covers the happy path, an error or failure state, or
an edge case. Each fringe case in the component breakdown is a scenario. State
scenarios, never test code. "Adding a tool with a duplicate name returns a
validation error" is a scenario. Writing the test is the specialist's job,
with full implementation context.

The point is reviewability. A reader can see what will and will not be tested
before any code exists. The specialist implements against an explicit list
rather than guessing at coverage. A story missing this section is not ready
for an implementation specialist.

Dedicated test stories exist only when the coverage needs more than one
story's work merged: cross-story integration tests and E2E flows. Each carries
the `surface:` label of the test project it is written in and is dispatched to
the specialist like any other story. These stories verify across stories and
carry dependencies on the development they verify.

**Scope boundary**
State what this story does not cover if anything adjacent might be assumed in
scope. Prevents scope creep at the Specialist stage.

## The references footer

Everything that points somewhere else lives at the bottom of the story, under
a `## References` heading, and nowhere else. Paths, identifiers, and design
assets do not appear in the middle of a requirement.

This is a readability rule with a real cost attached, and the trade is
deliberate. A requirement and its anchor are no longer in the same sentence.
So the anchor entry has to say which requirement it serves. That is a small
price for prose a person can read straight through. See `tracker-writing.md`
for the house standard this follows.

Leave the heading out when there is nothing to reference.

```
## References

- Existing employee model — `frontend: core/models/auth/employee.model.ts`
- List and modal pattern, for the roster table — `frontend: features/gateways/GatewaysSection` and `GatewayModal`
- Login screen mockup — the epic's design evidence, "Sign in" frame
- Blocked by — PROJ-42 Add refund data model
```

**Codebase anchors**
Required whenever the story was drafted with codebase access. Requirements
that say "follow the existing pattern" must name the pattern: the file
paths, component names, endpoint routes, or modules the work touches or
mirrors. "Following the existing list+modal pattern" is abstract. "Following
the list+modal pattern in \`GatewaysSection\`/\`GatewayModal\`" is a starting
point a developer can open. A story is not ready for a specialist if its
grounding lives only in the drafter's session.

Anchors are relative paths within a named surface/repo base. The base is
carried down from the Specification Agent's recorded bases. Each anchor points
to a **symbol, route, or component name**. It is **never a line range**.
Examples are `frontend: features/gateways/GatewaysSection` and `api:
MerchantsController.List`. Anchors are never absolute URLs. Line ranges go
stale the moment a sibling story lands in the same file. Specialists in the
first full engagement reported exactly that, repeatedly. A name survives
edits. The base is recorded on the epic, so a relative anchor resolves for both
readers. A human composes the link. The specialist works in a local checkout
of that surface and opens the path directly. Neither the story nor the anchor
has to know the repo's absolute location.

**Evidence pointers**
Expected for any story with a user-facing surface. Optional elsewhere. Names
the specific artifacts from the project's evidence that anchor this story.
Those are screenshot filenames with what each shows, and quoted lines from
source notes. For UI work the design asset is the spec. Prose describes it and
the image resolves it. A pointer must be specific enough that the specialist
can retrieve the artifact itself through the tracker connector.

**Blocking dependencies**
Lists the sibling stories that must be complete before this story can begin,
or says "No blocking dependencies." Each entry carries the blocker's issue
identifier and title. The tracker auto-links identifiers, so every entry is
one click from the blocker. This section has one author. The Decompose Agent
renders it from its own dependency graph. It renders in dependency order so
identifiers exist at render time. The specialist honors it and looks each
entry's state up itself through the tracker.

The format has one requirement, added for mechanical readability. Each entry
is its own bullet line. The blocker's bare issue identifier is the first token
on that line, e.g. `- PROJ-42 — Add refund data model`. Whatever prose
follows the identifier is free. The identifier's position is the only fixed
part. It is what lets a pre-dispatch check confirm every blocker is Done
without depending on any particular wording after it.

**Assignment metadata**
Every story carries three assignment fields, applied as labels at
decomposition time:

- `surface` — one or more, applied as `surface:<name>`, e.g. `surface:web`.
  Each names a place work happens: a repo, or a project inside one. It is
  recorded on the epic as `Repo base — <name>`. The prefix is fixed, because
  the dispatch trigger reads it mechanically to route a story. The vocabulary
  is not fixed. A surface is whatever this engagement actually has, so `web`,
  `mobile`, `api`, and `e2e` are equally valid. Nothing is gained by forcing a
  mobile app to be labelled "frontend."

  A story may carry several surface labels **only when they all resolve to the
  same repo and ref**. Then it is one branch, one pull request, one reviewer,
  and one atomic merge. The labels simply widen what the specialist may write.
  A feature and the flow test proving it can ship together this way. Labels
  resolving to different repos would mean pull requests that must land in step
  across repositories. Nothing coordinates that. That is two stories.

  There is no outcome label. It was removed 2026-08-07. The specialist's own
  comment is the only record of what happened on a run.
- `size` — small, medium, or large: relative effort within this epic. A story
  dramatically larger than its siblings fails the decomposition size band even
  when the count passes. Also feeds the specialist's turn budget mechanically
  now. See `tier`, below.
- `tier` — small, mid, or large: which execution tier runs the specialist for
  this story. A tier is a model class. This is cost control applied per story.
  Routine stories run on cheaper tiers. Stories with architectural surface run
  on stronger ones. Model-class selection itself is not yet automated from it,
  so the tier still only informs that choice today. But dispatch is
  app-driven, through `webhook-listener`'s specialist-dispatch lane. `tier`
  and `size` together already size the specialist's turn budget mechanically,
  in `dispatch-trigger.ts`'s `resolveMaxTurns`. Each independently multiplies
  a base turn count. The two are genuinely different axes. Tier is
  architectural weight and size is volume of work. A story can be light on one
  and heavy on the other.

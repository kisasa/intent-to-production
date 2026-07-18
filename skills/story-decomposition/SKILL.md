---
name: story-decomposition
description: How to break an approved epic into dependency-sequenced, atomic stories, including the size band and its routing behavior. Use when decomposing an epic into stories or reviewing a decomposition. Triggers include 'break this epic into stories' or 'decompose'.
---

# Skill: story-decomposition

How the Decompose Agent breaks an epic into dependency-sequenced stories.
This runs after the epic has passed evaluation and the PM has approved the
checkpoint — not before.

This is a team-forked template: the size band values are yours to set; the
routing behavior when a band trips is structural and should survive any fork.

---

## When to decompose

Decompose only when the epic satisfies all required components in
`epic-writing.md` and the PM has explicitly approved the checkpoint.
Decomposing an incomplete epic produces stories built on gaps. Those gaps
surface at the Specialist stage where they are more expensive to fix.

---

## What makes a story atomic

A story is atomic when:
- It is bounded by what a single Specialist can execute reliably in one
  issue without drifting — the denominator is agent scope, not calendar
  time; specialists are agents, and the pipeline's scarce resource is human
  review throughput, not developer hours
- It has a single, testable concern
- It can be verified independently without requiring sibling stories to be
  complete first
- It maps to a coherent slice of user behavior, not a layer of the technical
  stack

Stories that fail atomicity:
- "Build the payment service" — too large, not a single concern
- "Add database schema and API and UI for invoices" — three stories, not one
- "Handle all edge cases for the checkout flow" — not scoped or testable

---

## How to identify story boundaries

Work from the epic outward. Natural breakpoints are:

**By user type.** If the epic serves multiple named roles with distinct
needs, each role's primary flow is likely a separate story. Shared behavior
can be a dependency story that others block on.

**By system surface.** API behavior, UI behavior, and background processing
are usually separate stories. A story that spans all three is typically too
large.

**By distinct behavior.** Each discrete user action with a testable outcome
is a candidate story boundary. If two behaviors share acceptance criteria,
they may belong in the same story. If they have independent criteria, split
them.

**By failure mode.** Error handling and edge cases belong in the story they
relate to — not as separate stories. Do not create a story called "handle
errors for X."

**Test stories — what exists and what never does.** Never create unit-test
stories: unit tests are intrinsic to each implementation story, written by
its specialist during development. Dedicated test stories exist for exactly
two things, both verifying *across* implementation stories: integration
tests (Tests Specialist) and E2E user flows (E2E Specialist). They sit late
in the dependency graph, blocked by the implementation stories they verify —
typically one integration story per API seam worth exercising and one E2E
story per epic covering its primary user flows. These count against the size
band like any other story.

---

## Dependency sequencing

Identify blocking relationships before finalizing the story list. Common
patterns:

- Data models and schema changes block everything that reads or writes that
  data
- Authentication and permission stories block stories that require access
  control
- API stories block UI stories that consume them
- Shared infrastructure stories (logging, error handling, config) block
  stories that depend on them

Express dependencies as: "Story B is blocked by Story A." Dependencies should
be one-directional. Circular dependencies indicate the story boundaries are
wrong — revisit the decomposition.

Arrange stories in the issue tracker as a hierarchy:
- Epic is the parent issue
- Stories are sub-issues of the epic, **flat** — never nested under each
  other. Nesting encodes containment; dependencies are sequencing, and a
  story may depend on several siblings (the graph is a DAG, not a tree).
- The dependency graph is **content, not tracker structure**: each story
  carries a "Blocking dependencies" section listing the sibling stories it
  depends on by title, rendered by the app from the decomposition verdict.
  No tracker-native blocking relations — content-as-graph keeps the pipeline
  portable across trackers and the graph auditable in the artifact itself.
  The app honors the graph at specialist run time: it resolves each listed
  title and reports completion status in the specialist's payload.

---

## Size band

An epic should decompose into **3–10 stories** (default; team-forked value —
production data should refine it).

- **Fewer than 3:** the epic may be story-sized. Flag it — it may not have
  needed slicing, which is itself feedback to the intake tier.
- **More than 10: stop. Do not decompose. Do not split the epic locally.**
  An oversized epic is evidence the slicing one tier up was wrong, and the
  correction belongs there: post a comment stating the overrun; the
  recommended human route is to delete the epic and return the finding to
  the project's intake thread for a re-slice — regenerating from a corrected
  cut beats patching generated output into shape.
- **Uneven sizes:** a story dramatically larger than its siblings fails the
  band even if the count passes — split it or the boundary is wrong.

---

## When decomposition hits a gap

If a genuine unknown surfaces mid-decomposition that the epic cannot answer:
pause decomposition and surface the gap as a comment. Do not create research
or spike stories, and do not decompose around the gap.

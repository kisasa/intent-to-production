---
name: epic-writing
description: Defines what a well-formed epic is in this pipeline. Use when writing an epic directly, when drafting slice epics from a requirements document (Intake Agent), or when reading an epic downstream (Specification and Decompose Agents). Triggers include 'write an epic', 'is this epic ready', or drafting/evaluating any parent issue.
---

# Skill: epic-writing

Defines what a well-formed epic looks like in this pipeline. This document
has two consumers: the **Intake Agent** drafts epics against it when slicing
a requirements document, and the downstream **Specification and Decompose Agents** read epics against it when
they enter Evaluation. Human PMs writing an epic directly use it the same
way. One definition, one bar — machine-authored and human-authored epics are
gated identically, which is why the Intake Agent's drafting quality never
needs to be trusted.

This is a team-forked template: adapt the criteria and examples to your
domain; keep the structure and the readiness test.

---

## What an epic is responsible for

An epic expresses a problem worth solving and the context needed to solve it
— shaped well enough that stories can be produced from it without a discovery
meeting. It does not contain acceptance criteria, implementation details, or
a story breakdown; those are what the pipeline produces *from* it.

## Required components

**Title**
Prefixed `Epic: `, then a noun phrase naming the capability area in the user's
language.

The prefix is there for the places the tracker's own hierarchy does not travel
— a flat search result, a filtered list, a Slack unfurl, a notification. Inside
Linear the parent/child relationship is already visible; outside it, nothing
carries it.

Keep the part after the prefix short. Titles get truncated in exactly the views
where they matter most, so put the distinguishing words first and leave
qualifiers for the body.

- Good: "Epic: Identity, role resolution, and navigation"
- Good: "Epic: Invoice payment visibility"
- Bad: "Epic: Payment stuff" — names nothing.
- Bad: "Epic: Add a payment status dashboard to the invoice page" — a solution
  and a story-sized one. An epic names the area, not the change.
- Bad: "Identity, role resolution, and navigation" — no prefix.

Do not put an issue identifier, a team name, or a surface in the title. The
tracker supplies the first two, and labels carry the third.

**Business problem statement**
What is broken, missing, or needed — and why it matters. Never opens with a
solution.

- Good: "Account managers cannot see payment status for invoices they own.
  They rely on finance to pull reports manually, creating a 2–3 day lag."
- Bad: "Build a payment status dashboard."

**Affected users**
The specific roles or personas who experience the problem, specific enough to
type stories correctly. Generic terms ("user", "customer") are defects.

**Desired outcome**
A change in capability or state, stated in business terms. If the outcome can
only be expressed in technical terms, the business problem is not yet
understood well enough.

- Good: "Account managers can answer customer payment questions without
  involving finance. Finance retains control over which data is visible to
  each role."
- Bad: "A REST endpoint returns payment status filtered by role."

**System context**
What currently exists, what constraints apply, and what prior decisions
affect the approach. A Story Writer cannot ground stories technically without
this. Include: relevant existing services or components, known integrations,
prior architectural decisions that constrain the approach, and any
dependencies on work in progress.

**Scope boundary**
State explicitly what is in scope and what is not. Anything adjacent that
might be assumed in scope should be called out.

- Example: "In scope: read-only payment status view for account managers.
  Out of scope: payment initiation, dispute workflows, and role
  administration (covered in PROJ-14)."

**Evidence pointers**
The specific artifacts grounding this epic: screenshot filenames with what
each shows, source-note references, thread decisions by date. Required when
the epic is drafted by the Intake Agent (carried from the slice map);
recommended for human-authored epics. These flow downstream: the Evaluation
Agent carries the relevant pointers into each story, and the app resolves
them into specialist payloads.

**Definition of done**
A directional statement of when this epic is complete. Not testable
acceptance criteria — that is story-level. A clear enough signal that a Story
Writer can work toward it and the pipeline knows when to stop generating
stories.

These completion criteria also anchor the Intake Agent's per-slice readiness
test: a slice is viable only if this section can be written for it without
inventing facts beyond the brief, its attachments, and the intake thread.

- Good: "All named roles can view the payment data appropriate to their
  access level. Finance admin controls are unchanged."
- Bad: "The feature is working."

---

## Common defects

| Defect | Example | Fix |
|---|---|---|
| Opens with solution | "Build a new onboarding flow" | State what is broken about current onboarding and for whom |
| Generic user types | "As a user, I need..." | Name the role: account manager, finance admin, auditor |
| Outcome stated technically | "Add a REST endpoint for payment status" | State what the user can do that they cannot do now |
| Missing system context | No mention of current state or constraints | Describe what exists today and what affects the approach |
| Unbounded scope | "Improve the payment experience" | Define which surfaces, roles, and behaviors are in scope |
| No definition of done | Epic ends after problem description | Add a directional statement of what complete looks like |
| Contradictory requirements | Description says "admins only"; a comment says "all users" | Resolve before evaluation — contradictions block story-writing |

---

## Readiness test

Could a Story Writer read this epic cold and produce a first draft of stories
— with correct user types, grounded requirements, and behavioral conditions —
without asking a clarifying question?

If yes: the epic is ready.
If no: identify which required component is missing or insufficient and
address that first.

---

## For the downstream agents (Specification, Decompose)

Check each required component against the criteria above. If any are missing
or insufficient:

1. Identify the specific defect using the defect table
2. Ask one targeted question to resolve it — do not ask multiple questions
   at once
3. Continue until all components pass, then proceed to checkpoint

## For the Intake Agent

Draft each slice epic with all required components populated from evidence —
the brief, its attachments, and the intake thread. Where any component would
require an invented fact, the slice is not ready; the gap is your next
question in the thread.

---
name: ad-hoc-epic-creation
description: Create a standalone Linear epic for net-new work or a bug with no connection to any BRD currently being decomposed. Use when a developer says something like "I need to create a new epic that isn't tied to a BRD," "help me set up a standalone piece of work," or "this bug needs its own epic." Requires the Linear MCP connector.
---

# Ad-hoc epic creation

You are helping create a **standalone epic** — new work or a bug that has no
connection to any BRD currently going through the pipeline. This epic skips
Intake entirely: you are doing, by conversation, the judgment Intake would
normally apply to a BRD slice. Do not lower the bar because a human is
dictating instead of an agent deciding.

**Do not use this skill if the work belongs under an epic that already
exists.** That's a different situation — tell the developer to use the
`ad-hoc-story-creation` skill instead, and stop here.

**Team: assume Example Delivery (PROJ) unless told
otherwise.** Don't ask.

## Ground rules for the conversation

- **Ask one question at a time.**
- **Offer a short list of suggested answers whenever you reasonably can** —
  including the known surfaces/repos below. Ask openly only for what
  genuinely can't be looked up (the business problem, who's affected, etc.).
- **Do the shaping work yourself** — convert loose description into the
  contract's exact shape and show your draft back for confirmation.
- **Never create the Linear issue until the developer has confirmed the
  full assembled draft.**

## What you're producing

The exact contract a well-formed epic must meet is defined in
`skills/epic-writing/epic-writing.md` in the `intent-to-production` repo —
read it if you have access; if not, the required shape is summarized below
and should not drift from it.

An epic needs, in this order:

1. **Title** — `Epic: <noun phrase naming the area>`. Not a solution, not
   story-sized — an epic names an area, never a change.
2. **Business problem** — what's broken, missing, or needed, and why it
   matters. Never opens with a solution.
3. **Affected users** — specific roles or personas. "User" or "customer"
   alone is a defect.
4. **Desired outcome** — a change in capability or state, in business
   terms. If it can only be stated technically, the problem underneath
   isn't understood well enough yet.
5. **System context** — what exists today, constraints, prior decisions,
   in-progress dependencies.
6. **Scope boundary** — only if something adjacent could plausibly be
   assumed in scope.
7. **Evidence pointers** (optional but worth asking about) — screenshots,
   source notes, thread decisions by date.
8. **Definition of done** — directional, not testable acceptance criteria
   (that's story-level).

No parent, no Project — this epic isn't part of any BRD.

## Known PROJ surfaces and repos

Confirmed live against the tracker as of 2026-08-13 (an epic's API map, in
which "all six bases are now settled," and the team's current label set). Treat this
as a fast default, not gospel — if a developer names a surface not listed
here, or you have live Linear access and want to double-check, look it up
fresh (`list_issue_labels` for the team, or search documents titled "API
Map" — several exist per epic) rather than assuming this
table is still complete.

| Surface label | Repo | What it is |
|---|---|---|
| `surface:management-web` | `github/example-org/example-web` (Angular) | admin frontend |
| `surface:vt-web` | `github/example-org/example-vt-web` | merchant-facing secondary web app |
| `surface:paynow-web` | `github/example-org/example-paynow-web` | merchant-facing Pay Now |
| `surface:services` | `github/example-org/example-api` (.NET, modular: Merchants, Transactions, Users, Invoices, Payers, Identity...) | backend — **use this one, not the older `surface:backend`** |
| `surface:e2e`, `surface:tests` | cross-cutting, no single repo | only when the epic genuinely needs a dedicated test/E2E story |

**`example-erp`** (`github/example-org/example-erp`, the
ERP/QuickBooks queue adapter) has no surface label yet as of this writing.
If a story genuinely needs it, create one with `create_issue_label` —
`surface:erp` fits the existing naming pattern — rather than forcing it
under `surface:services`.

Every real repo base recorded in Linear uses `main` as the ref, not a
feature or release branch — that ref is what Specification reads code
*from* to draft its map, a separate concern from which branch the epic's
own git branch gets cut from (below). Use `main` unless a developer
specifically tells you otherwise.

## The setup this epic needs before any story under it can dispatch

1. **The epic's own git branch must be cut from the current release
   branch, never directly from `main`.** It's cut fresh per release cycle,
   so there's no fixed name to suggest — ask the developer, and if they
   don't know, tell them to check with the architect rather than guessing.
   This skill can't create git branches itself (Linear access only) — this
   is a manual step someone still has to do, and skipping it will make the
   specialist stop and refuse to work later, when it verifies the branch
   chain itself.
2. **A `Repo base — <surface>: <host>/<org>/<repo>/<ref>` comment**, one
   line per surface this epic's stories will need — use the table above,
   `main` as `<ref>`. This is the only place downstream dispatch looks up
   which repo a story's branch and PR belong in, and there's no fallback if
   it's missing or malformed:
   - No angle brackets around real values.
   - Don't put the word "e.g." on the same line as a real answer — both
     get read as unfilled placeholder text, not a real answer, by the
     framework's own parsing.

## The conversation, step by step

1. **What's the problem, in a sentence or two?** Draft the business problem
   statement from it.
2. **Who's affected?** Push for specific roles, not "users."
3. **What should be true once this is done?** Draft the desired outcome in
   business terms — if the developer answers technically, ask them to
   restate it in terms of what a person can do differently.
4. **What exists today that matters here?** System context — prior
   decisions, related work, constraints.
5. **Anything adjacent that could be mistaken for in-scope?** Only ask this
   if the answer seems non-obvious from what's already been said.
6. **Any screenshots, notes, or threads this should point at?** Optional —
   don't push if there's nothing.
7. **What does done look like?** Directional, not a test list.
8. **Which surface(s) will this touch?** Offer the known table above as
   suggestions. For each one, confirm the repo/ref against the table rather
   than asking cold.
9. **Do you know the current release branch?** If yes, note it for the
   setup reminder below; if no, tell them to check with the architect
   before this epic's branch gets cut.
10. **Show the complete draft** — title, full body, and every `Repo base`
    line — and ask for explicit confirmation.
11. **On confirmation**, create the epic with `save_issue` (no parent), then
    post the `Repo base — <surface>: ...` comment(s) with `save_comment`.
    Close by reminding the developer: cut the epic's git branch from the
    release branch (not `main`) before it goes into Evaluation, and moving
    it to Evaluation status is what starts Specification — there's no
    label to apply to skip ahead to Decompose; Specification runs first and
    hands off to Decompose itself once its own thread resolves. Since the
    `Repo base` comment is already posted, Specification may not even need
    to ask about it — but answer normally if it does.

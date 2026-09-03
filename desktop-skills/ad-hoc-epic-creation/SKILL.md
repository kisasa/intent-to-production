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

**Team:** use the team the developer's other work is in. If it is not
obvious from the conversation, ask once and remember the answer.

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

## Finding the team's surfaces and repos

Surfaces are engagement-specific and this skill carries no table of them.
Look them up live, in this order, and present what you find as suggested
answers:

1. The project's **surface registry**: the project document titled
   `Surfaces` (`list_documents` with the project id, then `get_document`).
   Its fenced `surfaces` block has one record per surface — repo, ref, the
   directory within the repo, the conventions file, mandatory skills, and
   status. This is the authoritative list. An epic may also carry a
   `Surfaces (override)` document for differences that hold for that epic
   only.
2. `list_issue_labels` for the team, filtered to the `surface:` prefix — the
   labels the team currently uses. A label with no registry record, or a
   record with no label, is a gap to mention.
3. The surface's own conventions file, at the path the record names, if you
   have codebase access — what the surface is for.

If a developer names a surface with no `surface:` label yet, create the
label with `create_issue_label` following the team's existing naming
pattern rather than forcing the work under a surface it does not belong to.
Test surfaces (`surface:e2e`, `surface:tests`) exist only when the epic
genuinely needs a dedicated test or E2E story.

A registry record's `ref` is the branch Specification reads code from
(commonly `main`), which is a separate concern from the branch the epic's
own git branch gets cut from (below). Use what the registry records unless a
developer specifically tells you otherwise.

## The setup this epic needs before any story under it can dispatch

1. **The epic's own git branch must be cut from the current release
   branch, never directly from `main`.** It's cut fresh per release cycle,
   so there's no fixed name to suggest — ask the developer, and if they
   don't know, tell them to check with the architect rather than guessing.
   This skill can't create git branches itself (Linear access only) — this
   is a manual step someone still has to do, and skipping it will make the
   specialist stop and refuse to work later, when it verifies the branch
   chain itself.
2. **A registry record for every surface this epic's stories will need.**
   Dispatch reads the project's `Surfaces` document (with the epic's
   `Surfaces (override)` layered on top) to learn which repo a story's branch
   and PR belong in; there is no fallback if a surface has no record. If a
   surface the developer names is already in the registry, nothing to do. If
   it is not, propose the record from what you can read and, once the
   developer confirms it, write it: into the project's `Surfaces` document
   when it is true for the whole engagement (regenerate the document in
   place, adding the record), or into a `Surfaces (override)` document on
   this epic when it holds only here. Use the exact block format the
   Specification Agent uses (`agents/specification-agent.md`, step 1) — you
   write it, the developer never types it.

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
8. **Which surface(s) will this touch?** Offer the surfaces you looked up as
   suggestions. For each one, confirm the repo/ref against what the
   project's other epics record rather than asking cold.
9. **Do you know the current release branch?** If yes, note it for the
   setup reminder below; if no, tell them to check with the architect
   before this epic's branch gets cut.
10. **Show the complete draft** — title, full body, and any registry record
    you intend to add — and ask for explicit confirmation.
11. **On confirmation**, create the epic with `save_issue` (no parent), then
    write any new registry record with `save_document` (the project's
    `Surfaces` document, or a `Surfaces (override)` document on the epic).
    Close by reminding the developer: cut the epic's git branch from the
    release branch (not `main`) before it goes into Evaluation, and moving
    it to Evaluation status is what starts Specification — there's no
    label to apply to skip ahead to Decompose; Specification runs first and
    hands off to Decompose itself once its own thread resolves. Since the
    registry already covers the surfaces, Specification may not even need
    to ask about them — but answer normally if it does.

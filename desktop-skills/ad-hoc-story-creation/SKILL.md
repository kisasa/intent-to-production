---
name: ad-hoc-story-creation
description: File a Linear story under an existing epic for blocking work discovered mid-development that no existing story covers. Use when a developer says something like "I found a blocker that isn't covered by any story," "I need to file an unplanned story under this epic," or "help me write up this extra work I found." Requires the Linear MCP connector.
---

# Ad-hoc story creation

You are helping a developer file a **story** under an epic that already
exists (with a real BRD behind it) — for work they discovered mid-task that
no existing story covers. You are doing, by conversation, the same shaping
work the Decompose Agent normally does automatically. Do not skip steps or
lower the bar because a human is dictating instead of an agent deciding.

**Do not use this skill if the work has nothing to do with an existing
epic.** That's a different situation — tell the developer to use the
`ad-hoc-epic-creation` skill instead, and stop here.

**Team: assume Example Delivery (PROJ) unless told
otherwise.** Don't ask.

## Ground rules for the conversation

- **Ask one question at a time.** Never dump the whole form at once — this
  is the entire reason this is a skill and not a static template.
- **Offer a short list of suggested answers whenever you reasonably can**,
  pulled from real data you just looked up (existing labels, the epic's
  recorded surfaces, the epic's own affected-users text) — not generic
  placeholders. If you truly have nothing to suggest, ask openly.
- **Do the shaping work yourself.** The developer will describe things
  loosely ("users can't see X when Y happens"); you convert that into the
  contract's exact shape (verb-phrase title, if/when/then acceptance
  criteria, etc.) and show your draft back for confirmation — don't just
  ask the developer to write each section verbatim in the required format.
- **Never create the Linear issue until the developer has confirmed the
  full assembled draft.** Show the complete title, body, labels, and parent
  before writing anything.

## What you're producing

The exact contract a well-formed story must meet is defined in
`skills/story-contract/story-contract.md` in this repo (`intent-to-production`)
— read it if you have access to the repo; if not, the required shape is
summarized below and should not drift from it. If the two ever disagree,
the repo file wins — this skill's job is to interview a human through that
same contract, not define a separate one.

A story needs, in this order:

1. **Title** — `Story: <verb phrase>`. Not a noun phrase (that reads as an
   epic), and distinguishable from sibling stories by its first few words —
   don't just restate the epic's subject.
2. **User value statement** — `As a [specific user type], I want [action]
   so that [outcome].` The user type should come from the epic if you can
   find it there, never a generic "user."
3. **Component breakdown** — Requirements (discrete things to build) and
   Fringe cases (missing data, failed dependencies, unexpected actions,
   permission boundaries).
4. **Acceptance criteria** — minimum three, if/when/then: one happy path,
   one error/failure, one edge case drawn from the fringe cases.
5. **Unit test scenarios** — one line per case the tests must cover, no
   test code. Every acceptance criterion is at least one scenario; every
   fringe case is one too.
6. **Scope boundary** — only if something adjacent could plausibly be
   assumed in scope.
7. **Blocking dependencies** — a `## Blocking dependencies` heading is
   required even when there's nothing to list (write "No blocking
   dependencies." under it). A pre-dispatch check in this framework reads
   this heading literally and fails the whole dispatch if it's missing
   entirely — this is the one section you must never omit.
8. **References** (optional) — codebase anchors and evidence pointers, only
   if there's something concrete to point at.

Labels:
- `surface:<name>` — **required**, must match a surface the epic has
  already recorded a `Repo base — <surface>: ...` comment for. Never invent
  a surface that isn't already recorded on the epic.
- `size:<small|medium|large>` and `tier:<small|mid|large>` — optional; if
  the developer doesn't know or care, say so and skip them rather than
  guessing.

## The conversation, step by step

1. **Which epic?** Ask for the epic's identifier or a link. Look it up
   (`get_issue`). Confirm the title back to the developer so they know
   you've got the right one.
2. **Which surface?** Read the epic's comments (`list_comments`) for every
   `Repo base — <surface>: ...` line — this is the authoritative source,
   always prefer it over guessing from labels or memory. Present the
   surfaces you found as the suggested answers — e.g. "This epic has repo
   bases recorded for **surface:services** and **surface:management-web**
   — which one is this?" If none exist, stop and tell the developer the
   epic itself is missing this and needs it before any story under it can
   dispatch — don't invent one yourself, even if it looks like a case
   covered in the table below.

   For PROJ specifically, the surfaces normally recorded are
   `surface:management-web`, `surface:vt-web`,
   `surface:paynow-web`, and `surface:services` (the current label for the
   example-api backend — not the older `surface:backend`, even if
   you see it on older sibling stories). Use this only to sanity-check what
   the epic's own comments say, never as a substitute for reading them.
3. **What happened / what's needed?** Ask in plain language — "what did you
   run into, and what needs to exist instead?" Use this to draft the title
   and the user value statement. Offer 2–3 candidate titles rather than one,
   and let the developer pick or edit.
4. **Who's affected?** If the epic's own body names affected users, suggest
   the one that fits; otherwise ask.
5. **What has to get built, and what's the messy edge?** Two short
   questions — requirements, then fringe cases. Bullet what you hear back
   rather than asking for bulleted input.
6. **Draft the acceptance criteria and unit test scenarios yourself** from
   everything gathered so far, and show them for confirmation — this is
   where you're doing more than a form would.
7. **Anything blocking this?** Default suggested answer: "No blocking
   dependencies." If they name something, get its real issue identifier.
8. **Size or tier?** Offer small/medium/large as suggestions; make clear
   skipping both is fine and just means a 1x turn-budget multiplier, not an
   error.
9. **Show the complete draft** — title, full body, labels, and which issue
   will be the parent — and ask for explicit confirmation before writing
   anything.
10. **On confirmation**, create the issue with `save_issue`: set `parentId`
    to the **epic's** id (never the story you started this conversation
    from, if any — that's the one mistake this skill exists to prevent),
    and apply the labels gathered above.

## The one thing to get right that a static form can't check

If the developer is currently working inside another story under this same
epic, do **not** parent the new issue to that story. Parent it to the epic
directly. A story's parent is what this framework's dispatch code reads to
find the branch it should build from and PR into — parenting to the wrong
issue silently sends the work to the wrong branch.

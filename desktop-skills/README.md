# Desktop skills

Three skills for a **developer's own Claude Desktop**, not for the automated
pipeline. Different audience and different distribution than `skills/`:

- `skills/` is the framework's own skill set. Most of it is code-consumed:
  `webhook-listener` attaches skills to the shaping agents it runs
  (Intake, Specification, Decompose), and `specialist-runner` loads
  `story-contract`, `epic-writing` and `tracker-writing` into every
  specialist run. Two are run by a person in their own session:
  `business-requirements-writing` (the PM) and `conventions-writing` (the
  architect).
- `desktop-skills/` is uploaded through Claude's own org skill-sharing
  feature so every developer's Claude Desktop can load it, and used
  conversationally by a human with the Linear MCP connector attached.

Two of them do, by conversation, the same shaping judgment
Intake/Specification/Decompose apply automatically — for the two cases
where a human is creating work outside that automated flow:

- [`ad-hoc-story-creation/SKILL.md`](ad-hoc-story-creation/SKILL.md) — a
  blocker found mid-work, under a real epic, that no existing story covers.
- [`ad-hoc-epic-creation/SKILL.md`](ad-hoc-epic-creation/SKILL.md) — new
  work or a bug with no BRD behind it.

Each points back at its contract in `skills/` —
`skills/story-contract/SKILL.md` for a story, `skills/epic-writing/SKILL.md`
for an epic — as the actual source of truth for what a well-formed one
contains, and summarizes that contract rather than re-defining it — if the
two ever disagree, the `skills/` file wins.

The third works on the other end of the flow: accepting what a specialist
built.

- [`review-story-pr/SKILL.md`](review-story-pr/SKILL.md) — reviewing a
  story's PR in revision rounds, then recording acceptance by resolving
  threads and ticking the criteria trace in the PR body.

Its sources of truth are `agents/specialist.md` ("A revision round") for
how the specialist answers a review, and `dispatch-worker/README.md`
("Revision rounds") with `REVISION_ROUND_CAP` and `REVISION_MAX_TURNS` in
`dispatch-worker/src/workflows/dispatch-story-workflow.ts` for the round
cap and budget. It also needs GitHub: a GitHub connector where one is
attached, otherwise an authenticated `gh` CLI.

**Nothing here is enforced by the pipeline's own code.** What is
code-enforced (the `surface:<name>` label, the surface registry documents,
the `Blocking dependencies` heading, the epic branch's real git ancestry) is
called out explicitly inside each skill, sourced from the actual dispatch
code, not restated from memory — if that code changes, these skills need a
matching pass.

## Distributing these

Claude's org skill-sharing feature is how these reach every developer —
there is no MCP tool that manages it, so keep this directory as the source
of truth and re-upload after any edit rather than editing the uploaded copy
directly.

See [`starting-prompts.md`](starting-prompts.md) for the message to send
developers along with each skill.

# Desktop skills

Two skills for a **developer's own Claude Desktop**, not for the automated
pipeline. Different audience and different distribution than `skills/`:

- `skills/` is loaded by `webhook-listener` and attached to the agents it
  runs server-side (Intake, Specification, Decompose) — code-consumed,
  never touched by a human directly.
- `desktop-skills/` is uploaded through Claude's own org skill-sharing
  feature so every developer's Claude Desktop can load it, and used
  conversationally by a human with the Linear MCP connector attached.

They exist to do, by conversation, the same shaping judgment
Intake/Specification/Decompose apply automatically — for the two cases
where a human is creating work outside that automated flow:

- [`ad-hoc-story-creation/SKILL.md`](ad-hoc-story-creation/SKILL.md) — a
  blocker found mid-work, under a real epic, that no existing story covers.
- [`ad-hoc-epic-creation/SKILL.md`](ad-hoc-epic-creation/SKILL.md) — new
  work or a bug with no BRD behind it.

Both point back at `skills/story-contract/story-contract.md` and
`skills/epic-writing/epic-writing.md` as the actual source of truth for what
a well-formed story/epic contains, and summarize that contract rather than
re-defining it — if the two ever disagree, the `skills/` file wins.

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

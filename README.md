# Intent to Production

A delivery pipeline for building software with AI agents **without handing
them the wheel.** A PM states intent; agents translate it into epics, a
functional spec, and stories; specialists write the code; humans decide at
every seam. Every handoff between a person and an agent is visible in the
issue tracker.

This is a way of working and the code that runs it, developed in the open
against real engagements. It is a v1: some lanes are fully formed, some are
placeholders that work, and the parts humans still do by hand are named as
such rather than papered over.

## The one-sentence version

**A human drives; the agents do the mechanical parts; every handoff between
them is visible.**

The best lanes are mixed. The agent drafts the API map and says what it
found; the architect resolves what exists. The agent reads the designer's
assets and lists what the user will see; the designer confirms and corrects.
The agent writes the code and opens the pull request; a developer decides
whether it is any good. Which also means knowing when not to add an agent:
there is no code-review agent here, because CI does the mechanical half of
review already and the rest is judgment.

## How the pipeline flows

1. **Business requirements.** A PM turns evidence into a requirements
   document in a session with the `business-requirements-writing` skill,
   resolving every capability in the room, and places it in the tracker as a
   project. The PM applies `ready for intake`.
2. **Intake.** The Intake Agent slices the document into epics whose
   boundaries match the areas the designer will work, proposes an order,
   and checkpoints with the PM and the designer. Only the epics the designer
   is starting with are released.
3. **Specification.** For each released epic, once the designer's assets for
   that area are attached, the Specification Agent reads them and the
   codebase and produces the API map: design touchpoints the designer
   resolves, technical touchpoints the architect resolves.
4. **Decompose.** The Decompose Agent cuts the epic into dependency-ordered,
   surface-assigned stories and checkpoints with the PM.
5. **Development.** A developer moves a story to In Progress. The app cuts
   the branch and dispatches a specialist into a sandbox; the specialist
   opens a pull request; the developer who moved the story reviews it.
6. **Epic completion.** When an epic's stories have merged, humans stand the
   branch up, run the E2E suite, and sign off — architect, designer, PM —
   before it merges. Automating this is deliberately parked.

The reasoning behind every one of those steps, and the failures that shaped
them, is in the design ledger.

## What is in this repository

| Path | What it is |
|---|---|
| `docs/design-ledger.md` | The design record: every rule, the observation that forced it, and what it superseded. Read this before proposing a change. |
| `docs/engagement-readiness.pdf` | What has to be true before a new engagement's first requirements document enters the pipeline, and the procedures humans run by hand. |
| `agents/` | The four agent definitions — Intake, Specification, Decompose, and the one generic Specialist. Invariant; teams use them as-is. |
| `skills/` | Team-forked templates the agents load: what a well-formed requirements doc, epic, API map, and story look like, the house prose standard, and the architect's conventions interview. |
| `desktop-skills/` | Skills a developer runs in their own Claude session for work that enters outside the normal path — an ad-hoc story or epic. |
| `webhook-listener/` | The app that receives tracker webhooks, routes on labels and status, and wakes the shaping agents. |
| `dispatch-worker/` | The Temporal worker that turns a story's status move into a specialist run: dependency check, branch, sandbox dispatch, PR watch. |
| `specialist-runner/` | The program that runs inside the specialist sandbox — a Claude Agent SDK session against a cloned surface repo. |
| `infrastructure/` | CDK Terrain stacks for the listener, the sandbox, and the Temporal workers. |
| `docs/local-development.pdf` | Bringing the whole thing up locally. |
| `docs/development-tier-dispatch.pdf` | The manual fallback for dispatching a specialist without the app. |
| `docs/source/` | The Markdown the PDFs above are rendered from — edit here, then run `scripts/build-docs-pdf.py`. |
| `CONTRIBUTING.md` | The checks that must pass, and the rule that nothing here references a private artifact. |

## Start here

If you are setting up an engagement, read `docs/engagement-readiness.pdf`.
If you are changing an agent or a skill, read the relevant sections of
`docs/design-ledger.md` first — most of what looks arbitrary has a recorded
reason. If you are running the software, start with
`docs/local-development.pdf`.

---

Built by [Kisasa](https://kisasa.io)

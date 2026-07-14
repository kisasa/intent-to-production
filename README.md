# Intent to Production

An opinionated, human-gated pipeline for turning business intent into running software using AI agents. This repository is a working reference implementation: fork it, adapt the skills to your team, and run it against your own tracker.

Built and operated by [Kisasa](https://example.com). An experience report covering the design decisions and results of the first full production engagement is in progress.

## The premise

**Humans gate, agents work.** Every transition between pipeline stages is controlled by a human decision. Agents do the shaping, slicing, and drafting; humans approve, redirect, or reject at explicit checkpoints. This is both a quality control and a spend control — no agent proceeds to the next stage, or burns the next round of tokens, without a person deciding it should.

The pipeline covers the full path from a business idea to code in production. Most AI development tooling starts at the specification and ends at the pull request. This starts earlier — at business requirements — and treats the translation from business intent to engineering work as the part worth automating carefully. Technical detail enters the artifacts progressively, at each seam, as business intent becomes engineering work.

## Architecture

Three layers, with a deliberate split between what ships as-is and what you adapt:

1. **Deterministic webhook application** — a TypeScript service (Hono, deployed on Railway) that receives tracker webhooks, routes events, and executes structured actions. No judgment lives here; it is plumbing.
2. **Invariant agents** — the pipeline's judgment. These ship as-is and are not customized per engagement. They decide how to slice epics, map capabilities, and cut stories.
3. **Team-variant skills** — the customization surface. Skills encode how *your* team writes requirements, what *your* codebase conventions are, what *your* definition of ready looks like. Fork these; leave the agents alone.

The tracker is [Linear](https://linear.app). The webhook app listens for label changes and drives each stage by calling Claude with the relevant agent and skills.

### Control model

- **Agents move labels.** A label change is an agent signaling its work is done and awaiting review.
- **Humans move statuses.** Status transitions are the gates; only people operate them.
- **Humans delete.** Agents never destroy anything.
- Agents never edit issue bodies after creation. Humans may edit freely; self-consistency checks detect drift rather than prohibiting it.

## The pipeline

| Stage | Actor | Output | Gate |
|---|---|---|---|
| Business requirements | PM, using the `business-requirements-writing` skill | Business Requirements Document (BRD) with a capability map | PM places it into the pipeline |
| Intake | Intake Agent | Proposed epic slices | Human approval before any epics are created |
| Specification | Specification Agent | Codebase-grounded capability map per epic | Architect review |
| Decompose | Decompose Agent | Stories with rendered dependencies and size bands | Explicit human approval; size-band check happens inside this checkpoint so the approver decides informed |
| Execution | Specialist agents in Claude Code | Code, tests, pull requests | Standard code review and deployment controls |

Design details that matter if you're adapting this:

- **Dependencies are content, not tracker relations.** The app renders dependency information into story bodies. This keeps stories self-contained for the agents that consume them.
- **Specialist context is scoped, not total.** An executing agent receives the full epic "why" (small, always included) plus the story's relevant capability map rows and resolved code — not the whole repository. The best-briefed developer isn't the one handed the entire system's source; it's the one who deeply understands the goal and has exactly the relevant code in front of them.
- **Evidence routing.** Text-representable artifacts go into Linear documents; binary artifacts attach to a dedicated evidence issue.

## Repository layout

<!-- TODO: fill in once structure is final -->
```
/app        Webhook application (TypeScript / Hono)
/agents     Invariant agent definitions
/skills     Team-variant skills — fork and adapt these
/docs       Design ledger and supporting documents
```

## Getting started

Todo
<!-- TODO: setup instructions — Linear webhook configuration, Railway deployment, environment variables, Anthropic API key -->

## Design ledger

Every consequential design decision is recorded in [`docs/design-ledger.md`](docs/design-ledger.md) with a provenance contract: the rule, the specific observation that forced it, and what it superseded. If you want to understand *why* the pipeline is shaped the way it is — including the decisions we reversed — start there.

## Status

Pre-1.0. The pipeline architecture is settled and the stages run individually; the first full end-to-end run on a production engagement is underway. Expect the skills and agent contracts to change based on what that run teaches us. The experience report publishes after the pipeline has carried a real engagement from BRD to production.

## Adapting this for your team

The intended adoption path:

1. Fork the repository.
2. Leave `/agents` alone.
3. Rewrite the skills in `/skills` to match your team's requirements style, codebase conventions, and readiness definitions.
4. Point the webhook app at your Linear workspace.
5. Run one small engagement end to end before trusting it with anything real.

If you'd rather have help, Kisasa consults on exactly this. But the framework is fully usable without us — that's the point of publishing it.

## License

MIT

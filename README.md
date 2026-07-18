# Humans in the Loop

A workflow for building software with AI agents **without handing them the wheel.**

This is not a product you install. It's a way of working — a set of swim lanes, roles, and opinions for teams that want AI agents doing real work while humans keep control of the decisions that matter.

The one-sentence version: **a human drives; the agents do the mechanical parts; every handoff between them is visible.**

---

## The thesis

Most "AI development workflow" demos put the AI in the driver's seat. Feedback comes in, the AI files the ticket, writes the code, reviews itself, and merges — humans optional. It demos well. It ships badly.

We do the opposite. The human is the driver at every lane. The agent is a fast, tireless teammate that handles the mechanical work — normalizing a messy call transcript into a ticket, writing a scoped backend change, doing a first-pass mechanical review. But a human decides what's worth doing, whether the work is right, and when it ships.

> **More human touchpoints, less automation. Just because we can automate something doesn't mean we should.**

The best lanes are the **mixed** ones — where the agent does the mechanical half and a human does the judgment half, in the same lane. The agent flags the missing auth check; the human decides whether the code is any good. That pairing is the heart of this framework.

## This is a v1

Be honest about where this is: it's a minimum viable version. Some lanes are fully formed. Others are **placeholders that work** — simple, not-yet-ideal answers that let the whole story be told end to end. Where something is a placeholder, we say so and we point at where it grows. We'd rather ship the complete loop with honest gaps than a perfect fragment.

## Start here

**Read the two shared docs first — everyone reads these:**

| Doc | What it is |
|-----|-----------|
| [shared/philosophy.md](shared/philosophy.md) | Why the human drives, and the beliefs every lane is built on |
| [shared/swim-lanes.md](shared/swim-lanes.md) | The whole workflow as one map — every lane, who owns it, where an agent fires |

**Then pick your track:**

| If you're a… | Read |
|--------------|------|
| **PM / product owner** | [for-pms/](for-pms/README.md) — turning customer voice into shaped work |
| **Engineer / architect** | [for-engineers/](for-engineers/README.md) — building, reviewing, and improving the agents |

The split is a navigation aid, not a wall. An architect lives in Evaluation too; a PM should understand the review gate. Read across when you need to.

---

Built by [Kisasa](https://example.com)

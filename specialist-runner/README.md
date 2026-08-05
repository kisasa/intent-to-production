# specialist-runner

Runs a **backend** or **frontend** Specialist against one story, inside the
`specialist-sandbox` ECS task [`infrastructure/`](../infrastructure) registers.
The automated replacement for the human half of
[`docs/development-tier-dispatch.md`](../docs/development-tier-dispatch.md) —
same specialist definitions (`agents/specialist-backend.md`,
`agents/specialist-frontend.md`), same MCP-driven orientation and hand-back,
just triggered by a `RunTask` call instead of a developer pasting a prompt
into Claude Code.

**Tests and E2E specialists are not built here.** They need GitHub Actions
cross-repo checkout (docker-compose across sibling surfaces) that doesn't
exist yet — see the design ledger's automated-dispatch session. This package
only knows `backend` and `frontend`.

## What it does

1. Reads its dispatch context from env vars (below) — nothing is handed to it
   beyond that, same as the manually-dispatched specialist.
2. Clones the framework repo (`agents/`, `skills/`) and the one target surface
   repo fresh, every run — see `src/workspace.ts`. Checks out the story branch
   the tracker already assigned; does not create or repair one.
3. Builds a system prompt from the specialist's own `.md` definition plus the
   two skills it declares (`story-contract`, `epic-writing`), and an initial
   user message naming the story, epic, and branches.
4. Runs one [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript)
   session (`@anthropic-ai/claude-agent-sdk`) with the Linear and GitHub MCP
   servers attached, local Read/Write/Edit/Bash/Grep/Glob tools, and
   `permissionMode: "bypassPermissions"` (unattended container, no human to
   approve tool calls).
5. Exits. **This runner does not decide complete/waiting/blocked** — that's
   the specialist's own tracker write, through its own Linear MCP calls, per
   its definition. This process only guarantees the container doesn't hang
   and something is visible if it crashes before Claude gets a turn (see
   `src/tracker-fallback.ts`).

## Dispatch context — the contract for whoever calls this

Nothing calls this yet. A future Temporal worker is expected to set these as
`RunTask` container overrides (see `src/dispatch-context.ts`, which validates
all of them at startup and fails fast naming whatever's missing):

| Var | Required | Meaning |
|---|---|---|
| `STORY_ID`, `STORY_TITLE` | yes | The story |
| `EPIC_ID` | yes | Parent epic |
| `SPECIALIST_TYPE` | yes | `backend` or `frontend` |
| `SURFACE_REPO` | yes | `org/name` on GitHub — the one repo this run writes to |
| `STORY_BRANCH`, `EPIC_BRANCH` | yes | Branch names the tracker already assigned |
| `MAX_TURNS` | yes | Hard cap on Agent SDK turns — the ledger is explicit a session doesn't time out on its own |
| `FRAMEWORK_REPO` | no | Default `example-org/intent-to-production` |
| `FRAMEWORK_REF` | no | Default `main` |

Plus the secrets every container in this project reads the same way (SSM,
injected by the ECS agent — see `infrastructure/README.md`):
`ANTHROPIC_API_KEY`, `LINEAR_AGENT_API_KEY`, `GITHUB_TOKEN`. Optional URL
overrides: `LINEAR_MCP_URL`, `GITHUB_MCP_URL`, `LINEAR_API_URL` (used only by
the fallback-comment path).

## A real ambiguity, resolved and flagged

Both specialist definitions say "you work in a local checkout... run git
directly" (orienting) and "you touch two systems, each through its own MCP:
source control... and the issue tracker" (handing back). Resolved here as:
local git handles clone/checkout/commit/push (needed for real test execution,
and for verifying branch ancestry against actual history — a shallow clone
can't do that, which is why `workspace.ts` uses `--filter=blob:none` for the
surface repo instead of `--depth`). GitHub's MCP server is attached
specifically for **opening the pull request**, the one action local git
without `gh` can't do. Same category of flagged-not-confirmed assumption as
`webhook-listener/src/activation-runner.ts`'s own MCP notes — verify against a
live run.

## Known gaps

- **Node-only target surfaces.** The image ships `node` + `git`, nothing else.
  A non-Node surface needs a broader image or a per-dispatch toolchain step —
  not built until an actual non-Node surface needs a specialist run.
- **No sibling-repo reads.** `workspace.ts` clones only `SURFACE_REPO`. A
  full-stack epic's frontend story confirming the real backend contract needs
  the app to know which sibling repos exist for a given epic — nothing does
  yet.
- **No caller.** Nothing invokes `ecs:RunTask` with the env vars above — that's
  the Temporal worker, not built in this pass.

## Working with it

```bash
npm install
npm run typecheck
npm run test:unit
```

```bash
docker build -f Dockerfile .
```

No live run is possible from this repo alone — it needs real credentials and
an actual story/epic/branch chain against a live target repo.

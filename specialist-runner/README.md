# specialist-runner

Runs a **backend**, **frontend**, **integration-test** (`specialist:tests`),
or **E2E** (`specialist:e2e`) Specialist against one story, inside the
`specialist-sandbox` ECS task [`infrastructure/`](../infrastructure)
registers. The automated replacement for the human half of
[`docs/development-tier-dispatch.md`](../docs/development-tier-dispatch.md) —
same specialist definitions (`agents/specialist-backend.md`,
`agents/specialist-frontend.md`, `agents/specialist-tests.md`,
`agents/specialist-e2e.md`), same MCP-driven orientation and hand-back, just
triggered by a `RunTask` call instead of a developer pasting a prompt into
Claude Code.

`tests` (2026-08-07) and `e2e` (2026-08-07, right after) both needed no new
infrastructure to add: `workspace.ts` already clones exactly one target
surface repo per dispatch, resolved by `dispatch-worker`'s
`resolveRepoBase(epicId, specialistType)` from a `Repo base — <surface>: ...`
comment the architect records on the epic — the same mechanism backend and
frontend already use. `e2e`'s registration was blocked slightly longer than
`tests`'s, but not by anything in this package — `specialist-e2e.md` used to
require the specialist to stand up and self-verify against a live
environment, which no sandbox here can do (see `docs/design-ledger.md`,
"Integration and E2E run in GitHub Actions": Fargate can't run the team's
privileged docker-compose stack). Once that requirement was dropped in favor
of CI doing the actual execution, dispatch mechanics were already fully
generic and `e2e` registered exactly like `tests` did.

**This still doesn't execute the E2E suite it writes — only the GitHub
Actions piece would.** The specialist writes tests and opens a PR; per the
decided design, a GitHub Actions workflow triggered by the epic's own PR
into the BRD branch is what's supposed to stand up docker-compose and run
them. That workflow doesn't exist in any target repo yet (confirmed empty in
`example-app`: no docker-compose file, no e2e/integration workflow, only
per-surface `backend.yml`/`frontend.yml`) — a separate, unbuilt piece from
what this package does.

Registering `tests` also only covers integration testing *within* one repo
(this engagement's actual shape — `frontend/` and presumably `backend/` as
folders in one `example-app` monorepo). It does **not** cover a hypothetical
engagement where backend and frontend are genuinely separate GitHub repos
and integration tests need both checked out simultaneously — that would
need this package's clone step to support more than one target repo, which
it doesn't today.

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
   servers attached, local Read/Write/Edit/Bash/Grep/Glob tools,
   `permissionMode: "bypassPermissions"` (unattended container, no human to
   approve tool calls), and an explicit model + effort (see below — never the
   SDK's own default).
5. Exits. **This runner does not decide complete/waiting/blocked** — that's
   the specialist's own tracker write, through its own Linear MCP calls, per
   its definition. This process only guarantees the container doesn't hang
   and something is visible if it crashes before Claude gets a turn (see
   `src/tracker-fallback.ts`).

## Dispatch context — the contract for whoever calls this

`dispatch-worker/src/activities/dispatch-specialist.ts` sets these as
`RunTask` container overrides (see `src/dispatch-context.ts`, which validates
all of them at startup and fails fast naming whatever's missing):

| Var | Required | Meaning |
|---|---|---|
| `STORY_ID`, `STORY_TITLE` | yes | The story |
| `EPIC_ID` | yes | Parent epic |
| `SPECIALIST_TYPE` | yes | `backend`, `frontend`, `tests`, or `e2e` |
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

`LOG_LEVEL` is set too, but it isn't part of `dispatch-context.ts`'s own
contract above — `src/logger.ts` reads it independently, same as every other
package's logger. `dispatch-specialist.ts` propagates `dispatch-worker`'s own
configured `LOG_LEVEL` (docker-compose locally, the ECS task definition in
prod) down as a container override on every dispatch, so this runner's
verbosity follows the worker that launched it without a second setting to
keep in sync.

## Model and effort — always explicit, never the SDK's own default

`src/claude-config.ts` reads `CLAUDE_MODEL` (default `claude-sonnet-5`) and
`CLAUDE_EFFORT` (default `high`, validated against the SDK's own
`low`/`medium`/`high`/`xhigh`/`max`) and passes both to every `query()` call.
Deliberately not left unset: an unset `model`/`effort` would silently track
whatever the Agent SDK's CLI default happens to be on a given build, drifting
the specialist's behavior out from under this codebase without a line
changing here. Mirrors `webhook-listener/src/activation-config.ts`'s own
uniform-knobs-are-explicit convention (that module's `effort: "high"` is the
same default, for the same reason).

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

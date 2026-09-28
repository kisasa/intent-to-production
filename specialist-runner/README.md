# specialist-runner

Runs **the Specialist** — one generic developer definition
(`agents/specialist.md`) — against one story, in whichever surface(s) that
story is labelled with, inside the `specialist-sandbox` ECS task
[`infrastructure/`](../infrastructure) registers. The automated replacement
for the human half of
[`docs/development-tier-dispatch.pdf`](../docs/development-tier-dispatch.pdf) —
same specialist definition, same MCP-driven orientation and hand-back, just
triggered by a `RunTask` call instead of a developer pasting a prompt into
Claude Code.

What the specialist may write in is set by `SURFACES`, a comma-separated
list rather than a single value: a story may carry more than one `surface:`
label, all resolving to the same repo and ref, and this runner passes every
one of them through. How to build on each surface — selector strategy, ORM
patterns, test levels — is that surface's own `CONVENTIONS.md`, not this
package's concern.

**This doesn't execute the integration or E2E tests it writes.** The
specialist writes tests and opens a PR; Fargate can't run a privileged
docker-compose stack, so a running-stack suite can't execute here. The
decided design has a GitHub Actions workflow, triggered by the epic's own PR
into the BRD branch, stand up docker-compose and run them. That workflow is
deliberately parked: humans stand the BRD branch up after each epic's stories
merge, run the suite by hand, and sign the epic off in its thread before it
merges. See [`docs/engagement-readiness.pdf`](../docs/engagement-readiness.pdf)
(source: [`docs/source/engagement-readiness.md`](../docs/source/engagement-readiness.md))
for the procedure and `docs/design-ledger.md` for the decision.

A run also clones exactly one target repo (see Known gaps), so integration
testing is covered only *within* one repo — not an engagement whose backend
and frontend are separate GitHub repos that both need checking out.

## What it does

1. Reads its dispatch context from env vars (below) — nothing is handed to it
   beyond that, same as the manually-dispatched specialist.
2. Clones the framework repo (`agents/`, `skills/`) and the one target surface
   repo fresh, every run — see `src/workspace.ts`. Checks out the story branch
   the tracker already assigned; does not create or repair one.
3. Builds a system prompt from the specialist's own `.md` definition, the
   three framework skills every specialist reads (`story-contract`,
   `epic-writing`, `tracker-writing`), and the surfaces' mandatory skills
   from `SURFACE_SKILLS`, plus an initial user message naming the story,
   epic, branches, and surface(s). On a revision round (the `REVISION_*` vars below are set) that
   message is instead the revision assignment: which PR and review to answer,
   which round of how many, and to follow the definition's revision
   lifecycle. The review itself is not passed in — the specialist reads it
   from the PR.
4. Runs one [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-typescript)
   session (`@anthropic-ai/claude-agent-sdk`) with the Linear and GitHub MCP
   servers attached, local Read/Write/Edit/Bash/Grep/Glob tools,
   `permissionMode: "bypassPermissions"` (unattended container, no human to
   approve tool calls), and an explicit model + effort (see below — never the
   SDK's own default).
5. Exits. **This runner reports no outcome.** The specialist's completion
   report is its own tracker write, through its own Linear MCP calls, and
   what `dispatch-worker` acts on is whether a PR exists afterwards. This
   process only guarantees the container doesn't hang and something is
   visible if it crashes before Claude gets a turn (see
   `src/tracker-fallback.ts`).

## Dispatch context — the contract for whoever calls this

`src/dispatch-context.ts` validates all of these at startup and fails fast
naming whatever's missing. Most come from `dispatch-worker/src/activities/
dispatch-specialist.ts`'s per-dispatch `RunTask` container overrides;
`FRAMEWORK_REPO`/`FRAMEWORK_REF` don't — they're baked into the specialist
sandbox's own task definition instead (`infrastructure/stacks/
specialist-sandbox.ts`, from `specialist-sandbox.framework-repo`/
`.framework-ref` in `cdktf.json`), since which agents/skills repo and ref a
specialist run uses is a deployment-level setting, not something that varies
per story:

| Var | Required | Meaning | Set by |
|---|---|---|---|
| `STORY_ID`, `STORY_TITLE` | yes | The story | `dispatch-specialist.ts` (`RunTask` override) |
| `EPIC_ID` | yes | Parent epic | `dispatch-specialist.ts` (`RunTask` override) |
| `SURFACES` | yes | Comma-separated `surface:<name>` label(s) the story carries, e.g. `backend` or `web,e2e` | `dispatch-specialist.ts` (`RunTask` override) |
| `SURFACE_REPO` | yes | `org/name` on GitHub — the one repo this run writes to | `dispatch-specialist.ts` (`RunTask` override) |
| `SURFACE_PATHS` | no | Comma-separated directory per surface, same order as `SURFACES` (`/` for the root), from the surface registry. Defaults to `/` for each | `dispatch-specialist.ts` (`RunTask` override) |
| `SURFACE_SKILLS` | no | Comma-separated mandatory skills from the registry; resolved surface-repo `.claude/skills/` first, then the framework catalog, and inlined into the system prompt. A name that resolves nowhere fails the run before it starts | `dispatch-specialist.ts` (`RunTask` override) |
| `STORY_BRANCH`, `EPIC_BRANCH` | yes | Branch names the tracker already assigned | `dispatch-specialist.ts` (`RunTask` override) |
| `MAX_TURNS` | yes | Hard cap on Agent SDK turns — a session doesn't time out on its own. A first build gets `webhook-listener`'s `resolveMaxTurns` budget; a revision round gets a fixed 25 | `dispatch-specialist.ts` (`RunTask` override) |
| `REVISION_ROUND`, `REVISION_ROUND_CAP`, `PULL_REQUEST_NUMBER`, `REVIEW_ID` | revision rounds only | Set together or not at all; a partial set fails at startup. Their presence is the only thing that makes a run a revision round rather than a first build | `dispatch-specialist.ts` (`RunTask` override) |
| `FRAMEWORK_REPO` | yes | `org/name` on GitHub for the framework (agents/skills) repo | `specialist-sandbox.ts` (task definition) |
| `FRAMEWORK_REF` | yes | Git ref of the framework repo to clone | `specialist-sandbox.ts` (task definition) |

Plus the secrets every container in this project reads the same way (SSM,
injected by the ECS agent — see `infrastructure/README.md`):
`ANTHROPIC_API_KEY`, `LINEAR_AGENT_API_KEY`, `GITHUB_TOKEN`. Optional URL
overrides: `LINEAR_MCP_URL`, `GITHUB_MCP_URL`, `LINEAR_API_URL` (used only by
the fallback-comment path). `WORKSPACE_ROOT` (default `/workspace`) sets where
the two repos are cloned.

`LOG_LEVEL` is set too, but it isn't part of `dispatch-context.ts`'s own
contract above — `src/logger.ts` reads it independently, same as every other
package's logger. `dispatch-specialist.ts` propagates `dispatch-worker`'s own
configured `LOG_LEVEL` (docker-compose locally, the ECS task definition in
prod) down as a container override on every dispatch, so this runner's
verbosity follows the worker that launched it without a second setting to
keep in sync.

## Model and effort — always explicit, never the SDK's own default

`src/claude-config.ts` reads `CLAUDE_MODEL` and `CLAUDE_EFFORT` (validated
against the SDK's own `low`/`medium`/`high`/`xhigh`/`max`) and passes both to
every `query()` call. **Neither has a code-level default** — both go through
`requireEnv`, and an unset one fails the run at startup rather than falling
back. The values come from the `specialist-sandbox.claude-model` /
`.claude-effort` context keys.
Deliberately not left unset: an unset `model`/`effort` would silently track
whatever the Agent SDK's CLI default happens to be on a given build, drifting
the specialist's behavior out from under this codebase without a line
changing here. `webhook-listener/src/activation-config.ts` follows the same
rule: its `CLAUDE_EFFORT` is required too, with no code-level default.

## Local git and GitHub's MCP — which does what

Local git handles clone/checkout/commit/push (needed for real test execution,
and for verifying branch ancestry against actual history — a shallow clone
can't do that, which is why `workspace.ts` uses `--filter=blob:none` for the
surface repo instead of `--depth`). GitHub's MCP server is attached for
what local git without `gh` can't do: opening the pull request, and on a
revision round reading the review and replying in its threads.

## Playwright/Chromium support

The image installs Chromium's OS-level shared libraries
(`npx playwright@latest install-deps chromium`) at build time, as root,
before the runtime switch to `USER node`. They have to be baked in: the
specialist has no root access at runtime, and without them Chromium fails to
launch ("error while loading shared libraries"). The browser *binary* itself
is deliberately not baked in — a specialist downloads it fresh per run
(`npx playwright install chromium`) inside whichever surface repo's browser
test project it's working in, matching that project's own pinned
`@playwright/test` version rather than whatever was current when this image
was built. As the non-root `node` user, installing and launching
`chromium-headless-shell` against a `data:` URL works in the built image.

## Toolchains

The image carries `node`, `python3` + Poetry, and the .NET SDK, plus `git` and
`curl`. Versions are matched to the reference CI workflows rather than chosen
here, and verified in the built image as the runtime `node` user:

| | version | how it is pinned |
|---|---|---|
| Node | 22 | the base image, `node:22-slim` |
| Python | 3.11.2 | the base image's Debian release (bookworm), not an apt pin |
| Poetry | 2.4.3 | `POETRY_VERSION` build arg, installed via `pipx` |
| .NET SDK | 10.0.401 | `DOTNET_CHANNEL` build arg (`10.0`) |

Every surface's toolchain has to be in the image, because the specialist runs
the surface's existing unit tests, not only its own, in this same sandbox. A
surface whose toolchain is missing gets tests nobody ran before CI, so CI stops
being an independent check on the specialist's own green.

The two build args exist so an engagement can retarget the image without
editing the Dockerfile. Python is the deliberate exception: it comes from the
base image's Debian release, because an apt pin on top of that installs a
second interpreter and leaves `python3` meaning the wrong one. A surface
needing a different minor is a base-image decision.

### Locked-mode restore

The specialist restores from committed lock files and never resolves fresh
(`agents/specialist.md`, "Do the work"). The three ecosystems do not behave
alike, and the difference is worth knowing before trusting any of them:

| | no lock file | lock present, drifted |
|---|---|---|
| `npm ci` | fails | fails |
| `poetry check --lock` | fails | fails |
| `dotnet restore --locked-mode` | **silently passes** | fails `NU1004` |

Verified in the built image, all six cells. The .NET cell is the trap: with no
`packages.lock.json` the flag restores normally and reports success, so a
solution that carries no lock file gets a check that means nothing. Enabling it
for real needs `RestorePackagesWithLockFile` set in the target repo and the
resulting lock files committed — a change in that repository, not this one.

## Known gaps

- **The toolchain set is engagement-shaped.** Node, Python and .NET are here
  because the surfaces in front of this framework use them. A surface built on
  anything else needs the image extended; the two build args cover a version
  change, not a new ecosystem.
- **No Docker, deliberately, and not coming.** Fargate offers no privileged
  mode and no socket mount, which is why integration and E2E execution live in
  GitHub Actions (design ledger, "Integration and E2E run in GitHub Actions").
  A criterion that needs a running stack cannot be closed in this sandbox at
  any toolchain level — it needs a CI check or a human at a terminal.
- **No sibling-repo reads (parked).** `workspace.ts` clones only
  `SURFACE_REPO`. A full-stack epic's frontend story confirming the real
  backend contract, or integration tests spanning two repos, would need the
  app to know which sibling repos exist for a given epic — nothing does.

## Working with it

```bash
npm install
npm run typecheck
npm run test:unit
```

```bash
docker build -f Dockerfile .
```

`./smoke-test.sh` builds the image and verifies it against the claims this
file makes about it — the toolchain versions, the unprivileged runtime user,
the continued absence of Docker, and all six locked-restore cells. Local only,
deliberately not in CI: it needs a Docker daemon, and what it guards changes
only when someone edits the Dockerfile. Run it then. `--image <tag>` skips the
build and checks an image already built.

No live run is possible from this repo alone — it needs real credentials and
an actual story/epic/branch chain against a live target repo.

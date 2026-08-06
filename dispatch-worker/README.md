# dispatch-worker

Hosts the Temporal workflow that dispatches a story to a specialist. Runs
inside the `temporal-workers` ECS service
[`infrastructure/`](../infrastructure) already registers — this is the
process that gives that service something to run, and the caller
[`specialist-sandbox`](../infrastructure/README.md) has been missing since it
was built.

Covers the design ledger's full "dispatch → wait for the specialist →
trigger CI → wait for the result → gate on human review → proceed" chain.
"Trigger CI" needs no code of its own — it already runs automatically once
the specialist opens a PR; "wait for the result" and "gate on human review"
are collapsed into one long-poll activity (see step 8 below) rather than two,
since a red CI check isn't a terminal state either (a human can push a fix
and CI goes green later) — the only two states that actually end a story's
dispatch are merged and closed-without-merging.

## What it does

`workflows/dispatch-story-workflow.ts`, one workflow execution per story:

1. **Check dependencies** — reads the story's "Blocking dependencies" section
   (tightened format, see below) and confirms every named blocker is Done via
   Linear. Not ready → posts a comment naming which blocker isn't done,
   workflow returns `{ outcome: "not-ready" }`. No `dispatch:blocked` label
   yet — see Known gaps.
2. **Resolve the repo base** — finds the target surface's `Repo base — …`
   line in the epic's comments (tightened format, see below), parses
   host/org/repo/ref.
3. **Create the story branch** — mechanical: reads the epic branch's current
   commit sha via the GitHub API, creates the story branch ref from it.
   Idempotent (a retried attempt against an already-created branch is not an
   error); never rebases or re-parents an existing branch.
4. **Dispatch the specialist** — `ecs:RunTask` against the specialist-sandbox
   task definition, container overrides exactly matching
   [`specialist-runner`](../specialist-runner)'s documented
   `dispatch-context.ts` contract.
5. **Wait for it** — polls the ECS task until it stops (long-running
   activity, heartbeats every poll — a specialist run can take a long time).
6. **Read the outcome** — the specialist's own `specialist:complete
   /:waiting/:blocked` label, once the task has stopped. This workflow never
   decides the outcome itself; it only reports what the specialist already
   decided and wrote via its own Linear MCP calls. Anything other than
   `complete` (waiting/blocked/unknown) ends the workflow here — there's no
   PR to watch.
7. **Find the PR** — mechanically, via GitHub's own head/base filter (`GET
   /repos/{owner}/{repo}/pulls?head=...&base=...&state=open`), not by parsing
   the specialist's free-prose "PR & branch" completion-report line. The
   workflow already knows the exact story/epic branch names before it ever
   dispatches the specialist, so no new recording format was needed here (see
   Two tightened content formats, below, for the two cases where one was).
   No matching open PR is a real specialist-compliance gap — posts a comment
   naming it and fails the workflow, non-retryable.
8. **Wait for merged, full stop** — polls the PR (re-reading its current head
   sha every poll, so a force-push can't leave it tracking a stale commit)
   until it's merged or closed without merging, heartbeating a CI/status
   summary each poll. Posts the final "PR merged" / "PR closed without
   merging" comment itself.

## Two tightened content formats — why they exist

Two pieces of data this workflow reads mechanically used to be pure prose,
with an example format but nothing enforced:

- **Blocking dependencies** (`skills/story-contract/story-contract.md`): each
  entry is now required to be its own bullet line with the blocker's bare
  identifier as the first token (`- PROJ-42 — <title>`), so
  `activities/check-dependencies.ts` can extract it without depending on any
  particular wording after it.
- **Repo base** (`agents/specification-agent.md`): recording a base now
  requires one fixed-form line per surface, `Repo base — <surface>:
  <host>/<org>/<repo>/<ref>`, in whatever comment the architect posts it in —
  `activities/resolve-repo-base.ts` searches the epic's comments for the
  matching line.

Neither edit relocates where the data lives (still a story description
section; still an epic thread comment) — just the format, so a mechanical
reader can trust it.

## Env vars

| Var | Wired into infra today? | Meaning |
|---|---|---|
| `TEMPORAL_HOST`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TASK_QUEUE`, `TEMPORAL_API_KEY` | yes | Connection to the namespace `infrastructure/constructs/temporal-namespace.ts` creates |
| `SPECIALIST_CLUSTER_ARN` | yes | From `specialist-sandbox`'s `clusterArn` output |
| `SPECIALIST_TASK_DEFINITION_ARN` | yes | From `specialist-sandbox`'s `taskDefinitionArn` output |
| `SPECIALIST_CONTAINER_NAME` | yes | From `specialist-sandbox`'s `taskDefinitionFamily` output — identical to the container name by construction (`specialist-task.ts` derives both from `formatName(config.name)`) |
| `SPECIALIST_SECURITY_GROUP_ID` | yes | From `specialist-sandbox`'s `securityGroupId` output |
| `SPECIALIST_SUBNET_IDS` | yes | Comma-separated (via Terraform's own `Fn.join`, not a JS-side join — see `temporal-worker-service.ts`); from `network`'s `publicSubnetIds` output |
| `GITHUB_TOKEN`, `LINEAR_AGENT_API_KEY` | yes (already in `temporal.parameter-prefix`) | Same secrets, same mechanism as every other container in this project |
| `LINEAR_API_URL` | no (optional) | Default `https://api.linear.app/graphql` |

All five `SPECIALIST_*` vars are now wired into
`infrastructure/stacks/temporal-workers.ts`'s container environment, and the
worker's task role carries the matching `ecs:RunTask`/`ecs:DescribeTasks`/
`iam:PassRole` permission (see `constructs/temporal-worker-service.ts`'s
`dispatchTarget` config) — `temporal-workers` can now actually dispatch
against `specialist-sandbox`. The caller now exists too:
`webhook-listener/src/dispatch-trigger.ts`'s `specialist-dispatch` lane calls
`client.workflow.start("dispatchStoryWorkflow", ...)` when a story enters
`In-Process` — see `webhook-listener/README.md`'s own lane table.

## What this does NOT do

- **Does not advance the story's Linear status to Done on merge.** CLAUDE.md
  states status is human-moved, always — this workflow doesn't relax that
  for a seemingly-mechanical case. Its own job ends at "merged"; a human
  still has to move the story to Done, the same way
  `check-dependencies.ts`'s `stateType !== "completed"` check already
  expects for every *other* story that depends on this one. A real,
  load-bearing consequence of that invariant, not a bug: a dependent
  story's own dispatch waits until a human notices the merge and moves the
  status.
- No `dispatch:blocked` label — `check-dependencies.ts` posts a comment
  naming the incomplete blocker, but doesn't apply the label, since Linear's
  label-write API replaces an issue's entire label set and applying one
  correctly needs its current labels read first — a small subsystem not
  built for the marginal gain over a comment.
- Only `github` is a supported repo-base host — see
  `activities/create-story-branch.ts`.
- No BRD-closure orchestration (three-way sign-off, closing-epic E2E) — this
  is the per-story loop only.

## Production bundling — `workflowBundle`, not `workflowsPath`

`workflowsPath` (bundling the workflow with webpack at Worker startup) is
fine for local development but the wrong choice for production per the
Temporal TypeScript SDK's own guidance — it's slow and repeats every time the
container starts. `scripts/build-workflow-bundle.mjs` pre-builds
`dist/workflow-bundle.js` once (the Dockerfile runs it at image build time,
not container start); `worker.ts` prefers that bundle when present and falls
back to `workflowsPath` only when running straight from source without a
build step.

## Testing

`workflows/dispatch-story-workflow.test.ts` runs the real workflow code
against a real (local, in-memory) Temporal test server —
`TestWorkflowEnvironment.createLocal()` plus a `Worker` with every activity
mocked — not just unit tests of the activities' own pure helper functions.
Covers the not-ready short-circuit, the not-complete short-circuit (waiting/
blocked/unknown never reaches `findPullRequest`/`awaitPullRequestOutcome`),
and the full eight-activity sequence ending in a merged PR, asserting both
the returned result and the exact call order. `createLocal()` over
`createTimeSkipping()`: this workflow has no workflow-level timers to skip
through (the only sleeps live inside `awaitSpecialistTask`'s and
`awaitPullRequestOutcome`'s activity code, invisible to the workflow
sandbox), so time-skipping buys nothing here.

`activities/await-specialist-task.test.ts` and
`activities/await-pull-request-outcome.test.ts` test the two activities that
call `heartbeat()`/`sleep()` from `@temporalio/activity` — both need a real
Activity Context to do anything (heartbeat emits an event only a Context
provides; `sleep()` is cancellation-aware and needs one to reject through).
Uses `@temporalio/testing`'s `MockActivityEnvironment` — confirmed its shape
by reading that package's own source
(`mocking-activity-environment.ts`) rather than assuming it: `env.run(fn,
...args)` runs `fn` inside a real Context, `env.on('heartbeat', ...)`
observes heartbeat calls, `env.cancel()` drives cancellation. Both cover
polling to their terminal state with the right heartbeat sequence, resolving
immediately when already terminal, and mid-poll cancellation actually
rejecting the activity; `await-pull-request-outcome.test.ts` additionally
confirms a failing CI conclusion on an intermediate poll doesn't end the
loop — only merged/closed does. Each activity takes its own lookup as an
injected function (`DescribeTaskStatus` / `GetPullRequestState`) rather than
constructing a client internally, specifically so tests can substitute a
fake one — same "explicit parameter, not read internally" discipline
`create-story-branch.ts` already uses for its GitHub token.

`activities/find-pull-request.test.ts` tests `pickPullRequest` only — the
pure selection logic, not the fetch call around it, same "parse/select is
pure and tested, the IO wrapper isn't" split `parseRepoBase`/
`parseBlockingDependencyIds` already established.

Retry classification also matters, and isn't left to defaults everywhere:
`resolveRepoBase`'s missing-base case and `createStoryBranch`'s permanent
failures (an unsupported host, a 4xx from GitHub) throw
`ApplicationFailure.nonRetryable` rather than a plain `Error` — Temporal's
default retry policy is generous (up to 100 attempts), and retrying a
config problem would just re-fetch and re-post the same "dispatch blocked"
comment on every attempt. `findPullRequest`'s missing-PR case is the same
category, for the same reason. The six quick activities also get a
domain-specific `retry: { maximumAttempts: 3 }` in the workflow's
`proxyActivities` call, so a persistent failure against Linear/GitHub/AWS
surfaces as a failed workflow rather than hammering those APIs for hours.
`awaitPullRequestOutcome` gets its own, much longer `startToCloseTimeout`
(14 days, vs. `awaitSpecialistTask`'s 4 hours) — a PR can sit unreviewed for
days in a way an ECS task never sits unfinished.

## Working with it

```bash
npm install
npm run typecheck
npm run test:unit
```

```bash
npm run build:bundle       # writes dist/workflow-bundle.js
docker build -f Dockerfile .
```

No live workflow execution against real Temporal Cloud is possible from
this repo alone — that needs real credentials and a real story/epic/branch
chain against live tracker and GitHub state. The workflow tests above are
real Temporal execution, just against a local test server and mocked
activities. A real (if local) end-to-end run — this worker, a local
Temporal server, and a real `ecs:RunTask` call against LocalStack that
actually launches a `specialist-runner` container — is possible via the
repo-root `docker-compose.yml`; see
[`docs/local-development.md`](../docs/local-development.md).

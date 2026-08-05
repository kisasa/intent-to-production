# dispatch-worker

Hosts the Temporal workflow that dispatches a story to a specialist. Runs
inside the `temporal-workers` ECS service
[`infrastructure/`](../infrastructure) already registers — this is the
process that gives that service something to run, and the caller
[`specialist-sandbox`](../infrastructure/README.md) has been missing since it
was built.

Covers the design ledger's "Dispatch → wait for the specialist" — the rest of
its stated flow ("trigger CI → wait for the result → gate on human review →
proceed") is a deliberate stop, not an oversight: CI already runs
automatically once the specialist opens a PR, and a human developer already
owns review and merge as reviewer-of-record. There's no automation gap there,
just an event this workflow doesn't block on for v1.

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
   decided and wrote via its own Linear MCP calls.

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

- No CI-wait or human-review-gate (see above).
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
Covers the not-ready short-circuit and the full six-activity sequence,
asserting both the returned result and the exact call order. `createLocal()`
over `createTimeSkipping()`: this workflow has no workflow-level timers to
skip through (the only sleep lives inside `awaitSpecialistTask`'s activity
code, invisible to the workflow sandbox), so time-skipping buys nothing here.

`activities/await-specialist-task.test.ts` tests the one activity that calls
`heartbeat()`/`sleep()` from `@temporalio/activity` — both need a real
Activity Context to do anything (heartbeat emits an event only a Context
provides; `sleep()` is cancellation-aware and needs one to reject through).
Uses `@temporalio/testing`'s `MockActivityEnvironment` — confirmed its shape
by reading that package's own source
(`mocking-activity-environment.ts`) rather than assuming it: `env.run(fn,
...args)` runs `fn` inside a real Context, `env.on('heartbeat', ...)`
observes heartbeat calls, `env.cancel()` drives cancellation. Covers polling
to `STOPPED` with the right heartbeat sequence, resolving immediately when
already stopped, an undefined ECS status heartbeating as `"unknown"`, and
mid-poll cancellation actually rejecting the activity. The activity itself
takes its ECS lookup as an injected function (`DescribeTaskStatus`) rather
than constructing a client internally, specifically so tests can substitute
a fake one — same "explicit parameter, not read internally" discipline
`create-story-branch.ts` already uses for its GitHub token.

Retry classification also matters, and isn't left to defaults everywhere:
`resolveRepoBase`'s missing-base case and `createStoryBranch`'s permanent
failures (an unsupported host, a 4xx from GitHub) throw
`ApplicationFailure.nonRetryable` rather than a plain `Error` — Temporal's
default retry policy is generous (up to 100 attempts), and retrying a
config problem would just re-fetch and re-post the same "dispatch blocked"
comment on every attempt. The four quick activities also get a
domain-specific `retry: { maximumAttempts: 3 }` in the workflow's
`proxyActivities` call, so a persistent failure against Linear/GitHub/AWS
surfaces as a failed workflow rather than hammering those APIs for hours.

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

No live workflow execution against real Temporal Cloud/AWS/GitHub/Linear is
possible from this repo alone — it needs real credentials and a real
story/epic/branch chain against live tracker and GitHub state. The workflow
tests above are real Temporal execution, just against a local test server
and mocked activities.

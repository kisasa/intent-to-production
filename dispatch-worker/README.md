# dispatch-worker

Hosts the Temporal workflow that dispatches a story to a specialist. Runs
inside the `temporal-workers` ECS service
[`infrastructure/`](../infrastructure) registers, and launches the
specialist as a one-shot task against the `specialist-sandbox` task
definition. The workflow is started by `webhook-listener`'s
`specialist-dispatch` lane (`webhook-listener/src/dispatch-trigger.ts`) when a
story enters `In Progress` — the tracker's literal name for the state the
framework calls In-Process.

Covers the design ledger's full "dispatch → wait for the specialist →
trigger CI → wait for the result → gate on human review → proceed" chain.
"Trigger CI" needs no code of its own — it already runs automatically once
the specialist opens a PR; "wait for the result" and "gate on human review"
are collapsed into one long-poll activity (step 8 below) rather than two,
since a red CI check isn't a terminal state either (a human can push a fix
and CI goes green later) — the only two states that actually end a story's
dispatch are merged and closed-without-merging. The same poll also notices a
"request changes" review and runs a revision round (see below).

## What it does

`workflows/dispatch-story-workflow.ts`, one workflow execution per story:

1. **Check dependencies** — reads the story's "Blocking dependencies" section
   (tightened format, see below) and confirms every named blocker is Done via
   Linear. Not ready → posts a comment naming which blocker isn't done, moves
   the story back to To-Do, and returns `{ outcome: "not-ready" }`.
2. **Resolve the surfaces** — `resolveSurfaces` reads the surface registry
   (the project's `Surfaces` document, with the epic's `Surfaces (override)`
   document layered on top), finds each of the story's surfaces, and requires
   them to share one repo and ref. Also yields each surface's directory and
   mandatory skills for the specialist.
3. **Create the story branch** — mechanical: reads the epic branch's current
   commit sha via the GitHub API and creates the story branch ref from it.
   An existing branch with no commits of its own is reused (a retried
   attempt is not an error). An existing branch that carries commits the epic
   branch doesn't have (`ahead_by > 0` on GitHub's compare endpoint — not a
   head comparison, since the epic branch moves as sibling stories merge) is
   work from an abandoned attempt, and the activity refuses it, naming the
   branch deletion as the remedy. A re-dispatch is a fresh start. It never
   rebases, re-parents, or deletes a branch.
4. **Dispatch the specialist** — `ecs:RunTask` against the specialist-sandbox
   task definition, container overrides matching
   [`specialist-runner`](../specialist-runner)'s documented
   `dispatch-context.ts` contract, plus this worker's own `LOG_LEVEL`
   propagated down as one more override — the specialist's verbosity follows
   whatever this worker was configured with, no separate setting to keep in
   sync.
5. **Wait for it** — polls the ECS task until it stops (long-running
   activity, heartbeats every poll — a specialist run can take a long time).
6. **Check for a PR — this is the outcome check.** Mechanically, via GitHub's
   own head/base filter, not a label and not the specialist's free-prose "PR
   & branch" completion-report line: a PR's existence *is* the outcome.
   Checks `open` first, then the single most recent `closed` PR for the same
   pair, trusting it only if it was actually merged — a merge that happens
   faster than this check must still read as complete. No matching PR →
   moves the story back to To-Do and returns `{ outcome: "no-pr" }`. Waiting
   on a dependency, blocked, or crashed all look the same to this workflow;
   the specialist's own comment on the story is the record of which one it
   was.
7. **Request the reviewer-of-record** on the PR (see below). If the mover
   can't be mapped to a GitHub login, posts a notice on the PR saying revision
   requests are off for this story.
8. **Watch the PR** — polls it (re-reading its current head sha every poll,
   so a force-push can't leave it tracking a stale commit), heartbeating a
   CI/status summary each poll, until one of three things happens:
   - **Merged** → posts "PR merged" on the story and returns
     `{ outcome: "complete" }`. The story's status is left for a human to
     move to Done.
   - **Closed without merging** → posts "PR closed without merging" on the
     story, moves it back to To-Do, and returns `{ outcome: "complete" }`
     with `merged: false`. The comment tells the developer to delete the
     story branch before re-dispatching, since step 3 refuses one carrying
     the abandoned attempt's commits.
   - **A new "request changes" review from the reviewer-of-record** → runs a
     revision round, then goes back to watching.

## Revision rounds

When the reviewer-of-record submits a GitHub "request changes" review on the
open PR, the workflow dispatches the specialist again at the same story,
branch and PR. `dispatch-story-workflow.ts` sets two constants:

- `REVISION_ROUND_CAP = 3` — at most three rounds per PR. Every round needs a
  human to submit a review first, so the loop can't run on its own; reaching
  the cap is a sign the story was mis-shaped, not a cost guard.
- `REVISION_MAX_TURNS = 25` — each round's turn budget, deliberately
  unrelated to the initial build's `resolveMaxTurns`. It is a scope fence:
  feedback that won't fit in it was a story change, not a review comment.

Changing either constant changes workflow control flow, so treat it as a
versioned change (`patched()`) if any dispatch is live.

**The trigger is an unactioned review, never the review state.** A
"changes requested" decision stays on the PR until the reviewer clears it,
so the workflow carries the id of the last review it acted on
(`afterReviewId`) and only a newer review from the reviewer-of-record's own
login counts. Keying on the state would re-fire on every poll. Detection is
part of the existing poll rather than a GitHub webhook: the workflow is
already fetching this PR, and GitHub doesn't redeliver a failed webhook, so a
review submitted while the single-task listener is mid-deploy would be lost.

A round runs `dispatchSpecialist` with `REVISION_MAX_TURNS` and a `revision`
block (round, cap, PR number, review id), which `specialist-runner` passes to
the specialist as its revision-round assignment. The specialist reads the
review itself from the PR. The progress comment on the story is posted and
removed the same way as the first build (see below).

The app's own lines on the PR (`activities/pull-request-notice.ts`, wording in
`workflows/revision-notices.ts`) say that a round started, that it finished
with how many remain, that the rounds are used up, or that a round failed.
They never say what the specialist did — that is the specialist's own reply,
in the thread the review was left in.

- The "rounds used up" notice is posted as soon as the last round finishes,
  not when a fourth review arrives. After that the workflow keeps watching
  for merge or close only; the story stays In Progress, since a PR is still
  open.
- A round that fails posts the failure on the PR as well as the story (see
  the catch-all below), and the story moves back to To-Do.
- A mover with no GitHub login mapping means no change request can be
  attributed to the reviewer-of-record, so revision rounds are off for that
  PR — which is why step 7 says so on the PR up front.

## Two tightened content formats — why they exist

Two pieces of data this workflow reads mechanically have a required format,
so a mechanical reader can trust them:

- **Blocking dependencies** (`skills/story-contract/story-contract.md`): each
  entry is its own line with the blocker's bare identifier as the first token
  (`- PROJ-42 — <title>`; the bullet marker is optional), so
  `activities/check-dependencies.ts` can extract it without depending on any
  particular wording after it.
- **Surface registry** (`agents/specification-agent.md`, step 1): where each
  surface lives is recorded as a fenced `surfaces` block in a Linear document
  — the project's `Surfaces`, optionally overridden per epic by
  `Surfaces (override)` — written by the agents, never typed by a human.
  `activities/surface-registry.ts` parses and merges it;
  `activities/resolve-surfaces.ts` reads the documents and resolves a
  story's surfaces.

## Env vars

| Var | Wired into infra today? | Meaning |
|---|---|---|
| `TEMPORAL_HOST`, `TEMPORAL_NAMESPACE`, `TEMPORAL_TASK_QUEUE`, `TEMPORAL_API_KEY` | yes | Connection to the namespace `infrastructure/constructs/temporal-namespace.ts` creates. `TEMPORAL_API_KEY` is optional: a local dev server has no namespace auth |
| `TEMPORAL_TLS` | no (optional) | Defaults on. Only the literal `false` turns it off, for a local dev server |
| `SPECIALIST_CLUSTER_ARN` | yes | From `specialist-sandbox`'s `clusterArn` output |
| `SPECIALIST_TASK_DEFINITION_ARN` | yes | From `specialist-sandbox`'s `taskDefinitionArn` output |
| `SPECIALIST_CONTAINER_NAME` | yes | From `specialist-sandbox`'s `taskDefinitionFamily` output — identical to the container name by construction (`specialist-task.ts` derives both from `formatName(config.name)`) |
| `SPECIALIST_SECURITY_GROUP_ID` | yes | From `specialist-sandbox`'s `securityGroupId` output |
| `SPECIALIST_SUBNET_IDS` | yes | Comma-separated (via Terraform's own `Fn.join`, not a JS-side join — see `temporal-workers.ts`); from `network`'s `publicSubnetIds` output |
| `GITHUB_TOKEN`, `LINEAR_AGENT_API_KEY` | yes (SSM, under the shared `parameter-prefix`) | Same secrets, same mechanism as every other container in this project |
| `REVIEWER_EMAIL_TO_GITHUB_LOGIN` | yes (from `temporal.reviewer-email-to-github-login` in `cdktf.json`) | Reviewer-of-record's static Linear-email -> GitHub-login table, JSON object string. Unset or missing an entry skips the reviewer request for that dispatch and turns revision rounds off for its PR — see `activities/request-pull-request-reviewer.ts` |
| `LINEAR_API_URL` | no (optional) | Default `https://api.linear.app/graphql` |
| `LOG_LEVEL` | no (optional) | Default `info`. Also passed down to the specialist container |
| `LOCAL_ENV_FILE`, `AWS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | no (local only) | The repo-root `docker-compose.yml` sets these to point the worker at LocalStack-emulated ECS — see `src/local-env-file.ts` and `.env.example` |

The worker's task role carries the `ecs:RunTask`/`ecs:DescribeTasks`/
`iam:PassRole` permission it needs to dispatch against `specialist-sandbox`
(see `constructs/temporal-worker-service.ts`'s `dispatchTarget` config).

## Reviewer-of-record

`dispatchStoryWorkflow`'s input carries `mover` — the tracker actor
`webhook-listener` read off the very webhook that moved the story to
In Progress (Linear's own `actor` field, present on every event kind, not
just comments). Once `findPullRequest` locates the specialist's PR,
`requestPullRequestReviewer` resolves `mover.email` through
`REVIEWER_EMAIL_TO_GITHUB_LOGIN` and requests that login as a GitHub
reviewer — preserving "the person who reviews decides when it gets written"
under app-driven dispatch.

The request itself is best-effort: a null `mover`, a missing mapping entry,
or a GitHub error never fails the workflow — the PR already exists and a
human is going to review it regardless. The login it resolves is also the
only reviewer whose "request changes" review starts a revision round, so when
none resolves the workflow posts a notice on the PR saying revision requests
are off, instead of leaving a developer to find out when their review does
nothing.

## Never silent — `dispatchStoryWorkflow`'s own catch-all

`dispatchStoryWorkflow`'s entire body is wrapped in one try/catch. Any
unhandled failure — anticipated or not — calls `postDispatchFailed` once,
naming the real cause, and then re-throws so Temporal still records the
workflow as failed. Activities don't post their own failure comments; their
thrown messages are specific enough to reuse as-is. If the failure happened
during a revision round, the same message is also posted on the PR, since
that is where the person waiting on the round is reading.

`describeFailure` (`workflows/describe-failure.ts`) unwraps Temporal's own
activity-failure wrapping — the workflow only ever sees a generic "Activity
task failed" on the top-level caught error; the activity's real message
lives one level down, on `.cause` — so the posted comment says the same
specific thing a developer reading the raw Event History would see.

## Moving back to Todo — the next step is always the developer's

Every path through `dispatchStoryWorkflow` that ends with no specialist
running and no open PR to watch — dependencies not ready, no PR after the
specialist's run, a PR closed without merging, or the catch-all failure
above — also calls `moveStoryToTodo`. Status is human-moved in the forward
direction; a workflow that can't proceed hands the next move back to a
developer rather than leaving a story looking like work is still happening.

`moveStoryToTodo` (`activities/move-story-to-todo.ts`) is best-effort like
every other courtesy activity here: it resolves the story's team's "Todo"
status by name (`findStateIdByName`/`updateIssueState` in `tracker.ts` —
state ids are per-team, so this is a two-step lookup, not a literal), and a
missing/renamed status or a Linear error is logged and swallowed rather than
failing the dispatch outcome it's just trying to reflect. "Todo" is the
tracker's literal state name — the same engagement-specific category as
`specialist-dispatch.ts`'s own "In Progress", not the framework's "To-Do".

## Specialist-progress comment

The shaping tier's own courtesy comment (`webhook-listener/src/
tracker-notifier.ts` — "working on this," edited every couple of minutes,
deleted on a clean run), carried over to the specialist tier:
`postSpecialistStarted` posts once the specialist container is dispatched,
`awaitSpecialistTask` edits it in place every ~2 minutes with an elapsed-time
line while it polls, and `deleteSpecialistProgressComment` removes it once
the container exits — before the PR check that follows, so the specialist's
own completion report is the only thing left narrating what happened. The
same happens for each revision round.

None of the three ever throw. A failure to post/update/delete this comment
must never fail an otherwise-successful dispatch. It is left on the tracker
(not deleted) whenever `dispatchSpecialist` or `awaitSpecialistTask` itself
fails, as a trace of how long the run went.

## What this does NOT do

- **Does not advance the story's Linear status to Done on merge — by
  design.** Status is human-moved, always, and this workflow doesn't relax
  that for a seemingly-mechanical case. Its own job ends at "merged"; a human
  moves the story to Done, the same way `check-dependencies.ts`'s
  `stateType !== "completed"` check expects for every story that depends on
  this one. The consequence is deliberate: a dependent story's own dispatch
  waits until a human notices the merge and moves the status.
- No `dispatch:blocked` label — `check-dependencies.ts` posts a comment
  naming the incomplete blocker, but doesn't apply the label, since Linear's
  label-write API replaces an issue's entire label set and applying one
  correctly needs its current labels read first — a small subsystem not
  built for the marginal gain over a comment.
- Only `github` is a supported repo-base host — see
  `activities/create-story-branch.ts`.
- No epic-completion or BRD-closure orchestration (per-epic three-way
  sign-off, E2E execution, closing-epic E2E) — this is the per-story loop
  only. Epic completion is a human procedure for now; see
  [`docs/engagement-readiness.pdf`](../docs/engagement-readiness.pdf)
  (source: [`docs/source/engagement-readiness.md`](../docs/source/engagement-readiness.md)).

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
It covers the not-ready short-circuit, a specialist run that leaves no PR,
the full sequence ending in a merged PR (asserting both the returned result
and the exact call order), the catch-all failure, a PR closed without
merging, a revision round with its own turn budget and watermark, the round
cap, and the unmapped-reviewer notice. `createLocal()` over
`createTimeSkipping()`: this workflow has no workflow-level timers to skip
through (the only sleeps live inside `awaitSpecialistTask`'s and
`awaitPullRequestOutcome`'s activity code, invisible to the workflow
sandbox), so time-skipping buys nothing here.

`activities/await-specialist-task.test.ts` and
`activities/await-pull-request-outcome.test.ts` test the two activities that
call `heartbeat()`/`sleep()` from `@temporalio/activity` — both need a real
Activity Context to do anything (heartbeat emits an event only a Context
provides; `sleep()` is cancellation-aware and needs one to reject through).
They use `@temporalio/testing`'s `MockActivityEnvironment`: `env.run(fn,
...args)` runs `fn` inside a real Context, `env.on('heartbeat', ...)`
observes heartbeat calls, `env.cancel()` drives cancellation. Both cover
polling to their terminal state with the right heartbeat sequence, resolving
immediately when already terminal, and mid-poll cancellation actually
rejecting the activity. `await-pull-request-outcome.test.ts` also confirms a
failing CI conclusion on an intermediate poll doesn't end the loop, and
covers change-request detection: only the reviewer-of-record's own
"request changes" review counts, only above the watermark, a merge wins over
a same-poll change request, and nothing is looked for once the cap is spent.
Each activity takes its own lookups as injected functions
(`DescribeTaskStatus` / `GetPullRequestState` / `GetChangeRequest`) rather
than constructing a client internally, specifically so tests can substitute
fakes — the same "explicit parameter, not read internally" discipline
`create-story-branch.ts` uses for its GitHub token.

`activities/create-story-branch.test.ts` covers the abandoned-work refusal:
a reused branch with no commits of its own passes, one carrying commits is
refused with the remedy named, and an unreadable comparison doesn't block
the story. `activities/find-pull-request.test.ts` tests `pickPullRequest`
only — the pure selection logic, not the fetch call around it, the same
"parse/select is pure and tested, the IO wrapper isn't" split as
`parseBlockingDependencyIds`. `workflows/revision-notices.test.ts` pins the
PR notice wording, including that none of them claims what the specialist
did.

Retry classification also matters, and isn't left to defaults everywhere:
permanent failures throw `ApplicationFailure.nonRetryable` rather than a
plain `Error` — a missing or malformed surface registry, or a surface it
can't resolve, in `resolveSurfaces`;
an unsupported host, a 4xx from GitHub, or an abandoned-work branch in
`createStoryBranch`; and an unreadable PR list in `findPullRequest` (no PR
at all is not a failure — it returns `null`, which is the `no-pr` outcome).
Temporal's default retry policy is generous (up to 100 attempts), and
retrying a config problem would just re-fetch and re-post the same failure on
every attempt. The short activities also get a domain-specific
`retry: { maximumAttempts: 3 }` in the workflow's `proxyActivities` call, so
a persistent failure against Linear/GitHub/AWS surfaces as a failed workflow
rather than hammering those APIs for hours. `awaitPullRequestOutcome` gets
its own, much longer `startToCloseTimeout` (14 days, vs.
`awaitSpecialistTask`'s 4 hours) — a PR can sit unreviewed for days in a way
an ECS task never sits unfinished.

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
[`docs/local-development.pdf`](../docs/local-development.pdf) (source:
[`docs/source/local-development.md`](../docs/source/local-development.md)).

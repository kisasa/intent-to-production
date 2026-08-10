/**
 * The workflow: checks dependencies, resolves the target surface's repo
 * base, creates the story branch, dispatches the specialist, waits for it,
 * and checks whether a PR now exists — if so, waits for it to merge or
 * close. Covers the ledger's full "dispatch → wait for the specialist →
 * trigger CI → wait for the result → gate on human review → proceed" chain
 * now; "trigger CI" is a no-op here since it already runs automatically on
 * the PR's own push.
 *
 * No outcome label (removed 2026-08-07 — see `docs/design-ledger.md`): a
 * PR's existence *is* the outcome. The specialist's own comment on the story
 * carries the why when there isn't one (waiting on a dependency, blocked,
 * still thinking, crashed) — the workflow itself only needs to know whether
 * there's a PR to watch, not classify the reason there isn't one yet.
 *
 * Every path that ends without a specialist actively running or a PR left
 * open to watch — dependencies not ready, no PR after the specialist's run,
 * or the catch-all failure below — also moves the story back to To-Do.
 * Confirmed live (2026-08-07): without this, a story could sit in
 * "In Progress" long after its own dispatch had already stopped, and the
 * next move is always the developer's to make, not a workflow's to wait on.
 *
 * Runs in Temporal's deterministic workflow sandbox: no fetch, no AWS SDK, no
 * filesystem here — every real IO call goes through `proxyActivities`, which
 * only imports `interface.ts`'s types, never the real implementations.
 */

import { proxyActivities } from "@temporalio/workflow";
import type { DispatchActivities } from "../activities/interface.js";
import type { Surface, StoryMover } from "../activities/types.js";
import { describeFailure } from "./describe-failure.js";

// Domain-specific reason for a non-default retry policy (the SDK default is
// generous — up to 100 attempts): these six all call external, rate-limited
// APIs (Linear, GitHub, AWS ECS). A persistent failure after 3 attempts
// should surface as a failed workflow rather than hammer those APIs for
// the better part of a day. Permanent errors (an unsupported host, a
// missing repo base) skip retries entirely — see each activity's own use of
// `ApplicationFailure.nonRetryable`.
const {
  checkDependencies,
  resolveRepoBase,
  createStoryBranch,
  dispatchSpecialist,
  postSpecialistStarted,
  deleteSpecialistProgressComment,
  findPullRequest,
  requestPullRequestReviewer,
  postDispatchFailed,
  moveStoryToTodo,
} = proxyActivities<DispatchActivities>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 3 },
});

// A specialist run can take a long time — the ledger's own "maxTurns is set
// ... since sessions do not time out on their own" applies here too, one
// level up: this activity has to be allowed to run at least that long, and
// it heartbeats every poll so Temporal doesn't mistake a long-but-alive run
// for a hung one.
const { awaitSpecialistTask } = proxyActivities<DispatchActivities>({
  startToCloseTimeout: "4 hours",
  heartbeatTimeout: "1 minute",
});

// A PR can sit unreviewed for days — a much longer ceiling than the
// specialist's own run, and its own separate proxyActivities call for the
// same reason: a different activity, a different realistic wait.
const { awaitPullRequestOutcome } = proxyActivities<DispatchActivities>({
  startToCloseTimeout: "14 days",
  heartbeatTimeout: "5 minutes",
});

export interface DispatchStoryWorkflowInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly surfaces: Surface[];
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
  /** Whoever moved this story to In-Process — reviewer-of-record. Null if the triggering webhook carried no resolvable actor. */
  readonly mover: StoryMover | null;
}

export interface DispatchStoryWorkflowResult {
  readonly outcome: "not-ready" | "no-pr" | "complete";
  /** Only set when `outcome` is "not-ready" — the blocking dependencies that aren't Done yet. */
  readonly blockedBy?: string[];
  /** Only set when `outcome` is "complete" — the PR this story's dispatch was watching. */
  readonly pullRequest?: { readonly number: number; readonly url: string; readonly merged: boolean };
}

export async function dispatchStoryWorkflow(input: DispatchStoryWorkflowInput): Promise<DispatchStoryWorkflowResult> {
  try {
    const dependencyCheck = await checkDependencies(input.storyId);
    if (!dependencyCheck.ready) {
      await moveStoryToTodo(input.storyId);
      return { outcome: "not-ready", blockedBy: dependencyCheck.blockedBy };
    }

    const repoBase = await resolveRepoBase(input.epicId, input.surfaces);

    await createStoryBranch({
      repoBase: repoBase,
      epicBranch: input.epicBranch,
      storyBranch: input.storyBranch,
    });

    const taskArn = await dispatchSpecialist({
      storyId: input.storyId,
      storyTitle: input.storyTitle,
      epicId: input.epicId,
      surfaces: input.surfaces,
      repoBase: repoBase,
      storyBranch: input.storyBranch,
      epicBranch: input.epicBranch,
      maxTurns: input.maxTurns,
    });

    const progressCommentId = await postSpecialistStarted(input.storyId);
    await awaitSpecialistTask(taskArn, progressCommentId);
    if (progressCommentId) {
      await deleteSpecialistProgressComment(progressCommentId);
    }

    const pr = await findPullRequest(repoBase, input.storyBranch, input.epicBranch);
    if (!pr) {
      // No PR yet, for whatever reason (waiting on a dependency, blocked,
      // still thinking, crashed) — the specialist's own comment on the
      // story already says why. Nothing is actively running anymore, so
      // hand the next move back to a developer rather than leaving the
      // board showing "In Progress" for a dispatch that's already stopped.
      await moveStoryToTodo(input.storyId);
      return { outcome: "no-pr" };
    }

    await requestPullRequestReviewer(repoBase, pr.number, input.mover);
    const prOutcome = await awaitPullRequestOutcome(input.storyId, repoBase, pr.number, pr.url);

    return {
      outcome: "complete",
      pullRequest: { number: pr.number, url: pr.url, merged: prOutcome === "merged" },
    };
  } catch (err) {
    // Posted, then re-thrown — Temporal still records the workflow itself
    // as Failed (the durable, queryable source of truth); the comment is
    // this tier's own equivalent of the shaping tier's fail-fast comment,
    // so a human watching the tracker (not Temporal) also finds out.
    await postDispatchFailed(input.storyId, describeFailure(err));
    await moveStoryToTodo(input.storyId);
    throw err;
  }
}

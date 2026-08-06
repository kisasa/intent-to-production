/**
 * The workflow: checks dependencies, resolves the target surface's repo
 * base, creates the story branch, dispatches the specialist, waits for it,
 * reads back its outcome, and — when that outcome is "complete" — finds the
 * PR the specialist opened and waits for it to merge or close. Covers the
 * ledger's full "dispatch → wait for the specialist → trigger CI → wait for
 * the result → gate on human review → proceed" chain now; "trigger CI" is a
 * no-op here since it already runs automatically on the PR's own push.
 *
 * Runs in Temporal's deterministic workflow sandbox: no fetch, no AWS SDK, no
 * filesystem here — every real IO call goes through `proxyActivities`, which
 * only imports `interface.ts`'s types, never the real implementations.
 */

import { proxyActivities } from "@temporalio/workflow";
import type { DispatchActivities } from "../activities/interface.js";
import type { SpecialistOutcome } from "../activities/read-specialist-outcome.js";
import type { SpecialistType, StoryMover } from "../activities/types.js";

// Domain-specific reason for a non-default retry policy (the SDK default is
// generous — up to 100 attempts): these six all call external, rate-limited
// APIs (Linear, GitHub, AWS ECS). A persistent failure after 3 attempts
// should surface as a failed workflow rather than hammer those APIs for
// the better part of a day. Permanent errors (an unsupported host, a
// missing repo base, no matching PR) skip retries entirely — see each
// activity's own use of `ApplicationFailure.nonRetryable`.
const {
  checkDependencies,
  resolveRepoBase,
  createStoryBranch,
  dispatchSpecialist,
  readSpecialistOutcome,
  findPullRequest,
  requestPullRequestReviewer,
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
  readonly specialistType: SpecialistType;
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
  /** Whoever moved this story to In-Process — reviewer-of-record. Null if the triggering webhook carried no resolvable actor. */
  readonly mover: StoryMover | null;
}

export interface DispatchStoryWorkflowResult {
  readonly outcome: SpecialistOutcome | "not-ready";
  /** Only set when `outcome` is "not-ready" — the blocking dependencies that aren't Done yet. */
  readonly blockedBy?: string[];
  /** Only set when `outcome` is "complete" — the PR this story's dispatch was watching. */
  readonly pullRequest?: { readonly number: number; readonly url: string; readonly merged: boolean };
}

export async function dispatchStoryWorkflow(input: DispatchStoryWorkflowInput): Promise<DispatchStoryWorkflowResult> {
  const dependencyCheck = await checkDependencies(input.storyId);
  if (!dependencyCheck.ready) {
    return { outcome: "not-ready", blockedBy: dependencyCheck.blockedBy };
  }

  const repoBase = await resolveRepoBase(input.storyId, input.epicId, input.specialistType);

  await createStoryBranch({
    repoBase: repoBase,
    epicBranch: input.epicBranch,
    storyBranch: input.storyBranch,
  });

  const taskArn = await dispatchSpecialist({
    storyId: input.storyId,
    storyTitle: input.storyTitle,
    epicId: input.epicId,
    specialistType: input.specialistType,
    repoBase: repoBase,
    storyBranch: input.storyBranch,
    epicBranch: input.epicBranch,
    maxTurns: input.maxTurns,
  });

  await awaitSpecialistTask(taskArn);

  const outcome = await readSpecialistOutcome(input.storyId);
  if (outcome !== "complete") {
    // waiting/blocked/unknown: no PR exists to watch.
    return { outcome: outcome };
  }

  const pr = await findPullRequest(input.storyId, repoBase, input.storyBranch, input.epicBranch);
  await requestPullRequestReviewer(repoBase, pr.number, input.mover);
  const prOutcome = await awaitPullRequestOutcome(input.storyId, repoBase, pr.number, pr.url);

  return {
    outcome: outcome,
    pullRequest: { number: pr.number, url: pr.url, merged: prOutcome === "merged" },
  };
}

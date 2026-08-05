/**
 * The workflow: checks dependencies, resolves the target surface's repo
 * base, creates the story branch, dispatches the specialist, waits for it,
 * and reads back its outcome. Covers the ledger's "Dispatch → wait for the
 * specialist" — CI-wait and human-review-gate are a deliberate stop, not an
 * oversight (see dispatch-worker/README.md).
 *
 * Runs in Temporal's deterministic workflow sandbox: no fetch, no AWS SDK, no
 * filesystem here — every real IO call goes through `proxyActivities`, which
 * only imports `interface.ts`'s types, never the real implementations.
 */

import { proxyActivities } from "@temporalio/workflow";
import type { DispatchActivities } from "../activities/interface.js";
import type { SpecialistOutcome } from "../activities/read-specialist-outcome.js";
import type { SpecialistType } from "../activities/types.js";

// Domain-specific reason for a non-default retry policy (the SDK default is
// generous — up to 100 attempts): these four all call external, rate-limited
// APIs (Linear, GitHub, AWS ECS). A persistent failure after 3 attempts
// should surface as a failed workflow rather than hammer those APIs for
// the better part of a day. Permanent errors (an unsupported host, a
// missing repo base) skip retries entirely — see each activity's own use of
// `ApplicationFailure.nonRetryable`.
const { checkDependencies, resolveRepoBase, createStoryBranch, dispatchSpecialist, readSpecialistOutcome } =
  proxyActivities<DispatchActivities>({
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

export interface DispatchStoryWorkflowInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly specialistType: SpecialistType;
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
}

export interface DispatchStoryWorkflowResult {
  readonly outcome: SpecialistOutcome | "not-ready";
  /** Only set when `outcome` is "not-ready" — the blocking dependencies that aren't Done yet. */
  readonly blockedBy?: string[];
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
  return { outcome: outcome };
}

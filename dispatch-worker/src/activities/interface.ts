/**
 * The activity signatures the workflow depends on — type-only, imported by
 * `workflows/dispatch-story-workflow.ts` via `proxyActivities<DispatchActivities>()`.
 * Workflow code runs in Temporal's deterministic sandbox and must never
 * import the real (non-deterministic) activity implementations directly;
 * this file exists so the workflow gets full type-checking on activity calls
 * without pulling any real code (fetch, the AWS SDK, Node's child_process)
 * into the workflow bundle. `worker.ts` is the only module that imports the
 * real implementations and binds them to these same names.
 */

import type { DependencyCheckResult } from "./check-dependencies.js";
import type { CreateStoryBranchInput } from "./create-story-branch.js";
import type { DispatchSpecialistInput } from "./dispatch-specialist.js";
import type { SpecialistOutcome } from "./read-specialist-outcome.js";
import type { RepoBase } from "./resolve-repo-base.js";
import type { SpecialistType } from "./types.js";

export interface DispatchActivities {
  checkDependencies(storyId: string): Promise<DependencyCheckResult>;
  resolveRepoBase(storyId: string, epicId: string, surface: SpecialistType): Promise<RepoBase>;
  createStoryBranch(input: CreateStoryBranchInput): Promise<void>;
  dispatchSpecialist(input: DispatchSpecialistInput): Promise<string>;
  awaitSpecialistTask(taskArn: string): Promise<void>;
  readSpecialistOutcome(storyId: string): Promise<SpecialistOutcome>;
}

/**
 * Reads the specialist's own outcome label off the story once its ECS task
 * has stopped. This is the workflow's only source of truth for
 * complete/waiting/blocked — the workflow itself never decides this, same
 * as `activation-runner.ts` never decides a shaping-tier activation's
 * outcome.
 */

import { getIssue, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";

export type SpecialistOutcome = "complete" | "waiting" | "blocked" | "unknown";

const OUTCOME_LABELS: Record<string, SpecialistOutcome> = {
  "specialist:complete": "complete",
  "specialist:waiting": "waiting",
  "specialist:blocked": "blocked",
};

/**
 * "unknown" covers the gap `docs/development-tier-dispatch.md`'s own
 * runbook doesn't have to worry about but this one does: the container
 * could exit without any outcome label at all (a crash `specialist-runner`'s
 * own tracker-fallback comment couldn't post to, or a bug). Not silently
 * treated as any of the three real outcomes.
 */
export function resolveOutcomeFromLabels(labels: string[]): SpecialistOutcome {
  for (const label of labels) {
    const outcome = OUTCOME_LABELS[label];
    if (outcome) return outcome;
  }
  return "unknown";
}

export function createReadSpecialistOutcomeActivity(config: WorkerConfig) {
  return async function readSpecialistOutcome(storyId: string): Promise<SpecialistOutcome> {
    const story = await getIssue(storyId, config.linearAgentApiKey, linearApiUrl());
    return resolveOutcomeFromLabels(story.labels);
  };
}

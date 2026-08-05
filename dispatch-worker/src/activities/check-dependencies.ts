/**
 * The pre-dispatch dependency check the ledger names as "a plain tracker
 * read, not agent judgment... runs before the Anthropic call rather than
 * being left for the dispatched agent to discover mid-run." Reads the
 * story's "Blocking dependencies" section (tightened format —
 * `skills/story-contract/story-contract.md` — bare identifier as the first
 * token of each bullet line), confirms every named blocker's Linear state
 * is `completed`.
 *
 * Not a `dispatch:blocked` label yet — see the class comment in
 * `resolve-repo-base.ts` for why label application is out of scope here
 * (`save_issue`-style label writes replace the whole label set, so applying
 * one correctly needs the issue's current labels first; a comment carries
 * the same information for now). Named gap, not silently dropped.
 */

import { getIssue, postComment, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";

export interface DependencyCheckResult {
  readonly ready: boolean;
  readonly blockedBy: string[];
}

const BULLET_IDENTIFIER = /^-\s*([A-Z][A-Z0-9]*-\d+)/;
const HEADING_LINE = /^\*\*.+\*\*$/;

/**
 * Extracts blocker identifiers from a story description's "Blocking
 * dependencies" section. Returns an empty array both for "No blocking
 * dependencies." and for a heading with no bullet lines — both correctly
 * mean "nothing blocking." Throws if the heading itself is missing: every
 * well-formed story has this section per story-contract.md, so its absence
 * is a story defect, not something to silently treat as "ready."
 */
export function parseBlockingDependencyIds(description: string): string[] {
  const lines = description.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === "**Blocking dependencies**");
  if (headingIndex === -1) {
    throw new Error('Story description has no "**Blocking dependencies**" section');
  }

  const ids: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) break;
    const trimmed = line.trim();
    if (HEADING_LINE.test(trimmed)) break;
    const match = trimmed.match(BULLET_IDENTIFIER);
    if (match?.[1]) ids.push(match[1]);
  }
  return ids;
}

export function createCheckDependenciesActivity(config: WorkerConfig) {
  return async function checkDependencies(storyId: string): Promise<DependencyCheckResult> {
    const baseUrl = linearApiUrl();
    const story = await getIssue(storyId, config.linearAgentApiKey, baseUrl);
    const blockerIds = parseBlockingDependencyIds(story.description);

    if (blockerIds.length === 0) {
      return { ready: true, blockedBy: [] };
    }

    const blockers = await Promise.all(
      blockerIds.map(async (id) => ({ id, issue: await getIssue(id, config.linearAgentApiKey, baseUrl) })),
    );
    const notDone = blockers.filter(({ issue }) => issue.stateType !== "completed").map(({ id }) => id);

    if (notDone.length > 0) {
      await postComment(
        storyId,
        config.linearAgentApiKey,
        baseUrl,
        `**Dispatch blocked** _(automated)_\n\nThis story's blocking dependencies aren't all Done yet: ` +
          `${notDone.join(", ")}. Move this story back to To-Do and forward again once ` +
          `${notDone.length === 1 ? "it merges" : "they merge"}.`,
      );
      return { ready: false, blockedBy: notDone };
    }

    return { ready: true, blockedBy: [] };
  };
}

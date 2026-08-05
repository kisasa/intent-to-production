/**
 * Reads the target surface's repo base (host/org/repo/ref) from the epic's
 * comment thread, per specification-agent.md's tightened recording format:
 * one fixed-form line per surface, `Repo base — <surface>:
 * <host>/<org>/<repo>/<ref>`, surrounded by otherwise free prose. Searches
 * comments most-recent-first so a later correction wins over an earlier one.
 *
 * A missing repo base is a real pipeline-setup problem (the Specification
 * Agent should have established it before this epic's stories ever reached
 * To-Do) — not silently swallowed. Posts a comment naming the gap on the
 * story before throwing `ApplicationFailure.nonRetryable` — not a plain
 * `Error`. Temporal's default retry policy retries a thrown activity for a
 * long time (up to 100 attempts by default); a plain throw here would keep
 * re-fetching the epic and re-posting the same "dispatch blocked" comment on
 * every attempt until someone records the base, which is both noisy and
 * pointless — retrying immediately can't fix a human recording problem.
 * Marking it non-retryable fails the workflow once, visibly, instead.
 */

import { ApplicationFailure } from "@temporalio/activity";
import { getIssue, postComment, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";
import type { SpecialistType } from "./types.js";

export interface RepoBase {
  readonly host: string;
  readonly org: string;
  readonly repo: string;
  readonly ref: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseRepoBase(comments: string[], surface: string): RepoBase | null {
  const pattern = new RegExp(`Repo base\\s*—\\s*${escapeRegExp(surface)}:\\s*([^/\\s]+)/([^/\\s]+)/([^/\\s]+)/(\\S+)`, "i");

  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    if (comment === undefined) continue;
    const match = pattern.exec(comment);
    if (match) {
      const [, host, org, repo, ref] = match;
      if (host && org && repo && ref) return { host, org, repo, ref };
    }
  }
  return null;
}

export function createResolveRepoBaseActivity(config: WorkerConfig) {
  return async function resolveRepoBase(storyId: string, epicId: string, surface: SpecialistType): Promise<RepoBase> {
    const baseUrl = linearApiUrl();
    const epic = await getIssue(epicId, config.linearAgentApiKey, baseUrl);
    const base = parseRepoBase(epic.comments, surface);

    if (!base) {
      await postComment(
        storyId,
        config.linearAgentApiKey,
        baseUrl,
        `**Dispatch blocked** _(automated)_\n\nNo recorded repo base found for surface "${surface}" on epic ` +
          `${epicId}. The architect needs to record one (see specification-agent.md's format) before this ` +
          `story can dispatch.`,
      );
      throw ApplicationFailure.nonRetryable(
        `No recorded repo base for surface "${surface}" on epic ${epicId}`,
        "MissingRepoBase",
      );
    }

    return base;
  };
}

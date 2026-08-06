/**
 * Finds the PR the specialist must have opened once it reports `complete` —
 * mechanically, via GitHub's own head/base filter, not by parsing the
 * specialist's free-prose "PR & branch" completion-report line (the same
 * class of problem `story-contract.md`/`specification-agent.md` already
 * solved twice by tightening a recording *format*). Not needed here: the
 * workflow already knows the exact story/epic branch names before it ever
 * dispatches the specialist, so it can just ask GitHub directly.
 *
 * No matching open PR is a real specialist-compliance gap (reported
 * "complete," didn't actually open the right PR) — not silently treated as
 * "still working." Throws `ApplicationFailure.nonRetryable` with a message
 * actionable on its own — dispatchStoryWorkflow's own catch-all posts it to
 * the story (see post-dispatch-failed.ts); this activity used to post its
 * own comment too, which would have double-posted once that catch-all
 * existed. Same category as `resolve-repo-base.ts`'s own handling.
 */

import { ApplicationFailure } from "@temporalio/activity";
import { githubRequest, isClientError } from "../github-request.js";
import type { WorkerConfig } from "../worker-config.js";
import type { RepoBase } from "./resolve-repo-base.js";

export interface PullRequestReference {
  readonly number: number;
  readonly url: string;
}

interface GitHubPullRequestListItem {
  number: number;
  html_url: string;
}

/**
 * GitHub's own head/base/state query params already narrow the result set —
 * this just picks the first (there should be at most one open PR for a given
 * head+base pair). Pure and tested directly, unlike the fetch call around it
 * (same "parse/select is pure and tested, the IO wrapper isn't" split as
 * `parseRepoBase`/`parseBlockingDependencyIds`).
 */
export function pickPullRequest(candidates: GitHubPullRequestListItem[]): PullRequestReference | null {
  const first = candidates[0];
  return first ? { number: first.number, url: first.html_url } : null;
}

export function createFindPullRequestActivity(config: WorkerConfig) {
  return async function findPullRequest(
    repoBase: RepoBase,
    headBranch: string,
    baseBranch: string,
  ): Promise<PullRequestReference> {
    const owner = repoBase.org;
    const repo = repoBase.repo;
    const query = new URLSearchParams({ head: `${owner}:${headBranch}`, base: baseBranch, state: "open" });

    const result = await githubRequest<GitHubPullRequestListItem[]>(
      config.githubToken,
      "GET",
      `/repos/${owner}/${repo}/pulls?${query.toString()}`,
    );
    if (result.status !== 200) {
      const message =
        `Could not list pull requests for ${owner}/${repo} (head=${headBranch}, base=${baseBranch}): ` +
        `GitHub returned ${result.status}`;
      if (isClientError(result.status)) throw ApplicationFailure.nonRetryable(message, "PullRequestListUnreadable");
      throw new Error(message);
    }

    const pr = pickPullRequest(result.json);
    if (!pr) {
      throw ApplicationFailure.nonRetryable(
        `The specialist reported this story complete, but no open pull request was found from "${headBranch}" ` +
          `into "${baseBranch}" in ${owner}/${repo}. Check that the PR was actually opened against the epic branch.`,
        "PullRequestNotFound",
      );
    }

    return pr;
  };
}

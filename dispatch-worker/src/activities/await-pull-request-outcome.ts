/**
 * Long-running activity: polls the PR the specialist opened until it leaves
 * the open state. Collapses the ledger's "trigger CI → wait for the result →
 * gate on human review" into one poll rather than two, on purpose — a red CI
 * check on the PR's current head is not a terminal state either (a human can
 * push a fix and CI goes green later), so there is no point where this
 * activity has to *decide* CI failed and stop; it only has to notice the two
 * states that actually end the story's dispatch: merged, or closed without
 * merging. Confirmed with the architect: review itself is modeled as "wait for
 * merged, full stop" — CLAUDE.md already frames review as one human act
 * ("a human developer... who merges"), not a separate approve-then-merge
 * pair, and if branch protection requires an approving review before merge
 * is allowed, merged already implies reviewed.
 *
 * Re-fetches the PR (and therefore its current head sha) every poll rather
 * than capturing a sha once up front — a force-push or a new commit changes
 * which commit's checks matter, and a poll pinned to a stale sha would
 * silently stop tracking the right one.
 *
 * Same `heartbeat()`/`sleep()`-needs-a-real-Context shape as
 * `await-specialist-task.ts`: the pure loop takes an injected
 * `getPullRequestState` function so it's testable with
 * `MockActivityEnvironment` without a real GitHub call.
 */

import { heartbeat, sleep } from "@temporalio/activity";
import { githubRequest } from "../github-request.js";
import { postComment, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";
import type { RepoBase } from "./resolve-repo-base.js";

const DEFAULT_POLL_INTERVAL_MS = 120_000;

export type PullRequestOutcome = "merged" | "closed";

export interface PullRequestState {
  readonly merged: boolean;
  readonly state: "open" | "closed";
  /** Human-readable CI/review status for the heartbeat — not used for control flow. */
  readonly statusSummary: string;
}

export type GetPullRequestState = (prNumber: number) => Promise<PullRequestState>;

export async function awaitPullRequestOutcome(
  prNumber: number,
  getPullRequestState: GetPullRequestState,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<PullRequestOutcome> {
  for (;;) {
    const pr = await getPullRequestState(prNumber);

    if (pr.merged) return "merged";
    if (pr.state === "closed") return "closed";

    heartbeat(pr.statusSummary);
    await sleep(pollIntervalMs);
  }
}

interface GitHubPullRequestDetail {
  merged: boolean;
  state: "open" | "closed";
  head: { sha: string };
}

interface GitHubCheckRun {
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
}

interface GitHubCheckRunsResponse {
  total_count: number;
  check_runs: GitHubCheckRun[];
}

const FAILING_CONCLUSIONS = new Set(["failure", "timed_out", "cancelled", "action_required"]);

/** Pure and tested directly, like `pickPullRequest` — the summary text is the only thing worth unit-testing here. */
export function summarizeCheckRuns(checks: GitHubCheckRunsResponse): string {
  if (checks.total_count === 0) return "no CI checks reported yet";

  const pending = checks.check_runs.filter((run) => run.status !== "completed").length;
  const failed = checks.check_runs.filter((run) => run.conclusion !== null && FAILING_CONCLUSIONS.has(run.conclusion)).length;
  const passed = checks.check_runs.length - pending - failed;

  const parts = [`CI: ${passed}/${checks.total_count} passed`];
  if (failed > 0) parts.push(`${failed} failed`);
  if (pending > 0) parts.push(`${pending} pending`);
  return parts.join(", ");
}

export function createAwaitPullRequestOutcomeActivity(config: WorkerConfig) {
  return async (storyId: string, repoBase: RepoBase, prNumber: number, prUrl: string): Promise<PullRequestOutcome> => {
    const owner = repoBase.org;
    const repo = repoBase.repo;

    const getPullRequestState: GetPullRequestState = async (number) => {
      const prResult = await githubRequest<GitHubPullRequestDetail>(config.githubToken, "GET", `/repos/${owner}/${repo}/pulls/${number}`);
      if (prResult.status !== 200) {
        throw new Error(`Could not read pull request #${number} in ${owner}/${repo}: GitHub returned ${prResult.status}`);
      }
      const detail = prResult.json;

      if (detail.merged) return { merged: true, state: "closed", statusSummary: "merged" };
      if (detail.state === "closed") return { merged: false, state: "closed", statusSummary: "closed without merging" };

      const checksResult = await githubRequest<GitHubCheckRunsResponse>(
        config.githubToken,
        "GET",
        `/repos/${owner}/${repo}/commits/${detail.head.sha}/check-runs`,
      );
      const statusSummary =
        checksResult.status === 200 ? summarizeCheckRuns(checksResult.json) : "CI status unavailable this poll";

      return { merged: false, state: "open", statusSummary: statusSummary };
    };

    const outcome = await awaitPullRequestOutcome(prNumber, getPullRequestState);

    const body =
      outcome === "merged"
        ? `**PR merged** _(automated)_\n\n${prUrl} has been merged. Story implementation is complete — move this story to Done once verified.`
        : `**PR closed without merging** _(automated)_\n\n${prUrl} was closed without merging. This story's dispatch did not complete.`;
    await postComment(storyId, config.linearAgentApiKey, linearApiUrl(), body);

    return outcome;
  };
}

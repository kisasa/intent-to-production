/**
 * Long-running activity: polls the PR the specialist opened until it leaves
 * the open state, or until someone with write access asks for changes.
 *
 * Merge detection collapses the ledger's "trigger CI → wait for the result →
 * gate on human review" into one poll rather than two, on purpose — a red CI
 * check on the PR's current head is not a terminal state either (a human can
 * push a fix and CI goes green later), so there is no point where this
 * activity has to *decide* CI failed and stop; it only has to notice the
 * states that actually end this watch.
 *
 * Change-request detection (2026-09-19) rides along on that same poll rather
 * than arriving by GitHub webhook. Two reasons, both about this repository
 * rather than about polling being nicer: the workflow is already awake and
 * already fetching this exact PR every couple of minutes, so it costs one
 * more request on a call that is going out anyway; and GitHub does not
 * automatically redeliver a failed webhook, while the listener is a
 * single Fargate task whose deploys stop the old one before starting the new
 * one. A review submitted during a deploy would be dropped silently, which
 * is the one outcome the development tier's "never silent" rule exists to
 * prevent. A webhook becomes worth building when something needs reacting to
 * *outside* a live workflow — the epic→BRD PR, or CI after a story merges.
 *
 * **The trigger is an unactioned review, never the review state.** A
 * "changes requested" decision stays on the PR until the same reviewer
 * approves it or someone dismisses it — the specialist cannot clear it, by
 * design. Keying on the state would therefore re-fire on every poll forever:
 * round one finishes, the state is still CHANGES_REQUESTED, and the next
 * poll dispatches round two. So the workflow carries the id of the last
 * review it acted on and only a newer one counts.
 *
 * Re-fetches the PR (and therefore its current head sha) every poll rather
 * than capturing a sha once up front — a force-push or a new commit changes
 * which commit's checks matter, and a poll pinned to a stale sha would
 * silently stop tracking the right one.
 *
 * Same `heartbeat()`/`sleep()`-needs-a-real-Context shape as
 * `await-specialist-task.ts`: the pure loop takes injected reader functions
 * so it's testable with `MockActivityEnvironment` without a real GitHub call.
 *
 * **Who may ask (2026-10-26): anyone with write access, not only the mover.**
 * The trigger used to be the reviewer-of-record's own login. A live run showed
 * what that costs: the architect reviewed a PR that had been requested of the
 * developer who moved the story, the review was ignored, and nothing on the PR
 * said so. The question that matters is not whose name is on the review but
 * whether the author is someone the repository already trusts to change code,
 * so the gate is the repository's own permission on the author. A reviewer with
 * read access cannot start a round — otherwise a drive-by reviewer on a public
 * repository could spend an ECS task and put text in front of the specialist.
 */

import { heartbeat, log, sleep } from "@temporalio/activity";
import { githubRequest } from "../github-request.js";
import { postComment, linearApiUrl } from "../tracker.js";
import type { WorkerConfig } from "../worker-config.js";
import type { RepoBase } from "./resolve-surfaces.js";

const DEFAULT_POLL_INTERVAL_MS = 120_000;

export type PullRequestOutcome = "merged" | "closed" | "changes-requested";

export interface PullRequestState {
  readonly merged: boolean;
  readonly state: "open" | "closed";
  /** Human-readable CI/review status for the heartbeat — not used for control flow. */
  readonly statusSummary: string;
}

/**
 * A submitted "request changes" review — identified, not carried.
 *
 * The review's prose and its inline comments are deliberately not read here.
 * The specialist fetches them itself from the PR, for the same reason it
 * reads the story and the codebase itself: handing an agent a pre-digested
 * copy of something it could read at the source is how a stale or lossy
 * summary becomes the thing it builds against. It also keeps an unbounded
 * blob of reviewer prose out of the ECS task overrides, which RunTask caps.
 */
export interface ChangeRequest {
  readonly reviewId: number;
  readonly submittedAt: string;
}

export type PullRequestWatchResult =
  | { readonly outcome: "merged" }
  | { readonly outcome: "closed" }
  | { readonly outcome: "changes-requested"; readonly changeRequest: ChangeRequest };

export type GetPullRequestState = (prNumber: number) => Promise<PullRequestState>;

/** Null return means "nothing new from anyone allowed to ask this poll." */
export type GetChangeRequest = () => Promise<ChangeRequest | null>;

/**
 * `getChangeRequest` is null when change requests are not being watched at
 * all — the round cap is spent. Merge and close still end the watch; passing
 * null rather than a flag keeps "we are not watching" impossible to confuse
 * with "we are watching and saw nothing."
 */
export async function awaitPullRequestOutcome(
  prNumber: number,
  getPullRequestState: GetPullRequestState,
  getChangeRequest: GetChangeRequest | null = null,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<PullRequestWatchResult> {
  for (;;) {
    const pr = await getPullRequestState(prNumber);

    if (pr.merged) return { outcome: "merged" };
    if (pr.state === "closed") return { outcome: "closed" };

    if (getChangeRequest) {
      const changeRequest = await getChangeRequest();
      if (changeRequest) return { outcome: "changes-requested", changeRequest: changeRequest };
    }

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

export interface GitHubReview {
  id: number;
  user: { login: string } | null;
  state: string;
  body: string | null;
  submitted_at: string | null;
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

/**
 * Whether a review's author may start a revision round. "unknown" is a read
 * that failed, which is not a verdict: it is asked again next poll, whereas
 * "may-not" is final for that review.
 */
export type ReviewerStanding = "may-request" | "may-not" | "unknown";

export type JudgeReviewer = (login: string) => Promise<ReviewerStanding>;

/**
 * Maps GitHub's collaborator-permission answer to a standing.
 *
 * Reads the legacy `permission` field, whose values are admin / write / read /
 * none, with `maintain` folded into write and `triage` into read — so write
 * access or higher is exactly `admin` or `write`. A 404 is a login that is not
 * a collaborator at all. Any other status is the read failing, not the answer.
 */
export function standingFromPermission(status: number, permission: string | undefined): ReviewerStanding {
  if (status === 404) return "may-not";
  if (status !== 200) return "unknown";
  return permission === "admin" || permission === "write" ? "may-request" : "may-not";
}

/**
 * Picks the newest unactioned "request changes" review whose author may start
 * a round.
 *
 * `refused` carries the ids already judged "may-not". A changes-requested
 * decision persists on the PR, so a read-only reviewer's review would
 * otherwise be re-judged — one more GitHub call — on every poll for as long as
 * the PR is open.
 *
 * Newest by id rather than by `submitted_at`: two reviews submitted in the
 * same second would tie on the timestamp, and the id is what the workflow
 * carries forward as its watermark anyway. An older eligible review still
 * counts when a newer one is refused, so a read-only reviewer cannot shadow a
 * collaborator's.
 */
export async function pickChangeRequest(
  reviews: readonly GitHubReview[],
  afterReviewId: number | null,
  judgeReviewer: JudgeReviewer,
  refused: Set<number>,
): Promise<GitHubReview | null> {
  const candidates = reviews
    .filter(
      (review) =>
        review.state === "CHANGES_REQUESTED" &&
        review.user !== null &&
        !refused.has(review.id) &&
        (afterReviewId === null || review.id > afterReviewId),
    )
    .sort((a, b) => b.id - a.id);

  for (const review of candidates) {
    if (review.user === null) continue;
    const standing = await judgeReviewer(review.user.login);
    if (standing === "may-request") return review;
    if (standing === "may-not") {
      refused.add(review.id);
      log.warn(
        `ignoring "request changes" review ${review.id} by "${review.user.login}": ` +
          `only reviewers with write access to the repository start a revision round`,
      );
    }
  }
  return null;
}

export interface AwaitPullRequestOutcomeInput {
  readonly storyId: string;
  readonly repoBase: RepoBase;
  readonly prNumber: number;
  readonly prUrl: string;
  /** Watermark — only a review newer than this counts. Null before the first round. */
  readonly afterReviewId: number | null;
  /** False once the round cap is spent: merge and close still end the watch, a further review does not. */
  readonly watchForChangeRequests: boolean;
}

export function createAwaitPullRequestOutcomeActivity(config: WorkerConfig) {
  return async (input: AwaitPullRequestOutcomeInput): Promise<PullRequestWatchResult> => {
    const owner = input.repoBase.org;
    const repo = input.repoBase.repo;
    const prNumber = input.prNumber;

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

    const judgeReviewer: JudgeReviewer = async (login) => {
      const permissionResult = await githubRequest<{ permission?: string }>(
        config.githubToken,
        "GET",
        `/repos/${owner}/${repo}/collaborators/${encodeURIComponent(login)}/permission`,
      );
      const standing = standingFromPermission(permissionResult.status, permissionResult.json.permission);
      if (standing === "unknown") {
        log.warn(`could not read "${login}"'s permission on ${owner}/${repo}: GitHub returned ${permissionResult.status}`);
      }
      return standing;
    };

    const refused = new Set<number>();
    const getChangeRequest: GetChangeRequest | null = input.watchForChangeRequests
      ? async () => {
          const reviewsResult = await githubRequest<GitHubReview[]>(
            config.githubToken,
            "GET",
            `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
          );
          // A failed read is this poll's problem, not the watch's: the next
          // poll asks again two minutes later. Throwing here would fail the
          // activity and lose a merge watch that is otherwise healthy.
          if (reviewsResult.status !== 200) return null;

          const review = await pickChangeRequest(reviewsResult.json, input.afterReviewId, judgeReviewer, refused);
          if (!review) return null;

          return { reviewId: review.id, submittedAt: review.submitted_at ?? "" };
        }
      : null;

    const result = await awaitPullRequestOutcome(prNumber, getPullRequestState, getChangeRequest);

    // Only the terminal states get a tracker comment. A change request is not
    // an ending — the workflow answers it in the PR, where the reviewer is.
    if (result.outcome === "merged") {
      await postComment(
        input.storyId,
        config.linearAgentApiKey,
        linearApiUrl(),
        `**PR merged** _(automated)_\n\n${input.prUrl} has been merged. Story implementation is complete — move this story to Done once verified.`,
      );
    } else if (result.outcome === "closed") {
      await postComment(
        input.storyId,
        config.linearAgentApiKey,
        linearApiUrl(),
        `**PR closed without merging** _(automated)_\n\n${input.prUrl} was closed without merging. This story has been moved back to Todo.\n\nA closed PR is a fresh start: delete the story branch before re-dispatching, then adjust the story and move it back into In Progress. A re-dispatch onto a branch that still carries the abandoned attempt's commits is refused rather than built on.`,
      );
    }

    return result;
  };
}

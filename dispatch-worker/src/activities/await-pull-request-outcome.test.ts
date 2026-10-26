import { describe, expect, it, vi } from "vitest";
import { MockActivityEnvironment } from "@temporalio/testing";
import { awaitPullRequestOutcome, pickChangeRequest, standingFromPermission, summarizeCheckRuns } from "./await-pull-request-outcome.js";
import type { GitHubReview, JudgeReviewer, ReviewerStanding } from "./await-pull-request-outcome.js";

const PR_NUMBER = 42;

function state(overrides: Partial<{ merged: boolean; state: "open" | "closed"; statusSummary: string }> = {}) {
  return { merged: false, state: "open" as const, statusSummary: "CI: 0/0 passed", ...overrides };
}

describe("summarizeCheckRuns", () => {
  it("reports no checks yet when none have been reported", () => {
    expect(summarizeCheckRuns({ total_count: 0, check_runs: [] })).toBe("no CI checks reported yet");
  });

  it("counts passed, failed, and pending separately", () => {
    const checks = {
      total_count: 5,
      check_runs: [
        { status: "completed" as const, conclusion: "success" },
        { status: "completed" as const, conclusion: "success" },
        { status: "completed" as const, conclusion: "success" },
        { status: "completed" as const, conclusion: "failure" },
        { status: "in_progress" as const, conclusion: null },
      ],
    };
    expect(summarizeCheckRuns(checks)).toBe("CI: 3/5 passed, 1 failed, 1 pending");
  });

  it("reports all-passed with no failed/pending clauses", () => {
    const checks = {
      total_count: 2,
      check_runs: [
        { status: "completed" as const, conclusion: "success" },
        { status: "completed" as const, conclusion: "success" },
      ],
    };
    expect(summarizeCheckRuns(checks)).toBe("CI: 2/2 passed");
  });
});

describe("awaitPullRequestOutcome", () => {
  it("polls until merged, heartbeating every intermediate status", async () => {
    const statuses = [
      state({ statusSummary: "CI: 0/2 passed, 2 pending" }),
      state({ statusSummary: "CI: 1/2 passed, 1 failed" }),
      state({ statusSummary: "CI: 2/2 passed" }),
      state({ merged: true, state: "closed", statusSummary: "merged" }),
    ];
    let call = 0;
    const getPullRequestState = vi.fn(async () => statuses[call++]!);

    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 1);

    expect(outcome).toEqual({ outcome: "merged" });
    expect(getPullRequestState).toHaveBeenCalledTimes(4);
    expect(getPullRequestState).toHaveBeenNthCalledWith(1, PR_NUMBER);
    expect(heartbeats).toEqual(["CI: 0/2 passed, 2 pending", "CI: 1/2 passed, 1 failed", "CI: 2/2 passed"]);
  });

  it("resolves immediately, without heartbeating, when already merged", async () => {
    const getPullRequestState = vi.fn(async () => state({ merged: true, state: "closed", statusSummary: "merged" }));
    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 1);

    expect(outcome).toEqual({ outcome: "merged" });
    expect(getPullRequestState).toHaveBeenCalledTimes(1);
    expect(heartbeats).toEqual([]);
  });

  it("resolves to closed when the PR is closed without merging", async () => {
    const getPullRequestState = vi.fn(async () => state({ merged: false, state: "closed", statusSummary: "closed without merging" }));
    const env = new MockActivityEnvironment();

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 1);

    expect(outcome).toEqual({ outcome: "closed" });
  });

  it("keeps polling through a failing CI conclusion rather than treating it as terminal", async () => {
    const statuses = [state({ statusSummary: "CI: 0/1 passed, 1 failed" }), state({ merged: true, state: "closed", statusSummary: "merged" })];
    let call = 0;
    const getPullRequestState = vi.fn(async () => statuses[call++]!);
    const env = new MockActivityEnvironment();

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 1);

    expect(outcome).toEqual({ outcome: "merged" });
    expect(getPullRequestState).toHaveBeenCalledTimes(2);
  });

  it("rejects when the activity is cancelled mid-poll", async () => {
    const getPullRequestState = vi.fn(async () => state());
    const env = new MockActivityEnvironment();

    const runPromise = env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 50);
    setTimeout(() => env.cancel(), 10);

    await expect(runPromise).rejects.toThrow();
  });
});

describe("standingFromPermission", () => {
  it("lets admin and write start a round", () => {
    expect(standingFromPermission(200, "admin")).toBe("may-request");
    expect(standingFromPermission(200, "write")).toBe("may-request");
  });

  it("keeps read, none and an unrecognised value out", () => {
    // GitHub folds `triage` into read and `maintain` into write in this
    // field, so read and none are the only ways to be below write.
    expect(standingFromPermission(200, "read")).toBe("may-not");
    expect(standingFromPermission(200, "none")).toBe("may-not");
    expect(standingFromPermission(200, undefined)).toBe("may-not");
  });

  it("treats a login that is not a collaborator as a final no", () => {
    expect(standingFromPermission(404, undefined)).toBe("may-not");
  });

  it("treats any other status as a failed read, not a verdict", () => {
    // Refusing on a 5xx or a rate limit would silence a collaborator's
    // review for as long as the PR stays open; "unknown" asks again.
    expect(standingFromPermission(403, undefined)).toBe("unknown");
    expect(standingFromPermission(502, undefined)).toBe("unknown");
  });
});

describe("pickChangeRequest", () => {
  function review(overrides: Partial<GitHubReview> = {}): GitHubReview {
    return {
      id: 500,
      user: { login: "example-reviewer" },
      state: "CHANGES_REQUESTED",
      body: "please fix",
      submitted_at: "2026-09-19T10:00:00Z",
      ...overrides,
    };
  }

  /** Judges by login so each test can say who has write access in one line. */
  function judge(standings: Record<string, ReviewerStanding>) {
    return vi.fn(async (login: string): Promise<ReviewerStanding> => standings[login] ?? "may-not");
  }

  // `pickChangeRequest` logs through the activity context when it refuses a
  // review, so every call runs inside one.
  async function pick(
    reviews: GitHubReview[],
    afterReviewId: number | null,
    judgeReviewer: JudgeReviewer,
    refused = new Set<number>(),
  ): Promise<GitHubReview | null> {
    // `env.run` loses the return type through its generics.
    return (await new MockActivityEnvironment().run(pickChangeRequest, reviews, afterReviewId, judgeReviewer, refused)) as GitHubReview | null;
  }

  it("picks a change request from any reviewer with write access, not only the story's mover", async () => {
    const judgeReviewer = judge({ "example-reviewer": "may-request" });
    expect((await pick([review()], null, judgeReviewer))?.id).toBe(500);
  });

  it("ignores a review from someone without write access", async () => {
    // Otherwise any passer-by on a public repository could spend an ECS task
    // and put their own text in front of the specialist.
    const judgeReviewer = judge({ "example-reviewer": "may-not" });
    expect(await pick([review()], null, judgeReviewer)).toBeNull();
  });

  it("remembers a refusal, so a persistent changes-requested state is judged once", async () => {
    // GitHub keeps the decision on the PR, so the same refused review comes
    // back in every poll's list.
    const judgeReviewer = judge({ "example-reviewer": "may-not" });
    const refused = new Set<number>();
    await pick([review()], null, judgeReviewer, refused);
    await pick([review()], null, judgeReviewer, refused);
    expect(judgeReviewer).toHaveBeenCalledTimes(1);
    expect(refused.has(500)).toBe(true);
  });

  it("asks again next poll when the permission read failed", async () => {
    const judgeReviewer = judge({ "example-reviewer": "unknown" });
    const refused = new Set<number>();
    expect(await pick([review()], null, judgeReviewer, refused)).toBeNull();
    expect(refused.has(500)).toBe(false);
    await pick([review()], null, judgeReviewer, refused);
    expect(judgeReviewer).toHaveBeenCalledTimes(2);
  });

  it("lets an older collaborator review through when a newer one is refused", async () => {
    const reviews = [review({ id: 501, user: { login: "drive-by" } }), review({ id: 500 })];
    const judgeReviewer = judge({ "example-reviewer": "may-request", "drive-by": "may-not" });
    expect((await pick(reviews, null, judgeReviewer))?.id).toBe(500);
  });

  it("ignores approvals and plain comments", async () => {
    const reviews = [review({ id: 501, state: "APPROVED" }), review({ id: 502, state: "COMMENTED" })];
    const judgeReviewer = judge({ "example-reviewer": "may-request" });
    expect(await pick(reviews, null, judgeReviewer)).toBeNull();
    expect(judgeReviewer).not.toHaveBeenCalled();
  });

  it("ignores a review at or below the watermark", async () => {
    // The decisive case: "changes requested" persists until the reviewer
    // clears it, so without the watermark the same review would re-fire on
    // every poll and dispatch a round each time.
    const judgeReviewer = judge({ "example-reviewer": "may-request" });
    expect(await pick([review({ id: 500 })], 500, judgeReviewer)).toBeNull();
    expect((await pick([review({ id: 501 })], 500, judgeReviewer))?.id).toBe(501);
  });

  it("takes the newest when several are unactioned", async () => {
    const reviews = [review({ id: 503 }), review({ id: 501 }), review({ id: 502 })];
    const judgeReviewer = judge({ "example-reviewer": "may-request" });
    expect((await pick(reviews, null, judgeReviewer))?.id).toBe(503);
  });

  it("tolerates a review whose author is gone", async () => {
    const judgeReviewer = judge({});
    expect(await pick([review({ user: null })], null, judgeReviewer)).toBeNull();
    expect(judgeReviewer).not.toHaveBeenCalled();
  });
});

describe("awaitPullRequestOutcome — change requests", () => {
  it("returns the change request instead of continuing to poll", async () => {
    const getPullRequestState = vi.fn(async () => state());
    const changeRequest = { reviewId: 501, submittedAt: "2026-09-19T10:00:00Z" };
    const getChangeRequest = vi.fn(async () => changeRequest);
    const env = new MockActivityEnvironment();

    const result = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, getChangeRequest, 1);

    expect(result).toEqual({ outcome: "changes-requested", changeRequest: changeRequest });
    expect(getPullRequestState).toHaveBeenCalledTimes(1);
  });

  it("keeps polling while the reviewer has said nothing new", async () => {
    const states = [state(), state(), state({ merged: true, state: "closed", statusSummary: "merged" })];
    let call = 0;
    const getPullRequestState = vi.fn(async () => states[call++]!);
    const getChangeRequest = vi.fn(async () => null);
    const env = new MockActivityEnvironment();

    const result = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, getChangeRequest, 1);

    expect(result).toEqual({ outcome: "merged" });
    expect(getChangeRequest).toHaveBeenCalledTimes(2);
  });

  it("lets a merge win over a change request submitted on the same PR", async () => {
    // Merged is terminal and irreversible; a change request is not. Checking
    // it first would dispatch a revision round against a merged PR.
    const getPullRequestState = vi.fn(async () => state({ merged: true, state: "closed", statusSummary: "merged" }));
    const getChangeRequest = vi.fn(async () => ({ reviewId: 501, submittedAt: "2026-09-19T10:00:00Z" }));
    const env = new MockActivityEnvironment();

    const result = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, getChangeRequest, 1);

    expect(result).toEqual({ outcome: "merged" });
    expect(getChangeRequest).not.toHaveBeenCalled();
  });

  it("never looks for change requests when it was told not to watch for them", async () => {
    const states = [state(), state({ merged: true, state: "closed", statusSummary: "merged" })];
    let call = 0;
    const getPullRequestState = vi.fn(async () => states[call++]!);
    const env = new MockActivityEnvironment();

    const result = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, null, 1);

    expect(result).toEqual({ outcome: "merged" });
  });
});

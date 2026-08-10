import { describe, expect, it, vi } from "vitest";
import { MockActivityEnvironment } from "@temporalio/testing";
import { awaitPullRequestOutcome, summarizeCheckRuns } from "./await-pull-request-outcome.js";

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

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, 1);

    expect(outcome).toBe("merged");
    expect(getPullRequestState).toHaveBeenCalledTimes(4);
    expect(getPullRequestState).toHaveBeenNthCalledWith(1, PR_NUMBER);
    expect(heartbeats).toEqual(["CI: 0/2 passed, 2 pending", "CI: 1/2 passed, 1 failed", "CI: 2/2 passed"]);
  });

  it("resolves immediately, without heartbeating, when already merged", async () => {
    const getPullRequestState = vi.fn(async () => state({ merged: true, state: "closed", statusSummary: "merged" }));
    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, 1);

    expect(outcome).toBe("merged");
    expect(getPullRequestState).toHaveBeenCalledTimes(1);
    expect(heartbeats).toEqual([]);
  });

  it("resolves to closed when the PR is closed without merging", async () => {
    const getPullRequestState = vi.fn(async () => state({ merged: false, state: "closed", statusSummary: "closed without merging" }));
    const env = new MockActivityEnvironment();

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, 1);

    expect(outcome).toBe("closed");
  });

  it("keeps polling through a failing CI conclusion rather than treating it as terminal", async () => {
    const statuses = [state({ statusSummary: "CI: 0/1 passed, 1 failed" }), state({ merged: true, state: "closed", statusSummary: "merged" })];
    let call = 0;
    const getPullRequestState = vi.fn(async () => statuses[call++]!);
    const env = new MockActivityEnvironment();

    const outcome = await env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, 1);

    expect(outcome).toBe("merged");
    expect(getPullRequestState).toHaveBeenCalledTimes(2);
  });

  it("rejects when the activity is cancelled mid-poll", async () => {
    const getPullRequestState = vi.fn(async () => state());
    const env = new MockActivityEnvironment();

    const runPromise = env.run(awaitPullRequestOutcome, PR_NUMBER, getPullRequestState, 50);
    setTimeout(() => env.cancel(), 10);

    await expect(runPromise).rejects.toThrow();
  });
});

/**
 * Workflow-level tests, per the Temporal TypeScript SDK's own testing
 * guidance: a real (local) Temporal test server plus a Worker running the
 * real workflow code against mocked activities — not just unit tests of the
 * activities' pure helper functions. `createLocal()` over
 * `createTimeSkipping()`: this workflow has no workflow-level timers to
 * skip through (the only sleep lives inside `awaitSpecialistTask`'s
 * activity code, invisible to the workflow sandbox), so time-skipping buys
 * nothing here.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { Worker } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { dispatchStoryWorkflow } from "./dispatch-story-workflow.js";

const WORKFLOWS_PATH = fileURLToPath(new URL("./dispatch-story-workflow.ts", import.meta.url));

const baseInput = {
  storyId: "PROJ-101",
  storyTitle: "Add refund endpoint",
  epicId: "PROJ-10",
  specialistType: "backend" as const,
  storyBranch: "proj-101-refund-endpoint",
  epicBranch: "proj-10-refunds",
  maxTurns: 40,
  mover: { id: "00000000-0000-4000-8000-000000000001", name: "Example User", email: "user@example.com" },
};

function unexpectedCall(name: string) {
  return async () => {
    throw new Error(`${name} should not have been called on this path`);
  };
}

describe("dispatchStoryWorkflow", () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  }, 120_000);

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it("short-circuits to not-ready without touching any later activity, but does move the story back to Todo", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "test-not-ready";
    const movedStoryIds: string[] = [];

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: taskQueue,
      workflowsPath: WORKFLOWS_PATH,
      activities: {
        checkDependencies: async () => ({ ready: false, blockedBy: ["PROJ-42"] }),
        resolveRepoBase: unexpectedCall("resolveRepoBase"),
        createStoryBranch: unexpectedCall("createStoryBranch"),
        dispatchSpecialist: unexpectedCall("dispatchSpecialist"),
        postSpecialistStarted: unexpectedCall("postSpecialistStarted"),
        awaitSpecialistTask: unexpectedCall("awaitSpecialistTask"),
        deleteSpecialistProgressComment: unexpectedCall("deleteSpecialistProgressComment"),
        findPullRequest: unexpectedCall("findPullRequest"),
        requestPullRequestReviewer: unexpectedCall("requestPullRequestReviewer"),
        awaitPullRequestOutcome: unexpectedCall("awaitPullRequestOutcome"),
        postDispatchFailed: unexpectedCall("postDispatchFailed"),
        moveStoryToTodo: async (storyId: string) => {
          movedStoryIds.push(storyId);
        },
      },
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(dispatchStoryWorkflow, {
        workflowId: "test-not-ready-1",
        taskQueue: taskQueue,
        args: [baseInput],
      });
      expect(result).toEqual({ outcome: "not-ready", blockedBy: ["PROJ-42"] });
    });

    expect(movedStoryIds).toEqual([baseInput.storyId]);
  }, 30_000);

  it("skips PR-watching and moves the story back to Todo when the specialist's run leaves no PR behind", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "test-not-complete";
    const movedStoryIds: string[] = [];

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: taskQueue,
      workflowsPath: WORKFLOWS_PATH,
      activities: {
        checkDependencies: async () => ({ ready: true, blockedBy: [] }),
        resolveRepoBase: async () => ({ host: "github", org: "example-org", repo: "example-api", ref: "main" }),
        createStoryBranch: async () => {},
        dispatchSpecialist: async () => "arn:aws:ecs:us-east-1:123:task/example-specialist-prod/abc123",
        postSpecialistStarted: async () => "comment-1",
        awaitSpecialistTask: async () => {},
        deleteSpecialistProgressComment: async () => {},
        findPullRequest: async () => null,
        requestPullRequestReviewer: unexpectedCall("requestPullRequestReviewer"),
        awaitPullRequestOutcome: unexpectedCall("awaitPullRequestOutcome"),
        postDispatchFailed: unexpectedCall("postDispatchFailed"),
        moveStoryToTodo: async (storyId: string) => {
          movedStoryIds.push(storyId);
        },
      },
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(dispatchStoryWorkflow, {
        workflowId: "test-not-complete-1",
        taskQueue: taskQueue,
        args: [baseInput],
      });
      expect(result).toEqual({ outcome: "no-pr" });
    });

    expect(movedStoryIds).toEqual([baseInput.storyId]);
  }, 30_000);

  it("runs the full sequence and returns the specialist's outcome", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "test-full-sequence";
    const calls: string[] = [];

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: taskQueue,
      workflowsPath: WORKFLOWS_PATH,
      activities: {
        checkDependencies: async () => {
          calls.push("checkDependencies");
          return { ready: true, blockedBy: [] };
        },
        resolveRepoBase: async () => {
          calls.push("resolveRepoBase");
          return { host: "github", org: "example-org", repo: "example-api", ref: "main" };
        },
        createStoryBranch: async () => {
          calls.push("createStoryBranch");
        },
        dispatchSpecialist: async () => {
          calls.push("dispatchSpecialist");
          return "arn:aws:ecs:us-east-1:123:task/example-specialist-prod/abc123";
        },
        postSpecialistStarted: async () => {
          calls.push("postSpecialistStarted");
          return "comment-1";
        },
        awaitSpecialistTask: async () => {
          calls.push("awaitSpecialistTask");
        },
        deleteSpecialistProgressComment: async () => {
          calls.push("deleteSpecialistProgressComment");
        },
        findPullRequest: async () => {
          calls.push("findPullRequest");
          return { number: 42, url: "https://github.com/example-org/example-api/pull/42" };
        },
        requestPullRequestReviewer: async () => {
          calls.push("requestPullRequestReviewer");
        },
        awaitPullRequestOutcome: async () => {
          calls.push("awaitPullRequestOutcome");
          return "merged";
        },
        postDispatchFailed: unexpectedCall("postDispatchFailed"),
        moveStoryToTodo: unexpectedCall("moveStoryToTodo"),
      },
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(dispatchStoryWorkflow, {
        workflowId: "test-full-sequence-1",
        taskQueue: taskQueue,
        args: [baseInput],
      });
      expect(result).toEqual({
        outcome: "complete",
        pullRequest: { number: 42, url: "https://github.com/example-org/example-api/pull/42", merged: true },
      });
    });

    expect(calls).toEqual([
      "checkDependencies",
      "resolveRepoBase",
      "createStoryBranch",
      "dispatchSpecialist",
      "postSpecialistStarted",
      "awaitSpecialistTask",
      "deleteSpecialistProgressComment",
      "findPullRequest",
      "requestPullRequestReviewer",
      "awaitPullRequestOutcome",
    ]);
  }, 30_000);

  it("posts a dispatch-failed comment naming the real cause, moves the story back to Todo, then still fails the workflow (never silent)", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "test-unanticipated-failure";
    const postedMessages: string[] = [];
    const movedStoryIds: string[] = [];

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: taskQueue,
      workflowsPath: WORKFLOWS_PATH,
      activities: {
        checkDependencies: async () => ({ ready: true, blockedBy: [] }),
        resolveRepoBase: async () => ({ host: "github", org: "example-org", repo: "example-api", ref: "main" }),
        // No activity anticipates this failure with its own comment — the
        // exact shape of today's real createStoryBranch/GitHub-404 incident.
        createStoryBranch: async () => {
          throw new Error("Could not read epic branch \"proj-10-refunds\" in kisasa/example-api: GitHub returned 404");
        },
        dispatchSpecialist: unexpectedCall("dispatchSpecialist"),
        postSpecialistStarted: unexpectedCall("postSpecialistStarted"),
        awaitSpecialistTask: unexpectedCall("awaitSpecialistTask"),
        deleteSpecialistProgressComment: unexpectedCall("deleteSpecialistProgressComment"),
        findPullRequest: unexpectedCall("findPullRequest"),
        requestPullRequestReviewer: unexpectedCall("requestPullRequestReviewer"),
        awaitPullRequestOutcome: unexpectedCall("awaitPullRequestOutcome"),
        postDispatchFailed: async (_storyId: string, message: string) => {
          postedMessages.push(message);
        },
        moveStoryToTodo: async (storyId: string) => {
          movedStoryIds.push(storyId);
        },
      },
    });

    await worker.runUntil(async () => {
      await expect(
        client.workflow.execute(dispatchStoryWorkflow, {
          workflowId: "test-unanticipated-failure-1",
          taskQueue: taskQueue,
          args: [baseInput],
        }),
      ).rejects.toThrow();
    });

    expect(postedMessages).toEqual(['Could not read epic branch "proj-10-refunds" in kisasa/example-api: GitHub returned 404']);
    expect(movedStoryIds).toEqual([baseInput.storyId]);
  }, 30_000);
});

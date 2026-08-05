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

  it("short-circuits to not-ready without touching any later activity", async () => {
    const { client, nativeConnection } = testEnv;
    const taskQueue = "test-not-ready";

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: taskQueue,
      workflowsPath: WORKFLOWS_PATH,
      activities: {
        checkDependencies: async () => ({ ready: false, blockedBy: ["PROJ-42"] }),
        resolveRepoBase: unexpectedCall("resolveRepoBase"),
        createStoryBranch: unexpectedCall("createStoryBranch"),
        dispatchSpecialist: unexpectedCall("dispatchSpecialist"),
        awaitSpecialistTask: unexpectedCall("awaitSpecialistTask"),
        readSpecialistOutcome: unexpectedCall("readSpecialistOutcome"),
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
        awaitSpecialistTask: async () => {
          calls.push("awaitSpecialistTask");
        },
        readSpecialistOutcome: async () => {
          calls.push("readSpecialistOutcome");
          return "complete";
        },
      },
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(dispatchStoryWorkflow, {
        workflowId: "test-full-sequence-1",
        taskQueue: taskQueue,
        args: [baseInput],
      });
      expect(result).toEqual({ outcome: "complete" });
    });

    expect(calls).toEqual([
      "checkDependencies",
      "resolveRepoBase",
      "createStoryBranch",
      "dispatchSpecialist",
      "awaitSpecialistTask",
      "readSpecialistOutcome",
    ]);
  }, 30_000);
});

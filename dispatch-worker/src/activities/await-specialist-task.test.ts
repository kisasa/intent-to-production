/**
 * `awaitSpecialistTask` is the one activity that calls `heartbeat()`/`sleep()`
 * from `@temporalio/activity` — both need a real Activity Context to do
 * anything (heartbeat emits an event only a Context provides; `sleep()` is
 * cancellation-aware and needs one to reject through). `MockActivityEnvironment`
 * (`@temporalio/testing`) is exactly what the Temporal TypeScript SDK's own
 * samples and test suite use for this — confirmed by reading
 * `@temporalio/testing`'s own source (`mocking-activity-environment.ts`)
 * rather than assuming its shape: `env.run(fn, ...args)` runs `fn` inside a
 * real `Context`, `env.on('heartbeat', ...)` observes heartbeat calls, and
 * `env.cancel()` drives cancellation.
 */

import { describe, expect, it, vi } from "vitest";
import { MockActivityEnvironment } from "@temporalio/testing";
import { awaitSpecialistTask } from "./await-specialist-task.js";

const TASK_ARN = "arn:aws:ecs:us-east-1:123:task/example-specialist-prod/abc123";

describe("awaitSpecialistTask", () => {
  it("polls until STOPPED, heartbeating every intermediate status", async () => {
    const statuses = ["PROVISIONING", "RUNNING", "RUNNING", "STOPPED"];
    let call = 0;
    const describeTaskStatus = vi.fn(async () => statuses[call++]);

    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    // pollIntervalMs=1: real time still elapses (MockActivityEnvironment
    // doesn't time-skip activity-context sleep the way
    // TestWorkflowEnvironment.createTimeSkipping() does for workflow time),
    // so this keeps the test fast without changing what's being verified.
    await env.run(awaitSpecialistTask, TASK_ARN, describeTaskStatus, 1);

    expect(describeTaskStatus).toHaveBeenCalledTimes(4);
    expect(describeTaskStatus).toHaveBeenNthCalledWith(1, TASK_ARN);
    expect(heartbeats).toEqual(["PROVISIONING", "RUNNING", "RUNNING"]);
  });

  it("resolves without heartbeating when the task is already STOPPED", async () => {
    const describeTaskStatus = vi.fn(async () => "STOPPED");
    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    await env.run(awaitSpecialistTask, TASK_ARN, describeTaskStatus, 1);

    expect(describeTaskStatus).toHaveBeenCalledTimes(1);
    expect(heartbeats).toEqual([]);
  });

  it("heartbeats 'unknown' when ECS returns no status for the task", async () => {
    const describeTaskStatus = vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce("STOPPED");
    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    await env.run(awaitSpecialistTask, TASK_ARN, describeTaskStatus, 1);

    expect(heartbeats).toEqual(["unknown"]);
  });

  it("rejects when the activity is cancelled mid-poll", async () => {
    const describeTaskStatus = vi.fn(async () => "RUNNING");
    const env = new MockActivityEnvironment();

    const runPromise = env.run(awaitSpecialistTask, TASK_ARN, describeTaskStatus, 50);
    setTimeout(() => env.cancel(), 10);

    await expect(runPromise).rejects.toThrow();
  });
});

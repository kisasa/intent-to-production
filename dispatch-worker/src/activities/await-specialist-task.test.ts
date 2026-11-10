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
import type { SpecialistStatus } from "../launchers/specialist-launcher.js";
import { awaitSpecialistTask } from "./await-specialist-task.js";

const HANDLE = "specialist-container-abc123";

const running = (detail: string): SpecialistStatus => ({ stopped: false, detail: detail });
const STOPPED: SpecialistStatus = { stopped: true, detail: "exited (exit code 0)" };

/** Answers each poll with the next status in order. */
function inOrder(statuses: SpecialistStatus[]): () => Promise<SpecialistStatus> {
  let call = 0;
  return async () => {
    const status = statuses[call++];
    if (!status) throw new Error("polled past the last status");
    return status;
  };
}

describe("awaitSpecialistTask", () => {
  it("polls until stopped, heartbeating every intermediate status", async () => {
    const statuses = [running("created"), running("running"), running("running"), STOPPED];
    const describeSpecialist = vi.fn(inOrder(statuses));

    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    // pollIntervalMs=1: real time still elapses (MockActivityEnvironment
    // doesn't time-skip activity-context sleep the way
    // TestWorkflowEnvironment.createTimeSkipping() does for workflow time),
    // so this keeps the test fast without changing what's being verified.
    await env.run(awaitSpecialistTask, HANDLE, describeSpecialist, null, 1);

    expect(describeSpecialist).toHaveBeenCalledTimes(4);
    expect(describeSpecialist).toHaveBeenNthCalledWith(1, HANDLE);
    expect(heartbeats).toEqual(["created", "running", "running"]);
  });

  it("resolves without heartbeating when the container has already stopped", async () => {
    const describeSpecialist = vi.fn(async () => STOPPED);
    const env = new MockActivityEnvironment();
    const heartbeats: unknown[] = [];
    env.on("heartbeat", (details: unknown) => heartbeats.push(details));

    await env.run(awaitSpecialistTask, HANDLE, describeSpecialist, null, 1);

    expect(describeSpecialist).toHaveBeenCalledTimes(1);
    expect(heartbeats).toEqual([]);
  });

  it("rejects when the activity is cancelled mid-poll", async () => {
    const describeSpecialist = vi.fn(async () => running("running"));
    const env = new MockActivityEnvironment();

    const runPromise = env.run(awaitSpecialistTask, HANDLE, describeSpecialist, null, 50);
    setTimeout(() => env.cancel(), 10);

    await expect(runPromise).rejects.toThrow();
  });

  it("never calls updateProgress when null — no progress comment to keep current", async () => {
    const describeSpecialist = vi.fn().mockResolvedValueOnce(running("running")).mockResolvedValueOnce(STOPPED);
    const env = new MockActivityEnvironment();

    await env.run(awaitSpecialistTask, HANDLE, describeSpecialist, null, 1, 1);

    expect(describeSpecialist).toHaveBeenCalledTimes(2);
  });

  it("does not call updateProgress before the progress interval has elapsed", async () => {
    const statuses = [running("running"), running("running"), STOPPED];
    const describeSpecialist = vi.fn(inOrder(statuses));
    const updateProgress = vi.fn(async () => {});
    const env = new MockActivityEnvironment();

    // A progress interval far longer than this short run could possibly
    // take — confirms the check is a real elapsed-time gate, not "every poll."
    await env.run(awaitSpecialistTask, HANDLE, describeSpecialist, updateProgress, 1, 60_000);

    expect(updateProgress).not.toHaveBeenCalled();
  });

  it("calls updateProgress once the progress interval has elapsed", async () => {
    const statuses: SpecialistStatus[] = [...Array<SpecialistStatus>(10).fill(running("running")), STOPPED];
    const describeSpecialist = vi.fn(inOrder(statuses));
    const updateProgress = vi.fn(async () => {});
    const env = new MockActivityEnvironment();

    // pollIntervalMs=15 against a 1ms progress interval — real wall-clock
    // time elapses between polls (see the first test's own note), so by the
    // second poll the progress interval has certainly elapsed.
    await env.run(awaitSpecialistTask, HANDLE, describeSpecialist, updateProgress, 15, 1);

    expect(updateProgress).toHaveBeenCalled();
  });
});

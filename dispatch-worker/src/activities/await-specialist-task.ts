/**
 * Long-running activity: polls the specialist's ECS task until it stops.
 * Heartbeats every poll so Temporal knows this activity is alive rather than
 * hung — a specialist run can take many minutes (the ledger's own
 * `maxTurns`/no-timeout language), so a plain single-call activity with a
 * short default timeout is the wrong shape here.
 *
 * Only tells you the container exited, not why — `read-specialist-outcome.ts`
 * reads the actual complete/waiting/blocked label afterward, since by the
 * time the container exits the specialist has already posted it via its own
 * Linear MCP calls (or `specialist-runner`'s tracker-fallback path has, on a
 * startup failure).
 */

import { DescribeTasksCommand, ECSClient } from "@aws-sdk/client-ecs";
import { heartbeat, sleep } from "@temporalio/activity";
import type { WorkerConfig } from "../worker-config.js";

const DEFAULT_POLL_INTERVAL_MS = 15_000;

export type DescribeTaskStatus = (taskArn: string) => Promise<string | undefined>;

/**
 * The pure polling loop, taking its ECS lookup as an injected function rather
 * than constructing a client itself — same "explicit parameter, not read
 * internally" discipline as `create-story-branch.ts` taking `githubToken`.
 * This is what makes it testable with `@temporalio/testing`'s
 * `MockActivityEnvironment`: `heartbeat()`/`sleep()` need a real Activity
 * Context to do anything meaningful (heartbeat emits an event only that
 * environment provides; `sleep()` is cancellation-aware and needs a `Context`
 * to reject through), which only exists when this runs inside `env.run(...)`
 * or inside a real Worker — never in a plain unit test that calls it
 * directly.
 */
export async function awaitSpecialistTask(
  taskArn: string,
  describeTaskStatus: DescribeTaskStatus,
  pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS,
): Promise<void> {
  for (;;) {
    const status = await describeTaskStatus(taskArn);

    if (status === "STOPPED") {
      return;
    }

    heartbeat(status ?? "unknown");
    await sleep(pollIntervalMs);
  }
}

export function createAwaitSpecialistTaskActivity(config: WorkerConfig) {
  const client = new ECSClient({});

  const describeTaskStatus: DescribeTaskStatus = async (taskArn) => {
    const result = await client.send(
      new DescribeTasksCommand({ cluster: config.specialistClusterArn, tasks: [taskArn] }),
    );
    return result.tasks?.[0]?.lastStatus;
  };

  return (taskArn: string) => awaitSpecialistTask(taskArn, describeTaskStatus);
}

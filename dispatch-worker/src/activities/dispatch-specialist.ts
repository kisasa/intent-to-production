/**
 * Calls `ecs:RunTask` against the specialist-sandbox task definition — the
 * caller that infra piece was built without ("nothing calls it yet"). The
 * story-derived container overrides mirror `specialist-runner/src/dispatch-
 * context.ts`'s documented contract exactly: whatever this activity doesn't
 * set, that runner will fail fast on at startup, naming the missing var.
 * `SURFACES` carries every surface label the story carries, comma-joined —
 * the specialist itself is one generic definition now (`agents/
 * specialist.md`), so what it needs to know is which surface(s) it may
 * write in, not a type name selecting which file to load. `LOG_LEVEL` is the
 * one override outside that contract — dispatch-context.ts never requires
 * it, but propagating this worker's own configured level down means the
 * specialist's verbosity follows wherever this worker's `LOG_LEVEL` is set
 * (docker-compose, the ECS task definition, ...) without a second setting to
 * keep in sync.
 */

import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import type { WorkerConfig } from "../worker-config.js";
import type { RepoBase } from "./resolve-repo-base.js";
import type { Surface } from "./types.js";

export interface DispatchSpecialistInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly surfaces: Surface[];
  readonly repoBase: RepoBase;
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
}

export function buildContainerOverrides(input: DispatchSpecialistInput, logLevel: string) {
  // Names match specialist-runner/src/dispatch-context.ts's required vars
  // exactly — SURFACE_REPO is "org/name", not the full repoBase (the
  // specialist clones over HTTPS with its own GITHUB_TOKEN; it doesn't need
  // the host or ref, which only this activity and its own FRAMEWORK_REF
  // default care about). LOG_LEVEL isn't part of that required contract —
  // specialist-runner's own logger.ts reads it independently, same as this
  // worker's own — but propagating this worker's configured level down
  // means the specialist's verbosity follows dispatch-worker's own
  // LOG_LEVEL without a second, separately-maintained setting.
  return [
    { name: "STORY_ID", value: input.storyId },
    { name: "STORY_TITLE", value: input.storyTitle },
    { name: "EPIC_ID", value: input.epicId },
    { name: "SURFACES", value: input.surfaces.join(",") },
    { name: "SURFACE_REPO", value: `${input.repoBase.org}/${input.repoBase.repo}` },
    { name: "STORY_BRANCH", value: input.storyBranch },
    { name: "EPIC_BRANCH", value: input.epicBranch },
    { name: "MAX_TURNS", value: String(input.maxTurns) },
    { name: "LOG_LEVEL", value: logLevel },
  ];
}

export function createDispatchSpecialistActivity(config: WorkerConfig) {
  const client = new ECSClient({});

  return async function dispatchSpecialist(input: DispatchSpecialistInput): Promise<string> {
    const result = await client.send(
      new RunTaskCommand({
        cluster: config.specialistClusterArn,
        taskDefinition: config.specialistTaskDefinitionArn,
        launchType: "FARGATE",
        count: 1,
        networkConfiguration: {
          awsvpcConfiguration: {
            subnets: config.specialistSubnetIds,
            securityGroups: [config.specialistSecurityGroupId],
            assignPublicIp: "ENABLED",
          },
        },
        overrides: {
          containerOverrides: [
            {
              name: config.specialistContainerName,
              environment: buildContainerOverrides(input, config.logLevel),
            },
          ],
        },
      }),
    );

    const failure = result.failures?.[0];
    if (failure) {
      throw new Error(`RunTask failed to start the specialist: ${failure.reason ?? "unknown reason"}`);
    }

    const taskArn = result.tasks?.[0]?.taskArn;
    if (!taskArn) {
      throw new Error("RunTask returned no task and no failure — unexpected ECS response shape");
    }

    return taskArn;
  };
}

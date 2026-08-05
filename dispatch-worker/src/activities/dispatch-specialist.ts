/**
 * Calls `ecs:RunTask` against the specialist-sandbox task definition — the
 * caller that infra piece was built without ("nothing calls it yet"). The
 * container overrides exactly mirror `specialist-runner/src/dispatch-
 * context.ts`'s documented contract: whatever this activity doesn't set,
 * that runner will fail fast on at startup, naming the missing var.
 */

import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import type { WorkerConfig } from "../worker-config.js";
import type { RepoBase } from "./resolve-repo-base.js";
import type { SpecialistType } from "./types.js";

export interface DispatchSpecialistInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly specialistType: SpecialistType;
  readonly repoBase: RepoBase;
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
}

export function buildContainerOverrides(input: DispatchSpecialistInput) {
  // Names match specialist-runner/src/dispatch-context.ts's required vars
  // exactly — SURFACE_REPO is "org/name", not the full repoBase (the
  // specialist clones over HTTPS with its own GITHUB_TOKEN; it doesn't need
  // the host or ref, which only this activity and its own FRAMEWORK_REF
  // default care about).
  return [
    { name: "STORY_ID", value: input.storyId },
    { name: "STORY_TITLE", value: input.storyTitle },
    { name: "EPIC_ID", value: input.epicId },
    { name: "SPECIALIST_TYPE", value: input.specialistType },
    { name: "SURFACE_REPO", value: `${input.repoBase.org}/${input.repoBase.repo}` },
    { name: "STORY_BRANCH", value: input.storyBranch },
    { name: "EPIC_BRANCH", value: input.epicBranch },
    { name: "MAX_TURNS", value: String(input.maxTurns) },
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
              environment: buildContainerOverrides(input),
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

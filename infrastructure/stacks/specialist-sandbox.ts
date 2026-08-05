import type { Construct } from "constructs";
import { DataAwsEcrRepository } from "@cdktn/provider-aws/lib/data-aws-ecr-repository";
import { DataAwsSsmParameter } from "@cdktn/provider-aws/lib/data-aws-ssm-parameter";
import { EcsCluster } from "@cdktn/provider-aws/lib/ecs-cluster";
import { EcsClusterCapacityProviders } from "@cdktn/provider-aws/lib/ecs-cluster-capacity-providers";

import { formatName, tfStateKeys } from "../common";
import { SpecialistTask } from "../constructs/specialist-task";
import type { ContainerSecret } from "../constructs/single-instance-service";
import type { SpecialistSandboxStackOutput } from "../models/specialist-sandbox-stack-output";
import { networkStackOutputFromRemoteState } from "../models/network-stack-output";
import { BaseStack } from "./base-stack";

/**
 * Environment variables a specialist run reads at process start, and where each one
 * comes from. Provisional: no specialist application code exists yet, so this list
 * is the minimal set the automated-dispatch design names (Anthropic, the tracker
 * MCP, source control) rather than a contract mirrored from a real `.env.example`
 * the way the listener's SECRET_PARAMETER_NAMES mirrors webhook-listener's. Revisit
 * once the specialist's own entrypoint exists.
 */
const SECRET_PARAMETER_NAMES: string[] = ["ANTHROPIC_API_KEY", "LINEAR_AGENT_API_KEY", "GITHUB_TOKEN"];

/**
 * The specialist sandbox: registers a Fargate task definition for on-demand
 * `ecs:RunTask` dispatch, one task per story. Distinct from `listener` on purpose —
 * see `constructs/specialist-task.ts` — down to its own ECS cluster, so that
 * `RunTask`/`PassRole` scoping for a future orchestrator stays separate from
 * anything touching the always-on listener service.
 *
 * Nothing in this stack calls `RunTask`. That belongs to the Temporal-workers
 * stack this is meant to precede, which will read this stack's outputs via remote
 * state exactly as `listener.ts` reads `network`'s today.
 */
export class SpecialistSandboxStack extends BaseStack {
  constructor(scope: Construct) {
    super(scope, tfStateKeys.specialistSandbox, "specialist-sandbox");

    const config = this.specialistSandbox;
    const tags = { ...this.globalTags, stack: `specialist-sandbox-${config.environmentName}` };
    const network = networkStackOutputFromRemoteState(this.remoteState(tfStateKeys.network));

    // Read, not managed — same posture as the listener's own ECR repository.
    // Unlike the listener's, no CI workflow pushes to this repository yet; the
    // specialist's application code and Dockerfile don't exist. Recorded as a
    // prerequisite in the README rather than built here.
    const repository = new DataAwsEcrRepository(this, "ecr-repository", {
      name: config.ecrRepositoryName,
    });
    const imageUri = `${repository.repositoryUrl}:${config.imageTag}`;

    const parameters = SECRET_PARAMETER_NAMES.map((name) => {
      return new DataAwsSsmParameter(this, `ssm-${name.toLowerCase().replace(/_/g, "-")}`, {
        name: `${config.parameterPrefix}${name}`,
        withDecryption: false,
      });
    });

    const secrets: ContainerSecret[] = SECRET_PARAMETER_NAMES.map((name, index) => {
      const parameter = parameters[index];
      if (parameter === undefined) throw new Error(`No SSM parameter resolved for ${name}`);
      return { name: name, valueFrom: parameter.arn };
    });

    const cluster = new EcsCluster(this, "ecs-cluster", {
      name: formatName(`example-specialist-${config.environmentName}`),
      tags: tags,
    });

    new EcsClusterCapacityProviders(this, "ecs-capacity-providers", {
      clusterName: cluster.name,
      capacityProviders: ["FARGATE"],
    });

    const task = new SpecialistTask(this, "task", {
      name: `specialist-${config.environmentName}`,
      vpcId: network.vpcId,
      image: imageUri,
      cpu: config.cpu,
      memory: config.memory,
      environment: [{ name: "NODE_ENV", value: "production" }],
      secrets: secrets,
      secretParameterArns: parameters.map((parameter) => parameter.arn),
      awsRegion: this.aws.region,
      logRetentionDays: config.logRetentionDays,
      globalTags: tags,
    });

    const outputs: SpecialistSandboxStackOutput = {
      clusterArn: cluster.arn,
      taskDefinitionArn: task.taskDefinitionArn,
      taskDefinitionFamily: task.taskDefinitionFamily,
      securityGroupId: task.securityGroupId,
      executionRoleArn: task.executionRoleArn,
      taskRoleArn: task.taskRoleArn,
      logGroupName: task.logGroupName,
    };

    this.renderOutputs(outputs);
  }
}

import type { Construct } from "constructs";
import { DataAwsEcrRepository } from "@cdktn/provider-aws/lib/data-aws-ecr-repository";
import { DataAwsSsmParameter } from "@cdktn/provider-aws/lib/data-aws-ssm-parameter";
import { EcsCluster } from "@cdktn/provider-aws/lib/ecs-cluster";
import { EcsClusterCapacityProviders } from "@cdktn/provider-aws/lib/ecs-cluster-capacity-providers";
import { SsmParameter } from "@cdktn/provider-aws/lib/ssm-parameter";

// See temporal-namespace.ts's own note: locally generated bindings, unverified
// in this session (no Terraform CLI on PATH to run `cdktn get`).
import { TemporalcloudProvider } from "../.gen/providers/temporalcloud/provider";

import { formatName, tfStateKeys } from "../common";
import type { ContainerSecret } from "../constructs/single-instance-service";
import { TemporalNamespace } from "../constructs/temporal-namespace";
import { TemporalPrivateLink } from "../constructs/temporal-privatelink";
import { TemporalWorkerService } from "../constructs/temporal-worker-service";
import { networkStackOutputFromRemoteState } from "../models/network-stack-output";
import type { TemporalStackOutput } from "../models/temporal-stack-output";
import { BaseStack } from "./base-stack";

const TASK_QUEUE_NAME = "dispatch-task-queue";

/**
 * Provisional — no worker application code exists yet, so this is the minimum
 * set the automated-dispatch design names (Anthropic, the tracker MCP, source
 * control), same caveat as the specialist sandbox's own list. Revisit once the
 * worker's own entrypoint exists.
 */
const SECRET_PARAMETER_NAMES: string[] = ["ANTHROPIC_API_KEY", "LINEAR_AGENT_API_KEY", "GITHUB_TOKEN"];

/**
 * Registers the Temporal Cloud namespace (reachable only via PrivateLink) and
 * an always-on ECS Fargate service for the worker that will sequence
 * dispatch → wait-for-specialist → CI → human-review-gate. Reads `network`'s
 * existing public subnets — PrivateLink doesn't need a NAT gateway, so this
 * doesn't reopen the no-NAT decision made in that stack.
 *
 * One deliberate exception to this project's "no secret value reaches synth"
 * discipline: the `temporalcloud` provider authenticates with an admin API
 * key that has to be a real string at synth time — Terraform providers don't
 * support the ARN-indirection pattern the ECS container secrets elsewhere in
 * this project use. That value is read once, here, from its own out-of-band
 * SSM parameter (`/example/prod/temporal-admin/API_KEY`, decrypted), and is
 * therefore the one secret in this project that reaches Terraform state
 * (S3-backend-encrypted, same as everything else, but no longer merely an arn
 * reference). See README's Known gaps.
 */
export class TemporalWorkersStack extends BaseStack {
  constructor(scope: Construct) {
    super(scope, tfStateKeys.temporalWorkers, "temporal-workers");

    const config = this.temporal;
    const tags = { ...this.globalTags, stack: `temporal-workers-${config.environmentName}` };
    const network = networkStackOutputFromRemoteState(this.remoteState(tfStateKeys.network));

    const adminApiKeyParameter = new DataAwsSsmParameter(this, "ssm-temporal-admin-api-key", {
      name: "/example/prod/temporal-admin/API_KEY",
      withDecryption: true,
    });

    new TemporalcloudProvider(this, "temporalcloud", {
      apiKey: adminApiKeyParameter.value,
    });

    // Read, not managed — same posture as the listener's and specialist
    // sandbox's own ECR repositories. Doesn't exist yet; no Dockerfile or CI
    // push target for the worker image either.
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
      name: formatName(`example-temporal-${config.environmentName}`),
      tags: tags,
    });

    new EcsClusterCapacityProviders(this, "ecs-capacity-providers", {
      clusterName: cluster.name,
      capacityProviders: ["FARGATE"],
    });

    const privateLink = new TemporalPrivateLink(this, "privatelink", {
      environmentName: config.environmentName,
      vpcId: network.vpcId,
      subnetIds: network.publicSubnetIds,
      vpcCidrBlock: this.vpcCidrBlock,
      awsRegion: this.aws.region,
      globalTags: tags,
    });

    const namespace = new TemporalNamespace(this, "namespace", {
      environmentName: config.environmentName,
      namespaceName: config.namespaceName,
      awsRegion: this.aws.region,
      vpcEndpointId: privateLink.vpcEndpointId,
      privateHostedZoneId: privateLink.phzZoneId,
      vpcEndpointDnsName: privateLink.vpcEndpointDnsName,
    });

    // The `temporalcloud` provider generates this token; it's not created as an
    // SSM parameter itself, so ECS's ARN-based `secrets` block has nothing to
    // point at until this stack writes it into one. Terraform-managed, so the
    // value reaches state the same way the admin API key above does — flagged
    // in the class comment and README's Known gaps, not hidden.
    const temporalApiKeyParameter = new SsmParameter(this, "ssm-temporal-worker-api-key", {
      name: `${config.parameterPrefix}TEMPORAL_API_KEY`,
      type: "SecureString",
      value: namespace.apiKeyToken,
      tags: tags,
    });

    const worker = new TemporalWorkerService(this, "worker", {
      name: `temporal-worker-${config.environmentName}`,
      clusterArn: cluster.arn,
      vpcId: network.vpcId,
      subnetIds: network.publicSubnetIds,
      image: imageUri,
      cpu: config.cpu,
      memory: config.memory,
      desiredCount: config.desiredCount,
      environment: [
        { name: "NODE_ENV", value: "production" },
        { name: "TEMPORAL_HOST", value: namespace.namespaceClusterAddress },
        { name: "TEMPORAL_NAMESPACE", value: namespace.namespaceId },
        { name: "TEMPORAL_TASK_QUEUE", value: TASK_QUEUE_NAME },
      ],
      secrets: [...secrets, { name: "TEMPORAL_API_KEY", valueFrom: temporalApiKeyParameter.arn }],
      secretParameterArns: [...parameters.map((parameter) => parameter.arn), temporalApiKeyParameter.arn],
      awsRegion: this.aws.region,
      logRetentionDays: config.logRetentionDays,
      globalTags: tags,
    });

    const outputs: TemporalStackOutput = {
      namespaceId: namespace.namespaceId,
      namespaceClusterAddress: namespace.namespaceClusterAddress,
      taskQueueName: TASK_QUEUE_NAME,
      clusterArn: cluster.arn,
      serviceName: worker.service.name,
      logGroupName: worker.logGroupName,
    };

    this.renderOutputs(outputs);
  }
}

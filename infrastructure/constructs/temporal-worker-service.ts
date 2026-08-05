import { Construct } from "constructs";
import { CloudwatchLogGroup } from "@cdktn/provider-aws/lib/cloudwatch-log-group";
import { EcsService } from "@cdktn/provider-aws/lib/ecs-service";
import { EcsTaskDefinition } from "@cdktn/provider-aws/lib/ecs-task-definition";
import { IamRole } from "@cdktn/provider-aws/lib/iam-role";
import { IamRolePolicy } from "@cdktn/provider-aws/lib/iam-role-policy";
import { IamRolePolicyAttachment } from "@cdktn/provider-aws/lib/iam-role-policy-attachment";
import { SecurityGroup } from "@cdktn/provider-aws/lib/security-group";

import { formatName, securityGroupDescription } from "../common";
import type { ContainerEnvironmentVariable, ContainerSecret } from "./single-instance-service";

export interface TemporalWorkerServiceConfig {
  readonly name: string;
  readonly clusterArn: string;
  readonly vpcId: string;
  readonly subnetIds: string[];
  readonly image: string;

  /** Task-level Fargate sizing. Container-level sizing is left unset. */
  readonly cpu: number;
  readonly memory: number;

  /**
   * Not pinned to 1 — unlike the listener, Temporal workers are safely
   * concurrent pollers with no in-process shared state to split. Left as a
   * plain config value rather than an autoscaling target: no data yet on real
   * load to scale against.
   */
  readonly desiredCount: number;

  readonly environment: ContainerEnvironmentVariable[];
  readonly secrets: ContainerSecret[];

  /** Arns the execution role is allowed to read, for the `secrets` above. */
  readonly secretParameterArns: string[];

  readonly awsRegion: string;
  readonly logRetentionDays: number;
  readonly globalTags: Record<string, string>;
}

const ECS_TASKS_ASSUME_ROLE_POLICY: string = JSON.stringify({
  Version: "2012-10-17",
  Statement: [
    {
      Effect: "Allow",
      Principal: { Service: "ecs-tasks.amazonaws.com" },
      Action: "sts:AssumeRole",
    },
  ],
});

/**
 * An always-on Fargate service running the Temporal worker — a poller, not a
 * request handler, so there's no load balancer here and no health-check grace
 * period tied to one. Unlike `SingleInstanceService`, `desiredCount` is not
 * asserted at 1: Temporal itself distributes work across however many workers
 * are polling the same task queue.
 *
 * Egress is unrestricted for the same reason it is on the specialist sandbox
 * and the listener — see `infrastructure/README.md`'s Known gaps. Ingress is
 * empty: nothing connects to a worker over the network, it only reaches out
 * to Temporal Cloud (via PrivateLink) and whatever it dispatches to.
 */
export class TemporalWorkerService extends Construct {
  public readonly service: EcsService;
  public readonly logGroupName: string;

  constructor(scope: Construct, id: string, config: TemporalWorkerServiceConfig) {
    super(scope, id);

    const logGroupName = `/ecs/${formatName(config.name)}`;

    const logGroup = new CloudwatchLogGroup(this, "log-group", {
      name: logGroupName,
      retentionInDays: config.logRetentionDays,
      tags: config.globalTags,
    });

    const executionRole = new IamRole(this, "execution-role", {
      name: formatName(`${config.name}-exec-role`, 64),
      assumeRolePolicy: ECS_TASKS_ASSUME_ROLE_POLICY,
      tags: config.globalTags,
    });

    new IamRolePolicyAttachment(this, "execution-role-managed-policy", {
      role: executionRole.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    });

    new IamRolePolicy(this, "execution-role-read-secrets", {
      name: formatName(`${config.name}-read-secrets`, 128),
      role: executionRole.id,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["ssm:GetParameters"],
            Resource: config.secretParameterArns,
          },
        ],
      }),
    });

    // The task role is the worker's own — real AWS calls, if any, are added
    // here as the worker's actual activities are implemented. Empty today
    // (execute-command only) because no worker application code exists yet.
    const taskRole = new IamRole(this, "task-role", {
      name: formatName(`${config.name}-task-role`, 64),
      assumeRolePolicy: ECS_TASKS_ASSUME_ROLE_POLICY,
      tags: config.globalTags,
    });

    new IamRolePolicy(this, "task-role-execute-command", {
      name: formatName(`${config.name}-execute-command`, 128),
      role: taskRole.id,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ssmmessages:CreateControlChannel",
              "ssmmessages:CreateDataChannel",
              "ssmmessages:OpenControlChannel",
              "ssmmessages:OpenDataChannel",
            ],
            Resource: "*",
          },
        ],
      }),
    });

    const containerDefinition = {
      name: formatName(config.name),
      image: config.image,
      essential: true,
      environment: config.environment,
      secrets: config.secrets,
      logConfiguration: {
        logDriver: "awslogs",
        options: {
          "awslogs-group": logGroupName,
          "awslogs-region": config.awsRegion,
          "awslogs-stream-prefix": "ecs",
        },
      },
    };

    const taskDefinition = new EcsTaskDefinition(this, "task-definition", {
      family: formatName(config.name),
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      cpu: String(config.cpu),
      memory: String(config.memory),
      executionRoleArn: executionRole.arn,
      taskRoleArn: taskRole.arn,
      containerDefinitions: JSON.stringify([containerDefinition]),
      runtimePlatform: {
        cpuArchitecture: "X86_64",
        operatingSystemFamily: "LINUX",
      },
      tags: config.globalTags,
      dependsOn: [logGroup],
    });

    const serviceSecurityGroup = new SecurityGroup(this, "security-group", {
      name: formatName(`${config.name}-svc-sg`, 255),
      description: securityGroupDescription("Temporal worker task; no inbound, polls Temporal Cloud outbound only"),
      vpcId: config.vpcId,
      ingress: [],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
          ipv6CidrBlocks: ["::/0"],
          description: securityGroupDescription("Temporal Cloud (via PrivateLink), Anthropic, tracker, source control"),
        },
      ],
      tags: config.globalTags,
    });

    this.service = new EcsService(this, "service", {
      name: formatName(`${config.name}-svc`),
      cluster: config.clusterArn,
      taskDefinition: taskDefinition.arn,
      launchType: "FARGATE",
      desiredCount: config.desiredCount,

      networkConfiguration: {
        subnets: config.subnetIds,
        securityGroups: [serviceSecurityGroup.id],
        assignPublicIp: true,
      },

      enableExecuteCommand: true,
      propagateTags: "SERVICE",
      tags: config.globalTags,
    });

    this.logGroupName = logGroupName;
  }
}

/**
 * Everything this worker process needs at startup, read once. Two groups:
 *
 * - Temporal connection vars already flow from `infrastructure/stacks/
 *   temporal-workers.ts`'s container environment today (TEMPORAL_HOST,
 *   TEMPORAL_NAMESPACE, TEMPORAL_TASK_QUEUE, TEMPORAL_API_KEY).
 * - The specialist-sandbox dispatch-target vars (SPECIALIST_*) are NEW —
 *   not yet wired into that stack's container environment. This module
 *   defines the contract; wiring the actual Terraform outputs
 *   (`specialist-sandbox-stack-output.ts`'s clusterArn/taskDefinitionArn/
 *   securityGroupId, plus `network`'s publicSubnetIds) into
 *   `temporal-workers.ts` is a tracked follow-up. Until then this worker
 *   fails fast at startup naming whichever var is missing — same posture as
 *   `specialist-sandbox`/`temporal-workers` being "registered but not yet
 *   applyable."
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export interface WorkerConfig {
  readonly temporalHost: string;
  readonly temporalNamespace: string;
  readonly temporalTaskQueue: string;

  /**
   * Optional: Temporal Cloud requires an API key, a local dev server
   * (`temporalio/auto-setup`, no namespace auth) doesn't have one at all.
   * `undefined` is a valid, real state here, not a missing-config error.
   */
  readonly temporalApiKey: string | undefined;

  /**
   * Defaults `true` (Temporal Cloud, the only thing this ever pointed at
   * until local dev needed a plain, unencrypted connection to a local
   * server) — only `TEMPORAL_TLS=false` turns it off, so existing
   * deployments need no env change to keep working.
   */
  readonly temporalTls: boolean;

  /** ARN of the specialist-sandbox ECS cluster to RunTask against. */
  readonly specialistClusterArn: string;
  /** ARN of the specialist-sandbox task definition (family or full ARN). */
  readonly specialistTaskDefinitionArn: string;

  /**
   * The container name inside that task definition — `specialist-task.ts`
   * names it `specialist-${environmentName}` (e.g. `specialist-prod`), a
   * deployment-specific value RunTask's container overrides must match
   * exactly, so it's config here rather than a guessed constant.
   */
  readonly specialistContainerName: string;
  readonly specialistSecurityGroupId: string;
  /** Comma-separated subnet ids — the network stack's public subnets. */
  readonly specialistSubnetIds: string[];

  readonly githubToken: string;
  readonly linearAgentApiKey: string;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    temporalHost: requireEnv("TEMPORAL_HOST"),
    temporalNamespace: requireEnv("TEMPORAL_NAMESPACE"),
    temporalTaskQueue: requireEnv("TEMPORAL_TASK_QUEUE"),
    temporalApiKey: process.env.TEMPORAL_API_KEY || undefined,
    temporalTls: process.env.TEMPORAL_TLS !== "false",

    specialistClusterArn: requireEnv("SPECIALIST_CLUSTER_ARN"),
    specialistTaskDefinitionArn: requireEnv("SPECIALIST_TASK_DEFINITION_ARN"),
    specialistContainerName: requireEnv("SPECIALIST_CONTAINER_NAME"),
    specialistSecurityGroupId: requireEnv("SPECIALIST_SECURITY_GROUP_ID"),
    specialistSubnetIds: requireEnv("SPECIALIST_SUBNET_IDS")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0),

    githubToken: requireEnv("GITHUB_TOKEN"),
    linearAgentApiKey: requireEnv("LINEAR_AGENT_API_KEY"),
  };
}

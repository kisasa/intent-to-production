import { type ContextNode, requireNumber, requireString } from "./context";

/**
 * Everything that varies between environments for the Temporal worker service —
 * the always-on poller that sequences dispatch → wait-for-specialist → CI →
 * human-review-gate. Mirrors `listener-configuration.ts`'s shape.
 *
 * Unlike the listener or the specialist sandbox, `desiredCount` here is not
 * pinned to 1: Temporal workers are safely concurrent pollers with no
 * in-process shared state, so there is no singleton constraint to enforce.
 */
export interface TemporalConfiguration {
  readonly environmentName: string;
  readonly namespaceName: string;
  readonly ecrRepositoryName: string;
  readonly imageTag: string;
  readonly cpu: number;
  readonly memory: number;
  readonly desiredCount: number;
  readonly logRetentionDays: number;

  /** Prefix under which the worker's own container-secret SSM parameters live. */
  readonly parameterPrefix: string;
}

export function temporalConfigurationFromContext(node: ContextNode): TemporalConfiguration {
  const path = "temporal";

  return {
    environmentName: requireString(node, "environment-name", path),
    namespaceName: requireString(node, "namespace-name", path),
    ecrRepositoryName: requireString(node, "ecr-repository-name", path),
    imageTag: requireString(node, "image-tag", path),
    cpu: requireNumber(node, "cpu", path),
    memory: requireNumber(node, "memory", path),
    desiredCount: requireNumber(node, "desired-count", path),
    logRetentionDays: requireNumber(node, "log-retention-days", path),
    parameterPrefix: requireString(node, "parameter-prefix", path),
  };
}

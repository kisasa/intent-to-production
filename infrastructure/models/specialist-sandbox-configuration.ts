import { type ContextNode, requireNumber, requireString } from "./context";

/**
 * Everything that varies between environments for the specialist sandbox — the
 * ephemeral per-dispatch Fargate task, distinct from the listener's own service.
 * Mirrors `listener-configuration.ts`'s shape; kept as a separate type because the
 * two are provisioned and scaled on entirely different terms (one always-on
 * singleton service vs. many short-lived tasks).
 */
export interface SpecialistSandboxConfiguration {
  readonly environmentName: string;
  readonly ecrRepositoryName: string;
  readonly imageTag: string;
  readonly cpu: number;
  readonly memory: number;
  readonly logRetentionDays: number;
}

export function specialistSandboxConfigurationFromContext(node: ContextNode): SpecialistSandboxConfiguration {
  const path = "specialist-sandbox";

  return {
    environmentName: requireString(node, "environment-name", path),
    ecrRepositoryName: requireString(node, "ecr-repository-name", path),
    imageTag: requireString(node, "image-tag", path),
    cpu: requireNumber(node, "cpu", path),
    memory: requireNumber(node, "memory", path),
    logRetentionDays: requireNumber(node, "log-retention-days", path),
  };
}

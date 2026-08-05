import { type ContextNode, requireNumber, requireString } from "./context";

/**
 * Everything that varies between environments for the specialist sandbox — the
 * ephemeral per-dispatch Fargate task, distinct from the listener's own service.
 * Mirrors `listener-configuration.ts`'s shape; kept as a separate type because the
 * two are provisioned and scaled on entirely different terms (one always-on
 * singleton service vs. many short-lived tasks).
 *
 * `parameterPrefix` is intentionally its own value, not the listener's — sandbox
 * credentials are provisioned separately so a compromised or misbehaving
 * specialist run never has access to the listener's production secrets.
 */
export interface SpecialistSandboxConfiguration {
  readonly environmentName: string;
  readonly ecrRepositoryName: string;
  readonly imageTag: string;
  readonly cpu: number;
  readonly memory: number;
  readonly logRetentionDays: number;

  /** Prefix under which the sandbox's own SSM parameters live (see the README). */
  readonly parameterPrefix: string;
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
    parameterPrefix: requireString(node, "parameter-prefix", path),
  };
}

import { describe, it, expect, vi, afterEach } from "vitest";
import { loadWorkerConfig } from "./worker-config.js";

const REQUIRED_VARS = {
  TEMPORAL_HOST: "prod.abcde.tmprl.cloud:7233",
  TEMPORAL_NAMESPACE: "prod.abcde",
  TEMPORAL_TASK_QUEUE: "dispatch-task-queue",
  TEMPORAL_API_KEY: "temporal-key",
  SPECIALIST_CLUSTER_ARN: "arn:aws:ecs:us-east-1:123:cluster/example-specialist-prod",
  SPECIALIST_TASK_DEFINITION_ARN: "arn:aws:ecs:us-east-1:123:task-definition/specialist-prod:1",
  SPECIALIST_CONTAINER_NAME: "specialist-prod",
  SPECIALIST_SECURITY_GROUP_ID: "sg-0123456789abcdef0",
  SPECIALIST_SUBNET_IDS: "subnet-aaa, subnet-bbb",
  GITHUB_TOKEN: "gh-token",
  LINEAR_AGENT_API_KEY: "linear-key",
};

function stubAll(overrides: Partial<Record<keyof typeof REQUIRED_VARS, string | undefined>> = {}): void {
  const merged = { ...REQUIRED_VARS, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) {
      vi.stubEnv(key, undefined as unknown as string);
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
}

describe("loadWorkerConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads a complete config, splitting and trimming subnet ids", () => {
    stubAll();
    expect(loadWorkerConfig()).toEqual({
      temporalHost: "prod.abcde.tmprl.cloud:7233",
      temporalNamespace: "prod.abcde",
      temporalTaskQueue: "dispatch-task-queue",
      temporalApiKey: "temporal-key",
      specialistClusterArn: "arn:aws:ecs:us-east-1:123:cluster/example-specialist-prod",
      specialistTaskDefinitionArn: "arn:aws:ecs:us-east-1:123:task-definition/specialist-prod:1",
      specialistContainerName: "specialist-prod",
      specialistSecurityGroupId: "sg-0123456789abcdef0",
      specialistSubnetIds: ["subnet-aaa", "subnet-bbb"],
      githubToken: "gh-token",
      linearAgentApiKey: "linear-key",
    });
  });

  it("throws naming the missing var", () => {
    stubAll({ SPECIALIST_CLUSTER_ARN: undefined });
    expect(() => loadWorkerConfig()).toThrow(/SPECIALIST_CLUSTER_ARN/);
  });
});

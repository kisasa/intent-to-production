/**
 * What the temporal-workers stack publishes. Nothing consumes these today.
 *
 * Note what's absent: a future activity calling `ecs:RunTask` against the
 * specialist sandbox needs *that* stack's outputs
 * (`specialist-sandbox-stack-output.ts`), not this one's — this stack's
 * outputs describe the Temporal side only.
 *
 * A type alias rather than an interface, for the reason given in
 * network-stack-output.ts.
 */
export type TemporalStackOutput = {
  readonly namespaceId: string;
  readonly namespaceClusterAddress: string;
  readonly taskQueueName: string;
  readonly clusterArn: string;
  readonly serviceName: string;
  readonly logGroupName: string;
};

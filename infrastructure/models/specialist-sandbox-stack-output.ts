/**
 * What the specialist-sandbox stack publishes. Nothing consumes these today —
 * they exist so a future Temporal-workers stack can read them via remote state,
 * the same way `listener.ts` reads `network`'s outputs, in order to call
 * `ecs:RunTask` against this task definition.
 *
 * A type alias rather than an interface, for the reason given in
 * network-stack-output.ts.
 */
export type SpecialistSandboxStackOutput = {
  readonly clusterArn: string;
  readonly taskDefinitionArn: string;
  readonly taskDefinitionFamily: string;
  readonly securityGroupId: string;
  readonly executionRoleArn: string;
  readonly taskRoleArn: string;
  readonly logGroupName: string;
};

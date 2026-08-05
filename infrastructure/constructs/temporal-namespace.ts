import { Construct } from "constructs";
import { Route53Record } from "@cdktn/provider-aws/lib/route53-record";

// Locally generated bindings — no prebuilt `@cdktn/provider-temporalcloud` package
// exists (confirmed via `npm view`), so these paths follow `cdktn get`'s default
// TypeScript output convention (`.gen/providers/<provider-name>/<resource>`),
// mirrored from the Example Payments reference project's generated C# namespace
// (`temporalcloud.Namespace`, `temporalcloud.ServiceAccount`, etc.). UNVERIFIED:
// this session has no Terraform/OpenTofu CLI on PATH, so `cdktn get` has not
// actually been run against these paths — confirm the exact folder layout and
// property casing once it has (see infrastructure/README.md's Known gaps).
import { ConnectivityRule } from "../.gen/providers/temporalcloud/connectivity-rule";
import { Namespace } from "../.gen/providers/temporalcloud/namespace";
import { ServiceAccount } from "../.gen/providers/temporalcloud/service-account";
import { Apikey } from "../.gen/providers/temporalcloud/apikey";

import { formatName, formatTerraformId } from "../common";

export interface TemporalNamespaceConfig {
  readonly environmentName: string;
  readonly namespaceName: string;
  readonly awsRegion: string;

  /** The PrivateLink construct's VPC endpoint id, for the connectivity rule. */
  readonly vpcEndpointId: string;

  /** The PrivateLink construct's own private-hosted-zone id and endpoint DNS name,
   * so the namespace-specific SNI hostname resolves to the same endpoint. */
  readonly privateHostedZoneId: string;
  readonly vpcEndpointDnsName: string;
}

/**
 * A subset of `temporal-privatelink.ts`'s region table — only the regions this
 * connectivity rule has actually been wired up for, matching the Example Payments
 * reference project's own `RegionOverrides` table exactly rather than guessing
 * entries for the other regions PrivateLink itself supports.
 */
const CONNECTIVITY_REGION_OVERRIDES: Record<string, string> = {
  "us-east-1": "aws-us-east-1",
  "us-east-2": "aws-us-east-2",
  "us-west-2": "aws-us-west-2",
};

/**
 * A Temporal Cloud namespace reachable only via PrivateLink, plus a
 * deployment-scoped service account and API key for the worker service to
 * authenticate with. Ported from the Example Payments reference project's
 * `NamespaceWithApikey` construct.
 *
 * `Namespace.id` (exposed here as `namespaceId`) is the fully-qualified name
 * Temporal assigns after creation — base name plus account-id suffix, e.g.
 * `{namespaceName}.abc12` — not the same as `namespaceName`. The per-namespace
 * CNAME below uses that fully-qualified id, because it's what Temporal Cloud
 * uses as the TLS SNI hostname to route to this namespace's backend.
 */
export class TemporalNamespace extends Construct {
  public readonly namespaceId: string;
  public readonly namespaceClusterAddress: string;
  public readonly apiKeyToken: string;

  constructor(scope: Construct, id: string, config: TemporalNamespaceConfig) {
    super(scope, id);

    const regionOverride = CONNECTIVITY_REGION_OVERRIDES[config.awsRegion];
    if (regionOverride === undefined) {
      throw new Error(
        `Temporal Cloud connectivity is not wired up for region '${config.awsRegion}'. ` +
          `Supported regions: ${Object.keys(CONNECTIVITY_REGION_OVERRIDES).join(", ")}`,
      );
    }

    const connectivityRule = new ConnectivityRule(this, formatTerraformId(`${config.namespaceName}-conn-rule`), {
      connectivityType: "private",
      connectionId: config.vpcEndpointId,
      region: regionOverride,
    });

    const namespace = new Namespace(this, formatTerraformId(`${config.namespaceName}-nmspce`), {
      apiKeyAuth: true,
      name: config.namespaceName,
      regions: [regionOverride],
      retentionDays: 14,
      connectivityRuleIds: [connectivityRule.id],
    });

    // Service account is deployment-specific — destroyed with the stack, same
    // rationale as the reference project's own comment.
    const serviceAccount = new ServiceAccount(this, formatTerraformId(`${config.namespaceName}-svc-acct`), {
      name: formatName(`${config.environmentName}-${config.namespaceName}`),
      accountAccess: "developer",
      namespaceAccesses: [{ namespaceId: namespace.id, permission: "admin" }],
    });

    // Token is only available at create time; API key is also
    // deployment-specific.
    const apiKey = new Apikey(this, formatTerraformId(`${config.namespaceName}-api-key`), {
      displayName: formatName(`${config.environmentName}-${config.namespaceName}`),
      ownerType: "service-account",
      ownerId: serviceAccount.id,

      // yyyy-MM-ddTHH:mm:ssZ, one year out — matches the reference project's
      // own expiry window.
      expiryTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, "Z"),
      disabled: false,
      description: `API key for the Temporal worker service account in the ${config.environmentName} deployment`,
    });

    const namespaceId = namespace.id;
    const namespaceHostname = `${namespaceId}.tmprl.cloud`;

    // The namespace-specific hostname is what Temporal Cloud uses as TLS SNI to
    // route to this namespace's backend — workers connect here, not to the
    // regional PrivateLink override address `temporal-privatelink.ts` exposes.
    new Route53Record(this, formatTerraformId(`${config.namespaceName}-ns-cname`), {
      zoneId: config.privateHostedZoneId,
      name: namespaceHostname,
      type: "CNAME",
      ttl: 300,
      records: [config.vpcEndpointDnsName],
    });

    this.namespaceId = namespaceId;
    this.namespaceClusterAddress = `${namespaceHostname}:7233`;
    this.apiKeyToken = apiKey.token;
  }
}

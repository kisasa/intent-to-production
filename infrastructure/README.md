# infrastructure

The AWS infrastructure that runs [webhook-listener](../webhook-listener/README.md) as a long-lived
service, defined in TypeScript with [CDK Terrain](https://cdktn.io/docs) (CDKTN).

Two stacks, each with its own state file:

| Stack | State key | What it holds |
|---|---|---|
| `network` | `network.tfstate` | VPC, internet gateway, two public subnets, route table |
| `listener` | `listener.tfstate` | ACM certificate, load balancer, DNS record, ECS cluster, task definition, service, IAM roles, log group |

The split follows rate of change: the network never changes, while the listener stack is re-applied
every time an image tag moves. `listener` reads the network's outputs through S3 remote state.

## Why a Fargate service, and why exactly one task

Three properties of the listener drive every significant choice here.

**Its state is in memory, on purpose.** The dedupe set and the debounce timers live in the process
([`agent-scheduler.ts`](../webhook-listener/src/agent-scheduler.ts)). A second instance would split
that state and produce duplicate agent runs, so the service is pinned to `desired_count = 1` with no
autoscaling target at all, and the deployment configuration (minimum healthy 0, maximum 100 percent)
stops the old task before starting the new one so the two never overlap.

**Work continues long after the HTTP response returns.** The webhook handler dispatches and returns
immediately; the activation itself can run for 30 minutes. That rules out Lambda (15-minute ceiling)
and App Runner (which suspends the instance between requests unless always-on is paid for, freezing
a mid-flight activation). An always-on Fargate task is the shape that fits.

**Inbound is trivial, outbound is everything.** A handful of webhooks a day arrive; the task talks
constantly to the Anthropic API, the tracker's API and MCP endpoint, and the GitHub MCP endpoint.

## Prerequisites

These are not managed here — each one either has to exist before Terraform runs, or is created by a
process outside it.

| Thing | Why it is not in a stack |
|---|---|
| S3 state bucket, versioned | Cannot live in the state it holds |
| Route53 hosted zone for the domain | Usually predates the project; the certificate and DNS record attach to it |
| ECR repository | The image must exist before a task can start from it, and CI pushes it independently of any Terraform run — see [`build-and-push-ecr.yml`](../.github/workflows/build-and-push-ecr.yml), which creates the repository idempotently. Read here as a data source. |
| The five SSM parameters | See below — keeping creation out-of-band is what keeps secret values out of state |
| An AWS profile named in `aws.profile` | |
| Terraform or OpenTofu **>= 1.10** on PATH | Required for S3-native state locking (`use_lockfile`), which is why there is no DynamoDB lock table |

Terraform behaves best on Linux; WSL with Ubuntu works well on Windows. Keep line endings `LF`.

### Creating the SSM parameters

Terraform reads only these parameters' ARNs and grants the task execution role permission to fetch
them. No secret value ever enters the synthesized JSON or the state file. Create them once per
environment, matching `listener.parameter-prefix`:

```bash
PREFIX=/example/prod
PROFILE=kisasa
for name in LINEAR_WEBHOOK_SECRET LINEAR_AGENT_API_KEY ANTHROPIC_API_KEY GITHUB_TOKEN; do
  read -rsp "$name: " value; echo
  aws ssm put-parameter --region "us-east-1" --profile "$PROFILE" --name "$PREFIX/$name" --type SecureString --value "$value" --overwrite
done
```

`AGENT_USER_ID` is not sensitive but is provisioned the same way, so that standing up the service's
credentials is one step rather than two:

```bash
aws ssm put-parameter --region "us-east-1" --profile example --name /example/prod/AGENT_USER_ID --type String --value "<bot user id>" --overwrite
```

Rotating any of these is a `put-parameter` followed by forcing a new deployment — the value is read
at task start, so Terraform has nothing to re-apply:

```bash
aws ecs update-service --region "us-east-1" --profile example --cluster example-prod --service webhook-listener-prod-svc --force-new-deployment
```

## Configuration

Every setting comes from the `context` block of [`cdktf.json`](cdktf.json) — read once per stack in
the base stack's constructor, validated by the factories in [`models/`](models). Nothing reads
`process.env`, and there are no sensitive Terraform variables, so there is no `secrets.tfvars` to
manage. Values marked `REPLACE_ME` in the committed file must be filled in before the first synth.

| Key | Example | Notes |
|---|---|---|
| `aws.region` | `us-east-1` | |
| `aws.account-number` | `123456789012` | Also passed as `allowed_account_ids`, so a mis-set profile fails the plan rather than applying to the wrong account |
| `aws.profile` | `kisasa` | |
| `state-bucket-name` | `example-terraform-state-001` | |
| `global-tags` | `{ "terraform": "true", … }` | Applied to everything, plus a per-stack `stack` tag |
| `domain-name` | `example.com` | |
| `hosted-zone-id` | `Z0852…` | |
| `vpc-cidr-block` | `10.6.0.0/22` | Split into /24 subnets; two blocks left spare |
| `listener.environment-name` | `prod` | **Max 30 characters** — load balancer and target group names cap at 32 |
| `listener.subdomain` | `hooks` | Combines into `hooks.prod.example.com` |
| `listener.ecr-repository-name` | `intent-to-production` | Must match the CI workflow's `ECR_REPOSITORY` |
| `listener.image-tag` | `a1b2c3d4e5f6` | See below |
| `listener.port` | `8787` | Container port and target group port |
| `listener.cpu` / `.memory` | `512` / `1024` | Task-level Fargate sizing |
| `listener.log-retention-days` | `30` | |
| `listener.debounce-ms` | `15000` | Passed through as `DEBOUNCE_MS` |
| `listener.log-level` | `info` | Passed through as `LOG_LEVEL` |
| `listener.parameter-prefix` | `/example/prod/` | Trailing slash included |
| `listener.linear-api-url`, `.linear-mcp-url`, `.github-mcp-url`, `.product-context-paths` | `null` | Optional. `null` means the application's own default applies; the keys are spelled out to document that they exist |

### Image tags

`listener.image-tag` is pinned rather than tracking `:latest`, so that Terraform sees a real diff and
the running version is auditable in git. Deploying a new build is: read the tag CI pushed, edit the
key, apply. Tracking `:latest` would leave Terraform with nothing to plan.

## Working with it

```bash
npm install
npm run synth
```

```bash
npx cdktn diff --skip-synth network && npx cdktn diff --skip-synth listener
```

```bash
npx cdktn deploy --skip-synth --auto-approve network listener
```

The first deploy blocks while ACM validates the certificate through DNS — several minutes is normal.

`npx cdktn output listener` reports the webhook URL to register with the tracker, the service name,
the log group, and the exact image URI running.

```bash
npm run test:unit && npm run typecheck
```

## Layout

```
main.ts                  Stack construction and dependency wiring
common.ts                Name formatting and state keys
cdktf.json               Project config; the context block is all the settings
models/                  Typed configuration and stack outputs, with fromContext factories
constructs/              Reusable pieces: VPC, certificate, load balancer, single-instance service
stacks/                  base-stack.ts (base) plus network.ts and listener.ts
```

The shape follows the C# reference project this was modelled on (`example-infra.CDKTF`):
context as the single configuration source, a base stack owning the provider and backend, typed
config records with validating factories, named state keys, and reusable constructs. Two things
diverge deliberately.

**Outputs and remote-state reads are spelled out, not reflected.** The reference project reflects
over a C# record's constructor parameters to read cross-stack outputs. TypeScript has no runtime view
of a type, so [`network-stack-output.ts`](models/network-stack-output.ts) carries an explicit codec
instead. Writing one of those by hand for each boundary is part of why this is two stacks and not
three.

**The service construct is not a copy of `EcsClusterService`.** That construct defaults to two-to-four
instances behind CPU and memory target tracking and tells Terraform to ignore `desired_count` drift —
all three of which are wrong for a service that must be a singleton. It also reuses one pre-existing
account-level role as both the execution and the task role; here they are separate roles with
separate policies, because the ECS agent's permissions (pull image, write logs, read secrets) and the
application's (none — it makes no AWS calls) are not the same thing.

## Known gaps

Honest about what this does not do.

- **No drain on deploy.** An activation can run for 30 minutes; Fargate's `stopTimeout` caps at 120
  seconds. Replacing the task mid-activation drops that run, possibly after the agent has already
  written partial comments to the tracker. Deploy when the lanes are idle. A real fix means moving
  the scheduler's state out of process — the same change that would allow more than one instance.
- **A short gap on every deploy.** Stopping before starting is what guarantees a single instance. The
  tracker retries webhook deliveries, so a missed delivery during the gap arrives on the retry.
- **No alarms.** `HealthyHostCount < 1` is the obvious one, but an alarm without an action is
  theater, and wiring SNS means managing a subscription confirmation. Not built rather than
  half-built.
- **The load balancer is open to the internet on 443.** Authenticity is established in the
  application by HMAC signature verification, not by source address. An IP allowlist is available as
  a knob but would be a second thing to keep current, failing closed and silently when the tracker's
  ranges change.
- **One environment.** Adding a second means a second context — either a `<env>.cdktf.json` copied
  into place, following the reference project, or a second directory of stacks. Nothing in the code
  assumes one environment; only `cdktf.json` does.

/**
 * Everything this worker process needs at startup that is not about how a
 * specialist container is run, read once: the Temporal connection, the
 * GitHub and Linear credentials its activities call with, and the
 * reviewer-of-record table. How the specialist is launched is the
 * launcher's own configuration (`launchers/`), so this holds nothing
 * platform-specific. Fails fast at startup naming whichever var is missing,
 * rather than partway through a dispatch.
 */

import { envOr } from "./env.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

/**
 * Reviewer-of-record's identity mapping: Linear only gives the pipeline a
 * story-mover's email (docs/design-ledger.md, "reviewer-of-record"); GitHub's
 * requested-reviewers API needs a login. No automatic way to bridge the two
 * reliably exists (an email-search API call would silently miss anyone whose
 * GitHub account doesn't expose a matching public email), so this is a static,
 * architect-maintained table instead — reviewed the same way a conventions
 * spec is, kept current as people join/leave.
 *
 * Optional and defaults to empty: an engagement that hasn't filled this in yet
 * still dispatches normally, it just skips requesting a reviewer (see
 * `request-pull-request-reviewer.ts`) rather than failing every dispatch.
 */
export function parseReviewerMapping(raw: string | undefined): Map<string, string> {
  if (!raw) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`REVIEWER_EMAIL_TO_GITHUB_LOGIN is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("REVIEWER_EMAIL_TO_GITHUB_LOGIN must be a JSON object of email -> GitHub login");
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  for (const [email, login] of entries) {
    if (typeof login !== "string" || login.length === 0) {
      throw new Error(`REVIEWER_EMAIL_TO_GITHUB_LOGIN's entry for "${email}" must be a non-empty string GitHub login`);
    }
  }
  return new Map(entries as [string, string][]);
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

  readonly githubToken: string;
  readonly linearAgentApiKey: string;

  /** Reviewer-of-record's static Linear-email -> GitHub-login table. See parseReviewerMapping. */
  readonly reviewerEmailToGithubLogin: Map<string, string>;

  /**
   * This process's own log level (`logger.ts` already reads `LOG_LEVEL`
   * directly for its own logging) — surfaced here too so
   * `dispatch-specialist.ts` can pass it into the specialist's environment,
   * rather than the specialist needing its own separate `LOG_LEVEL` wired
   * in. Defaults to "info",
   * matching every other logger in this codebase.
   */
  readonly logLevel: string;
}

export function loadWorkerConfig(): WorkerConfig {
  return {
    temporalHost: requireEnv("TEMPORAL_HOST"),
    temporalNamespace: requireEnv("TEMPORAL_NAMESPACE"),
    temporalTaskQueue: requireEnv("TEMPORAL_TASK_QUEUE"),
    temporalApiKey: process.env.TEMPORAL_API_KEY || undefined,
    temporalTls: process.env.TEMPORAL_TLS !== "false",

    githubToken: requireEnv("GITHUB_TOKEN"),
    linearAgentApiKey: requireEnv("LINEAR_AGENT_API_KEY"),

    reviewerEmailToGithubLogin: parseReviewerMapping(process.env.REVIEWER_EMAIL_TO_GITHUB_LOGIN),

    logLevel: envOr("LOG_LEVEL", "info"),
  };
}

/**
 * The model and effort level every specialist run uses — uniform tuning
 * knobs, not per-dispatch identity (that's dispatch-context.ts). Mirrors the
 * separation in webhook-listener/src/activation-config.ts: "per-lane identity
 * lives in each lane's own config; this module is only the knobs that apply
 * uniformly."
 *
 * Deliberately explicit rather than left to the Agent SDK's own default —
 * an unset `model`/`effort` would silently track whatever the CLI's default
 * happens to be on a given build, which drifts the specialist's behavior out
 * from under this codebase without a line changing here.
 */

import type { EffortLevel } from "@anthropic-ai/claude-agent-sdk";
import { envOr } from "./env.js";

const EFFORT_LEVELS: EffortLevel[] = ["low", "medium", "high", "xhigh", "max"];

export interface ClaudeConfig {
  readonly model: string;
  readonly effort: EffortLevel;
}

function loadEffort(raw: string): EffortLevel {
  if ((EFFORT_LEVELS as string[]).includes(raw)) return raw as EffortLevel;
  throw new Error(`CLAUDE_EFFORT="${raw}" is not a valid effort level. Supported: ${EFFORT_LEVELS.join(", ")}`);
}

export function loadClaudeConfig(): ClaudeConfig {
  return {
    model: envOr("CLAUDE_MODEL", "claude-sonnet-5"),

    // "high" mirrors activationConfig.effort's own uniform default in
    // webhook-listener — real coding work, not a routine/cheap run.
    effort: loadEffort(envOr("CLAUDE_EFFORT", "high")),
  };
}

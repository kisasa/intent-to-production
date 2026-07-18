/**
 * Tuneable values shared across every agent lane's activation runs — the token
 * ceiling and content limits. Per-lane identity (which agent file, which
 * skills, which model) lives in each lane's own config; this module is only
 * the knobs that apply uniformly regardless of which lane is running.
 *
 * There is no client-side tool loop here: both the tracker (Linear) and the
 * product codebase (GitHub, for lanes with codebaseAccess) are attached as
 * MCP servers, resolved server-side — the app declares no client-side tools
 * of its own. But the server's own MCP tool-call loop has an internal
 * round-trip cap; a task needing more calls than that pauses mid-turn
 * (`stop_reason: "pause_turn"`) rather than finishing. maxPauseContinuations
 * bounds how many times the runner resumes that paused loop before giving up.
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface ActivationConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  progressUpdateIntervalMs: number;
  effort: Effort;
  maxPauseContinuations: number;
  limits: {
    productContextCharsPerFile: number;
  };
}

export const activationConfig: ActivationConfig = {
  // Maximum input tokens allowed before the Anthropic API call. Reserving 10%
  // of a 200K window leaves headroom for output and extended thinking tokens,
  // which count against the same window. Enforced via an exact pre-flight
  // countTokens() call rather than a character-to-token approximation.
  maxInputTokens: 200_000 * 0.9,

  // Anthropic requires max_tokens on every call — there is no "unbounded"
  // option. Generous on purpose: Decompose's shaped output can carry several
  // full story descriptions in one response, and adaptive thinking spends
  // from the same budget. VERIFY against each lane's configured model's
  // actual ceiling — exceeding it surfaces as a different, equally clear 400.
  maxOutputTokens: 32_000,

  // The @anthropic-ai/sdk client's own request timeout — separate from, and
  // in addition to, the SDK's non-streaming "must stream past ~10 minutes"
  // guard we already satisfy by streaming. This one applies to streaming
  // requests too and defaults to 10 minutes, which a real activation can
  // exceed: reading a full BRD plus its evidence and design issue, then
  // drafting a slice map at adaptive thinking + high effort, is not a quick
  // call. Observed hitting the default and aborting mid-run ("terminated")
  // on 2026-07-15; raised well past what a thorough run should need.
  requestTimeoutMs: 30 * 60_000,

  // How often the "working on it" comment is refreshed in place with an
  // elapsed-time/liveness line, for whatever portion of a run exceeds this
  // interval. One evolving comment, not a new one per tick.
  progressUpdateIntervalMs: 2 * 60_000,

  // Passed as output_config.effort on every activation call, uniformly across
  // lanes — thinking/action depth, not per-lane identity. "high" balances
  // quality against token spend; raise to "xhigh"/"max" if a lane's output is
  // under-thought, lower to "medium"/"low" to cut cost on routine runs.
  effort: "high",

  // How many times the runner resumes a run that paused mid-task because the
  // server's own MCP tool-call loop hit its internal round-trip cap. Each
  // resume re-sends the conversation with the paused assistant turn appended
  // (no new user message) — the Anthropic-documented pattern for continuing
  // past pause_turn. Observed 2026-07-16: a large Intake run doing many
  // existing-issue lookups paused mid-loop; without this, the runner treated
  // the pause as terminal and mis-scanned an in-progress response for errors
  // before Claude ever got a chance to finish or retry.
  maxPauseContinuations: 5,

  limits: {
    // Maximum characters read from a single product context file, folded into
    // every lane's activation alongside the issue/project and skill blocks.
    productContextCharsPerFile: 80_000,
  },
};

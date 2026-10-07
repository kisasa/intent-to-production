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

import { requireEnv } from "./env.js";
import type { AttachmentPreloadConfig } from "./attachments/attachment-preload.js";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

const EFFORT_LEVELS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

/**
 * Infra-tunable per engagement — see infrastructure/models/listener-
 * configuration.ts and CLAUDE_EFFORT in webhook-listener/.env.example.
 * Required rather than defaulted: an unset or invalid value fails the
 * container at startup rather than silently running some other effort.
 * Mirrors specialist-runner/src/claude-config.ts's own validation.
 */
function loadEffort(): Effort {
  const raw = requireEnv("CLAUDE_EFFORT");
  if ((EFFORT_LEVELS as string[]).includes(raw)) return raw as Effort;
  throw new Error(`CLAUDE_EFFORT="${raw}" is not a valid effort level. Supported: ${EFFORT_LEVELS.join(", ")}`);
}

export interface ActivationConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  requestTimeoutMs: number;
  progressUpdateIntervalMs: number;
  effort: Effort;
  maxPauseContinuations: number;
  maxStreamRetries: number;
  limits: {
    productContextCharsPerFile: number;
  };
  attachments: AttachmentPreloadConfig;
}

export const activationConfig: ActivationConfig = {
  // Maximum input tokens allowed before the Anthropic API call — the system
  // prompt, the pre-loaded attachments and the activation template together.
  // Every lane runs a 1M-token model; this leaves about 400K of the window
  // for what the run itself reads through its connectors (threads, documents,
  // the codebase), which accumulates through the turn, plus output and
  // thinking. Enforced via an exact pre-flight countTokens() call rather than
  // a character-to-token approximation. Was 180K, sized for a 200K window
  // long after the lanes moved to 1M models — with PDFs in the prompt that
  // ceiling would refuse runs the model handles comfortably.
  maxInputTokens: 600_000,

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
  // lanes — thinking/action depth, not per-lane identity. Read from
  // CLAUDE_EFFORT (see loadEffort above) so an engagement can raise it to
  // "xhigh"/"max" if a lane's output is under-thought, or lower it to
  // "medium"/"low" to cut cost on routine runs, without a code change.
  effort: loadEffort(),

  // How many times the runner resumes a run that paused mid-task because the
  // server's own MCP tool-call loop hit its internal round-trip cap. Each
  // resume re-sends the conversation with the paused assistant turn appended
  // (no new user message) — the Anthropic-documented pattern for continuing
  // past pause_turn. Observed 2026-07-16: a large Intake run doing many
  // existing-issue lookups paused mid-loop; without this, the runner treated
  // the pause as terminal and mis-scanned an in-progress response for errors
  // before Claude ever got a chance to finish or retry.
  maxPauseContinuations: 5,

  // How many times a single stream attempt is retried when the SDK throws
  // "stream ended without producing a Message with role=assistant" —
  // observed twice in a row on 2026-08-13, both times right
  // after the model fired a burst of concurrent MCP tool_use blocks and the
  // connection went quiet: no message_stop, no error frame (errored=false),
  // no client-side abort (aborted=false), receivedMessages=0. Nothing was
  // produced and nothing was written, so retrying the identical call is
  // safe — unlike a pause_turn or an mcp_tool_result error, which already
  // carry real content the runner must not throw away.
  maxStreamRetries: 2,

  limits: {
    // Maximum characters read from a single product context file, folded into
    // every lane's activation alongside the issue/project and skill blocks.
    productContextCharsPerFile: 80_000,
  },

  // Attachment pre-load (attachments/attachment-preload.ts) for the lanes that
  // read evidence.
  attachments: {
    walk: {
      // Links followed from where the activation starts. One real evidence
      // chain needed three: brief → its evidence issue → a shared evidence
      // issue and a scope-authority issue.
      maxHops: 3,
      maxNodes: 40,
    },
    budget: {
      // About 1.5–2× the heaviest real evidence set seen so far (a 16-page
      // screens PDF, a brand guide, canvas HTML sources, logos and
      // screenshots). Roughly $1 at Opus input pricing on an activation's
      // first call; its pause_turn resumes read it from cache.
      totalTokens: 250_000,
      maxTextFileTokens: 100_000,
      maxNativeImages: 20,
    },
    download: {
      // Bounds on what pre-load holds in this process's memory. The listener
      // is one small task (memory set in the deployment's cdktf.json) shared
      // by every concurrent activation, so these keep one activation's
      // evidence from starving the others. A file over the per-file cap is
      // listed as not loaded, with a note that a smaller export would load.
      maxFileBytes: 50 * 1024 * 1024,
      maxTotalBytes: 150 * 1024 * 1024,
    },
    // A day of life per upload, reused only while six hours remain — longer
    // than an activation's 30-minute attempts across every pause_turn resume.
    fileExpirySeconds: 24 * 60 * 60,
    minRemainingFileLifeMs: 6 * 60 * 60 * 1000,
  },
};

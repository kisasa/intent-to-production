/**
 * Shows what an activation would be handed: runs the real attachment pre-load
 * for a lane and entity, then prints the manifest and the token counts. With
 * --call it also sends one request in exactly the shape an activation sends
 * (buildActivationParams, the lane's own system prompt, the pre-loaded
 * attachments), with a check instruction in place of the activation template,
 * and reports what the API accepted and how much it cached.
 *
 * Read-only by construction: --call attaches the tracker connector through
 * its read-only endpoint, so even a model that ignores the instruction can't
 * write, and no GitHub connector is attached at all.
 *
 * Operator script, run locally — not part of the unit suite and not run in CI.
 * --call spends real tokens; uploads expire on their own after a day.
 *
 *   node --env-file=.env --import tsx scripts/preview-attachment-preload.ts intake <project-uuid> [--call]
 *   node --env-file=.env --import tsx scripts/preview-attachment-preload.ts specification <epic-identifier> [--call]
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AgentLaneConfig } from "../src/agent-lane.js";
import {
  attachmentPreloader,
  buildActivationParams,
  evidenceScopeFor,
  getSystemBlocks,
  openActivationStream,
} from "../src/activation-runner.js";
import { activationConfig } from "../src/activation-config.js";
import { createLogger } from "../src/logger.js";
import { requireEnv } from "../src/env.js";

const log = createLogger("preview");

const LINEAR_MCP_READONLY_URL = "https://mcp.linear.app/mcp/readonly";

async function loadLane(name: string): Promise<AgentLaneConfig> {
  // Imported by name so only the chosen lane's model variable must be set.
  if (name === "intake") return (await import("../src/lanes/intake.js")).config;
  if (name === "specification") return (await import("../src/lanes/specification.js")).config;
  throw new Error(`lane must be "intake" or "specification", got "${name}"`);
}

async function main(): Promise<void> {
  const [laneName, entityId, ...flags] = process.argv.slice(2);
  if (!laneName || !entityId) {
    throw new Error("usage: preview-attachment-preload.ts <intake|specification> <entity> [--call]");
  }
  const lane = await loadLane(laneName);
  const scope = evidenceScopeFor(lane, entityId);
  if (!scope) throw new Error(`lane ${lane.name} pre-loads no attachments`);

  const client = new Anthropic({ timeout: activationConfig.requestTimeoutMs });
  const preloaded = await attachmentPreloader.preload(client, scope, lane.model, log);
  const manifest = preloaded.blocks.at(-1) as { text?: string } | undefined;
  log.info(`\n${manifest?.text ?? "(no manifest)"}\n`);
  log.info(`attachment tokens in the prompt: ${preloaded.attachmentTokens}`);
  log.info(`code execution tool attached: ${preloaded.needsCodeExecution}`);

  const system = await getSystemBlocks(lane);
  const counted = await client.messages.countTokens({
    model: lane.model,
    system: system,
    messages: [{ role: "user", content: [...preloaded.countBlocks, { type: "text", text: "check" }] }],
  } as unknown as Anthropic.MessageCountTokensParams);
  log.info(`pre-flight total (system + attachments): ${counted.input_tokens} of ${activationConfig.maxInputTokens}`);

  if (!flags.includes("--call")) return;

  const instruction =
    "This is a request-shape check by the operator, not an activation. Do not use any tool. " +
    "Reply in two lines: how many attachments you can see in this message, and the title of the first one.";
  const params = buildActivationParams({
    model: lane.model,
    effort: "low",
    maxTokens: 4_000,
    system: system,
    mcpServers: [
      { type: "url", url: LINEAR_MCP_READONLY_URL, name: "linear", authorization_token: requireEnv("LINEAR_AGENT_API_KEY") },
    ],
    needsCodeExecution: preloaded.needsCodeExecution,
    messages: [{ role: "user", content: [...preloaded.blocks, { type: "text", text: instruction }] }],
  });
  const message = await openActivationStream(client, params).finalMessage();
  log.info(`accepted: stop_reason=${message.stop_reason}`);
  for (const block of message.content) {
    if (block.type === "text") log.info(`reply: ${block.text}`);
    else if (block.type !== "thinking") log.info(`${block.type} block returned`);
  }
  log.info(`usage: ${JSON.stringify(message.usage)}`);
}

main().catch((err: unknown) => {
  log.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  process.exitCode = 1;
});

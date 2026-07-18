/**
 * One call per activation: template lookup (by agent + trigger state) →
 * placeholder substitution → attach the agent's .md file and its declared
 * skills. This is the whole prompt-assembly step; activation-runner.ts calls
 * it once per run and sends the result straight to the Anthropic API.
 *
 * Placeholder substitution is literal string replace on `<NAME>` tokens — no
 * templating engine. Every placeholder a template can contain is either a
 * value the app can actually produce (webhook payload fields, its own
 * recorded state) or a fixed trigger-description string; anything the app has
 * no way to know is never a placeholder — the agent discovers it itself via
 * the tracker connector (see each lane's own .md file).
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import type { SkillBlock } from "./skills.js";
import { loadSkills } from "./skills.js";

const AGENTS_DIR = fileURLToPath(new URL("../../agents/", import.meta.url));
const TEMPLATES_DIR = fileURLToPath(new URL("./prompt-templates/", import.meta.url));

export type SystemBlock = { type: "text"; text: string };

export async function loadAgentFile(agentFile: string): Promise<SystemBlock> {
  const text = await readFile(join(AGENTS_DIR, agentFile), "utf8");
  return { type: "text", text: text };
}

export async function buildSystemBlocks(agentFile: string, skills: string[]): Promise<SystemBlock[]> {
  const agentBlock = await loadAgentFile(agentFile);
  const skillBlocks: SkillBlock[] = await loadSkills(skills);
  return [agentBlock, ...skillBlocks];
}

export async function renderActivationPrompt(
  templateFile: string,
  placeholders: Record<string, string>,
): Promise<string> {
  const template = await readFile(join(TEMPLATES_DIR, templateFile), "utf8");
  let rendered = template;
  for (const [key, value] of Object.entries(placeholders)) {
    rendered = rendered.split(`<${key}>`).join(value);
  }
  return rendered;
}

/**
 * Loads skill markdown files from the top-level skills/ directory and returns
 * them as Anthropic system prompt content blocks. Skills are portable expertise —
 * shared across agent types, not specific to any one agent.
 *
 * Each skill lives at skills/<name>/<name>.md, alongside a SKILL.md used by a
 * separate tool (the Claude Skills convention) — the two are parallel files
 * with the same content, not one derived from the other. This loader reads
 * only the former.
 *
 * Each agent declares the skill names it needs. This loader resolves those names
 * to files and returns one content block per skill, ready to spread into the
 * system array of an Anthropic Messages API call.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SKILLS_DIR = fileURLToPath(new URL("../../skills/", import.meta.url));

export type SkillBlock = { type: "text"; text: string };

export async function loadSkills(names: string[]): Promise<SkillBlock[]> {
  if (names.length === 0) return [];
  return Promise.all(
    names.map(async (name) => {
      const text = await readFile(join(SKILLS_DIR, name, `${name}.md`), "utf8");
      return { type: "text" as const, text: text };
    }),
  );
}

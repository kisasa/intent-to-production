/**
 * Builds this run's systemPrompt (the specialist's own definition plus the two
 * skills it declares) and its initial user message (assignment: which story,
 * which surface(s), which branches — everything else the agent fetches itself
 * via MCP, per its own definition). Adapts "The prompt" template from
 * docs/development-tier-dispatch.md — generated programmatically here rather
 * than filling `<PLACEHOLDER>` tokens in a static file, since there is exactly
 * one shape of specialist prompt to produce, not one per lane the way the
 * shaping tier's templates are (see prompt-assembly.ts in webhook-listener).
 *
 * One agent file for every surface now (`agents/specialist.md`), not a
 * `specialist-${type}.md` selected by type — the specialist-types-collapse-
 * into-surfaces redesign (docs/design-ledger.md, 2026-08-08) found no
 * genuine type-specific behavior once the four definitions were compared
 * properly. What used to be told by loading a different file is now told in
 * the user message instead: which surface(s) this story is labelled with.
 *
 * Two deliberate differences from the manual prompt: the agent file and
 * skills are read here and placed directly in systemPrompt, rather than told
 * to Claude as paths to read itself — saves a turn and guarantees they're
 * read. And there is no "sibling repositories" paragraph — v1 clones only the
 * one target surface (see workspace.ts's own note on this gap).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DispatchContext } from "./dispatch-context.js";

const AGENT_FILE = "specialist.md";
const SKILL_NAMES = ["story-contract", "epic-writing"];

export async function buildSystemPrompt(frameworkPath: string, context: DispatchContext): Promise<string> {
  const agentText = await readFile(join(frameworkPath, "agents", AGENT_FILE), "utf8");
  const skillTexts = await Promise.all(
    SKILL_NAMES.map((name) => readFile(join(frameworkPath, "skills", name, `${name}.md`), "utf8")),
  );
  return [agentText, ...skillTexts].join("\n\n---\n\n");
}

export function buildUserMessage(context: DispatchContext): string {
  const surfaceLabels = context.surfaces.map((surface) => `surface:${surface}`).join(" ");

  return `You are the Specialist described in the system prompt. Follow that definition; this message only tells you which story and where.

Assignment: story ${context.storyId} — "${context.storyTitle}", under epic ${context.epicId}.

Your story carries the label(s) ${surfaceLabels} — that is your surface, or surfaces if more than one is listed (they all resolve to the same repo and ref). Every write you make goes there and nowhere else. It is checked out on ${context.storyBranch}; the epic branch is ${context.epicBranch}. Both names come from the tracker, and the branch chain was set up before you were dispatched — verify it, do not repair it.

Using the Linear connector, read ${context.storyId}'s description and its full comment thread, then walk up to ${context.epicId} for the parent epic, its resolved API map, and the linked design issue. The comment thread on ${context.storyId} may carry a question-and-answer exchange between the developer who picked this up and the architect from before you were engaged — read it as part of the story, not as commentary on it.

Then act per your definition: check blocking dependencies, verify the branch chain, read the codebase and its conventions spec, do the story's work, open the PR into ${context.epicBranch}, and post your completion report on ${context.storyId}.

If the branch chain is wrong, a blocking dependency is unmerged, or the story has a gap you cannot resolve from the thread — stop and report it rather than deciding for yourself. A blocker you surface is the useful output of this run.`;
}

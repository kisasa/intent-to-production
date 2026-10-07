/**
 * Decides which attachments go into the prompt itself and which go to the
 * code execution sandbox instead. Nothing is ever truncated or dropped: a file
 * that doesn't fit in the prompt still reaches Claude as a file it can open
 * with code, and the manifest says why it went there.
 *
 * Observed 2026-10-06: an Intake run fetched a 15-screen PDF through the
 * tracker connector, which returned it as base64 text — 1.6M tokens, and the
 * request was refused before Claude read a word. The budget is the guard
 * against any single activation's evidence outgrowing the window again.
 */

import type { AttachmentKind } from "./attachment-classifier.js";

export interface AttachmentBudgetLimits {
  // Ceiling on the prompt tokens all in-prompt attachments may use together.
  totalTokens: number;
  // Ceiling on any one text file — canvas-exported HTML can carry embedded
  // images and fonts as data URIs and cost as much as a whole PDF.
  maxTextFileTokens: number;
  // Above 20 images in one request the API applies a stricter per-image
  // dimension limit and rejects images over it.
  maxNativeImages: number;
}

export interface BudgetCandidate {
  key: string;
  kind: AttachmentKind;
  // Prompt tokens the file costs in-prompt. Unused for a sandbox file.
  tokens: number;
}

export interface BudgetDecision {
  key: string;
  kind: AttachmentKind;
  // Set when the file was meant for the prompt but went to the sandbox.
  demotedBecause: string | null;
}

export function applyAttachmentBudget(candidates: BudgetCandidate[], limits: AttachmentBudgetLimits): BudgetDecision[] {
  const decisions = new Map<string, BudgetDecision>();
  let imagesKept = 0;

  for (const c of candidates) {
    if (c.kind === "text" && c.tokens > limits.maxTextFileTokens) {
      decisions.set(c.key, {
        key: c.key,
        kind: "sandbox",
        demotedBecause: `${c.tokens} tokens as text, over the ${limits.maxTextFileTokens}-token per-file limit`,
      });
    } else if (c.kind === "image" && imagesKept >= limits.maxNativeImages) {
      decisions.set(c.key, {
        key: c.key,
        kind: "sandbox",
        demotedBecause: `more than ${limits.maxNativeImages} images in one request`,
      });
    } else {
      if (c.kind === "image") imagesKept++;
      decisions.set(c.key, { key: c.key, kind: c.kind, demotedBecause: null });
    }
  }

  // Largest first, so the fewest files leave the prompt to bring it under.
  const inPrompt = candidates
    .filter((c) => decisions.get(c.key)?.kind !== "sandbox")
    .sort((a, b) => b.tokens - a.tokens);
  let total = inPrompt.reduce((sum, c) => sum + c.tokens, 0);
  for (const c of inPrompt) {
    if (total <= limits.totalTokens) break;
    decisions.set(c.key, {
      key: c.key,
      kind: "sandbox",
      demotedBecause: `attachments together exceeded the ${limits.totalTokens}-token budget; this was the largest (${c.tokens} tokens)`,
    });
    total -= c.tokens;
  }

  return candidates.map((c) => decisions.get(c.key) as BudgetDecision);
}

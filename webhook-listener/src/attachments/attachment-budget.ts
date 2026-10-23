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

import type { AttachmentKind, ImageDimensions } from "./attachment-classifier.js";

export interface AttachmentBudgetLimits {
  // Ceiling on the prompt tokens all in-prompt attachments may use together.
  totalTokens: number;
  // Ceiling on any one text file — canvas-exported HTML can carry embedded
  // images and fonts as data URIs and cost as much as a whole PDF.
  maxTextFileTokens: number;
  // Ceiling on images sent as images in one request.
  maxNativeImages: number;
  // Above this many image and document blocks in one request, the API applies
  // a stricter per-image dimension limit to every image in it ...
  manyImageThreshold: number;
  // ... and rejects an image with a side longer than this many pixels.
  manyImageMaxSide: number;
}

export interface BudgetCandidate {
  key: string;
  kind: AttachmentKind;
  // Prompt tokens the file costs in-prompt. Unused for a sandbox file.
  tokens: number;
  // An image's pixel size, when its header could be read.
  dimensions?: ImageDimensions | null;
}

export interface BudgetDecision {
  key: string;
  kind: AttachmentKind;
  // Set when the file was meant for the prompt but went to the sandbox.
  demotedBecause: string | null;
}

/**
 * Which images go in as images. Up to the many-image threshold, any image the
 * classifier accepted. Past it, every image in the request must sit inside the
 * stricter side limit, so the request carries all the images that do (up to
 * the ceiling) and none that don't — unless too few fit for that to beat
 * staying at the threshold. An image whose size is unknown counts as not
 * fitting. Returns the reason for each image left out.
 *
 * Observed 2026-10-23: an area of 30 screenshots, each 1358×896, would have
 * lost ten to the sandbox under a flat cap of 20, where Claude reads a file
 * but never sees it.
 */
function placeImages(candidates: BudgetCandidate[], limits: AttachmentBudgetLimits): Map<string, string> {
  const images = candidates.filter((c) => c.kind === "image");
  const documents = candidates.filter((c) => c.kind === "pdf").length;
  const leftOut = new Map<string, string>();
  const capAt = (kept: BudgetCandidate[], cap: number, reason: string) =>
    kept.slice(cap).forEach((c) => leftOut.set(c.key, reason));

  if (images.length + documents <= limits.manyImageThreshold) {
    capAt(images, limits.maxNativeImages, `more than ${limits.maxNativeImages} images in one request`);
    return leftOut;
  }
  const fits = (c: BudgetCandidate) =>
    !!c.dimensions &&
    c.dimensions.width <= limits.manyImageMaxSide &&
    c.dimensions.height <= limits.manyImageMaxSide;
  const small = images.filter(fits);
  if (small.length + documents > limits.manyImageThreshold) {
    for (const c of images) {
      if (fits(c)) continue;
      leftOut.set(
        c.key,
        c.dimensions
          ? `${c.dimensions.width}×${c.dimensions.height} px, over the ${limits.manyImageMaxSide} px side limit for a request of more than ${limits.manyImageThreshold} images`
          : `its size could not be read, and a request of more than ${limits.manyImageThreshold} images takes only images known to be under ${limits.manyImageMaxSide} px a side`,
      );
    }
    capAt(small, limits.maxNativeImages, `more than ${limits.maxNativeImages} images in one request`);
    return leftOut;
  }
  capAt(
    images,
    Math.max(0, limits.manyImageThreshold - documents),
    `more than ${limits.manyImageThreshold} images and documents in one request, and too few images under ${limits.manyImageMaxSide} px a side to send more`,
  );
  return leftOut;
}

export function applyAttachmentBudget(candidates: BudgetCandidate[], limits: AttachmentBudgetLimits): BudgetDecision[] {
  const decisions = new Map<string, BudgetDecision>();
  const imagesLeftOut = placeImages(candidates, limits);

  for (const c of candidates) {
    const imageReason = imagesLeftOut.get(c.key);
    if (c.kind === "text" && c.tokens > limits.maxTextFileTokens) {
      decisions.set(c.key, {
        key: c.key,
        kind: "sandbox",
        demotedBecause: `${c.tokens} tokens as text, over the ${limits.maxTextFileTokens}-token per-file limit`,
      });
    } else if (imageReason !== undefined) {
      decisions.set(c.key, { key: c.key, kind: "sandbox", demotedBecause: imageReason });
    } else {
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

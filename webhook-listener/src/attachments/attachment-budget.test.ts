import { describe, it, expect } from "vitest";
import { applyAttachmentBudget, type AttachmentBudgetLimits } from "./attachment-budget.js";

const LIMITS: AttachmentBudgetLimits = { totalTokens: 250_000, maxTextFileTokens: 100_000, maxNativeImages: 20 };

describe("applyAttachmentBudget", () => {
  it("keeps everything in the prompt when it fits", () => {
    const decisions = applyAttachmentBudget(
      [
        { key: "pdf", kind: "pdf", tokens: 64_000 },
        { key: "png", kind: "image", tokens: 3_000 },
        { key: "md", kind: "text", tokens: 5_000 },
      ],
      LIMITS,
    );
    expect(decisions.map((d) => d.kind)).toEqual(["pdf", "image", "text"]);
    expect(decisions.every((d) => d.demotedBecause === null)).toBe(true);
  });

  it("sends a text file over the per-file limit to the sandbox", () => {
    const [decision] = applyAttachmentBudget([{ key: "html", kind: "text", tokens: 140_000 }], LIMITS);
    expect(decision?.kind).toBe("sandbox");
    expect(decision?.demotedBecause).toMatch(/per-file limit/);
  });

  it("sends images past the twentieth to the sandbox", () => {
    const images = Array.from({ length: 22 }, (_, i) => ({ key: `img${i}`, kind: "image" as const, tokens: 1_000 }));
    const decisions = applyAttachmentBudget(images, LIMITS);
    expect(decisions.filter((d) => d.kind === "image")).toHaveLength(20);
    expect(decisions.slice(20).every((d) => d.kind === "sandbox")).toBe(true);
  });

  it("demotes the largest files first until the rest fit the total budget", () => {
    const decisions = applyAttachmentBudget(
      [
        { key: "small-pdf", kind: "pdf", tokens: 60_000 },
        { key: "big-pdf", kind: "pdf", tokens: 150_000 },
        { key: "mid-pdf", kind: "pdf", tokens: 90_000 },
      ],
      LIMITS,
    );
    expect(decisions.map((d) => [d.key, d.kind])).toEqual([
      ["small-pdf", "pdf"],
      ["big-pdf", "sandbox"],
      ["mid-pdf", "pdf"],
    ]);
    expect(decisions[1]?.demotedBecause).toMatch(/250000-token budget/);
  });

  it("leaves files that were always sandbox files untouched", () => {
    const [decision] = applyAttachmentBudget([{ key: "docx", kind: "sandbox", tokens: 0 }], LIMITS);
    expect(decision).toEqual({ key: "docx", kind: "sandbox", demotedBecause: null });
  });
});

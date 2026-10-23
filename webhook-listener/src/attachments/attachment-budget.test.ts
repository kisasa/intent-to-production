import { describe, it, expect } from "vitest";
import { applyAttachmentBudget, type AttachmentBudgetLimits } from "./attachment-budget.js";

const LIMITS: AttachmentBudgetLimits = {
  totalTokens: 250_000,
  maxTextFileTokens: 100_000,
  maxNativeImages: 100,
  manyImageThreshold: 20,
  manyImageMaxSide: 2000,
};

const screenshot = { width: 1358, height: 896 };
const images = (count: number, dimensions: { width: number; height: number } | null, prefix = "img") =>
  Array.from({ length: count }, (_, i) => ({
    key: `${prefix}${i}`,
    kind: "image" as const,
    tokens: 1_000,
    dimensions: dimensions,
  }));

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

  it("sends every image of an area of thirty screenshots as an image", () => {
    const decisions = applyAttachmentBudget(images(30, screenshot), LIMITS);
    expect(decisions.every((d) => d.kind === "image" && d.demotedBecause === null)).toBe(true);
  });

  it("past twenty images, leaves out only the ones over the side limit", () => {
    const decisions = applyAttachmentBudget(
      [...images(21, screenshot), ...images(1, { width: 2560, height: 1440 }, "wide")],
      LIMITS,
    );
    expect(decisions.filter((d) => d.kind === "image")).toHaveLength(21);
    expect(decisions[21]?.kind).toBe("sandbox");
    expect(decisions[21]?.demotedBecause).toMatch(/2560×1440 px, over the 2000 px side limit/);
  });

  it("treats an image of unknown size as over the side limit", () => {
    const decisions = applyAttachmentBudget([...images(21, screenshot), ...images(1, null, "odd")], LIMITS);
    expect(decisions[21]?.kind).toBe("sandbox");
    expect(decisions[21]?.demotedBecause).toMatch(/could not be read/);
  });

  it("stays at twenty, in order, when too few images fit the side limit to send more", () => {
    const decisions = applyAttachmentBudget(images(22, { width: 3000, height: 2000 }), LIMITS);
    expect(decisions.filter((d) => d.kind === "image")).toHaveLength(20);
    expect(decisions.slice(20).every((d) => d.kind === "sandbox")).toBe(true);
  });

  it("counts documents toward the twenty", () => {
    const pdfs = [
      { key: "pdf1", kind: "pdf" as const, tokens: 1_000 },
      { key: "pdf2", kind: "pdf" as const, tokens: 1_000 },
    ];
    const decisions = applyAttachmentBudget([...pdfs, ...images(19, { width: 3000, height: 2000 })], LIMITS);
    expect(decisions.filter((d) => d.kind === "image")).toHaveLength(18);
  });

  it("never sends more images than the ceiling", () => {
    const decisions = applyAttachmentBudget(images(110, screenshot), LIMITS);
    expect(decisions.filter((d) => d.kind === "image")).toHaveLength(100);
    expect(decisions[100]?.demotedBecause).toMatch(/more than 100 images/);
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

import { describe, it, expect } from "vitest";
import { resolveOutcomeFromLabels } from "./read-specialist-outcome.js";

describe("resolveOutcomeFromLabels", () => {
  it.each([
    ["specialist:complete", "complete"],
    ["specialist:waiting", "waiting"],
    ["specialist:blocked", "blocked"],
  ] as const)("resolves %s to %s", (label, expected) => {
    expect(resolveOutcomeFromLabels(["size:medium", label])).toBe(expected);
  });

  it("returns unknown when no outcome label is present", () => {
    expect(resolveOutcomeFromLabels(["size:medium", "tier:mid"])).toBe("unknown");
  });

  it("returns unknown for an empty label list", () => {
    expect(resolveOutcomeFromLabels([])).toBe("unknown");
  });
});

import { describe, it, expect } from "vitest";
import { parseBlockingDependencyIds } from "./check-dependencies.js";

describe("parseBlockingDependencyIds", () => {
  it("returns an empty array for 'No blocking dependencies.'", () => {
    const description = ["**Scope boundary**", "Nothing else.", "", "**Blocking dependencies**", "No blocking dependencies."].join(
      "\n",
    );
    expect(parseBlockingDependencyIds(description)).toEqual([]);
  });

  it("extracts the bare identifier as the first token of each bullet line", () => {
    const description = [
      "**Blocking dependencies**",
      "- PROJ-42 — Add refund data model",
      "- PROJ-43 — Add refund validation",
      "",
      "**Assignment metadata**",
      "specialist: backend",
    ].join("\n");
    expect(parseBlockingDependencyIds(description)).toEqual(["PROJ-42", "PROJ-43"]);
  });

  it("stops at the next bold heading line", () => {
    const description = ["**Blocking dependencies**", "- PROJ-1 — First blocker", "**Assignment metadata**", "- PROJ-99 — Not a blocker"].join(
      "\n",
    );
    expect(parseBlockingDependencyIds(description)).toEqual(["PROJ-1"]);
  });

  it("throws when the section is missing entirely", () => {
    const description = "**Scope boundary**\nNothing else.";
    expect(() => parseBlockingDependencyIds(description)).toThrow(/no "\*\*Blocking dependencies\*\*" section/);
  });

  it("returns an empty array for a heading with no bullet lines", () => {
    const description = "**Blocking dependencies**\n\n**Assignment metadata**";
    expect(parseBlockingDependencyIds(description)).toEqual([]);
  });
});

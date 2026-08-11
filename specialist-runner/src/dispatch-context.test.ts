import { describe, it, expect, vi, afterEach } from "vitest";
import { loadDispatchContext } from "./dispatch-context.js";

const REQUIRED_VARS = {
  STORY_ID: "PROJ-101",
  STORY_TITLE: "Add refund endpoint",
  EPIC_ID: "PROJ-10",
  SURFACES: "backend",
  SURFACE_REPO: "kisasa/example-api",
  STORY_BRANCH: "proj-101-refund-endpoint",
  EPIC_BRANCH: "proj-10-refunds",
  FRAMEWORK_REPO: "example-org/intent-to-production",
  FRAMEWORK_REF: "main",
  MAX_TURNS: "40",
};

type StubbableVar = keyof typeof REQUIRED_VARS;

function stubAll(overrides: Partial<Record<StubbableVar, string | undefined>> = {}): void {
  const merged = { ...REQUIRED_VARS, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) {
      vi.stubEnv(key, undefined as unknown as string);
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
}

describe("loadDispatchContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads a complete, valid context", () => {
    stubAll();
    const context = loadDispatchContext();
    expect(context).toEqual({
      storyId: "PROJ-101",
      storyTitle: "Add refund endpoint",
      epicId: "PROJ-10",
      surfaces: ["backend"],
      surfaceRepo: "kisasa/example-api",
      storyBranch: "proj-101-refund-endpoint",
      epicBranch: "proj-10-refunds",
      frameworkRepo: "example-org/intent-to-production",
      frameworkRef: "main",
      maxTurns: 40,
    });
  });

  it("parses more than one comma-separated surface", () => {
    stubAll({ SURFACES: "web,e2e" });
    expect(loadDispatchContext().surfaces).toEqual(["web", "e2e"]);
  });

  it("trims whitespace around comma-separated surfaces", () => {
    stubAll({ SURFACES: " web , e2e " });
    expect(loadDispatchContext().surfaces).toEqual(["web", "e2e"]);
  });

  it("accepts any surface name — the vocabulary is open, not a fixed list", () => {
    stubAll({ SURFACES: "mobile" });
    expect(loadDispatchContext().surfaces).toEqual(["mobile"]);
  });

  it("throws naming the missing var when FRAMEWORK_REPO is unset", () => {
    stubAll({ FRAMEWORK_REPO: undefined });
    expect(() => loadDispatchContext()).toThrow(/FRAMEWORK_REPO/);
  });

  it("throws naming the missing var when FRAMEWORK_REF is unset", () => {
    stubAll({ FRAMEWORK_REF: undefined });
    expect(() => loadDispatchContext()).toThrow(/FRAMEWORK_REF/);
  });

  it("respects an explicit frameworkRef", () => {
    stubAll({ FRAMEWORK_REF: "dev" });
    expect(loadDispatchContext().frameworkRef).toBe("dev");
  });

  it("throws naming the missing var when STORY_ID is unset", () => {
    stubAll({ STORY_ID: undefined });
    expect(() => loadDispatchContext()).toThrow(/STORY_ID/);
  });

  it("rejects an empty SURFACES value", () => {
    stubAll({ SURFACES: "" });
    expect(() => loadDispatchContext()).toThrow(/SURFACES/);
  });

  it("rejects a SURFACES value that is only commas and whitespace", () => {
    stubAll({ SURFACES: " , , " });
    expect(() => loadDispatchContext()).toThrow(/must name at least one surface/);
  });

  it("rejects a non-numeric MAX_TURNS", () => {
    stubAll({ MAX_TURNS: "not-a-number" });
    expect(() => loadDispatchContext()).toThrow(/MAX_TURNS/);
  });

  it("rejects a zero or negative MAX_TURNS", () => {
    stubAll({ MAX_TURNS: "0" });
    expect(() => loadDispatchContext()).toThrow(/MAX_TURNS/);
  });
});

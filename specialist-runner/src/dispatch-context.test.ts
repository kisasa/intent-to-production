import { describe, it, expect, vi, afterEach } from "vitest";
import { loadDispatchContext } from "./dispatch-context.js";

const REQUIRED_VARS = {
  STORY_ID: "PROJ-101",
  STORY_TITLE: "Add refund endpoint",
  EPIC_ID: "PROJ-10",
  SPECIALIST_TYPE: "backend",
  SURFACE_REPO: "kisasa/example-api",
  STORY_BRANCH: "proj-101-refund-endpoint",
  EPIC_BRANCH: "proj-10-refunds",
  MAX_TURNS: "40",
};

type StubbableVar = keyof typeof REQUIRED_VARS | "FRAMEWORK_REF" | "FRAMEWORK_REPO";

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
      specialistType: "backend",
      specialistFile: "specialist-backend.md",
      surfaceRepo: "kisasa/example-api",
      storyBranch: "proj-101-refund-endpoint",
      epicBranch: "proj-10-refunds",
      frameworkRepo: "example-org/intent-to-production",
      frameworkRef: "main",
      maxTurns: 40,
    });
  });

  it("resolves specialistFile for frontend too", () => {
    stubAll({ SPECIALIST_TYPE: "frontend" });
    expect(loadDispatchContext().specialistFile).toBe("specialist-frontend.md");
  });

  it("defaults frameworkRef to main when unset", () => {
    stubAll({ FRAMEWORK_REF: undefined });
    expect(loadDispatchContext().frameworkRef).toBe("main");
  });

  it("respects an explicit frameworkRef", () => {
    stubAll({ FRAMEWORK_REF: "dev" });
    expect(loadDispatchContext().frameworkRef).toBe("dev");
  });

  it("throws naming the missing var when STORY_ID is unset", () => {
    stubAll({ STORY_ID: undefined });
    expect(() => loadDispatchContext()).toThrow(/STORY_ID/);
  });

  it("rejects an unsupported specialist type", () => {
    stubAll({ SPECIALIST_TYPE: "e2e" });
    expect(() => loadDispatchContext()).toThrow(/not a supported specialist type/);
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

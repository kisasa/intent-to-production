import { describe, it, expect } from "vitest";
import { buildContainerOverrides } from "./dispatch-specialist.js";

describe("buildContainerOverrides", () => {
  it("matches specialist-runner's dispatch-context.ts contract exactly, plus a propagated LOG_LEVEL", () => {
    const overrides = buildContainerOverrides(
      {
        storyId: "PROJ-101",
        storyTitle: "Add refund endpoint",
        epicId: "PROJ-10",
        specialistType: "backend",
        repoBase: { host: "github", org: "example-org", repo: "example-api", ref: "main" },
        storyBranch: "proj-101-refund-endpoint",
        epicBranch: "proj-10-refunds",
        maxTurns: 40,
      },
      "debug",
    );

    expect(overrides).toEqual([
      { name: "STORY_ID", value: "PROJ-101" },
      { name: "STORY_TITLE", value: "Add refund endpoint" },
      { name: "EPIC_ID", value: "PROJ-10" },
      { name: "SPECIALIST_TYPE", value: "backend" },
      { name: "SURFACE_REPO", value: "kisasa/example-api" },
      { name: "STORY_BRANCH", value: "proj-101-refund-endpoint" },
      { name: "EPIC_BRANCH", value: "proj-10-refunds" },
      { name: "MAX_TURNS", value: "40" },
      { name: "LOG_LEVEL", value: "debug" },
    ]);
  });
});

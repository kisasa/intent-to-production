import { describe, it, expect } from "vitest";
import { createStoryBranch } from "./create-story-branch.js";

describe("createStoryBranch", () => {
  it("rejects an unsupported repo-base host before making any request", async () => {
    await expect(
      createStoryBranch("gh-token", {
        repoBase: { host: "gitlab", org: "example-org", repo: "example-api", ref: "main" },
        epicBranch: "proj-10-refunds",
        storyBranch: "proj-101-refund-endpoint",
      }),
    ).rejects.toThrow(/Unsupported repo-base host "gitlab"/);
  });
});

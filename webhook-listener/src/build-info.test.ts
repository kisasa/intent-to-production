import { describe, expect, it } from "vitest";
import { buildCommitFrom } from "./build-info.js";

describe("buildCommitFrom", () => {
  it("shortens a full commit to twelve characters", () => {
    expect(buildCommitFrom("e121ba2f0c3d4b5a69788796a5b4c3d2e1f0a9b8")).toBe("e121ba2f0c3d");
  });

  it("reports unknown when the build passed nothing", () => {
    expect(buildCommitFrom(undefined)).toBe("unknown");
    expect(buildCommitFrom("  ")).toBe("unknown");
  });
});

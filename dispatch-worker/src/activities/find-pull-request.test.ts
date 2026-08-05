import { describe, it, expect } from "vitest";
import { pickPullRequest } from "./find-pull-request.js";

describe("pickPullRequest", () => {
  it("returns the first (and normally only) matching PR", () => {
    const candidates = [{ number: 42, html_url: "https://github.com/example-org/example-api/pull/42" }];
    expect(pickPullRequest(candidates)).toEqual({ number: 42, url: "https://github.com/example-org/example-api/pull/42" });
  });

  it("returns null when nothing matches", () => {
    expect(pickPullRequest([])).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { parseRepoBase } from "./resolve-repo-base.js";

describe("parseRepoBase", () => {
  it("parses a well-formed line", () => {
    const comments = ["Some discussion.", "Repo base — frontend: github/example-org/example-web/main", "Thanks!"];
    expect(parseRepoBase(comments, "frontend")).toEqual({
      host: "github",
      org: "example-org",
      repo: "example-web",
      ref: "main",
    });
  });

  it("returns null when no comment matches the surface", () => {
    const comments = ["Repo base — backend: github/example-org/example-api/main"];
    expect(parseRepoBase(comments, "frontend")).toBeNull();
  });

  it("prefers the most recent matching comment when a base is corrected later", () => {
    const comments = [
      "Repo base — frontend: github/example-org/old-repo/main",
      "Correction — Repo base — frontend: github/example-org/new-repo/main",
    ];
    expect(parseRepoBase(comments, "frontend")).toEqual({
      host: "github",
      org: "example-org",
      repo: "new-repo",
      ref: "main",
    });
  });

  it("matches surrounding free prose without breaking the parse", () => {
    const comments = ["Confirmed with the architect. Repo base — backend: github/example-org/example-api/release-2 — thanks!"];
    expect(parseRepoBase(comments, "backend")).toEqual({
      host: "github",
      org: "example-org",
      repo: "example-api",
      ref: "release-2",
    });
  });
});

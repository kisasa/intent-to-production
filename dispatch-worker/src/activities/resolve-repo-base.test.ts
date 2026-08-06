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

  it("ignores Specification's own kickoff-question template line (confirmed live, PROJ-58)", () => {
    const comments = [
      "Before I can draft the API map for this epic, I need the repo coordinates. " +
        "@architect — could you confirm the repo base for the frontend surface? Format:\n" +
        "`Repo base — frontend: <host>/<org>/<repo>/<ref>` (e.g. `Repo base — frontend: github/example-org/example-app/main`)\n\n" +
        "Once I have this, I'll confirm the codebase is spec-ready.",
      "Repo base recorded, thanks @Example User:\n\n`Repo base — frontend: github/example-org/example-app/dev`\n\nDrafted the API map.",
    ];
    expect(parseRepoBase(comments, "frontend")).toEqual({
      host: "github",
      org: "example-org",
      repo: "example-app",
      ref: "dev",
    });
  });

  it("rejects a template line even when it's the only candidate", () => {
    const comments = ["Format:\n`Repo base — frontend: <host>/<org>/<repo>/<ref>` (e.g. `Repo base — frontend: github/example-org/example-app/main`)"];
    expect(parseRepoBase(comments, "frontend")).toBeNull();
  });

  it("rejects an angle-bracket placeholder even without an 'e.g.' marker", () => {
    const comments = ["Repo base — frontend: <host>/<org>/<repo>/<ref>"];
    expect(parseRepoBase(comments, "frontend")).toBeNull();
  });
});

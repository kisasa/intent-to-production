import { describe, it, expect } from "vitest";
import { parseRepoBase, resolveCommonRepoBase } from "./resolve-repo-base.js";

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

describe("resolveCommonRepoBase", () => {
  it("resolves a single surface", () => {
    const comments = ["Repo base — backend: github/example-org/example-api/main"];
    expect(resolveCommonRepoBase(comments, ["backend"])).toEqual({
      ok: true,
      repoBase: { host: "github", org: "example-org", repo: "example-api", ref: "main" },
    });
  });

  it("resolves more than one surface to their shared repo base", () => {
    const comments = [
      "Repo base — web: github/example-org/example-app/main",
      "Repo base — e2e: github/example-org/example-app/main",
    ];
    expect(resolveCommonRepoBase(comments, ["web", "e2e"])).toEqual({
      ok: true,
      repoBase: { host: "github", org: "example-org", repo: "example-app", ref: "main" },
    });
  });

  it("reports every missing surface, not just the first", () => {
    const comments = ["Repo base — backend: github/example-org/example-api/main"];
    const result = resolveCommonRepoBase(comments, ["backend", "web", "e2e"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/No recorded repo base found for surface\(s\): web, e2e/);
  });

  it("includes a worked example for a surface with no recorded line at all", () => {
    const result = resolveCommonRepoBase([], ["web"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("- web: expected `Repo base — web: <host>/<org>/<repo>/<ref>`");
  });

  it("quotes back a malformed line instead of reporting the surface as unrecorded (confirmed live: em dash where a colon was required)", () => {
    const comments = ["Repo base — management-web — github/example-org/example-web/main"];
    const result = resolveCommonRepoBase(comments, ["management-web"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain(
      "- management-web: found `Repo base — management-web — github/example-org/example-web/main`, " +
        "which doesn't match the required format.",
    );
    expect(!result.ok && result.reason).toContain("Expected `Repo base — management-web: <host>/<org>/<repo>/<ref>`");
  });

  it("doesn't confuse one surface's malformed line for another's when both are missing", () => {
    const comments = ["Repo base — management-web — github/example-org/example-web/main"];
    const result = resolveCommonRepoBase(comments, ["management-web", "services"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain("management-web: found `Repo base — management-web —");
    expect(!result.ok && result.reason).toContain("- services: expected `Repo base — services:");
  });

  it("rejects surfaces that resolve to different repo bases, naming each one's resolution", () => {
    const comments = [
      "Repo base — web: github/example-org/example-web/main",
      "Repo base — e2e: github/example-org/example-e2e/main",
    ];
    const result = resolveCommonRepoBase(comments, ["web", "e2e"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(
      /web: github\/kisasa\/example-web\/main; e2e: github\/kisasa\/example-e2e\/main/,
    );
  });

  it("flags a shadowed correction — a newer line for the mismatched surface that didn't parse (confirmed live, PROJ-647)", () => {
    const comments = [
      "Repo base — management-web: github/example-org/example-web/main\n\n" +
        "Repo base — e2e: github/example-org/example-web/playwright/main",
      // Posted later, intended as a fix, but the em dash didn't survive — this
      // uses a plain hyphen, so parseRepoBase's strict pattern never matches
      // it and the older "playwright/main" line above keeps winning.
      "Repo base - e2e: github/example-org/example-web/main",
    ];
    const result = resolveCommonRepoBase(comments, ["management-web", "e2e"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toContain(
      "e2e: github/example-org/example-web/playwright/main " +
        "(a more recent comment says `Repo base - e2e: github/example-org/example-web/main`, " +
        "which didn't match the required format and was ignored)",
    );
  });

  it("does not flag a shadowed correction when the most recent mention is the one that actually resolved", () => {
    const comments = [
      "Repo base — web: github/example-org/example-web/main",
      "Repo base — e2e: github/example-org/example-e2e/main",
    ];
    const result = resolveCommonRepoBase(comments, ["web", "e2e"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).not.toContain("more recent comment");
  });
});

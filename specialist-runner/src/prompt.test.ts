import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSystemPrompt, buildUserMessage } from "./prompt.js";
import type { DispatchContext } from "./dispatch-context.js";

const context: DispatchContext = {
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
};

describe("buildUserMessage", () => {
  it("names the specialist, the story, the epic, and both branches", () => {
    const message = buildUserMessage(context);
    expect(message).toContain("Backend Specialist");
    expect(message).toContain('PROJ-101 — "Add refund endpoint"');
    expect(message).toContain("PROJ-10");
    expect(message).toContain("proj-101-refund-endpoint");
    expect(message).toContain("proj-10-refunds");
  });

  it("names Frontend for a frontend dispatch", () => {
    const message = buildUserMessage({ ...context, specialistType: "frontend", specialistFile: "specialist-frontend.md" });
    expect(message).toContain("Frontend Specialist");
  });
});

describe("buildSystemPrompt", () => {
  let frameworkPath: string;

  afterEach(async () => {
    if (frameworkPath) await rm(frameworkPath, { recursive: true, force: true });
  });

  it("concatenates the agent file and both skill files", async () => {
    frameworkPath = await mkdtemp(join(tmpdir(), "specialist-runner-test-"));
    await mkdir(join(frameworkPath, "agents"), { recursive: true });
    await mkdir(join(frameworkPath, "skills", "story-contract"), { recursive: true });
    await mkdir(join(frameworkPath, "skills", "epic-writing"), { recursive: true });
    await writeFile(join(frameworkPath, "agents", "specialist-backend.md"), "AGENT DEFINITION");
    await writeFile(join(frameworkPath, "skills", "story-contract", "story-contract.md"), "STORY CONTRACT SKILL");
    await writeFile(join(frameworkPath, "skills", "epic-writing", "epic-writing.md"), "EPIC WRITING SKILL");

    const systemPrompt = await buildSystemPrompt(frameworkPath, context);

    expect(systemPrompt).toContain("AGENT DEFINITION");
    expect(systemPrompt).toContain("STORY CONTRACT SKILL");
    expect(systemPrompt).toContain("EPIC WRITING SKILL");
    expect(systemPrompt.indexOf("AGENT DEFINITION")).toBeLessThan(systemPrompt.indexOf("STORY CONTRACT SKILL"));
  });
});

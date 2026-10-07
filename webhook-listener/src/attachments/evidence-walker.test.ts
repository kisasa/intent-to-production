import { describe, it, expect } from "vitest";
import { walkEvidence, type WalkLimits } from "./evidence-walker.js";
import { fakeLinear, issue, silentLogger } from "./test-fakes.js";

const LIMITS: WalkLimits = { maxHops: 3, maxNodes: 40 };
const url = (key: string) => `https://linear.app/example-org/issue/${key}`;
const upload = (id: string) => ({ id: id, title: `file ${id}`, url: `https://uploads.linear.app/${id}` });

describe("walkEvidence", () => {
  it("follows a project's documents to evidence three hops out, across projects", async () => {
    // The real shape that set the depth: brief → its evidence issue → a
    // shared evidence issue → nothing further needed.
    const linear = fakeLinear({
      projects: { proj: { content: "Summary only.", documentContents: [`Evidence: ${url("PROJ-2")}`] } },
      issues: {
        "PROJ-2": issue("PROJ-2", `Shared evidence is on ${url("PROJ-1")}; scope authority is ${url("PROJ-3")}.`),
        "PROJ-1": issue("PROJ-1", "", [upload("analysis")]),
        "PROJ-3": issue("PROJ-3", `Templates: ${url("PROJ-4")}`, [], "other-project"),
        "PROJ-4": issue("PROJ-4", `Too deep: ${url("PROJ-5")}`, [upload("template")], "other-project"),
        "PROJ-5": issue("PROJ-5", "", [upload("deep")]),
      },
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, LIMITS, silentLogger);
    expect(found.map((f) => [f.id, f.issueIdentifier])).toEqual([
      ["analysis", "PROJ-1"],
      ["template", "PROJ-4"],
    ]);
    expect(linear.issueLookups).not.toContain("PROJ-5");
  });

  it("includes the design issue even when nothing links to it", async () => {
    const linear = fakeLinear({
      projects: { proj: { content: "", documentContents: [] } },
      issues: { "uuid-PROJ-6": issue("PROJ-6", "", [upload("screen")]) },
      designIssueIds: { proj: ["uuid-PROJ-6"] },
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, LIMITS, silentLogger);
    expect(found.map((f) => f.id)).toEqual(["screen"]);
  });

  it("starts an epic walk with the epic's own attachments", async () => {
    const linear = fakeLinear({
      issues: {
        "PROJ-10": issue("PROJ-10", `Evidence pointers: ${url("PROJ-1")}`, [upload("area-design")]),
        "PROJ-1": issue("PROJ-1", "", [upload("screens")]),
      },
    });
    const found = await walkEvidence(linear, { kind: "epic", issueId: "PROJ-10" }, LIMITS, silentLogger);
    expect(found.map((f) => f.id)).toEqual(["area-design", "screens"]);
  });

  it("visits an issue once when it is reached by identifier and by UUID", async () => {
    const shared = issue("PROJ-1", "", [upload("once")]);
    const linear = fakeLinear({
      projects: {
        proj: { content: `${url("PROJ-1")} and <issue id="00000000-0000-4000-8000-000000000001">`, documentContents: [] },
      },
      issues: { "PROJ-1": shared, "00000000-0000-4000-8000-000000000001": shared },
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, LIMITS, silentLogger);
    expect(found.map((f) => f.id)).toEqual(["once"]);
  });

  it("follows links inside a linked document", async () => {
    const linear = fakeLinear({
      projects: { proj: { content: "[brief](https://linear.app/example-org/document/brief-abcdef012345)", documentContents: [] } },
      documents: { abcdef012345: `Evidence: ${url("PROJ-1")}` },
      issues: { "PROJ-1": issue("PROJ-1", "", [upload("evidence")]) },
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, LIMITS, silentLogger);
    expect(found.map((f) => f.id)).toEqual(["evidence"]);
  });

  it("skips a dead link rather than failing the walk", async () => {
    const linear = fakeLinear({
      projects: { proj: { content: `${url("PROJ-99")} ${url("PROJ-1")}`, documentContents: [] } },
      issues: { "PROJ-1": issue("PROJ-1", "", [upload("kept")]) },
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, LIMITS, silentLogger);
    expect(found.map((f) => f.id)).toEqual(["kept"]);
  });

  it("fails when the starting project itself is missing", async () => {
    const linear = fakeLinear({});
    await expect(
      walkEvidence(linear, { kind: "project", projectId: "nope" }, LIMITS, silentLogger),
    ).rejects.toThrow(/not found/);
  });

  it("stops at the lookup ceiling", async () => {
    const issues = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`PROJ-${i + 20}`, issue(`PROJ-${i + 20}`, "", [upload(`f${i}`)])]),
    );
    const linear = fakeLinear({
      projects: { proj: { content: Object.keys(issues).map(url).join(" "), documentContents: [] } },
      issues: issues,
    });
    const found = await walkEvidence(linear, { kind: "project", projectId: "proj" }, { maxHops: 3, maxNodes: 4 }, silentLogger);
    expect(found).toHaveLength(4);
  });
});

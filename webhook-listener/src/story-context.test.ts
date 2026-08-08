import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchStoryDispatchContext, parseSpecialistType } from "./story-context.js";

const API_KEY = "test-api-key";
const BASE_URL = "https://api.linear.app/graphql";
const TRACE_ID = "trace-1";

function stubIssueQuery(issue: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { issue: issue } }),
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseSpecialistType", () => {
  it("extracts a supported specialist type from its label", () => {
    expect(parseSpecialistType(["size:medium", "specialist:backend"])).toEqual({ type: "backend" });
  });

  it("extracts 'tests' as a supported specialist type", () => {
    expect(parseSpecialistType(["size:medium", "specialist:tests"])).toEqual({ type: "tests" });
  });

  it("extracts 'e2e' as a supported specialist type", () => {
    expect(parseSpecialistType(["size:medium", "specialist:e2e"])).toEqual({ type: "e2e" });
  });

  it("reports when no specialist:* label is present", () => {
    expect(parseSpecialistType(["size:medium"])).toEqual({
      reason: "no specialist:<type> label found",
    });
  });

  it("reports when the specialist type isn't one this trigger supports", () => {
    const result = parseSpecialistType(["specialist:design"]);
    expect("reason" in result && result.reason).toMatch(/not a supported specialist type/);
  });

  it("ignores a leftover outcome label from an earlier dispatch attempt (real PROJ-64 shape)", () => {
    const result = parseSpecialistType(["specialist:waiting", "specialist:frontend", "tier:small", "size:medium"]);
    expect(result).toEqual({ type: "frontend" });
  });

  it("ignores a leftover outcome label regardless of label order", () => {
    expect(parseSpecialistType(["specialist:backend", "specialist:complete"])).toEqual({ type: "backend" });
    expect(parseSpecialistType(["specialist:blocked", "specialist:backend"])).toEqual({ type: "backend" });
  });

  it("reports when a story carries more than one specialist type label", () => {
    const result = parseSpecialistType(["specialist:backend", "specialist:frontend"]);
    expect("reason" in result && result.reason).toMatch(/more than one specialist type label/);
  });
});

describe("fetchStoryDispatchContext", () => {
  it("builds a full dispatch context from a well-formed story", async () => {
    stubIssueQuery({
      id: "story-1",
      branchName: "story/story-1-add-refund-model",
      labels: { nodes: [{ name: "specialist:backend" }, { name: "size:medium" }] },
      parent: { id: "epic-1", branchName: "epic/epic-1-refunds" },
    });

    const result = await fetchStoryDispatchContext("story-1", API_KEY, BASE_URL, TRACE_ID);

    expect(result).toEqual({
      ok: true,
      context: {
        storyId: "story-1",
        storyBranch: "story/story-1-add-refund-model",
        specialistType: "backend",
        epicId: "epic-1",
        epicBranch: "epic/epic-1-refunds",
      },
    });
  });

  it("returns ok:false when the story has no parent epic recorded", async () => {
    stubIssueQuery({
      id: "story-1",
      branchName: "story/story-1",
      labels: { nodes: [{ name: "specialist:backend" }] },
      parent: null,
    });

    const result = await fetchStoryDispatchContext("story-1", API_KEY, BASE_URL, TRACE_ID);
    expect(result).toEqual({ ok: false, reason: "story has no parent epic recorded" });
  });

  it("returns ok:false when no specialist:* label is present", async () => {
    stubIssueQuery({
      id: "story-1",
      branchName: "story/story-1",
      labels: { nodes: [{ name: "size:medium" }] },
      parent: { id: "epic-1", branchName: "epic/epic-1" },
    });

    const result = await fetchStoryDispatchContext("story-1", API_KEY, BASE_URL, TRACE_ID);
    expect(result).toEqual({ ok: false, reason: "no specialist:<type> label found" });
  });

  it("returns ok:false when the story could not be read from the tracker", async () => {
    stubIssueQuery(null);

    const result = await fetchStoryDispatchContext("missing-story", API_KEY, BASE_URL, TRACE_ID);
    expect(result).toEqual({ ok: false, reason: "story missing-story could not be read from the tracker" });
  });

  it("throws when the API key is missing", async () => {
    await expect(fetchStoryDispatchContext("story-1", "", BASE_URL, TRACE_ID)).rejects.toThrow(
      "LINEAR_AGENT_API_KEY is not set",
    );
  });

  it("throws on a GraphQL error response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ errors: ["boom"] }) }),
    );
    await expect(fetchStoryDispatchContext("story-1", API_KEY, BASE_URL, TRACE_ID)).rejects.toThrow(
      "Linear GraphQL error",
    );
  });
});

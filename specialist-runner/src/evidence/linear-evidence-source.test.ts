import { describe, expect, it } from "vitest";
import { createLinearEvidenceClient, drainConnection, type FetchFn } from "./linear-evidence-source.js";

// The API pages every connection; these fakes serve fixed pages keyed by the
// cursor the client sends, the way the real API does.

interface Call {
  query: string;
  variables: Record<string, unknown>;
}

function fakeFetch(respond: (call: Call) => unknown): { fetch: FetchFn; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (_url: unknown, init?: { body?: unknown }) => {
    const call = JSON.parse(String(init?.body)) as Call;
    calls.push(call);
    return new Response(JSON.stringify({ data: respond(call) }), { status: 200 });
  }) as unknown as FetchFn;
  return { fetch: fetchFn, calls: calls };
}

// Splits nodes into pages of `size`, cursors "c1", "c2", …
function pages<T>(nodes: T[], size: number) {
  const out: { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } }[] = [];
  for (let i = 0; i < nodes.length; i += size) {
    const n = out.length + 1;
    out.push({ nodes: nodes.slice(i, i + size), pageInfo: { hasNextPage: i + size < nodes.length, endCursor: `c${n}` } });
  }
  return out;
}

function pageFor<T>(served: ReturnType<typeof pages<T>>, after: unknown) {
  return after ? served[Number(String(after).slice(1))] : served[0];
}

const attachments = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `a${i}`, title: `capture-${i}`, url: `https://uploads.example/${i}` }));

describe("linear evidence client paging", () => {
  it("returns every attachment on an issue, not the first page", async () => {
    // 73 attachments at the API's default page size of 50: the shape that
    // once pre-loaded as 50.
    const served = pages(attachments(73), 50);
    const { fetch, calls } = fakeFetch((call) => ({
      issue: {
        id: "uuid-1",
        identifier: "PROJ-1",
        description: "evidence",
        project: { id: "p1" },
        attachments: pageFor(served, call.variables.after),
      },
    }));

    const issue = await createLinearEvidenceClient("https://api.example", "key", fetch).getIssue("PROJ-1");

    expect(issue?.attachments).toHaveLength(73);
    expect(issue?.attachments.map((a) => a.id)).toEqual(attachments(73).map((a) => a.id));
    expect(calls).toHaveLength(2);
    expect(calls[0]?.query).toContain("pageInfo");
    expect(calls[1]?.variables).toEqual({ id: "PROJ-1", after: "c1" });
  });

  it("makes one request when everything fits on one page", async () => {
    const served = pages(attachments(3), 50);
    const { fetch, calls } = fakeFetch(() => ({
      issue: { id: "uuid-1", identifier: "PROJ-1", description: "", project: null, attachments: served[0] },
    }));

    const issue = await createLinearEvidenceClient("https://api.example", "key", fetch).getIssue("PROJ-1");

    expect(issue?.attachments).toHaveLength(3);
    expect(calls).toHaveLength(1);
  });

  it("returns every project document", async () => {
    const docs = Array.from({ length: 120 }, (_, i) => ({ content: `doc ${i}` }));
    const served = pages(docs, 50);
    const { fetch, calls } = fakeFetch((call) => ({
      project: { content: "brief", documents: pageFor(served, call.variables.after) },
    }));

    const project = await createLinearEvidenceClient("https://api.example", "key", fetch).getProject("p1");

    expect(project?.documentContents).toHaveLength(120);
    expect(project?.documentContents[119]).toBe("doc 119");
    expect(calls).toHaveLength(3);
  });

  it("returns every design issue in the project", async () => {
    const ids = Array.from({ length: 55 }, (_, i) => ({ id: `d${i}` }));
    const served = pages(ids, 50);
    const { fetch, calls } = fakeFetch((call) => ({ issues: pageFor(served, call.variables.after) }));

    const found = await createLinearEvidenceClient("https://api.example", "key", fetch).findDesignIssueIds("p1");

    expect(found).toHaveLength(55);
    expect(calls[0]?.variables).toEqual({ id: "p1", after: null });
    expect(calls[1]?.variables).toEqual({ id: "p1", after: "c1" });
  });
});

describe("drainConnection", () => {
  it("stops on a cursor that does not advance rather than paging forever", async () => {
    const stuck = { nodes: [1], pageInfo: { hasNextPage: true, endCursor: "c1" } };
    await expect(drainConnection(stuck, async () => stuck)).rejects.toThrow(/did not advance/);
  });
});

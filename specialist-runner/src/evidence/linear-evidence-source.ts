// Mirrors webhook-listener/src/attachments/linear-evidence-source.ts — the two packages share
// no library (the same convention as move-story-to-todo.ts in each), so a
// change to one belongs in the other.

/**
 * The tracker side of evidence download: the GraphQL lookups the evidence
 * walker needs, and the download of each file it finds. Read-only — this
 * package's one direct tracker write stays tracker-fallback.ts.
 *
 * Downloads carry the API key: an upload URL from the GraphQL API is signed,
 * but the signature alone is refused (HTTP 401 without the key, 200 with it —
 * confirmed by webhook-listener/scripts/probe-attachment-preload.ts on 2026-10-07). The
 * signature also expires minutes after the query that issued it, so files are
 * downloaded in the same pre-load that listed them, never later in the run.
 */

import type { EvidenceIssue, EvidenceProject, EvidenceSource } from "./evidence-walker.js";

export const DESIGN_ASSET_LABEL = "design:asset";

export type FetchFn = typeof fetch;

export interface DownloadedFile {
  bytes: Buffer;
  contentType: string;
  contentDisposition: string | null;
}

export interface LinearEvidenceClient extends EvidenceSource {
  // Throws DownloadTooLargeError, without buffering the rest, once a file
  // passes maxBytes.
  download(url: string, maxBytes: number): Promise<DownloadedFile>;
}

export class DownloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`download exceeded ${maxBytes} bytes`);
    this.name = "DownloadTooLargeError";
  }
}

interface IssueNode {
  id: string;
  identifier: string;
  description: string | null;
  project: { id: string } | null;
  attachments: { nodes: { id: string; title: string; url: string }[] };
}

export function createLinearEvidenceClient(apiUrl: string, apiKey: string, fetchFn: FetchFn): LinearEvidenceClient {
  async function query<T>(gql: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetchFn(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: apiKey },
      body: JSON.stringify({ query: gql, variables: variables }),
    });
    if (!res.ok) throw new Error(`Linear query failed: HTTP ${res.status}`);
    const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
    // A lookup of an issue or document that doesn't exist (or that this key
    // can't see) comes back as an "Entity not found" error rather than a null
    // — a dead link in evidence prose, not a failure of the walk.
    if (json.errors?.length && json.errors.every((e) => /not found/i.test(e.message))) return {} as T;
    if (json.errors?.length) throw new Error(`Linear query failed: ${json.errors.map((e) => e.message).join("; ")}`);
    return json.data as T;
  }

  return {
    async getProject(projectId: string): Promise<EvidenceProject | null> {
      const data = await query<{
        project?: { content: string | null; documents: { nodes: { content: string | null }[] } } | null;
      }>(`query($id:String!){ project(id:$id){ content documents{ nodes{ content } } } }`, { id: projectId });
      if (!data.project) return null;
      return {
        content: data.project.content ?? "",
        documentContents: data.project.documents.nodes.map((d) => d.content ?? ""),
      };
    },

    async getIssue(issueIdOrIdentifier: string): Promise<EvidenceIssue | null> {
      const data = await query<{ issue?: IssueNode | null }>(
        `query($id:String!){ issue(id:$id){ id identifier description project{ id } attachments{ nodes{ id title url } } } }`,
        { id: issueIdOrIdentifier },
      );
      if (!data.issue) return null;
      return {
        id: data.issue.id,
        identifier: data.issue.identifier,
        description: data.issue.description ?? "",
        projectId: data.issue.project?.id ?? null,
        attachments: data.issue.attachments.nodes,
      };
    },

    async getDocumentContent(documentIdOrSlug: string): Promise<string | null> {
      const data = await query<{ document?: { content: string | null } | null }>(
        `query($id:String!){ document(id:$id){ content } }`,
        { id: documentIdOrSlug },
      );
      return data.document ? (data.document.content ?? "") : null;
    },

    async findDesignIssueIds(projectId: string): Promise<string[]> {
      const data = await query<{ issues?: { nodes: { id: string }[] } }>(
        `query($id:ID!){ issues(filter:{ project:{ id:{ eq:$id } }, labels:{ name:{ eq:"${DESIGN_ASSET_LABEL}" } } }){ nodes{ id } } }`,
        { id: projectId },
      );
      return data.issues?.nodes.map((n) => n.id) ?? [];
    },

    async download(url: string, maxBytes: number): Promise<DownloadedFile> {
      const controller = new AbortController();
      const res = await fetchFn(url, { headers: { Authorization: apiKey }, signal: controller.signal });
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
      const declared = Number(res.headers.get("content-length") ?? "NaN");
      if (declared > maxBytes) {
        controller.abort();
        throw new DownloadTooLargeError(maxBytes);
      }
      // Counted as it streams, not trusted to the header: a missing or wrong
      // content-length must not let an oversized file through.
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (res.body) {
        for await (const chunk of res.body) {
          received += chunk.length;
          if (received > maxBytes) {
            controller.abort();
            throw new DownloadTooLargeError(maxBytes);
          }
          chunks.push(chunk);
        }
      }
      return {
        bytes: Buffer.concat(chunks),
        contentType: res.headers.get("content-type") ?? "application/octet-stream",
        contentDisposition: res.headers.get("content-disposition"),
      };
    },
  };
}

/**
 * The tracker side of attachment pre-load: the GraphQL lookups the evidence
 * walker needs, and the download of each file it finds. Read-only — the app's
 * tracker writes stay in tracker-notifier.ts.
 *
 * Downloads carry the API key: an upload URL from the GraphQL API is signed,
 * but the signature alone is refused (HTTP 401 without the key, 200 with it —
 * confirmed by scripts/probe-attachment-preload.ts on 2026-10-07). The
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

// The GraphQL API pages every connection, 50 nodes when `first` is not given.
// A reader that takes the first page as the whole list drops the rest without
// a trace: an evidence issue with 73 attachments once pre-loaded as 50, and the
// 23 oldest never reached the activation (docs/design-ledger.md, 2026-10-23).
// Every connection read here is followed to its last page.
const PAGE_SIZE = 100;
const PAGE_INFO = "pageInfo{ hasNextPage endCursor }";

interface Connection<T> {
  nodes: T[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}

interface AttachmentNode {
  id: string;
  title: string;
  url: string;
}

interface IssueNode {
  id: string;
  identifier: string;
  description: string | null;
  project: { id: string } | null;
  attachments: Connection<AttachmentNode>;
  state?: { type: string } | null;
  // An issue carries a handful of labels; the first page is all of them.
  labels?: { nodes: { name: string }[] };
}

// Collects every node of a connection: the page already in hand, then each
// following page until the API says there is none.
export async function drainConnection<T>(
  first: Connection<T>,
  next: (after: string) => Promise<Connection<T> | null>,
): Promise<T[]> {
  const nodes = [...first.nodes];
  let page = first;
  while (page.pageInfo.hasNextPage && page.pageInfo.endCursor) {
    const cursor = page.pageInfo.endCursor;
    const following = await next(cursor);
    if (!following) break;
    // A cursor that does not advance would page forever.
    if (following.pageInfo.hasNextPage && following.pageInfo.endCursor === cursor) {
      throw new Error(`Linear pagination did not advance past cursor ${cursor}`);
    }
    nodes.push(...following.nodes);
    page = following;
  }
  return nodes;
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
      type DocumentConnection = Connection<{ content: string | null }>;
      const data = await query<{ project?: { content: string | null; documents: DocumentConnection } | null }>(
        `query($id:String!){ project(id:$id){ content documents(first:${PAGE_SIZE}){ nodes{ content } ${PAGE_INFO} } } }`,
        { id: projectId },
      );
      if (!data.project) return null;
      const documents = await drainConnection(data.project.documents, async (after) => {
        const more = await query<{ project?: { documents: DocumentConnection } | null }>(
          `query($id:String!,$after:String!){ project(id:$id){ documents(first:${PAGE_SIZE},after:$after){ nodes{ content } ${PAGE_INFO} } } }`,
          { id: projectId, after: after },
        );
        return more.project?.documents ?? null;
      });
      return {
        content: data.project.content ?? "",
        documentContents: documents.map((d) => d.content ?? ""),
      };
    },

    async getIssue(issueIdOrIdentifier: string): Promise<EvidenceIssue | null> {
      const data = await query<{ issue?: IssueNode | null }>(
        `query($id:String!){ issue(id:$id){ id identifier description project{ id } state{ type } labels(first:${PAGE_SIZE}){ nodes{ name } } attachments(first:${PAGE_SIZE}){ nodes{ id title url } ${PAGE_INFO} } } }`,
        { id: issueIdOrIdentifier },
      );
      if (!data.issue) return null;
      const attachments = await drainConnection(data.issue.attachments, async (after) => {
        const more = await query<{ issue?: { attachments: Connection<AttachmentNode> } | null }>(
          `query($id:String!,$after:String!){ issue(id:$id){ attachments(first:${PAGE_SIZE},after:$after){ nodes{ id title url } ${PAGE_INFO} } } }`,
          { id: issueIdOrIdentifier, after: after },
        );
        return more.issue?.attachments ?? null;
      });
      return {
        id: data.issue.id,
        identifier: data.issue.identifier,
        description: data.issue.description ?? "",
        projectId: data.issue.project?.id ?? null,
        attachments: attachments,
        stateType: data.issue.state?.type ?? null,
        labels: data.issue.labels?.nodes.map((l) => l.name) ?? [],
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
      const page = async (after: string | null) =>
        (
          await query<{ issues?: Connection<{ id: string }> }>(
            `query($id:ID!,$after:String){ issues(first:${PAGE_SIZE},after:$after,filter:{ project:{ id:{ eq:$id } }, labels:{ name:{ eq:"${DESIGN_ASSET_LABEL}" } } }){ nodes{ id } ${PAGE_INFO} } }`,
            { id: projectId, after: after },
          )
        ).issues ?? null;
      const first = await page(null);
      if (!first) return [];
      return (await drainConnection(first, page)).map((n) => n.id);
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

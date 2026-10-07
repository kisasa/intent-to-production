/**
 * Shared fakes for the evidence tests: an in-memory tracker and a logger that
 * keeps quiet. Mirrors the tracker half of webhook-listener's own
 * attachments/test-fakes.ts.
 */

import type { Logger } from "../logger.js";
import type { EvidenceIssue, EvidenceProject } from "./evidence-walker.js";
import { DownloadTooLargeError, type DownloadedFile, type LinearEvidenceClient } from "./linear-evidence-source.js";

export const silentLogger: Logger = {
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
};

export interface FakeTracker {
  projects?: Record<string, EvidenceProject>;
  // Keyed by every reference that should resolve to the issue — identifier
  // and UUID alike.
  issues?: Record<string, EvidenceIssue>;
  documents?: Record<string, string>;
  designIssueIds?: Record<string, string[]>;
  files?: Record<string, DownloadedFile | Error>;
}

export function fakeLinear(tracker: FakeTracker): LinearEvidenceClient & { issueLookups: string[] } {
  const issueLookups: string[] = [];
  return {
    issueLookups: issueLookups,
    getProject: async (id) => tracker.projects?.[id] ?? null,
    getIssue: async (ref) => {
      issueLookups.push(ref);
      return tracker.issues?.[ref] ?? null;
    },
    getDocumentContent: async (ref) => tracker.documents?.[ref] ?? null,
    findDesignIssueIds: async (projectId) => tracker.designIssueIds?.[projectId] ?? [],
    download: async (url, maxBytes) => {
      const file = tracker.files?.[url];
      if (!file) throw new Error(`download failed: HTTP 404`);
      if (file instanceof Error) throw file;
      if (file.bytes.length > maxBytes) throw new DownloadTooLargeError(maxBytes);
      return file;
    },
  };
}

export function issue(
  identifier: string,
  description: string,
  attachments: { id: string; title: string; url: string }[] = [],
  projectId: string | null = "proj",
): EvidenceIssue {
  return {
    id: `uuid-${identifier}`,
    identifier: identifier,
    description: description,
    projectId: projectId,
    attachments: attachments,
  };
}

export function file(contentType: string, content: string | Buffer): DownloadedFile {
  return {
    bytes: typeof content === "string" ? Buffer.from(content) : content,
    contentType: contentType,
    contentDisposition: null,
  };
}

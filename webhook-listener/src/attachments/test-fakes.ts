/**
 * Shared fakes for the attachment pre-load tests: an in-memory tracker, a
 * recording Anthropic files/counting client, and a logger that keeps quiet.
 */

import type { Logger } from "../logger.js";
import type { EvidenceIssue, EvidenceProject } from "./evidence-walker.js";
import { DownloadTooLargeError, type DownloadedFile, type LinearEvidenceClient } from "./linear-evidence-source.js";
import type { AnthropicFilesClient } from "./attachment-preload.js";

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

export interface RecordingAnthropic extends AnthropicFilesClient {
  uploads: { filename: string; type: string }[];
}

/**
 * Counts tokens as one per byte of each block's payload, plus one for the
 * fixed "." text — crude, but deterministic and proportional, which is all
 * the budget logic needs.
 */
export function recordingAnthropic(refuseCountingOver = Number.POSITIVE_INFINITY): RecordingAnthropic {
  const uploads: { filename: string; type: string }[] = [];
  let next = 0;
  return {
    uploads: uploads,
    files: {
      upload: async (params) => {
        const f = params.file as File;
        uploads.push({ filename: f.name, type: f.type });
        next++;
        return { id: `file_${next}` };
      },
    },
    messages: {
      countTokens: async (params) => {
        let tokens = 0;
        for (const m of params.messages) {
          if (typeof m.content === "string") {
            tokens += m.content.length;
            continue;
          }
          for (const block of m.content) {
            const b = block as { type: string; text?: string; source?: { data?: string } };
            tokens += b.type === "text" ? (b.text ?? "").length : (b.source?.data ?? "").length;
          }
        }
        // Stands in for the endpoint refusing a block outright (page limit,
        // encryption, request size).
        if (tokens > refuseCountingOver) throw new Error("400 invalid_request_error: request too large");
        return { input_tokens: tokens };
      },
    },
  };
}

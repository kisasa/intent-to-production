/**
 * Attachment pre-load: puts the tracker files an activation needs into the
 * Anthropic request itself, the way a person's uploads reach Claude in a
 * desktop session — a PDF read page by page, an image seen, text as text, and
 * anything else as a file in the code execution sandbox.
 *
 * Observed 2026-10-06: Intake fetched a 15-screen PDF through the tracker
 * connector's attachment tool, which returns a file's bytes as base64 *text*.
 * Claude cannot read base64 as a document — it is just tokens — and the
 * request came to 1.6M tokens, over the window, so the run failed before a
 * word was read. The same PDF as a document block is tens of thousands of
 * tokens and Claude sees its pages. Fetching is therefore the app's
 * mechanical job, done before the call; what the files mean stays Claude's.
 *
 * Every file is uploaded once to the Files API and referenced by id, so a
 * pause_turn resume re-sends ids rather than megabytes, and a later
 * activation that sees the same bytes reuses the same upload (keyed on a hash
 * of the content, which also collapses one file attached in two places).
 * Uploads carry an expiry, so nothing here ever deletes a file: a restart only
 * costs a re-upload, and the Files API retires the old copy on its own.
 */

import { createHash } from "node:crypto";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { classifyAttachment, deriveFilename, normalizeMimeType, type AttachmentKind } from "./attachment-classifier.js";
import { applyAttachmentBudget, type AttachmentBudgetLimits, type BudgetCandidate } from "./attachment-budget.js";
import { walkEvidence, type EvidenceScope, type FoundAttachment, type WalkLimits } from "./evidence-walker.js";
import { DownloadTooLargeError, type DownloadedFile, type LinearEvidenceClient } from "./linear-evidence-source.js";
import type { Logger } from "../logger.js";

// Only the tracker's own uploads are files; every other attachment URL (a
// pull request, a prototype, a design canvas) is a link Claude is told about
// but that nothing here tries to open.
const UPLOAD_URL_PREFIX = "https://uploads.linear.app/";

export interface AttachmentDownloadLimits {
  maxFileBytes: number;
  maxTotalBytes: number;
}

export interface AttachmentPreloadConfig {
  walk: WalkLimits;
  budget: AttachmentBudgetLimits;
  download: AttachmentDownloadLimits;
  // Lifetime given to each upload. A cached upload is reused only while at
  // least minRemainingFileLifeMs of that lifetime is left, so a file can't
  // expire under an activation still referencing it across its resumes.
  fileExpirySeconds: number;
  minRemainingFileLifeMs: number;
}

/** The two Anthropic endpoints pre-load uses, narrowed so tests can fake them. */
export interface AnthropicFilesClient {
  files: { upload(params: Anthropic.FileUploadParams): PromiseLike<{ id: string }> };
  messages: { countTokens(params: Anthropic.MessageCountTokensParams): PromiseLike<{ input_tokens: number }> };
}

export interface PreloadedAttachments {
  // Content blocks for the real request: file-sourced attachments, the
  // sandbox uploads, and the manifest last (carrying a cache breakpoint).
  blocks: Anthropic.Beta.BetaContentBlockParam[];
  // The text parts of `blocks` alone — the labels and the manifest — for the
  // pre-flight count. The token counting endpoint refuses file sources (HTTP
  // 400, confirmed by the probe script on 2026-10-07), and re-sending every
  // file inline there would run into its own request size limit, so each
  // file was measured on its own and the pre-flight adds attachmentTokens to
  // the count of this.
  countBlocks: Anthropic.ContentBlockParam[];
  needsCodeExecution: boolean;
  // Prompt tokens of the in-prompt files, measured one by one. Sandbox files
  // cost none.
  attachmentTokens: number;
}

export interface AttachmentPreloader {
  preload(anthropic: AnthropicFilesClient, scope: EvidenceScope, model: string, log: Logger): Promise<PreloadedAttachments>;
}

interface CachedUpload {
  fileId: string;
  expiresAt: number;
}

interface LoadedFile {
  found: FoundAttachment;
  file: DownloadedFile;
  hash: string;
  kind: AttachmentKind;
  filename: string;
}

type ManifestEntry =
  | { status: "prompt"; found: FoundAttachment; mime: string; bytes: number; kind: AttachmentKind; tokens: number }
  | { status: "sandbox"; found: FoundAttachment; mime: string; bytes: number; filename: string; reason: string | null }
  | { status: "duplicate"; found: FoundAttachment; sameAs: number }
  | { status: "link"; found: FoundAttachment }
  | { status: "failed"; found: FoundAttachment; reason: string };

const KIND_DESCRIPTION: Record<AttachmentKind, string> = {
  pdf: "in this message as a PDF document — every page as text and as an image",
  image: "in this message as an image",
  text: "in this message as text",
  sandbox: "in your code execution sandbox",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function renderManifest(entries: ManifestEntry[]): string {
  const lines = [
    "## Attachments for this activation",
    "",
    "The tracker files this activation needs were collected for you by following the evidence links " +
      "from where this activation starts (and the design issue), and are already part of this message. " +
      "Never fetch an attachment with the tracker connector's attachment tool: it returns a file as " +
      "base64 text you cannot read, and a large one overflows the context window.",
    "",
  ];
  if (entries.length === 0) lines.push("No attachments were found on the linked evidence.");
  entries.forEach((e, i) => {
    const head = `${i + 1}. "${e.found.title}" (on ${e.found.issueIdentifier})`;
    switch (e.status) {
      case "prompt":
        lines.push(`${head} — ${e.mime}, ${formatBytes(e.bytes)} — ${KIND_DESCRIPTION[e.kind]}.`);
        break;
      case "sandbox":
        lines.push(
          `${head} — ${e.mime}, ${formatBytes(e.bytes)} — ${KIND_DESCRIPTION.sandbox} at \`$INPUT_DIR/${e.filename}\`` +
            (e.reason ? ` (not in the message itself: ${e.reason})` : "") +
            ". Open it with code execution.",
        );
        break;
      case "duplicate":
        lines.push(`${head} — the same file as attachment ${e.sameAs + 1}; not repeated.`);
        break;
      case "link":
        lines.push(`${head} — a link, not a file: ${e.found.url}. It was not opened, and you cannot open it.`);
        break;
      case "failed":
        lines.push(`${head} — NOT LOADED: ${e.reason}.`);
        break;
    }
  });
  lines.push(
    "",
    "If an attachment you need is NOT LOADED, or only reached you in the sandbox when its visual content " +
      "matters (a deck or document whose layout carries the meaning), say so in the thread and ask for it — " +
      "for example as a PDF export — rather than reasoning past it.",
  );
  return lines.join("\n");
}

export function createAttachmentPreloader(
  linear: LinearEvidenceClient,
  config: AttachmentPreloadConfig,
  now: () => number = Date.now,
): AttachmentPreloader {
  const uploads = new Map<string, CachedUpload>();

  async function uploadOnce(
    anthropic: AnthropicFilesClient,
    hash: string,
    bytes: Buffer,
    filename: string,
    mime: string,
    log: Logger,
  ): Promise<string> {
    // The hash already identifies the bytes; the upload type is part of the
    // key because a text file goes up as text/plain for a document block but
    // as itself when it goes to the sandbox.
    const key = `${hash}:${mime}`;
    const cached = uploads.get(key);
    if (cached && cached.expiresAt - now() >= config.minRemainingFileLifeMs) {
      log.trace(`attachment pre-load: reusing upload ${cached.fileId} for ${filename}`);
      return cached.fileId;
    }
    const startedAt = now();
    const uploaded = await anthropic.files.upload({
      file: await toFile(bytes, filename, { type: mime }),
      expires_in_seconds: config.fileExpirySeconds,
    });
    uploads.set(key, { fileId: uploaded.id, expiresAt: startedAt + config.fileExpirySeconds * 1000 });
    log.trace(`attachment pre-load: uploaded ${filename} as ${uploaded.id}`);
    return uploaded.id;
  }

  function inlineBlock(loaded: LoadedFile): Anthropic.ContentBlockParam {
    const mime = normalizeMimeType(loaded.file.contentType);
    if (loaded.kind === "pdf") {
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: loaded.file.bytes.toString("base64") },
        title: loaded.found.title,
      };
    }
    if (loaded.kind === "image") {
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: mime as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
          data: loaded.file.bytes.toString("base64"),
        },
      };
    }
    return {
      type: "document",
      source: { type: "text", media_type: "text/plain", data: loaded.file.bytes.toString("utf8") },
      title: loaded.found.title,
    };
  }

  return {
    async preload(anthropic, scope, model, log) {
      const found = await walkEvidence(linear, scope, config.walk, log);
      log.debug(`attachment pre-load: ${found.length} attachment(s) on the linked evidence`);

      // Downloads start right after the walk: the signed upload URLs it
      // returned stop working minutes later. One at a time, under a per-file and a per-activation byte cap. Every
      // downloaded file sits in this process's memory until it is uploaded,
      // and the listener is a single small task whose concurrent activations
      // all share that memory — an unbounded parallel download of one large
      // attachment could take the whole process, and every run in it, down.
      const results: { found: FoundAttachment; file: DownloadedFile | null; error: string | null }[] = [];
      let downloadedBytes = 0;
      for (const f of found) {
        if (!f.url.startsWith(UPLOAD_URL_PREFIX)) {
          results.push({ found: f, file: null, error: null });
          continue;
        }
        const remaining = config.download.maxTotalBytes - downloadedBytes;
        const limit = Math.min(config.download.maxFileBytes, remaining);
        try {
          const file = await linear.download(f.url, limit);
          downloadedBytes += file.bytes.length;
          results.push({ found: f, file: file, error: null });
        } catch (err) {
          const reason =
            err instanceof DownloadTooLargeError
              ? limit < config.download.maxFileBytes
                ? `skipped: this activation's attachments already reached the ${formatBytes(config.download.maxTotalBytes)} download limit`
                : `too large to load (over ${formatBytes(config.download.maxFileBytes)}); a smaller export, such as a PDF of the relevant pages, would load`
              : err instanceof Error
                ? err.message
                : String(err);
          results.push({ found: f, file: null, error: reason });
        }
      }

      const entries: ManifestEntry[] = [];
      const loaded: LoadedFile[] = [];
      const entryIndexByHash = new Map<string, number>();
      for (const r of results) {
        if (r.error !== null) {
          entries.push({ status: "failed", found: r.found, reason: r.error });
          continue;
        }
        if (!r.file) {
          entries.push({ status: "link", found: r.found });
          continue;
        }
        const hash = createHash("sha256").update(r.file.bytes).digest("hex");
        const sameAs = entryIndexByHash.get(hash);
        if (sameAs !== undefined) {
          entries.push({ status: "duplicate", found: r.found, sameAs: sameAs });
          continue;
        }
        entryIndexByHash.set(hash, entries.length);
        loaded.push({
          found: r.found,
          file: r.file,
          hash: hash,
          kind: classifyAttachment(r.file.contentType, r.file.bytes.length),
          filename: deriveFilename(r.found.title, r.file.contentType, r.file.contentDisposition),
        });
        // Placeholder, replaced below once the budget has decided where it goes.
        entries.push({ status: "failed", found: r.found, reason: "unplaced" });
      }

      // Each in-prompt candidate's own cost, measured exactly: the counting
      // endpoint on that block alone, less the cost of the same message
      // without it.
      const baselineMessage: Anthropic.MessageParam = { role: "user", content: [{ type: "text", text: "." }] };
      const baseline = (await anthropic.messages.countTokens({ model: model, messages: [baselineMessage] }))
        .input_tokens;
      // A file the counting endpoint refuses (a PDF past the page limit, an
      // encrypted one, one whose inline copy exceeds the request size limit)
      // would be refused by the real request too, so it goes to the sandbox
      // rather than failing the run.
      const unmeasurable = new Map<string, string>();
      const candidates: BudgetCandidate[] = await Promise.all(
        loaded.map(async (l): Promise<BudgetCandidate> => {
          if (l.kind === "sandbox") return { key: l.hash, kind: l.kind, tokens: 0 };
          try {
            const counted = await anthropic.messages.countTokens({
              model: model,
              messages: [{ role: "user", content: [inlineBlock(l), { type: "text", text: "." }] }],
            });
            return { key: l.hash, kind: l.kind, tokens: Math.max(0, counted.input_tokens - baseline) };
          } catch (err) {
            unmeasurable.set(
              l.hash,
              `the API would not accept it in the message (${err instanceof Error ? err.message : String(err)})`,
            );
            return { key: l.hash, kind: "sandbox", tokens: 0 };
          }
        }),
      );
      const decisions = applyAttachmentBudget(candidates, config.budget).map((d) => ({
        ...d,
        demotedBecause: unmeasurable.get(d.key) ?? d.demotedBecause,
      }));

      const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
      const countBlocks: Anthropic.ContentBlockParam[] = [];
      let needsCodeExecution = false;
      let attachmentTokens = 0;

      for (let i = 0; i < loaded.length; i++) {
        const l = loaded[i] as LoadedFile;
        const decision = decisions[i] as (typeof decisions)[number];
        const candidate = candidates[i] as BudgetCandidate;
        const entryIndex = entryIndexByHash.get(l.hash) as number;
        const mime = normalizeMimeType(l.file.contentType);
        const label = `Attachment ${entryIndex + 1}: "${l.found.title}" (on ${l.found.issueIdentifier})`;

        try {
          if (decision.kind === "sandbox") {
            const fileId = await uploadOnce(anthropic, l.hash, l.file.bytes, l.filename, mime, log);
            blocks.push({ type: "container_upload", file_id: fileId });
            needsCodeExecution = true;
            entries[entryIndex] = {
              status: "sandbox",
              found: l.found,
              mime: mime,
              bytes: l.file.bytes.length,
              filename: l.filename,
              reason: decision.demotedBecause,
            };
            continue;
          }

          const uploadMime = l.kind === "text" ? "text/plain" : mime;
          const fileId = await uploadOnce(anthropic, l.hash, l.file.bytes, l.filename, uploadMime, log);
          blocks.push({ type: "text", text: label });
          countBlocks.push({ type: "text", text: label });
          if (l.kind === "image") {
            blocks.push({ type: "image", source: { type: "file", file_id: fileId } });
          } else {
            blocks.push({ type: "document", source: { type: "file", file_id: fileId }, title: l.found.title });
          }
          attachmentTokens += candidate.tokens;
          entries[entryIndex] = {
            status: "prompt",
            found: l.found,
            mime: mime,
            bytes: l.file.bytes.length,
            kind: l.kind,
            tokens: candidate.tokens,
          };
        } catch (err) {
          entries[entryIndex] = {
            status: "failed",
            found: l.found,
            reason: `upload failed: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      // The manifest closes the attachment section and carries its cache
      // breakpoint: the files and the manifest are identical across passes on
      // the same evidence, while the activation template after them is not.
      const manifest = renderManifest(entries);
      blocks.push({ type: "text", text: manifest, cache_control: { type: "ephemeral" } });
      countBlocks.push({ type: "text", text: manifest });

      log.info(
        `attachment pre-load: ${entries.filter((e) => e.status === "prompt").length} in the prompt ` +
          `(${attachmentTokens} tokens), ${entries.filter((e) => e.status === "sandbox").length} in the sandbox, ` +
          `${entries.filter((e) => e.status === "link").length} link(s), ` +
          `${entries.filter((e) => e.status === "failed").length} failed`,
      );
      return {
        blocks: blocks,
        countBlocks: countBlocks,
        needsCodeExecution: needsCodeExecution,
        attachmentTokens: attachmentTokens,
      };
    },
  };
}

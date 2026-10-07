/**
 * Puts the epic's evidence files on disk before the specialist starts, so it
 * opens them with its own tools — the Read tool shows a PDF page by page and
 * an image as an image, and anything else opens with Bash — instead of
 * fetching them through the tracker connector.
 *
 * The connector hands a file over as base64 text. In the shaping tier that
 * overflowed the context window outright (2026-10-06, one PDF, 1.6M tokens).
 * Here the Agent SDK would save an oversized result to a file and hand over
 * the path instead, so it can't overflow — but what it saves is still base64,
 * and turning it back into a usable file was left to the specialist's
 * improvisation, at the cost of turns. Downloading is mechanical, so the
 * runner does it.
 *
 * The same files the Specification Agent was given: the epic, the issues it
 * links to (three hops, across projects), and the design issue. Unlike the
 * listener's pre-load there is no token budget and no Files API here: a file
 * on disk costs nothing until the specialist opens it, and it opens only what
 * its story needs.
 *
 * The directory sits beside the surface checkout, never inside it, so no file
 * can be committed by accident.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { walkEvidence, type FoundAttachment, type WalkLimits } from "./evidence-walker.js";
import { DownloadTooLargeError, type LinearEvidenceClient } from "./linear-evidence-source.js";
import type { Logger } from "../logger.js";

const UPLOAD_URL_PREFIX = "https://uploads.linear.app/";

export const MANIFEST_FILENAME = "MANIFEST.md";

export interface EvidenceDownloadConfig {
  walk: WalkLimits;
  // The same caps as the listener's pre-load, for the same files: a file too
  // big to hand the shaping agents should not quietly reach the specialist
  // either, and a smaller export fixes it for both.
  maxFileBytes: number;
  maxTotalBytes: number;
}

export const EVIDENCE_DOWNLOAD_CONFIG: EvidenceDownloadConfig = {
  walk: { maxHops: 3, maxNodes: 40 },
  maxFileBytes: 50 * 1024 * 1024,
  maxTotalBytes: 150 * 1024 * 1024,
};

type ManifestEntry =
  | { status: "saved"; found: FoundAttachment; filename: string; contentType: string; bytes: number }
  | { status: "duplicate"; found: FoundAttachment; sameAs: string }
  | { status: "link"; found: FoundAttachment }
  | { status: "failed"; found: FoundAttachment; reason: string };

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "text/html": ".html",
  "text/markdown": ".md",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
  "application/xml": ".xml",
  "application/zip": ".zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A filename that is safe on disk and easy to refer to: numbered in manifest
 * order so two attachments with the same title can't collide, the
 * download's own declared name when it gave one, and an extension matching
 * the content type so the specialist's tools recognise the file.
 */
export function evidenceFilename(
  index: number,
  title: string,
  contentType: string,
  contentDisposition: string | null,
): string {
  const declared = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1];
  const base = (declared ? decodeURIComponent(declared) : title)
    .replace(/[^A-Za-z0-9._ ()-]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  const mime = (contentType.split(";")[0] ?? "").trim().toLowerCase();
  const extension = EXTENSION_BY_MIME[mime];
  const named = extension && !base.toLowerCase().endsWith(extension) ? `${base}${extension}` : base;
  return `${String(index).padStart(2, "0")}-${named || "attachment"}`;
}

export function renderEvidenceManifest(dir: string, epicId: string, entries: ManifestEntry[]): string {
  const lines = [
    `# Evidence files for ${epicId}`,
    "",
    "Collected before your run by following the evidence links from the epic, plus the design issue — the " +
      "same files the Specification Agent read when it drafted the API map. They are in this directory, " +
      `\`${dir}\`. Open a PDF or an image with the Read tool, which shows it page by page or as an image; ` +
      "open anything else with Bash. Never fetch an attachment through the tracker connector: it returns " +
      "a file as base64 text, not as the file.",
    "",
  ];
  if (entries.length === 0) lines.push("No attachments were found on the linked evidence.");
  entries.forEach((e, i) => {
    const head = `${i + 1}. "${e.found.title}" (on ${e.found.issueIdentifier})`;
    switch (e.status) {
      case "saved":
        lines.push(`${head} — \`${e.filename}\`, ${e.contentType}, ${formatBytes(e.bytes)}`);
        break;
      case "duplicate":
        lines.push(`${head} — the same file as \`${e.sameAs}\`; not saved twice`);
        break;
      case "link":
        lines.push(`${head} — a link, not a file: ${e.found.url}. Not downloaded.`);
        break;
      case "failed":
        lines.push(`${head} — NOT DOWNLOADED: ${e.reason}`);
        break;
    }
  });
  lines.push(
    "",
    "If a file you need is NOT DOWNLOADED, or a link you would need to open matters to the story, do not " +
      "build around the gap: say so in your report.",
  );
  return lines.join("\n") + "\n";
}

/**
 * Walks the epic's evidence, downloads each file into `dir`, and writes the
 * manifest there. Never throws for a single file: one that can't be fetched is
 * listed as not downloaded. A walk that fails outright is recorded in the
 * manifest too — the run goes on, since most stories never need a file, and
 * the specialist is told what it doesn't have.
 */
export async function downloadEvidence(
  linear: LinearEvidenceClient,
  epicId: string,
  dir: string,
  config: EvidenceDownloadConfig,
  log: Logger,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const manifestPath = join(dir, MANIFEST_FILENAME);

  let found: FoundAttachment[];
  try {
    found = await walkEvidence(linear, { kind: "epic", issueId: epicId }, config.walk, log);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log.warn(`evidence walk failed for ${epicId}: ${reason}`);
    await writeFile(
      manifestPath,
      `# Evidence files for ${epicId}\n\nThe evidence could not be collected before your run: ${reason}. ` +
        "If the story depends on the designer's files, say so in your report.\n",
    );
    return manifestPath;
  }

  const entries: ManifestEntry[] = [];
  const savedByHash = new Map<string, string>();
  let downloadedBytes = 0;
  for (const f of found) {
    if (!f.url.startsWith(UPLOAD_URL_PREFIX)) {
      entries.push({ status: "link", found: f });
      continue;
    }
    const limit = Math.min(config.maxFileBytes, config.maxTotalBytes - downloadedBytes);
    try {
      const file = await linear.download(f.url, limit);
      downloadedBytes += file.bytes.length;
      const hash = createHash("sha256").update(file.bytes).digest("hex");
      const sameAs = savedByHash.get(hash);
      if (sameAs !== undefined) {
        entries.push({ status: "duplicate", found: f, sameAs: sameAs });
        continue;
      }
      const filename = evidenceFilename(entries.length + 1, f.title, file.contentType, file.contentDisposition);
      await writeFile(join(dir, filename), file.bytes);
      savedByHash.set(hash, filename);
      entries.push({
        status: "saved",
        found: f,
        filename: filename,
        contentType: file.contentType,
        bytes: file.bytes.length,
      });
    } catch (err) {
      const reason =
        err instanceof DownloadTooLargeError
          ? limit < config.maxFileBytes
            ? `skipped: the evidence already reached the ${formatBytes(config.maxTotalBytes)} download limit`
            : `too large (over ${formatBytes(config.maxFileBytes)}); a smaller export, such as a PDF of the relevant pages, would download`
          : err instanceof Error
            ? err.message
            : String(err);
      entries.push({ status: "failed", found: f, reason: reason });
    }
  }

  await writeFile(manifestPath, renderEvidenceManifest(dir, epicId, entries));
  log.info(
    `evidence for ${epicId}: ${entries.filter((e) => e.status === "saved").length} file(s) saved to ${dir}, ` +
      `${entries.filter((e) => e.status === "link").length} link(s), ` +
      `${entries.filter((e) => e.status === "failed").length} not downloaded`,
  );
  return manifestPath;
}

// Mirrors webhook-listener/src/attachments/evidence-walker.ts — the two packages share
// no library (the same convention as move-story-to-todo.ts in each), so a
// change to one belongs in the other.

/**
 * Finds the attachments an activation should see, by following the evidence
 * pointers the tracker already carries rather than by project membership.
 *
 * Membership was the first idea and fails both ways. A project that runs more
 * than one business-requirements document accumulates every delivered epic
 * and its design assets, so "every issue in the project" pre-loads work
 * already shipped; and evidence can live outside the project entirely — a
 * proof-of-concept's design issue in another project, linked from the brief.
 * The brief's evidence inventory is the head of the evidence-pointer chain
 * (business-requirements-writing), so the walker starts there and follows
 * links, across projects, up to a fixed depth.
 *
 * Observed while designing this: one real chain ran brief → its evidence
 * issue → a shared evidence issue and a scope-authority issue — three hops
 * from the brief before the last file was reached. The default depth is 3.
 */

import { extractLinkedRefs } from "./evidence-links.js";
import type { Logger } from "../logger.js";

export interface LinearAttachment {
  id: string;
  title: string;
  url: string;
}

export interface EvidenceIssue {
  id: string;
  identifier: string;
  description: string;
  projectId: string | null;
  attachments: LinearAttachment[];
}

export interface EvidenceProject {
  content: string;
  documentContents: string[];
}

/** The read-only tracker lookups the walker needs, injectable for tests. */
export interface EvidenceSource {
  getProject(projectId: string): Promise<EvidenceProject | null>;
  getIssue(issueIdOrIdentifier: string): Promise<EvidenceIssue | null>;
  getDocumentContent(documentIdOrSlug: string): Promise<string | null>;
  findDesignIssueIds(projectId: string): Promise<string[]>;
}

export interface FoundAttachment extends LinearAttachment {
  // Identifier of the issue the attachment sits on, for the manifest.
  issueIdentifier: string;
}

export interface WalkLimits {
  maxHops: number;
  // Guards against a link graph that fans out further than any real evidence
  // chain would — a ceiling on lookups, not a design parameter.
  maxNodes: number;
}

export type EvidenceScope = { kind: "project"; projectId: string } | { kind: "epic"; issueId: string };

interface QueuedRef {
  kind: "issue" | "document";
  ref: string;
  depth: number;
}

export async function walkEvidence(
  source: EvidenceSource,
  scope: EvidenceScope,
  limits: WalkLimits,
  log: Logger,
): Promise<FoundAttachment[]> {
  const queue: QueuedRef[] = [];
  const seenRefs = new Set<string>();
  const seenIssueIds = new Set<string>();
  const found = new Map<string, FoundAttachment>();
  let lookups = 0;

  function enqueueFrom(markdown: string, depth: number): void {
    if (depth > limits.maxHops) return;
    const refs = extractLinkedRefs(markdown);
    for (const ref of refs.issues) enqueue({ kind: "issue", ref: ref, depth: depth });
    for (const ref of refs.documents) enqueue({ kind: "document", ref: ref, depth: depth });
  }

  function enqueue(item: QueuedRef): void {
    const key = `${item.kind}:${item.ref}`;
    if (seenRefs.has(key)) return;
    seenRefs.add(key);
    queue.push(item);
  }

  function collect(issue: EvidenceIssue): void {
    for (const a of issue.attachments) {
      if (!found.has(a.id)) found.set(a.id, { ...a, issueIdentifier: issue.identifier });
    }
  }

  // The design issue is a reference artifact every lane consults whether or
  // not anything links to it, and it is found by its existing label rather
  // than by a pointer — so it is seeded directly, one hop out.
  async function seedDesignIssues(projectId: string | null): Promise<void> {
    if (!projectId) return;
    for (const id of await source.findDesignIssueIds(projectId)) enqueue({ kind: "issue", ref: id, depth: 1 });
  }

  if (scope.kind === "project") {
    const project = await source.getProject(scope.projectId);
    if (!project) throw new Error(`evidence walk: project ${scope.projectId} not found`);
    enqueueFrom(project.content, 1);
    for (const content of project.documentContents) enqueueFrom(content, 1);
    await seedDesignIssues(scope.projectId);
  } else {
    const epic = await source.getIssue(scope.issueId);
    if (!epic) throw new Error(`evidence walk: issue ${scope.issueId} not found`);
    seenIssueIds.add(epic.id);
    collect(epic);
    enqueueFrom(epic.description, 1);
    await seedDesignIssues(epic.projectId);
  }

  while (queue.length > 0) {
    const item = queue.shift() as QueuedRef;
    if (lookups >= limits.maxNodes) {
      log.warn(`evidence walk stopped at ${limits.maxNodes} lookups; ${queue.length + 1} linked item(s) not followed`);
      break;
    }
    lookups++;

    if (item.kind === "document") {
      const content = await source.getDocumentContent(item.ref);
      log.trace(`evidence walk: document ${item.ref} at hop ${item.depth} ${content === null ? "not found" : "read"}`);
      if (content !== null) enqueueFrom(content, item.depth + 1);
      continue;
    }

    const issue = await source.getIssue(item.ref);
    if (!issue) {
      log.trace(`evidence walk: issue ${item.ref} at hop ${item.depth} not found`);
      continue;
    }
    // An identifier and a UUID can name the same issue; dedupe on the UUID
    // the lookup returns, not on the reference that led here.
    if (seenIssueIds.has(issue.id)) continue;
    seenIssueIds.add(issue.id);
    log.trace(
      `evidence walk: issue ${issue.identifier} at hop ${item.depth}, ${issue.attachments.length} attachment(s)`,
    );
    collect(issue);
    enqueueFrom(issue.description, item.depth + 1);
  }

  return [...found.values()];
}

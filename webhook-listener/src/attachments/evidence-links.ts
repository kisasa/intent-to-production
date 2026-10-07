/**
 * Pulls the tracker references out of a piece of tracker markdown — a project's
 * content, a document, an issue description — so the evidence walker can
 * follow them. Only explicit links count: a full issue or document URL, or the
 * `<issue id="…">` / `<document id="…">` mention tags the tracker renders.
 * A bare identifier in prose ("see PROJ-42") is deliberately not followed: plain
 * text carries too many identifier-shaped strings that aren't issues — a
 * requirement number, a standard's clause — and an evidence chain worth
 * following is one somebody linked.
 */

export interface LinkedRefs {
  // Issue identifiers (e.g. "PROJ-42") or issue UUIDs — the tracker's issue
  // lookup accepts either.
  issues: string[];
  // Document slug ids (the hex suffix of a document URL) or document UUIDs —
  // the document lookup accepts either.
  documents: string[];
}

const ISSUE_URL = /https:\/\/linear\.app\/[^/\s]+\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)/g;
const ISSUE_TAG = /<issue\s+id="([0-9a-f-]{36})"/g;
const DOCUMENT_URL = /https:\/\/linear\.app\/[^/\s]+\/document\/(?:[^/\s)>"]*-)?([0-9a-f]{12})(?![0-9a-f])/g;
const DOCUMENT_TAG = /<document\s+id="([0-9a-f-]{36})"/g;

function matchAll(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern), (m) => m[1]).filter((v): v is string => v !== undefined);
}

export function extractLinkedRefs(markdown: string): LinkedRefs {
  const issues = new Set([...matchAll(markdown, ISSUE_URL), ...matchAll(markdown, ISSUE_TAG)]);
  const documents = new Set([...matchAll(markdown, DOCUMENT_URL), ...matchAll(markdown, DOCUMENT_TAG)]);
  return { issues: [...issues], documents: [...documents] };
}

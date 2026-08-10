/**
 * Reads what the specialist-dispatch lane needs from Linear directly, outside
 * any agent activation — the same category of direct app-level read as
 * `adapters/linear.ts`'s `fetchEntityContext` and `tracker-notifier.ts`'s own
 * comment writes, using the same raw-fetch GraphQL shape rather than a new
 * client library. Deliberately not shared with `dispatch-worker/src/tracker.ts`
 * — separate npm package, no shared lib between them, matching this repo's
 * existing "each package owns its own small client" pattern.
 *
 * The assignment label is `surface:<name>` — resolving the `specialist:<type>`
 * vs `spec:<type>` conflict design-ledger.md flagged as unresolved, and
 * renamed from `specialist:` after the specialist-types-collapse-into-
 * surfaces redesign (`docs/design-ledger.md`, 2026-08-08). A story may carry
 * more than one `surface:` label; this module only extracts the set of
 * names — whether they're all recognized by the epic (and, when there's more
 * than one, whether they all resolve to the same repo and ref) is
 * `dispatch-worker`'s `resolveRepoBase` to check, since that's the first
 * point in the pipeline that actually reads the epic's recorded repo bases.
 *
 * VERIFY before relying on this in production (same flagged-not-confirmed
 * category as `adapters/linear.ts`'s and `dispatch-worker/src/tracker.ts`'s
 * own notes): `parent { id branchName }` as the field name and shape for a
 * story's epic — inferred from Linear's public API docs, not confirmed
 * against a live query.
 */

import { createLogger } from "./logger.js";

const log = createLogger("story-context");

// A surface is a place work happens — a repo, or a project inside one. The
// vocabulary is open (`web`, `mobile`, `api`, `e2e`, ... whatever this
// engagement actually has), not a fixed union, so this is a plain string
// alias rather than a literal type.
export type Surface = string;

const SURFACE_LABEL_PREFIX = "surface:";

export interface StoryDispatchContext {
  readonly storyId: string;
  readonly storyBranch: string;
  readonly surfaces: Surface[];
  readonly epicId: string;
  readonly epicBranch: string;
}

export type StoryContextResult =
  | { readonly ok: true; readonly context: StoryDispatchContext }
  | { readonly ok: false; readonly reason: string };

interface GraphQlResponse<T> {
  data?: T;
  errors?: unknown;
}

const STORY_CONTEXT_QUERY = `
  query($id: String!) {
    issue(id: $id) {
      id
      branchName
      labels { nodes { name } }
      parent { id branchName }
    }
  }
`;

interface StoryContextQueryResult {
  issue: {
    id: string;
    branchName: string;
    labels: { nodes: { name: string }[] };
    parent: { id: string; branchName: string } | null;
  } | null;
}

/**
 * Extracts the story's `surface:<name>` label(s). Returns the reason string
 * for the one way a story can fail to carry a usable one — no label at all —
 * rather than a bare null; `dispatch-trigger.ts` posts this reason verbatim
 * in its error comment, so it has to be specific enough for a human to act
 * on.
 *
 * Unlike the old `specialist:<type>` version, there is no supported-type
 * check here: the surface vocabulary is open (whatever this engagement
 * actually has), so any `surface:*` label is presumptively valid at this
 * stage. Whether the epic actually recognizes a given surface — and, when
 * a story carries more than one, whether they all resolve to the same repo
 * and ref — is `resolveRepoBase` to catch downstream, since that is the
 * first point that reads the epic's recorded repo bases. Deduplicates a
 * repeated label and preserves the order labels were applied in, but places
 * no upper bound on count: a story may legitimately carry several surface
 * labels (`docs/design-ledger.md`, 2026-08-08 — "the labels widen what the
 * specialist may write").
 */
export function parseSurfaces(labels: string[]): { surfaces: Surface[] } | { reason: string } {
  const surfaces: Surface[] = [];
  for (const name of labels) {
    if (!name.startsWith(SURFACE_LABEL_PREFIX)) continue;
    const surface = name.slice(SURFACE_LABEL_PREFIX.length);
    if (!surfaces.includes(surface)) surfaces.push(surface);
  }

  if (surfaces.length === 0) {
    return { reason: `no ${SURFACE_LABEL_PREFIX}<name> label found` };
  }

  return { surfaces: surfaces };
}

export async function fetchStoryDispatchContext(
  storyId: string,
  apiKey: string,
  baseUrl: string,
  traceId: string,
): Promise<StoryContextResult> {
  const reqLog = log.child(traceId);
  if (!apiKey) throw new Error("LINEAR_AGENT_API_KEY is not set");

  reqLog.trace(`fetching story dispatch context for ${storyId}`);
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query: STORY_CONTEXT_QUERY, variables: { id: storyId } }),
  });
  const json = (await res.json()) as GraphQlResponse<StoryContextQueryResult>;
  if (!res.ok || json.errors || json.data === undefined) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors ?? res.status)}`);
  }

  const issue = json.data.issue;
  if (!issue) {
    return { ok: false, reason: `story ${storyId} could not be read from the tracker` };
  }

  if (!issue.parent) {
    return { ok: false, reason: "story has no parent epic recorded" };
  }

  const labelNames = issue.labels.nodes.map((node) => node.name);
  const surfacesResult = parseSurfaces(labelNames);
  if ("reason" in surfacesResult) {
    return { ok: false, reason: surfacesResult.reason };
  }

  reqLog.trace(
    `story ${storyId}: surfaces=${surfacesResult.surfaces.join(",")} epicId=${issue.parent.id} ` +
      `storyBranch=${issue.branchName} epicBranch=${issue.parent.branchName}`,
  );

  return {
    ok: true,
    context: {
      storyId: issue.id,
      storyBranch: issue.branchName,
      surfaces: surfacesResult.surfaces,
      epicId: issue.parent.id,
      epicBranch: issue.parent.branchName,
    },
  };
}

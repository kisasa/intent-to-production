/**
 * Reads what the specialist-dispatch lane needs from Linear directly, outside
 * any agent activation — the same category of direct app-level read as
 * `adapters/linear.ts`'s `fetchEntityContext` and `tracker-notifier.ts`'s own
 * comment writes, using the same raw-fetch GraphQL shape rather than a new
 * client library. Deliberately not shared with `dispatch-worker/src/tracker.ts`
 * — separate npm package, no shared lib between them, matching this repo's
 * existing "each package owns its own small client" pattern.
 *
 * The assignment label is `specialist:<type>` — resolving the
 * `specialist:<type>` vs `spec:<type>` conflict design-ledger.md flagged as
 * unresolved. (It used to also match the outcome-label prefix
 * `specialist:complete`/`:waiting`/`:blocked`; those are gone — see
 * `docs/design-ledger.md`, 2026-08-07.)
 *
 * VERIFY before relying on this in production (same flagged-not-confirmed
 * category as `adapters/linear.ts`'s and `dispatch-worker/src/tracker.ts`'s
 * own notes): `parent { id branchName }` as the field name and shape for a
 * story's epic — inferred from Linear's public API docs, not confirmed
 * against a live query.
 */

import { createLogger } from "./logger.js";

const log = createLogger("story-context");

export type SpecialistType = "backend" | "frontend" | "tests" | "e2e";

const SUPPORTED_SPECIALIST_TYPES: SpecialistType[] = ["backend", "frontend", "tests", "e2e"];
const SPECIALIST_LABEL_PREFIX = "specialist:";

export interface StoryDispatchContext {
  readonly storyId: string;
  readonly storyBranch: string;
  readonly specialistType: SpecialistType;
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
 * Extracts and validates the `specialist:<type>` label. Returns the reason
 * string for every way a story can fail to carry a usable one, rather than a
 * bare null — `dispatch-trigger.ts` posts this reason verbatim in its error
 * comment, so it has to be specific enough for a human to act on.
 *
 * Filters to labels naming a *supported* type, rather than just taking the
 * first `specialist:`-prefixed label. Confirmed live (2026-08-07, PROJ-64):
 * back when the specialist's own outcome was also tracked as a label under
 * this exact same prefix (`specialist:complete`/`:waiting`/`:blocked`,
 * removed 2026-08-07 — see `docs/design-ledger.md`), nothing cleared one
 * once a story was re-dispatched, and a leftover `specialist:waiting` won
 * over the real `specialist:frontend` assignment label on the next attempt,
 * since the old code just took whichever `specialist:*` label came first.
 * Outcome labels are gone now, so this can't recur from a future dispatch,
 * but the filter stays: it makes resolution order-independent and immune to
 * any stray label sharing the prefix, and still reports clearly if a story
 * genuinely carries zero or more than one type label.
 */
export function parseSpecialistType(labels: string[]): { type: SpecialistType } | { reason: string } {
  const specialistLabels = labels.filter((name) => name.startsWith(SPECIALIST_LABEL_PREFIX));
  if (specialistLabels.length === 0) {
    return { reason: `no ${SPECIALIST_LABEL_PREFIX}<type> label found` };
  }

  const typeLabels = specialistLabels.filter((name) =>
    SUPPORTED_SPECIALIST_TYPES.includes(name.slice(SPECIALIST_LABEL_PREFIX.length) as SpecialistType),
  );

  if (typeLabels.length === 0) {
    return {
      reason:
        `${specialistLabels.join(", ")} is not a supported specialist type. Supported: ` +
        `${SUPPORTED_SPECIALIST_TYPES.join(", ")}.`,
    };
  }
  if (typeLabels.length > 1) {
    return { reason: `story carries more than one specialist type label: ${typeLabels.join(", ")} — exactly one is required` };
  }

  return { type: typeLabels[0]!.slice(SPECIALIST_LABEL_PREFIX.length) as SpecialistType };
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
  const specialistResult = parseSpecialistType(labelNames);
  if ("reason" in specialistResult) {
    return { ok: false, reason: specialistResult.reason };
  }

  reqLog.trace(
    `story ${storyId}: specialistType=${specialistResult.type} epicId=${issue.parent.id} ` +
      `storyBranch=${issue.branchName} epicBranch=${issue.parent.branchName}`,
  );

  return {
    ok: true,
    context: {
      storyId: issue.id,
      storyBranch: issue.branchName,
      specialistType: specialistResult.type,
      epicId: issue.parent.id,
      epicBranch: issue.parent.branchName,
    },
  };
}

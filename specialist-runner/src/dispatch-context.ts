/**
 * The contract between this runner and whatever dispatches it —
 * `dispatch-worker/src/activities/dispatch-specialist.ts` calls `ecs:RunTask`
 * with these as container overrides. Fails fast, naming the missing var,
 * rather than partway through a run — same discipline as
 * `infrastructure/models/context.ts`'s `requireX` helpers, just over env vars
 * instead of a JSON context tree.
 */

// A surface is a place work happens — a repo, or a project inside one. The
// vocabulary is open (whatever this engagement actually has), not a fixed
// union, so this is a plain string alias, matching `dispatch-worker/src/
// activities/types.ts`'s own `Surface`.
export type Surface = string;

export interface DispatchContext {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;

  /** Every `surface:<name>` label the story carries — one or more. */
  readonly surfaces: Surface[];

  /** `org/name` on GitHub — the one repo this run writes to. */
  readonly surfaceRepo: string;
  readonly storyBranch: string;
  readonly epicBranch: string;

  /** `org/name` on GitHub for the framework repo. */
  readonly frameworkRepo: string;

  /** Git ref of the framework repo to clone. */
  readonly frameworkRef: string;

  /**
   * Hard cap on Agent SDK turns for this run. Required, not defaulted-and-
   * forgotten: the ledger is explicit that a session "does not time out on
   * its own," so a caller must set this deliberately.
   */
  readonly maxTurns: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} — the dispatching worker must set this as a RunTask override`);
  }
  return value;
}

/**
 * `SURFACES` is comma-separated because a story may carry more than one
 * `surface:` label (docs/design-ledger.md, 2026-08-08) — all resolving to
 * this same repo, so this runner still clones exactly one. No supported-list
 * check here: the surface vocabulary is open, and whether the epic actually
 * recognizes a given surface was already validated upstream, by
 * `dispatch-worker`'s `resolveRepoBase`, before this container was ever
 * launched.
 */
function requireSurfaces(name: string): Surface[] {
  const raw = requireEnv(name);
  const surfaces = raw
    .split(",")
    .map((surface) => surface.trim())
    .filter((surface) => surface.length > 0);
  if (surfaces.length === 0) {
    throw new Error(`${name}="${raw}" must name at least one surface`);
  }
  return surfaces;
}

function requireMaxTurns(name: string): number {
  const raw = requireEnv(name);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name}="${raw}" must be a positive number`);
  }
  return value;
}

export function loadDispatchContext(): DispatchContext {
  return {
    storyId: requireEnv("STORY_ID"),
    storyTitle: requireEnv("STORY_TITLE"),
    epicId: requireEnv("EPIC_ID"),
    surfaces: requireSurfaces("SURFACES"),
    surfaceRepo: requireEnv("SURFACE_REPO"),
    storyBranch: requireEnv("STORY_BRANCH"),
    epicBranch: requireEnv("EPIC_BRANCH"),
    frameworkRepo: requireEnv("FRAMEWORK_REPO"),
    frameworkRef: requireEnv("FRAMEWORK_REF"),
    maxTurns: requireMaxTurns("MAX_TURNS"),
  };
}

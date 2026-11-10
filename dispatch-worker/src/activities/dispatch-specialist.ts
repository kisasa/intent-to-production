/**
 * Starts the specialist for one story through whichever launcher this worker
 * was built with (`launchers/specialist-launcher.ts`). The per-dispatch
 * environment mirrors `specialist-runner/src/dispatch-context.ts`'s
 * documented contract exactly: whatever this activity doesn't set, that
 * runner fails fast on at startup, naming the missing var. `SURFACES`
 * carries every surface label the story carries, comma-joined — the
 * specialist itself is one generic definition (`agents/specialist.md`), so
 * what it needs to know is which surface(s) it may write in. `LOG_LEVEL` is
 * the one variable outside that contract: propagating this worker's own
 * level means the specialist's verbosity follows wherever the worker's is
 * set, without a second setting to keep in sync.
 */

import type { SpecialistEnvVar, SpecialistLauncher } from "../launchers/specialist-launcher.js";
import type { RepoBase } from "./resolve-surfaces.js";
import type { Surface } from "./types.js";

export interface DispatchSpecialistInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly surfaces: Surface[];
  readonly repoBase: RepoBase;
  /** Directory of each surface within the repo, from the registry, same order as `surfaces`. */
  readonly surfacePaths: readonly string[];
  /** Mandatory skills across the story's surfaces, from the registry; the runner inlines them. */
  readonly surfaceSkills: readonly string[];
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
  /** Present only on a revision round. Absent means this is the story's first build. */
  readonly revision?: RevisionAssignment;
}

/**
 * What a revision round tells the specialist: which PR, which review, and
 * where it sits in the round budget.
 *
 * The review itself is not passed — only its id. The specialist reads the
 * body and the inline comments from the PR the same way it reads the story
 * and the code, rather than working from a copy the app made.
 */
export interface RevisionAssignment {
  readonly round: number;
  readonly roundCap: number;
  readonly pullRequestNumber: number;
  readonly reviewId: number;
}

export function buildSpecialistEnvironment(input: DispatchSpecialistInput, logLevel: string): SpecialistEnvVar[] {
  // Names match specialist-runner/src/dispatch-context.ts's required vars
  // exactly — SURFACE_REPO is "org/name", not the full repoBase (the
  // specialist clones over HTTPS with its own GITHUB_TOKEN; it doesn't need
  // the host or ref). Revision vars are appended only on a revision round, so a first build's
  // environment is byte-identical to what it was before revisions existed —
  // the runner treats their absence as "this is a fresh build", which is the
  // one signal distinguishing the two modes.
  const revision = input.revision;
  const revisionEnvironment: SpecialistEnvVar[] = revision
    ? [
        { name: "REVISION_ROUND", value: String(revision.round) },
        { name: "REVISION_ROUND_CAP", value: String(revision.roundCap) },
        { name: "PULL_REQUEST_NUMBER", value: String(revision.pullRequestNumber) },
        { name: "REVIEW_ID", value: String(revision.reviewId) },
      ]
    : [];

  return [
    ...revisionEnvironment,
    { name: "STORY_ID", value: input.storyId },
    { name: "STORY_TITLE", value: input.storyTitle },
    { name: "EPIC_ID", value: input.epicId },
    { name: "SURFACES", value: input.surfaces.join(",") },
    { name: "SURFACE_REPO", value: `${input.repoBase.org}/${input.repoBase.repo}` },
    { name: "SURFACE_PATHS", value: input.surfacePaths.join(",") },
    { name: "SURFACE_SKILLS", value: input.surfaceSkills.join(",") },
    { name: "STORY_BRANCH", value: input.storyBranch },
    { name: "EPIC_BRANCH", value: input.epicBranch },
    { name: "MAX_TURNS", value: String(input.maxTurns) },
    { name: "LOG_LEVEL", value: logLevel },
  ];
}

export function createDispatchSpecialistActivity(launcher: SpecialistLauncher, logLevel: string) {
  return async function dispatchSpecialist(input: DispatchSpecialistInput): Promise<string> {
    return launcher.launch({ storyId: input.storyId, environment: buildSpecialistEnvironment(input, logLevel) });
  };
}

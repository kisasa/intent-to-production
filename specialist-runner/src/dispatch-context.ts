/**
 * The contract between this runner and whatever dispatches it —
 * `dispatch-worker/src/activities/dispatch-specialist.ts` calls `ecs:RunTask`
 * with these as container overrides. Fails fast, naming the missing var,
 * rather than partway through a run — same discipline as
 * `infrastructure/models/context.ts`'s `requireX` helpers, just over env vars
 * instead of a JSON context tree.
 */

import { envOr } from "./env.js";

export type SpecialistType = "backend" | "frontend" | "tests";

const SUPPORTED_SPECIALIST_TYPES: SpecialistType[] = ["backend", "frontend", "tests"];

export interface DispatchContext {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly specialistType: SpecialistType;

  /** `specialist-backend.md` / `specialist-frontend.md` — resolved from specialistType. */
  readonly specialistFile: string;

  /** `org/name` on GitHub — the one repo this run writes to. */
  readonly surfaceRepo: string;
  readonly storyBranch: string;
  readonly epicBranch: string;

  /** `org/name` on GitHub for the framework repo. Default `example-org/intent-to-production`. */
  readonly frameworkRepo: string;

  /** Git ref of the framework repo to clone. Default `main`. */
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

function requireSpecialistType(name: string): SpecialistType {
  const value = requireEnv(name);
  if (SUPPORTED_SPECIALIST_TYPES.includes(value as SpecialistType)) return value as SpecialistType;
  throw new Error(
    `${name}="${value}" is not a supported specialist type. Supported: ${SUPPORTED_SPECIALIST_TYPES.join(", ")} ` +
      `— e2e specialists are a tracked follow-up, not built here.`,
  );
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
  const specialistType = requireSpecialistType("SPECIALIST_TYPE");

  return {
    storyId: requireEnv("STORY_ID"),
    storyTitle: requireEnv("STORY_TITLE"),
    epicId: requireEnv("EPIC_ID"),
    specialistType: specialistType,
    specialistFile: `specialist-${specialistType}.md`,
    surfaceRepo: requireEnv("SURFACE_REPO"),
    storyBranch: requireEnv("STORY_BRANCH"),
    epicBranch: requireEnv("EPIC_BRANCH"),
    frameworkRepo: envOr("FRAMEWORK_REPO", "example-org/intent-to-production"),
    frameworkRef: envOr("FRAMEWORK_REF", "main"),
    maxTurns: requireMaxTurns("MAX_TURNS"),
  };
}

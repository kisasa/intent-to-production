/**
 * Shared across activities and the workflow. Same values as
 * `specialist-runner/src/dispatch-context.ts`'s `SpecialistType`. `e2e`
 * joined 2026-08-07 — the dispatch mechanics (dependency check, branch
 * creation, repo-base resolution) were already fully generic over
 * specialist type; the only thing blocking it was `specialist-e2e.md`
 * requiring the specialist to stand up and self-verify against a live
 * environment, which is gone now (see `docs/design-ledger.md`).
 */
export type SpecialistType = "backend" | "frontend" | "tests" | "e2e";

/**
 * Whoever moved the story to In-Process — webhook-listener's own TrackerActor,
 * re-declared here rather than imported since the two packages share no lib
 * (this repo's existing pattern). Carries `email` because that's the only
 * field `requestPullRequestReviewer` can resolve to a GitHub login through the
 * static mapping — `id`/`name` ride along for logging only.
 */
export interface StoryMover {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}

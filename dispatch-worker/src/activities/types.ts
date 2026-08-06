/**
 * Shared across activities and the workflow. Same two values as
 * `specialist-runner/src/dispatch-context.ts`'s `SpecialistType` — tests/e2e
 * aren't dispatched by this workflow, same scoping as that package.
 */
export type SpecialistType = "backend" | "frontend";

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

/**
 * Shared across activities and the workflow. Same values as
 * `specialist-runner/src/dispatch-context.ts`'s `SpecialistType` — e2e isn't
 * dispatched by this workflow yet (it needs an epic-branch environment
 * stand-up this workflow doesn't build), same scoping as that package.
 */
export type SpecialistType = "backend" | "frontend" | "tests";

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

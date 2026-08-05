/**
 * Shared across activities and the workflow. Same two values as
 * `specialist-runner/src/dispatch-context.ts`'s `SpecialistType` — tests/e2e
 * aren't dispatched by this workflow, same scoping as that package.
 */
export type SpecialistType = "backend" | "frontend";

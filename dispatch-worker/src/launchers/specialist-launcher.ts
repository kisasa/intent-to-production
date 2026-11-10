/**
 * The one place the worker touches whatever actually runs a specialist
 * container. The framework assumes no particular platform: it ships a Docker
 * launcher (`docker-launcher.ts`), and an operator running somewhere else
 * supplies their own implementation of this interface through `runWorker`
 * (`run-worker.ts`) instead of forking the activities.
 *
 * A handle is whatever string the launcher needs to find its container again
 * — a container id, a task ARN, a job name. The workflow carries it between
 * `dispatchSpecialist` and `awaitSpecialistTask` without ever reading it, so
 * it is recorded in workflow history as an opaque string.
 */

export interface SpecialistEnvVar {
  readonly name: string;
  readonly value: string;
}

export interface SpecialistLaunchRequest {
  /** For naming and labelling only; the specialist reads its story from `environment`. */
  readonly storyId: string;
  /** Per-dispatch variables, matching `specialist-runner/src/dispatch-context.ts`'s contract. */
  readonly environment: readonly SpecialistEnvVar[];
}

export interface SpecialistStatus {
  readonly stopped: boolean;
  /** Free text, heartbeated while running and useful in a stuck activity's details. */
  readonly detail: string;
}

export interface SpecialistLauncher {
  /** Starts one specialist container and returns its handle. */
  launch(request: SpecialistLaunchRequest): Promise<string>;
  describe(handle: string): Promise<SpecialistStatus>;
}

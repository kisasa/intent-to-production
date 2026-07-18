/**
 * The contract between tracker adapters and the pipeline. Adapters produce this;
 * everything downstream — swim-lane routing, agent activation — consumes it.
 * Nothing tracker-specific (no Linear types, no Jira fields) appears past this
 * boundary.
 *
 * Three event kinds, no more:
 *   label_added    → a human or agent applied a label. Drives first-pass activation
 *                     for lanes whose trigger is a specific label's presence
 *                     (Intake's `ready for intake`, Decompose's `spec:resolved`).
 *   status_changed  → the entity moved to a new status. Drives first-pass activation
 *                     for lanes whose trigger is entering a status — Specification,
 *                     whose first touch is additionally gated on the *absence* of
 *                     any `spec:*` label (checked in routing, not here).
 *   comment_added   → a human replied. Drives follow-up activation for whichever
 *                     lane's "awaiting" label(s) are currently present.
 *
 * `entityType` distinguishes Linear Projects (Intake's home) from Issues
 * (Specification's and Decompose's home) — the two tiers this pipeline drives
 * activation on. `entityTitle` is populated when the source payload carries it
 * directly; comment events on trackers that don't include it inline require the
 * adapter to fetch it separately (see adapters/linear.ts).
 */

export type EntityType = "project" | "issue";

export interface TrackerEvent {
  kind: "label_added" | "status_changed" | "comment_added";
  entityType: EntityType;
  entityId: string;
  entityTitle: string | null;
  status: string; // the entity's current status/state name
  labels: string[]; // the entity's current label set, post-event
  authorId: string | null; // populated for comment_added; null for label/status events
  addedLabels: string[]; // populated for label_added — every label newly applied in this event (usually one)
}

// "first" = the lane's first-touch trigger fired; agent activates fresh.
// "follow-up" = a human replied while the lane's awaiting-label(s) were present; the
// thread now contains the agent's prior activity and the human's reply.
export type Pass = "first" | "follow-up";

// traceId correlates this call back to the webhook delivery that caused it
// (see trace-id.ts) — carried through so a debounced follow-up's eventual
// activation still traces back to whichever reply reset the timer last.
export type AgentFn = (
  entityId: string,
  pass: Pass,
  entityTitle: string | null,
  traceId: string,
) => void | Promise<void>;

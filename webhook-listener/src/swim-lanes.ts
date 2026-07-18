/**
 * The pipeline's swim lane registry. Each lane pairs a trigger rule (when does
 * this agent wake) with an agent function (what runs when it does) — trigger
 * rules are a routing concern and live here, not in the agent's own config,
 * since they encode which label/status names this deployment's tracker uses.
 *
 * To add a lane: implement the agent's AgentLaneConfig under lanes/, then add
 * one entry below. No other file changes — this is what makes a fourth
 * (specialist) lane a registration, not a rearchitecture.
 */

import type { LaneConfig } from "./swim-lane-routing.js";
import { createActivationRunner } from "./activation-runner.js";
import { config as intakeConfig } from "./lanes/intake.js";
import { config as specificationConfig } from "./lanes/specification.js";
import { config as decomposeConfig } from "./lanes/decompose.js";

export const lanes: LaneConfig[] = [
  {
    name: intakeConfig.name,
    entityType: intakeConfig.entityType,
    agent: createActivationRunner(intakeConfig),
    // First touch: `ready for intake` applied to a Backlog project — a human act.
    firstPass: { on: "label_added", label: "ready for intake", statusRequired: "Backlog" },
    // Intake's own trigger section: follow-up fires on any reply while the label
    // is present, not a narrower awaiting-sub-label — `ask` leaves labels
    // untouched, so the label that gated first-pass is the same one that gates
    // every follow-up until `slice` swaps it for `ready for eval`.
    awaitingLabels: ["ready for intake"],
    statusRequiredForFollowUp: "Backlog",
  },
  {
    name: specificationConfig.name,
    entityType: specificationConfig.entityType,
    agent: createActivationRunner(specificationConfig),
    // The one absence-gated trigger in this table: an epic entering Evaluation
    // with no spec:* label yet — everything else here matches on presence.
    firstPass: { on: "status_entered", status: "Evaluation", requireLabelsAbsentPrefix: "spec:" },
    awaitingLabels: ["spec:awaiting-architect", "spec:awaiting-designer"],
    statusRequiredForFollowUp: "Evaluation",
  },
  {
    name: decomposeConfig.name,
    entityType: decomposeConfig.entityType,
    agent: createActivationRunner(decomposeConfig),
    // First touch: the Specification Agent applying spec:resolved — an agent's
    // own label change, not guarded by the self-comment filter (that guard
    // covers comments only; label changes are exactly how lanes hand off).
    firstPass: { on: "label_added", label: "spec:resolved", statusRequired: "Evaluation" },
    awaitingLabels: ["eval:awaiting-answers", "eval:awaiting-approval"],
    statusRequiredForFollowUp: "Evaluation",
  },
];

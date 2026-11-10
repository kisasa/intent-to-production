/**
 * Specification lane. First agent inside the Evaluation status — wakes when an
 * epic enters Evaluation with no `spec:*` label yet, and on architect/designer
 * replies once a map is drafted. Reads the codebase; produces the API map.
 */

import type { AgentLaneConfig } from "../agent-lane.js";
import { requireEnv } from "../env.js";

export const config: AgentLaneConfig = {
  name: "specification",
  entityType: "issue",
  agentFile: "specification-agent.md",
  skills: ["api-map-writing", "epic-writing", "tracker-writing"],
  codebaseAccess: true,
  attachmentScope: "epic",
  // Required per deployment, no code-level default — see
  // CLAUDE_MODEL_SPECIFICATION in webhook-listener/.env.example.
  model: requireEnv("CLAUDE_MODEL_SPECIFICATION"),
  templates: {
    first: "specification-kickoff.md",
    followUp: "specification-reply.md",
  },
  buildPlaceholders(_pass, entityId, entityTitle) {
    return {
      EPIC_TITLE: entityTitle ?? "(untitled)",
      EPIC_ID: entityId,
    };
  },
};

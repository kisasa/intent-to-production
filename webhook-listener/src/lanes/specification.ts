/**
 * Specification lane. First agent inside the Evaluation status — wakes when an
 * epic enters Evaluation with no `spec:*` label yet, and on architect/designer
 * replies once a map is drafted. Reads the codebase; produces the API map.
 */

import type { AgentLaneConfig } from "../agent-lane.js";

export const config: AgentLaneConfig = {
  name: "specification",
  entityType: "issue",
  agentFile: "specification-agent.md",
  skills: ["api-map-writing", "epic-writing"],
  codebaseAccess: true,
  model: "claude-sonnet-5",
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

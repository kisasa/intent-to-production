/**
 * The specialist-dispatch lane's `agent` function — not an Anthropic
 * activation (no `createActivationRunner` here), a Temporal workflow start.
 * Satisfies `AgentFn`'s signature so it registers into `swim-lanes.ts` like
 * any other lane (see `swim-lane-routing.ts`'s own claim: "adding a lane is a
 * registration, not a rearchitecture").
 *
 * What this does NOT do: re-run the dependency check. `checkDependencies`
 * already runs as `dispatchStoryWorkflow`'s own first activity and already
 * posts its own "Dispatch blocked" comment on failure
 * (`dispatch-worker/src/activities/check-dependencies.ts`, already built and
 * tested) — this trigger's only job is gathering input and starting the
 * workflow.
 *
 * What this does NOT do, named and deferred (docs/design-ledger.md,
 * "automated dispatch and BRD closure"): record the status-mover as
 * reviewer-of-record on the specialist's eventual PR. That needs a Linear
 * webhook field not yet confirmed against a live payload and touches three
 * packages — out of scope for this pass.
 */

import { WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import type { Client } from "@temporalio/client";
import { createLogger } from "./logger.js";
import type { AgentFn } from "./tracker-event.js";
import { fetchStoryDispatchContext, type SpecialistType } from "./story-context.js";
import trackerNotifier from "./tracker-notifier.js";

const log = createLogger("dispatch-trigger");

// Temporal resolves a workflow by its registered type name — a plain string,
// not an imported function reference. dispatch-worker and webhook-listener
// are separate npm packages with no shared lib (this repo's existing
// pattern), so the name and input shape below are deliberately mirrored, not
// imported, from dispatch-worker/src/workflows/dispatch-story-workflow.ts.
const WORKFLOW_TYPE = "dispatchStoryWorkflow";

// No existing mapping from the `tier` label to a turn count — story-contract.md
// is explicit that `tier` today only "informs a human's model choice," nothing
// mechanical. A fixed default, tunable here alongside activation-config.ts's
// own constants, until a real mapping is designed.
const DEFAULT_MAX_TURNS = 80;

interface DispatchStoryWorkflowInput {
  readonly storyId: string;
  readonly storyTitle: string;
  readonly epicId: string;
  readonly specialistType: SpecialistType;
  readonly storyBranch: string;
  readonly epicBranch: string;
  readonly maxTurns: number;
}

export interface DispatchTriggerConfig {
  readonly linearAgentApiKey: string;
  readonly linearApiUrl: string;
  readonly getClient: () => Promise<Client>;
  readonly taskQueue: () => string;
  readonly maxTurns?: number;
}

export function createDispatchTrigger(config: DispatchTriggerConfig): AgentFn {
  return async function dispatchTrigger(entityId: string, _pass, entityTitle: string | null, traceId: string) {
    const reqLog = log.child(traceId);
    reqLog.trace(`specialist-dispatch: gathering context for story ${entityId}`);

    const contextResult = await fetchStoryDispatchContext(entityId, config.linearAgentApiKey, config.linearApiUrl, traceId);
    if (!contextResult.ok) {
      reqLog.warn(`specialist-dispatch: story ${entityId} is not dispatchable — ${contextResult.reason}`);
      await trackerNotifier.postErrorComment(
        entityId,
        "issue",
        traceId,
        `This story could not be dispatched: ${contextResult.reason}.`,
      );
      return;
    }

    const input: DispatchStoryWorkflowInput = {
      storyId: contextResult.context.storyId,
      storyTitle: entityTitle ?? "(untitled)",
      epicId: contextResult.context.epicId,
      specialistType: contextResult.context.specialistType,
      storyBranch: contextResult.context.storyBranch,
      epicBranch: contextResult.context.epicBranch,
      maxTurns: config.maxTurns ?? DEFAULT_MAX_TURNS,
    };

    try {
      const client = await config.getClient();
      const handle = await client.workflow.start(WORKFLOW_TYPE, {
        workflowId: `dispatch-${entityId}`,
        taskQueue: config.taskQueue(),
        args: [input],
      });
      reqLog.info(`specialist-dispatch: started ${WORKFLOW_TYPE} for story ${entityId}, workflowId=${handle.workflowId}`);
    } catch (err) {
      if (err instanceof WorkflowExecutionAlreadyStartedError) {
        // Benign — a duplicate webhook delivery or a story bounced back and
        // forth into In-Process again while its dispatch is still running.
        // Not a failure worth a tracker comment.
        reqLog.trace(`specialist-dispatch: a dispatch workflow for story ${entityId} is already running — no-op`);
        return;
      }
      reqLog.error(`specialist-dispatch: failed to start ${WORKFLOW_TYPE} for story ${entityId}:`, err);
      await trackerNotifier.postErrorComment(
        entityId,
        "issue",
        traceId,
        `Dispatch could not start: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };
}

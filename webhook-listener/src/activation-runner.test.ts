import { describe, it, expect } from "vitest";
import { findMcpError, type ToolUseRecord } from "./activation-runner.js";

// Minimal content blocks — only the fields findMcpError reads.
function toolUse(id: string, name: string, input: Record<string, unknown> = {}) {
  return { type: "mcp_tool_use", id: id, name: name, input: input };
}
function toolResult(toolUseId: string, isError: boolean) {
  return { type: "mcp_tool_result", tool_use_id: toolUseId, is_error: isError, content: "result" };
}

describe("findMcpError", () => {
  it("returns null when nothing errored", () => {
    const content = [toolUse("t1", "get_issue"), toolResult("t1", false)];
    expect(findMcpError(content as never)).toBeNull();
  });

  it("ignores a failed read tool Claude recovered from (the observed false-positive case)", () => {
    // Real shape from a 2026-07-15 run: list_comments and get_document both
    // timed out; Claude tried other paths and still completed a real write
    // (save_comment, not shown here) — this must not be reported as a failure.
    const content = [
      toolUse("t1", "get_project"),
      toolResult("t1", false),
      toolUse("t2", "list_comments"),
      toolResult("t2", true),
      toolUse("t3", "get_document"),
      toolResult("t3", true),
      toolUse("t4", "save_comment"),
      toolResult("t4", false),
    ];
    expect(findMcpError(content as never)).toBeNull();
  });

  it("flags a failed write tool even if reads earlier succeeded", () => {
    const content = [
      toolUse("t1", "get_issue"),
      toolResult("t1", false),
      toolUse("t2", "save_comment"),
      toolResult("t2", true),
    ];
    expect(findMcpError(content as never)).not.toBeNull();
  });

  it("errs toward flagging when the tool name can't be resolved", () => {
    const content = [{ type: "mcp_tool_result", tool_use_id: "unknown", is_error: true, content: "boom" }];
    expect(findMcpError(content as never)).not.toBeNull();
  });

  it("ignores a failed write immediately retried against the same target and succeeded", () => {
    // Real shape from a 2026-07-17 run: a pause_turn boundary landed mid-argument-
    // stream on save_comment, corrupting its body field; Claude retried the same
    // call against the same issueId with corrected arguments and it succeeded.
    const content = [
      toolUse("t1", "save_comment", { issueId: "PROJ-19", body: { garbled: true } }),
      toolResult("t1", true),
      toolUse("t2", "save_comment", { issueId: "PROJ-19", body: "corrected text" }),
      toolResult("t2", false),
    ];
    expect(findMcpError(content as never)).toBeNull();
  });

  it("still flags a failed write when a later success targets a different entity", () => {
    // Decompose creating several stories: story A's save_issue fails, story B's
    // save_issue (a different target) succeeds — must not swallow A's failure.
    const content = [
      toolUse("t1", "save_issue", { issueId: "PROJ-30", title: "Story A" }),
      toolResult("t1", true),
      toolUse("t2", "save_issue", { issueId: "PROJ-31", title: "Story B" }),
      toolResult("t2", false),
    ];
    expect(findMcpError(content as never)).not.toBeNull();
  });

  it("recovers a write's target from an earlier round via the cross-round tool-use map", () => {
    // The corrupted call's own tool_use lives in a prior (already-pushed) round,
    // not in the final content array being scanned — findMcpError must still be
    // able to resolve its target through the caller-supplied map.
    const allToolUses = new Map<string, ToolUseRecord>([
      ["t1", { name: "save_comment", input: { issueId: "PROJ-19", body: { garbled: true } } }],
    ]);
    const finalContent = [
      toolResult("t1", true),
      toolUse("t2", "save_comment", { issueId: "PROJ-19", body: "corrected text" }),
      toolResult("t2", false),
    ];
    expect(findMcpError(finalContent as never, allToolUses)).toBeNull();
  });
});

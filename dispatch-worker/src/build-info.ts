// Mirrors webhook-listener/src/build-info.ts — the packages share no library,
// so a change to one belongs in the others.

/**
 * The commit this process was built from, so a running service can say which
 * code it is. The image build passes it in as BUILD_COMMIT; a process started
 * any other way reports "unknown".
 *
 * Observed 2026-10-23: the listener had been running for two weeks without the
 * evidence pre-load merged on 2026-10-07, and nothing the pipeline wrote could
 * show it (docs/design-ledger.md, 2026-10-23).
 */

export function buildCommitFrom(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.slice(0, 12) : "unknown";
}

export const BUILD_COMMIT = buildCommitFrom(process.env.BUILD_COMMIT);

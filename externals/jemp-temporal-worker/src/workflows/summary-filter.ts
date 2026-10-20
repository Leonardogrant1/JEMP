// Pure helper for the workflow's previous-session summaries. Lives in its own
// module so the workflow bundle pulls no IO imports. Excluding warmup/cooldown
// (instead of whitelisting primary/secondary/accessory) keeps legacy summaries
// identical while letting v2 pattern blocks (push/pull/...) through — otherwise
// v2 summaries are empty and the variety mechanism is dead (phase 2b review I1).
export const isSummaryBlock = (blockType: string): boolean =>
  blockType !== 'warmup' && blockType !== 'cooldown'

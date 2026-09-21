/**
 * Lifecycle of a usage event, in order:
 *   pending_settlement → settling → settled
 *
 * `settling` is an operator-held claim (see lib/settlement/execute.ts);
 * `settled` rows carry settled_tx_hash. Use these constants everywhere —
 * a typo'd literal here strands events in the settlement pipeline.
 */
export const USAGE_STATUS = {
  PENDING: "pending_settlement",
  SETTLING: "settling",
  SETTLED: "settled",
} as const;

export type UsageStatus = (typeof USAGE_STATUS)[keyof typeof USAGE_STATUS];

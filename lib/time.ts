/**
 * UTC spend windows — the single source of truth for daily/monthly billing
 * boundaries. Both enforcement (usage/track) and reporting (invoices,
 * dashboards) MUST read their windows from here so the two can never drift.
 */

export interface SpendWindow {
  start: string;
  end: string;
}

export function getUtcDayRange(now = new Date()): SpendWindow {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getUtcMonthRange(now = new Date()): SpendWindow {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
  return { start: start.toISOString(), end: end.toISOString() };
}

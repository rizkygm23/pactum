/**
 * Structured logging + request ids.
 *
 * One JSON line per event on stdout — greppable in Vercel logs and any
 * log aggregator. Bigints serialize as strings automatically.
 *
 * Level threshold: set LOG_LEVEL (debug|info|warn|error), default "info".
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL: number =
  LEVELS[(process.env.LOG_LEVEL as Level | undefined) ?? "info"] ?? LEVELS.info;

function emit(level: Level, message: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(fields ?? {}),
  };
  const line = JSON.stringify(entry, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function log(level: Level, message: string, fields?: Record<string, unknown>) {
  emit(level, message, fields);
}

/** Correlates all log lines of one request. */
export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}

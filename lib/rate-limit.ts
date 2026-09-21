/**
 * Fixed-window in-memory rate limiter. Sufficient for the testnet demo —
 * per-instance only (resets on restart, not shared across serverless
 * instances), which is acceptable for brute-force slowing on auth routes.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
// Bound the map so unique-IP floods cannot grow memory indefinitely.
const MAX_BUCKETS = 10_000;

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_BUCKETS) {
      // Evict the oldest inserted entries (Map preserves insertion order)
      const evict = Math.floor(MAX_BUCKETS / 10);
      let removed = 0;
      for (const oldest of buckets.keys()) {
        buckets.delete(oldest);
        if (++removed >= evict) break;
      }
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

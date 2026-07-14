// Lightweight, dependency-free rate limiter (fixed-window per key).
//
// NOTE: state lives in process memory, so on serverless it is PER-INSTANCE, not
// global. It's a cheap guardrail against runaway loops / accidental hammering
// from a single warm instance, layered under the durable monthly plan cap
// (see src/lib/billing/limits.ts). For strict distributed limiting, back this
// with Upstash Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();

  // Opportunistically purge expired buckets to bound memory.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, limit, resetAt };
  }

  existing.count += 1;
  return {
    success: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    limit,
    resetAt: existing.resetAt,
  };
}

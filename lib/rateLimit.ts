/**
 * Small in-memory fixed-window limiter. On serverless platforms each instance has its own
 * memory, so this is a best-effort brake against abuse; put Cloudflare/Vercel WAF rules in front for hard limits.
 */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.reset < now) { buckets.set(key, { count: 1, reset: now + windowMs }); return true; }
  b.count += 1;
  return b.count <= limit;
}

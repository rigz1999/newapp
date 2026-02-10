// ============================================
// In-memory rate limiter for Edge Functions
// Uses a sliding window counter per key (IP or user ID)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 60 seconds to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60_000);

interface RateLimitOptions {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check if a request is allowed under the rate limit.
 * @param key - Unique identifier (IP address, user ID, etc.)
 * @param options - Rate limit configuration
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const entry = store.get(key);

  // No existing entry or window expired — allow and start fresh
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: options.maxRequests - 1, retryAfterSeconds: 0 };
  }

  // Within window — check count
  if (entry.count < options.maxRequests) {
    entry.count++;
    return { allowed: true, remaining: options.maxRequests - entry.count, retryAfterSeconds: 0 };
  }

  // Rate limited
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds };
}

/**
 * Extract client IP from request headers (works behind proxies/CDNs).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Build a 429 Too Many Requests response with CORS headers.
 */
export function rateLimitResponse(retryAfterSeconds: number, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Trop de tentatives. Veuillez réessayer plus tard.' }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
      },
    }
  );
}

/**
 * Edge-compatible in-memory rate limiter using a sliding window approach.
 * This is suitable for single-instance deployments (Vercel Edge, etc).
 * For multi-instance deployments, use a distributed store like Upstash Redis.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 60 seconds
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;

    for (const [key, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}

/**
 * Check rate limit for a given identifier (e.g. IP address).
 * @param identifier - Unique identifier for the client (IP, user ID, etc.)
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { success: boolean, remaining: number, resetIn: number }
 */
export function rateLimit(
    identifier: string,
    maxRequests: number = 5,
    windowMs: number = 60_000 // 1 minute
): { success: boolean; remaining: number; resetIn: number } {
    cleanup();

    const now = Date.now();
    const entry = rateLimitMap.get(identifier);

    if (!entry || now > entry.resetTime) {
        // First request or window expired
        rateLimitMap.set(identifier, {
            count: 1,
            resetTime: now + windowMs,
        });
        return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
    }

    if (entry.count >= maxRequests) {
        // Rate limit exceeded
        const resetIn = entry.resetTime - now;
        return { success: false, remaining: 0, resetIn };
    }

    // Increment count
    entry.count++;
    const resetIn = entry.resetTime - now;
    return { success: true, remaining: maxRequests - entry.count, resetIn };
}

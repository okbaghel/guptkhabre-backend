import { getRedis } from "../lib/redis.js";

/**
 * Fixed-window rate limiter backed by Redis INCR + EXPIRE.
 * Two commands per request — minimal round-trip cost.
 * If Redis is unavailable the middleware calls next() immediately (fail-open).
 *
 * @param {{ windowSec: number, maxRequests: number, keyPrefix: string, message?: string }} opts
 */
function createRateLimiter({ windowSec, maxRequests, keyPrefix, message }) {
  return async (req, res, next) => {
    const redis = getRedis();
    if (!redis) return next(); // Redis down → allow all traffic

    const ip  = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `rl:${keyPrefix}:${ip}`;

    try {
      const count = await redis.incr(key);

      if (count === 1) {
        // First hit in this window — stamp the expiry so the key is cleaned up
        // automatically even if the process crashes before the window ends.
        await redis.expire(key, windowSec);
      }

      if (count > maxRequests) {
        const ttl = await redis.ttl(key);
        return res.status(429).json({
          msg:        message || "Too many requests. Please try again later.",
          retryAfter: ttl > 0 ? ttl : windowSec,
        });
      }

      // Inform the client how many requests remain
      res.setHeader("X-RateLimit-Limit",     maxRequests);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));

      next();
    } catch (err) {
      // Redis error → fail open so a cache blip never breaks the site
      console.warn("[RateLimit] Redis error:", err.message);
      next();
    }
  };
}

// ── Pre-configured limiters ───────────────────────────────────────────────────

/** 5 login attempts per 15 minutes — brute-force protection */
export const loginLimiter = createRateLimiter({
  windowSec:   15 * 60,
  maxRequests: 5,
  keyPrefix:   "login",
  message:     "Too many login attempts. Please try again in 15 minutes.",
});

/** 10 likes per minute — prevents like-spam without blocking real users */
export const likeLimiter = createRateLimiter({
  windowSec:   60,
  maxRequests: 10,
  keyPrefix:   "like",
  message:     "Too many like requests. Please slow down.",
});

/** 3 contact-form submissions per 10 minutes — anti-spam */
export const contactLimiter = createRateLimiter({
  windowSec:   10 * 60,
  maxRequests: 3,
  keyPrefix:   "contact",
  message:     "Too many enquiries submitted. Please wait before trying again.",
});

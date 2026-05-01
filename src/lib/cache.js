import { getRedis } from "./redis.js";

const PREFIX = "gk:";
const DEBUG  = process.env.NODE_ENV !== "production";

// ── Internal helpers ─────────────────────────────────────────────────────────

const k = (key) => `${PREFIX}${key}`;

// ── Low-level ops ─────────────────────────────────────────────────────────────

export async function cacheGet(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(k(key));
    if (raw === null) {
      if (DEBUG) console.log(`[CACHE MISS] ${key}`);
      return null;
    }
    if (DEBUG) console.log(`[CACHE HIT]  ${key}`);
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache] GET "${key}":`, err.message);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(k(key), JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.warn(`[Cache] SET "${key}":`, err.message);
  }
}

export async function cacheDel(key) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(k(key));
    if (DEBUG) console.log(`[CACHE DEL]  ${key}`);
  } catch (err) {
    console.warn(`[Cache] DEL "${key}":`, err.message);
  }
}

/**
 * Delete every key whose name matches a glob pattern.
 * Uses SCAN (cursor-based) instead of KEYS so it never blocks Redis.
 * Pattern is relative to the prefix, e.g. "posts:*"
 */
export async function cacheDelPattern(pattern) {
  const redis = getRedis();
  if (!redis) return;
  const fullPattern = `${PREFIX}${pattern}`;
  let deleted = 0;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(
        cursor, "MATCH", fullPattern, "COUNT", 100
      );
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== "0");
    if (DEBUG && deleted > 0)
      console.log(`[CACHE DEL PATTERN] ${pattern} → ${deleted} key(s)`);
  } catch (err) {
    console.warn(`[Cache] DEL pattern "${pattern}":`, err.message);
  }
}

// ── Cache-aside ───────────────────────────────────────────────────────────────

/**
 * Check cache → on miss run `fn` → store result → return.
 * Falls back to calling `fn` directly if Redis is unavailable.
 *
 * @param {string}           key  Cache key (without prefix)
 * @param {number}           ttl  TTL in seconds
 * @param {() => Promise<*>} fn   Async data fetcher
 */
export async function withCache(key, ttl, fn) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;

  const data = await fn();
  // Fire-and-forget the write so the response is not delayed by a slow Redis
  cacheSet(key, data, ttl).catch(() => {});
  return data;
}

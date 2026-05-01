import Redis from "ioredis";

let _redis = undefined; // undefined = not yet initialised

/**
 * Returns the shared ioredis client, or null if Redis is not configured /
 * not reachable.  Never throws — callers should treat null as "no cache".
 */
export function getRedis() {
  if (_redis !== undefined) return _redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.info("[Redis] REDIS_URL not set — caching and rate-limiting disabled");
    _redis = null;
    return null;
  }

  _redis = new Redis(url, {
    // Each command gets one automatic retry; if it still fails, throw so the
    // caller's try/catch can handle it gracefully.
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
    // Back off: 200 ms, 400 ms, 600 ms — then give up to avoid hammering a
    // down server and slowing every request.
    retryStrategy: (times) => (times < 3 ? times * 200 : null),
    // Silence the default "unhandled rejection" on reconnect failures.
    enableOfflineQueue: false,
  });

  _redis.on("error",  (err) => console.warn("[Redis]", err.message));
  _redis.on("ready",  ()    => console.log("[Redis] Connected ✓"));
  _redis.on("close",  ()    => console.info("[Redis] Connection closed"));

  return _redis;
}

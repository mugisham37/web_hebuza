// 'use cache' handler (next.config cacheHandlers.default). REDIS_URL set (runtime) → entries + tag invalidations shared
// across web replicas in Redis; unset → Next's own in-memory LRU (same as no handler, 50 MB = cacheMaxMemorySize default).
const {
  createDefaultCacheHandler,
} = require("next/dist/server/lib/cache-handlers/default");

if (!process.env.REDIS_URL) {
  module.exports = createDefaultCacheHandler(50 * 1024 * 1024);
} else {
  const Redis = require("ioredis");
  const redis = new Redis(process.env.REDIS_URL, {
    keyPrefix: "next:",
    maxRetriesPerRequest: 1,
  });
  redis.on("error", () => {}); // a Redis outage degrades to cache misses, never a crash
  const tags = new Map(); // tag → { stale, expired } (ms), synced from Redis in refreshTags

  module.exports = {
    async get(key) {
      try {
        const raw = await redis.getBuffer(`e:${key}`);
        if (!raw) return undefined;
        const e = JSON.parse(raw.toString());
        let revalidate = e.revalidate;
        for (const t of e.tags) {
          const { stale = 0, expired = 0 } = tags.get(t) ?? {};
          if (expired > e.timestamp && expired <= Date.now()) return undefined;
          if (stale > e.timestamp) revalidate = -1;
        }
        const bytes = Buffer.from(e.value, "base64");
        return {
          ...e,
          revalidate,
          value: new ReadableStream({
            start(c) {
              c.enqueue(bytes);
              c.close();
            },
          }),
        };
      } catch {
        return undefined;
      }
    },
    async set(key, pending) {
      try {
        const e = await pending;
        const value = Buffer.from(
          await new Response(e.value).arrayBuffer(),
        ).toString("base64");
        const body = JSON.stringify({ ...e, value });
        if (Number.isFinite(e.expire))
          await redis.set(
            `e:${key}`,
            body,
            "EX",
            Math.max(1, Math.ceil(e.expire)),
          );
        else await redis.set(`e:${key}`, body);
      } catch {
        /* lost entry → next request re-renders */
      }
    },
    async refreshTags() {
      try {
        const all = await redis.hgetall("tags");
        for (const [t, v] of Object.entries(all)) tags.set(t, JSON.parse(v));
      } catch {
        /* keep last known tag state */
      }
    },
    async getExpiration(ts) {
      return Math.max(...ts.map((t) => tags.get(t)?.expired ?? 0), 0);
    },
    async updateTags(ts, durations) {
      const now = Date.now();
      const m = redis.multi();
      for (const t of ts) {
        const v = { ...(tags.get(t) ?? {}) };
        if (durations) {
          v.stale = now;
          if (durations.expire !== undefined)
            v.expired = now + durations.expire * 1000;
        } else v.expired = now;
        tags.set(t, v);
        m.hset("tags", t, JSON.stringify(v));
      }
      await m.exec();
    },
  };
}

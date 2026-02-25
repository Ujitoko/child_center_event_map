const fs = require("fs");
const { parseYmdFromJst } = require("./date-utils");
const { saveGeoCache } = require("./geo-utils");

function loadSnapshot(snapshotPath) {
  try {
    const raw = fs.readFileSync(snapshotPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSnapshot(snapshotPath, data) {
  try {
    const dir = require("path").dirname(snapshotPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(data), "utf8");
  } catch (e) {
    console.warn("[snapshot] save failed:", e.message || e);
  }
}

async function batchCollect(fns, size) {
  const results = [];
  for (let i = 0; i < fns.length; i += size) {
    const batch = await Promise.all(fns.slice(i, i + size).map(async (f, j) => {
      try {
        return await f();
      } catch (e) {
        console.error(`[batchCollect] collector #${i + j} failed:`, e.message, e.stack?.split("\n")[1]);
        return [];
      }
    }));
    results.push(...batch);
  }
  return results;
}

function createGetEvents(deps) {
  const { CACHE_TTL_MS, cache, snapshotPath, geoCache, geoCachePath, collectors } = deps;

  return async function getEvents(maxDays, refresh) {
  const days = Math.min(Math.max(Number(maxDays) || 30, 1), 90);
  const cacheKey = `jidokan:${days}`;

  // Normal user access: return cached data only, never scrape
  if (!refresh) {
    if (cache.data && cache.key === cacheKey) {
      return {
        ...cache.data,
        from_cache: true,
        snapshot_saved_at: new Date(cache.savedAt).toISOString(),
      };
    }
    if (snapshotPath) {
      const snapshot = loadSnapshot(snapshotPath);
      if (snapshot) {
        cache.key = cacheKey;
        cache.data = snapshot;
        cache.savedAt = Date.now();
        console.log("[snapshot] loaded from disk:", snapshotPath);
        return {
          ...snapshot,
          from_cache: true,
          snapshot_saved_at: new Date(cache.savedAt).toISOString(),
        };
      }
    }
    return {
      date_jst: "",
      count: 0,
      source: "tokyo_jidokan",
      items: [],
      debug_counts: { raw: {} },
      from_cache: true,
      snapshot_saved_at: null,
    };
  }

  // refresh=1 (cron only): actually scrape
  const memBefore = process.memoryUsage();
  console.log(`[refresh] start — heap: ${Math.round(memBefore.heapUsed / 1024 / 1024)}MB, rss: ${Math.round(memBefore.rss / 1024 / 1024)}MB, geoCache: ${geoCache?.size || 0}`);

  const allCollectorResults = await batchCollect(
    collectors.map(fn => () => fn(days)),
    3
  );
  const memAfter = process.memoryUsage();
  console.log(`[refresh] done — heap: ${Math.round(memAfter.heapUsed / 1024 / 1024)}MB, rss: ${Math.round(memAfter.rss / 1024 / 1024)}MB, geoCache: ${geoCache?.size || 0}`);
  // Flatten all collector results into a single array.
  // Most collectors return an array; additional-wards returns an object of arrays.
  const rawItems = [];
  for (const result of allCollectorResults) {
    if (Array.isArray(result)) {
      rawItems.push(...result);
    } else if (result && typeof result === "object") {
      for (const arr of Object.values(result)) {
        if (Array.isArray(arr)) rawItems.push(...arr);
      }
    }
  }
  const items = rawItems
    .map((ev) => {
      const { point, query_hit, recently_updated, ...rest } = ev;
      if (typeof rest.time_unknown === "boolean") return rest;
      let inferredUnknown = false;
      if (!rest.ends_at && rest.starts_at) {
        const d = new Date(rest.starts_at);
        if (!Number.isNaN(d.getTime())) {
          const hm = new Intl.DateTimeFormat("ja-JP", {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(d);
          inferredUnknown = hm === "00:00";
        }
      }
      return { ...rest, time_unknown: inferredUnknown };
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const now = parseYmdFromJst(new Date());
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + days);
  const endJst = parseYmdFromJst(end);

  const payload = {
    date_jst: `${now.key}..${endJst.key}`,
    count: items.length,
    source: "tokyo_jidokan",
    debug_counts: {
      raw: (() => {
        const counts = {};
        for (const ev of rawItems) {
          const key = ev.source || "unknown";
          counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
      })(),
    },
    items,
    refresh_in_progress: false,
  };

  cache.key = cacheKey;
  cache.data = payload;
  cache.savedAt = Date.now();

  if (snapshotPath) saveSnapshot(snapshotPath, payload);
  if (geoCachePath && geoCache) saveGeoCache(geoCachePath, geoCache);

  return {
    ...payload,
    from_cache: false,
    snapshot_saved_at: new Date(cache.savedAt).toISOString(),
  };
};
}

module.exports = {
  createGetEvents,
};

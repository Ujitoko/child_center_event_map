#!/usr/bin/env node
// scripts/collect.js — GitHub Actions用スタンドアロン収集スクリプト
// server.js のコレクター配線を再利用し、batchCollect + 後処理 + ファイル書き出しを行う

const fs = require("fs");
const path = require("path");
const { collectors, geoCache, GEO_CACHE_PATH, SNAPSHOT_PATH,
        REGION_GROUPS, PREF_CENTERS, buildSourceToPrefMap, _wardsExports } = require("../server");
const { batchCollect } = require("../src/server/events-service");
const { parseYmdFromJst } = require("../src/server/date-utils");
const { saveGeoCache } = require("../src/server/geo-utils");

async function main() {
  const days = 90;
  const outputDir = path.join(__dirname, "..", "public", "data");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[collect] ${collectors.length} collectors, days=${days}`);

  // 収集実行 (concurrency=2, 300s timeout — events-service.js と同じ)
  const allResults = await batchCollect(
    collectors.map(fn => () => fn(days)), 2
  );

  // Flatten (events-service.js runRefresh と同じロジック)
  const rawItems = [];
  for (const result of allResults) {
    if (Array.isArray(result)) rawItems.push(...result);
    else if (result && typeof result === "object") {
      for (const arr of Object.values(result)) {
        if (Array.isArray(arr)) rawItems.push(...arr);
      }
    }
  }

  // time_unknown推定 + sort
  const items = rawItems.map(ev => {
    const { point, query_hit, recently_updated, ...rest } = ev;
    if (typeof rest.time_unknown === "boolean") return rest;
    let inferredUnknown = false;
    if (!rest.ends_at && rest.starts_at) {
      const d = new Date(rest.starts_at);
      if (!Number.isNaN(d.getTime())) {
        const hm = new Intl.DateTimeFormat("ja-JP", {
          timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false,
        }).format(d);
        inferredUnknown = hm === "00:00";
      }
    }
    return { ...rest, time_unknown: inferredUnknown };
  }).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  const now = parseYmdFromJst(new Date());
  const end = new Date(); end.setUTCDate(end.getUTCDate() + days);
  const endJst = parseYmdFromJst(end);

  const payload = {
    date_jst: `${now.key}..${endJst.key}`,
    count: items.length,
    source: "tokyo_jidokan",
    debug_counts: { raw: (() => {
      const counts = {};
      for (const ev of rawItems) counts[ev.source || "unknown"] = (counts[ev.source || "unknown"] || 0) + 1;
      return counts;
    })() },
    items,
  };

  // 書き出し
  const eventsPath = path.join(outputDir, "events.json");
  const metadataPath = path.join(outputDir, "metadata.json");

  fs.writeFileSync(eventsPath, JSON.stringify(payload), "utf8");
  console.log(`[collect] events.json: ${items.length} items (${(fs.statSync(eventsPath).size / 1024 / 1024).toFixed(1)}MB)`);

  const metadata = {
    regions: REGION_GROUPS,
    pref_centers: PREF_CENTERS,
    source_to_pref: buildSourceToPrefMap(_wardsExports),
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata), "utf8");

  // data/ にもスナップショット保存 (gitコミット用)
  const dataDir = path.dirname(SNAPSHOT_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(payload), "utf8");

  // geo_cache 保存
  saveGeoCache(GEO_CACHE_PATH, geoCache);

  console.log(`[collect] Done. ${items.length} events, geo_cache: ${geoCache.size} entries`);
}

main().catch(e => { console.error("[collect] FATAL:", e); process.exit(1); });

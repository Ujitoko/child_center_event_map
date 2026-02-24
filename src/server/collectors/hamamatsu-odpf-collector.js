/**
 * 浜松市 ODPF（オープンデータプラットフォーム）コレクター
 * S3 JSON エンドポイントからイベントデータを一括取得。
 *
 * データ形式: JSON配列、[0]がヘッダー行、[1]以降がデータ行。
 * ヘッダーインデックス:
 *   4:イベント名, 7:開始日, 8:終了日, 9:開始時間, 10:終了時間,
 *   19:場所名称, 20:住所, 22:緯度, 23:経度, 30:URL, 32:カテゴリー, 33:区
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DATA_URL = "https://prd-hmpf-s3-odpf-01.s3.ap-northeast-1.amazonaws.com/opendata/v01/221309_hamamatsu_event/221309_hamamatsu_event.json";

// Column indices (from header row)
const COL = {
  NAME: 4,
  START_DATE: 7,
  END_DATE: 8,
  START_TIME: 9,
  END_TIME: 10,
  PLACE: 19,
  ADDRESS: 20,
  LAT: 22,
  LNG: 23,
  URL: 30,
  CATEGORY: 32,
  WARD: 33,
};

function createHamamatsuOdpfCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHamamatsuOdpfEvents(maxDays) {
    let allRows;
    try {
      const json = await fetchText(DATA_URL);
      allRows = JSON.parse(json);
      if (!Array.isArray(allRows) || allRows.length < 2) return [];
    } catch (e) {
      console.warn(`[${label}] ODPF fetch failed:`, e.message || e);
      return [];
    }

    // Skip header row
    const rows = allRows.slice(1);

    // Filter: こそだて category only
    const childRows = rows.filter((r) => r[COL.CATEGORY] === "こそだて");

    const byId = new Map();

    for (const r of childRows) {
      const title = (r[COL.NAME] || "").trim();
      if (!title) continue;

      // Parse date "2026-03-19"
      const dateStr = r[COL.START_DATE] || "";
      const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (!dateMatch) continue;

      const dd = { y: Number(dateMatch[1]), mo: Number(dateMatch[2]), d: Number(dateMatch[3]) };
      if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

      // Time
      const startTime = r[COL.START_TIME] || "";
      const endTime = r[COL.END_TIME] || "";
      const stMatch = startTime.match(/(\d{1,2}):(\d{2})/);
      const etMatch = endTime.match(/(\d{1,2}):(\d{2})/);
      const timeRange = stMatch ? {
        startH: Number(stMatch[1]),
        startM: Number(stMatch[2]),
        endH: etMatch ? Number(etMatch[1]) : null,
        endM: etMatch ? Number(etMatch[2]) : null,
      } : null;

      // Venue & address
      const venue = sanitizeVenueText(r[COL.PLACE] || "");
      const address = sanitizeAddressText(r[COL.ADDRESS] || "");

      // Pre-geocoded coordinates
      const rawLat = r[COL.LAT];
      const rawLng = r[COL.LNG];
      let point = null;
      if (rawLat && rawLng) {
        const lat = Number(rawLat);
        const lng = Number(rawLng);
        if (lat > 30 && lat < 40 && lng > 130 && lng < 142) {
          point = { lat, lng };
        }
      }

      // Fallback geocoding if no coords
      if (!point) {
        const candidates = [];
        if (address) candidates.push(address.includes("浜松") ? address : `静岡県${address}`);
        if (venue) candidates.push(`静岡県浜松市 ${venue}`);
        point = await geocodeForWard(candidates.slice(0, 3), source);
      }

      point = resolveEventPoint(source, venue, point, address || `静岡県浜松市 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `静岡県浜松市 ${venue}`, point);

      const eventUrl = r[COL.URL] || "";
      const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
      const id = `${srcKey}:${eventUrl || dateKey}:${title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddress || "",
        url: eventUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHamamatsuOdpfCollector };

/**
 * はぐみんNet (愛知県) イベントコレクター
 * https://hagumin-net.pref.aichi.jp/event/
 *
 * 愛知県子育て支援情報ポータル。
 * 静的JSON (/_json/events.j) から全イベントを取得。
 * ~10-20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const JSON_URL = "https://hagumin-net.pref.aichi.jp/_json/events.j";
const DETAIL_BASE = "https://hagumin-net.pref.aichi.jp/event/detail/";

/**
 * "2026/3/22 13:00" → { y, mo, d, hour, minute }
 */
function parseDatetime(str) {
  if (!str) return null;
  const m = str.match(/(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return {
    y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]),
    hour: m[4] != null ? Number(m[4]) : null,
    minute: m[5] != null ? Number(m[5]) : null,
  };
}

function createHaguminAichiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHaguminAichiEvents(maxDays) {
    let items;
    try {
      const raw = await fetchText(JSON_URL);
      if (!raw) {
        console.log(`[${label}] 0 events collected (fetch failed)`);
        return [];
      }
      const data = JSON.parse(raw);
      items = data.item;
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`[${label}] 0 events collected (no items in JSON)`);
        return [];
      }
    } catch {
      console.log(`[${label}] 0 events collected (parse error)`);
      return [];
    }

    const byId = new Map();

    for (const item of items) {
      const title = stripTags(item.event || "").trim();
      if (!title) continue;

      const startDt = parseDatetime(item.start);
      if (!startDt) continue;
      if (!inRangeJst(startDt.y, startDt.mo, startDt.d, maxDays)) continue;

      const endDt = parseDatetime(item.end);
      const eventUrl = `${DETAIL_BASE}${item.id}`;

      // 会場
      const rawLocation = stripTags((item.location || "").replace(/<br\s*\/?>/gi, " ")).trim();
      const venueName = sanitizeVenueText(rawLocation);

      // 住所: summary内や sponsor_n から抽出を試みる
      let address = "";
      const summaryText = stripTags((item.summary || "").replace(/<br\s*\/?>/gi, " "));
      const addrM = summaryText.match(/(愛知県[^\s,、。）)]+)/);
      if (addrM) {
        address = sanitizeAddressText(addrM[1]);
      }

      // ジオコード
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`愛知県 ${venueName}`);
      if (candidates.length === 0) candidates.push("愛知県名古屋市");
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address || "愛知県");
      const resolvedAddress = resolveEventAddress(source, venueName, address, point);

      // 時間
      let timeRange = null;
      if (startDt.hour != null) {
        timeRange = { startHour: startDt.hour, startMinute: startDt.minute || 0 };
        if (endDt && endDt.hour != null) {
          timeRange.endHour = endDt.hour;
          timeRange.endMinute = endDt.minute || 0;
        }
      }

      const dateKey = `${startDt.y}${String(startDt.mo).padStart(2, "0")}${String(startDt.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(startDt, timeRange);
      const id = `${srcKey}:${eventUrl}:${title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: resolvedAddress || "",
        url: eventUrl,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHaguminAichiCollector };

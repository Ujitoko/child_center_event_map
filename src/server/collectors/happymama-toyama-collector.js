/**
 * はっぴーママ富山 イベントコレクター
 * https://www.hapima-toyama.co.jp/event/
 *
 * 富山県の子育てイベントポータル (WordPress)。
 * WP REST API でイベントID一覧を取得し、詳細ページから構造化データを抽出。
 * ~20 events/month (全て子ども向け)
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const API_BASE = "https://www.hapima-toyama.co.jp/wp-json/wp/v2/event";
const DETAIL_BATCH = 5;

/** 詳細ページから構造化データを抽出 */
function parseDetailPage(html) {
  const meta = {};
  if (!html) return meta;
  // <p class="event-date">3月1日（日）</p>
  const dateM = html.match(/<p\s+class="event-date"[^>]*>([\s\S]*?)<\/p>/i);
  if (dateM) meta.dateText = stripTags(dateM[1]).replace(/\s+/g, " ").trim();
  // <p class="event-time">10時半～11時45分</p>
  const timeM = html.match(/<p\s+class="event-time"[^>]*>([\s\S]*?)<\/p>/i);
  if (timeM) meta.timeText = stripTags(timeM[1]).replace(/\s+/g, " ").trim();
  // <p class="event-location">滑川市児童館</p>
  const locM = html.match(/<p\s+class="event-location"[^>]*>([\s\S]*?)<\/p>/i);
  if (locM) meta.venue = stripTags(locM[1]).replace(/\s+/g, " ").trim();
  return meta;
}

/** 日付テキストから年月日を抽出 (年なしの場合は現在年で推定) */
function parseDates(text, refYear) {
  if (!text) return [];
  const dates = [];
  // "3月1日" or "2026年3月1日"
  const withYear = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (withYear) {
    dates.push({ y: Number(withYear[1]), mo: Number(withYear[2]), d: Number(withYear[3]) });
  } else {
    const noYear = text.match(/(\d{1,2})月(\d{1,2})日/);
    if (noYear) {
      const mo = Number(noYear[1]);
      const d = Number(noYear[2]);
      // 1-3月 → current year or next year depending on reference
      const y = mo < refYear.mo - 6 ? refYear.y + 1 : refYear.y;
      dates.push({ y, mo, d });
    }
  }
  // 範囲日付: "2月28日(土)～3月4日(水)"
  const rangeM = text.match(/(\d{1,2})月(\d{1,2})日[（(][^）)]*[）)]\s*[～〜-]\s*(\d{1,2})月(\d{1,2})日/);
  if (rangeM && dates.length <= 1) {
    const mo1 = Number(rangeM[1]), d1 = Number(rangeM[2]);
    const mo2 = Number(rangeM[3]), d2 = Number(rangeM[4]);
    const y1 = mo1 < refYear.mo - 6 ? refYear.y + 1 : refYear.y;
    const y2 = mo2 < refYear.mo - 6 ? refYear.y + 1 : refYear.y;
    const startDate = new Date(y1, mo1 - 1, d1);
    const endDate = new Date(y2, mo2 - 1, d2);
    const result = [];
    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      result.push({ y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() });
    }
    return result;
  }
  return dates;
}

function createHappymamaToyamaCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHappymamaToyamaEvents(maxDays) {
    // WP REST API でイベント一覧取得
    let apiEvents;
    try {
      const jsonText = await fetchText(`${API_BASE}?per_page=100&_fields=id,title,link`);
      apiEvents = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] API fetch failed:`, e.message || e);
      return [];
    }
    if (!Array.isArray(apiEvents) || apiEvents.length === 0) return [];

    // 現在の年月 (JST)
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const refYear = { y: Number(parts.find(p => p.type === "year").value), mo: Number(parts.find(p => p.type === "month").value) };

    // 詳細ページをバッチ取得
    const detailMap = new Map();
    const links = apiEvents.map(ev => ev.link).filter(Boolean);
    for (let i = 0; i < links.length; i += DETAIL_BATCH) {
      const batch = links.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of apiEvents) {
      const detail = detailMap.get(ev.link) || {};
      const meta = detail.meta || {};

      const dates = parseDates(meta.dateText, refYear);
      if (dates.length === 0) continue;

      const title = stripTags(ev.title.rendered || "").trim();
      if (!title) continue;

      const venueName = sanitizeVenueText(meta.venue || "");
      const timeRange = parseTimeRangeFromText(meta.timeText || "");

      // ジオコード
      const candidates = [];
      if (venueName) candidates.push(`富山県 ${venueName}`);
      candidates.push("富山県富山市");
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      const addrFallback = venueName ? `富山県 ${venueName}` : "富山県";
      point = resolveEventPoint(source, venueName, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venueName, addrFallback, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${ev.link}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venueName, address: resolvedAddress || "",
          url: ev.link,
          lat: point ? point.lat : null, lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHappymamaToyamaCollector };

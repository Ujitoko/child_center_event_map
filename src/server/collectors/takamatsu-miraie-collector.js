/**
 * 高松市こども未来館（たかまつミライエ）コレクター
 * https://takamatsu-miraie.com/event/
 *
 * JSON API: /event/index.html?type=json&page=N
 * Response: { status, page, items: [{ event_id, event_name, event_date, description, ... }] }
 * 全イベントが子ども向け（プラネタリウム、工作、読み聞かせ等）
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");

const SITE_BASE = "https://takamatsu-miraie.com";
const API_URL = `${SITE_BASE}/event/index.html?type=json`;
const VENUE = "高松市こども未来館";
const VENUE_ADDRESS = "香川県高松市松島町1丁目15-1";
const VENUE_POINT = { lat: 34.3405, lng: 134.0537 };

/**
 * event_date テキストから日付を抽出
 * 例: "令和8年2月27日(金)、28日(土)"
 *     "令和8年3月7日(土)"
 *     "令和8年2月21日(土)、22日(日)、23日(月・祝)、28日(土)、3月1日(日)"
 */
function parseDatesFromEventDate(text) {
  if (!text) return [];
  const dates = [];

  // 令和N年 → 西暦
  const eraMatch = text.match(/令和(\d+)年/);
  const baseYear = eraMatch ? 2018 + Number(eraMatch[1]) : null;

  // 西暦 pattern
  const fullYearMatch = text.match(/(\d{4})年/);
  const year = baseYear || (fullYearMatch ? Number(fullYearMatch[1]) : new Date().getFullYear());

  // Extract M月D日 patterns
  let currentMonth = null;
  const re = /(\d{1,2})月(\d{1,2})日|(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      currentMonth = Number(m[1]);
      dates.push({ y: year, mo: currentMonth, d: Number(m[2]) });
    } else if (m[3] && currentMonth) {
      dates.push({ y: year, mo: currentMonth, d: Number(m[3]) });
    }
  }

  return dates;
}

function createTakamatsuMiraieCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectTakamatsuMiraieEvents(maxDays) {
    const allItems = [];

    // Fetch up to 4 pages (6 items each)
    for (let page = 1; page <= 4; page++) {
      try {
        const json = await fetchText(`${API_URL}&page=${page}`);
        const data = JSON.parse(json);
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) break;
        allItems.push(...data.items);
        if (data.page === 0) break; // last page indicator
      } catch (e) {
        if (page === 1) {
          console.warn(`[${label}] API failed:`, e.message || e);
          return [];
        }
        break;
      }
    }

    if (allItems.length === 0) return [];

    const byId = new Map();

    for (const item of allItems) {
      const title = (item.event_name || "").trim();
      if (!title) continue;

      const dates = parseDatesFromEventDate(item.event_date);
      if (dates.length === 0) continue;

      // Try to extract time from description
      const desc = item.description || "";
      const timeRange = parseTimeRangeFromText(desc);

      const point = resolveEventPoint(source, VENUE, VENUE_POINT, VENUE_ADDRESS);
      const resolvedAddress = resolveEventAddress(source, VENUE, VENUE_ADDRESS, point);

      const eventUrl = `${SITE_BASE}/event/detail${item.event_id}.html`;

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${item.event_id}:${title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: VENUE,
          address: resolvedAddress || VENUE_ADDRESS,
          url: eventUrl,
          lat: point ? point.lat : VENUE_POINT.lat,
          lng: point ? point.lng : VENUE_POINT.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createTakamatsuMiraieCollector };

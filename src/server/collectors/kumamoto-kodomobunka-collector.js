/**
 * 熊本市こども文化会館 イベントコレクター
 * https://www.kodomobunka.jp/event/
 *
 * 熊本市の児童施設。イベント一覧ページから全イベントを取得。
 * 固定施設: 熊本市中央区新町1丁目3番11号。~42 events
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const LIST_URL = "https://www.kodomobunka.jp/event/";
const FACILITY = {
  name: "熊本市こども文化会館",
  address: "熊本県熊本市中央区新町1丁目3番11号",
  lat: 32.8007,
  lng: 130.6928,
};

/** イベント一覧ページからイベントを抽出 */
function parseEventList(html) {
  const events = [];
  // <div class="event__box"> ... </div>
  const boxRe = /<div\s+class="event__box">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
  let m;
  while ((m = boxRe.exec(html)) !== null) {
    const block = m[1];
    // Year: <p class="year">2026</p>
    const yearM = block.match(/<p\s+class="year">(\d{4})<\/p>/);
    if (!yearM) continue;
    const year = Number(yearM[1]);
    // Date text after year tag
    const dateDiv = block.match(/class="event__box__date">([\s\S]*?)<\/div>/i);
    if (!dateDiv) continue;
    const dateText = stripTags(dateDiv[1]).replace(/\s+/g, " ").replace(/^\d{4}\s*/, "").trim();

    // Title + URL
    const linkM = block.match(/<a\s+href="\.\/event\.cgi\?mode=view&eventyid=(\d+)">([^<]+)<\/a>/i);
    if (!linkM) continue;
    const eventId = linkM[1];
    const title = linkM[2].trim();

    // Time: <span class="text--blue event__aleat">時間：...
    const timeM = block.match(/時間[：:]\s*(\d{1,2})\s*時(\d{2})分より\s*(\d{1,2})時(\d{2})分まで/);
    let timeRange = null;
    if (timeM) {
      timeRange = {
        startHour: Number(timeM[1]), startMinute: Number(timeM[2]),
        endHour: Number(timeM[3]), endMinute: Number(timeM[4]),
      };
    }

    // Parse dates
    // 単日: "03月05日（木）"
    const singleM = dateText.match(/(\d{1,2})月(\d{1,2})日/);
    // 範囲: "03月01日～03月31日"
    const rangeM = dateText.match(/(\d{1,2})月(\d{1,2})日\s*[～〜-]\s*(\d{1,2})月(\d{1,2})日/);

    const dates = [];
    if (rangeM) {
      const mo1 = Number(rangeM[1]), d1 = Number(rangeM[2]);
      const mo2 = Number(rangeM[3]), d2 = Number(rangeM[4]);
      const y2 = mo2 < mo1 ? year + 1 : year;
      const start = new Date(year, mo1 - 1, d1);
      const end = new Date(y2, mo2 - 1, d2);
      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dates.push({ y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate() });
      }
    } else if (singleM) {
      dates.push({ y: year, mo: Number(singleM[1]), d: Number(singleM[2]) });
    }

    if (dates.length > 0) {
      events.push({ eventId, title, dates, timeRange });
    }
  }
  return events;
}

function createKumamotoKodomobunkaCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKumamotoKodomobunkaEvents(maxDays) {
    let html;
    try {
      html = await fetchText(LIST_URL);
    } catch (e) {
      console.warn(`[${label}] fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const rawEvents = parseEventList(html);
    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);

    const byId = new Map();
    for (const ev of rawEvents) {
      const eventUrl = `https://www.kodomobunka.jp/event/event.cgi?mode=view&eventyid=${ev.eventId}`;

      let count = 0;
      for (const dd of ev.dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, ev.timeRange);
        const id = `${srcKey}:${eventUrl}:${ev.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: ev.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: FACILITY.name,
          address: resolvedAddr || FACILITY.address,
          url: eventUrl,
          lat: point.lat, lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKumamotoKodomobunkaCollector };

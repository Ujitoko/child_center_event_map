/**
 * 5-Daysこども文化科学館 (Pyonta) イベントコレクター
 * https://www.pyonta.city.hiroshima.jp/event_guide/list/
 *
 * 広島市の児童施設。リストページからイベントカード抽出。
 * 詳細ページから時間・会場を取得。主に固定施設。~10-20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.pyonta.city.hiroshima.jp";
const LIST_URL = `${BASE}/event_guide/list/`;
const DETAIL_BATCH = 5;
const FACILITY = {
  name: "5-Daysこども文化科学館",
  address: "広島県広島市中区基町5番83号",
  lat: 34.3965,
  lng: 132.4515,
};

/** リストページからイベントカード抽出 */
function parseListPage(html) {
  const events = [];
  // event-item: <div class="event-item"><a href="/event_guide/list/detail?id=ID">
  const cardRe = /<div\s+class="event-item">\s*<a\s+href="(\/event_guide\/list\/detail\?id=(\d+))">([\s\S]*?)<\/a>\s*<\/div>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const href = m[1];
    const eventId = m[2];
    const block = m[3];

    // タイトル: <p class="event-ttl"><span>TITLE</span></p>
    const titleM = block.match(/<p\s+class="event-ttl"><span>([^<]+)<\/span><\/p>/i);
    const title = titleM ? titleM[1].trim() : "";
    if (!title) continue;

    // JSON日付: <div class="info-event-duration" hidden>[{"start":"YYYY/MM/DD","end":"YYYY/MM/DD"}]</div>
    const jsonM = block.match(/<div\s+class="info-event-duration"\s+hidden>\s*(\[[\s\S]*?\])\s*<\/div>/i);
    let dates = [];
    if (jsonM) {
      try {
        const raw = jsonM[1].replace(/\\\//g, "/");
        const arr = JSON.parse(raw);
        for (const range of arr) {
          const startParts = range.start.match(/(\d{4})\/(\d{2})\/(\d{2})/);
          const endParts = range.end.match(/(\d{4})\/(\d{2})\/(\d{2})/);
          if (startParts && endParts) {
            const start = new Date(Number(startParts[1]), Number(startParts[2]) - 1, Number(startParts[3]));
            const end = new Date(Number(endParts[1]), Number(endParts[2]) - 1, Number(endParts[3]));
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
            }
          }
        }
      } catch (_) { /* ignore parse errors */ }
    }

    // フォールバック: 表示日付 <p class="event-time">2026年3月3日(火)</p>
    if (dates.length === 0) {
      const dateM = block.match(/<p\s+class="event-time">(\d{4})年(\d{1,2})月(\d{1,2})日/i);
      if (dateM) {
        dates.push({ y: Number(dateM[1]), mo: Number(dateM[2]), d: Number(dateM[3]) });
      }
    }

    if (dates.length > 0) {
      events.push({ href, eventId, title, dates });
    }
  }
  return events;
}

/** 詳細ページから時間を抽出 */
function parseDetailTime(html) {
  if (!html) return null;
  // <th>日時</th><td>2026年3月3日（火）19時30分～21時</td>
  const rowRe = /<th[^>]*>([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = stripTags(m[1]).trim();
    if (key === "日時") {
      const text = stripTags(m[2]).replace(/\s+/g, " ").trim();
      // HH時MM分～HH時 or HH:MM～HH:MM
      const tm = text.match(/(\d{1,2})[時:](\d{1,2})[分]?\s*[～~ー-]\s*(\d{1,2})[時:]?(\d{1,2})?/);
      if (tm) {
        return {
          startHour: Number(tm[1]), startMinute: Number(tm[2]),
          endHour: Number(tm[3]), endMinute: tm[4] ? Number(tm[4]) : 0,
        };
      }
      const tm2 = text.match(/(\d{1,2})[時:](\d{1,2})/);
      if (tm2) {
        return { startHour: Number(tm2[1]), startMinute: Number(tm2[2]) };
      }
    }
  }
  return null;
}

function createPyontaCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectPyontaEvents(maxDays) {
    let html;
    try {
      html = await fetchText(LIST_URL);
    } catch (e) {
      console.warn(`[${label}] fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const rawEvents = parseListPage(html);
    if (rawEvents.length === 0) return [];

    // 詳細ページバッチ取得
    const detailMap = new Map();
    const uniqueIds = [...new Set(rawEvents.map(e => e.eventId))].slice(0, 30);
    for (let i = 0; i < uniqueIds.length; i += DETAIL_BATCH) {
      const batch = uniqueIds.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (eid) => {
          const dhtml = await fetchText(`${BASE}/event_guide/list/detail?id=${eid}`);
          return { eid, time: parseDetailTime(dhtml) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.eid, r.value.time);
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const ev of rawEvents) {
      const timeRange = detailMap.get(ev.eventId) || null;
      const eventUrl = `${BASE}${ev.href}`;

      let count = 0;
      for (const dd of ev.dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
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

module.exports = { createPyontaCollector };

/**
 * 富山県こどもみらい館 イベントコレクター
 * https://kodomo-miraikan.com/event/
 *
 * 富山県射水市の県営児童施設。月別カレンダーテーブルからイベント抽出。
 * 詳細ページから開催時間を取得。固定施設。~15-20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://kodomo-miraikan.com";
const DETAIL_BATCH = 5;
const FACILITY = {
  name: "こどもみらい館",
  address: "富山県射水市黒河 県民公園太閤山ランド内",
  lat: 36.7341,
  lng: 137.0230,
};

/** カレンダーテーブルからイベントを抽出 */
function parseCalendar(html) {
  const events = [];

  // 年月: <h2>2026年2月</h2>
  const ymM = html.match(/<h2>(\d{4})年(\d{1,2})月<\/h2>/);
  if (!ymM) return events;
  const year = Number(ymM[1]);
  const month = Number(ymM[2]);

  // 各<td>セルからイベント抽出
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cm;
  while ((cm = cellRe.exec(html)) !== null) {
    const cell = cm[1];
    // 日付: <em>1</em>
    const dayM = cell.match(/<em>(\d{1,2})<\/em>/);
    if (!dayM) continue;
    const day = Number(dayM[1]);

    // イベントリンク: <a href="https://kodomo-miraikan.com/event/ID/"><span title="TITLE">TITLE</span></a>
    const linkRe = /<a\s+href="(https:\/\/kodomo-miraikan\.com\/event\/(\d+)\/)"[^>]*>\s*<span[^>]*>([^<]+)<\/span>\s*<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(cell)) !== null) {
      events.push({
        url: lm[1],
        eventId: lm[2],
        title: lm[3].trim(),
        year, month, day,
      });
    }
  }
  return events;
}

/** 詳細ページから時間を抽出 */
function parseDetailTime(html) {
  if (!html) return null;
  // <dl><dt>開催時間</dt><dd>09:00~17:00</dd></dl>
  const dlRe = /<dl>\s*<dt>([^<]+)<\/dt>\s*<dd>\s*([\s\S]*?)\s*<\/dd>\s*<\/dl>/gi;
  let m;
  while ((m = dlRe.exec(html)) !== null) {
    if (m[1].trim() === "開催時間") {
      return stripTags(m[2]).replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function createKodomoMiraikanCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKodomoMiraikanEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    // カレンダーページを3ヶ月分取得
    const allEvents = [];
    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      try {
        const url = `${BASE}/event/index_test.php?date=${yy}-${String(mm).padStart(2, "0")}`;
        const html = await fetchText(url);
        if (html) allEvents.push(...parseCalendar(html));
      } catch (e) {
        console.warn(`[${label}] ${yy}/${mm} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) return [];

    // 詳細ページバッチ取得 (時間取得)
    const detailMap = new Map();
    const uniqueIds = [...new Set(allEvents.map(e => e.eventId))].slice(0, 40);
    for (let i = 0; i < uniqueIds.length; i += DETAIL_BATCH) {
      const batch = uniqueIds.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (eid) => {
          const html = await fetchText(`${BASE}/event/${eid}/`);
          return { eid, time: parseDetailTime(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.eid, r.value.time);
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const ev of allEvents) {
      const dd = { y: ev.year, mo: ev.month, d: ev.day };
      if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

      const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
      const timeText = detailMap.get(ev.eventId) || "";
      const timeRange = parseTimeRangeFromText(timeText);
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: FACILITY.name,
        address: resolvedAddr || FACILITY.address,
        url: ev.url,
        lat: point.lat, lng: point.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKodomoMiraikanCollector };

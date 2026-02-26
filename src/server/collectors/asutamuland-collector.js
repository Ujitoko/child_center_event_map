/**
 * あすたむらんど徳島 イベントコレクター
 * https://asutamuland.jp/events/event/on/YYYY/MM/
 *
 * WP Event Organiser。月別リストページからイベントURLとタイトル(日付入り)を抽出。
 * 単一施設のため詳細ページ不要。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");

const SITE_BASE = "https://asutamuland.jp";
const VENUE = "あすたむらんど徳島";
const ADDRESS = "徳島県板野郡板野町那東字キビガ谷45-22";

/**
 * 月別リストページからイベントを抽出
 * リンクテキスト例: "ワクワクたからさがし！ 01/22(木)～03/19(木)"
 */
function parseMonthPage(html, currentYear) {
  const events = [];
  const linkRe = /<a[^>]*href="(https?:\/\/asutamuland\.jp\/events\/event\/(\d+)\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    const rawText = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (rawText.length < 3) continue;

    // Extract date range from link text: MM/DD(曜)～MM/DD(曜) or MM/DD(曜)
    const dateRangeRe = /(\d{1,2})\/(\d{1,2})\([^)]*\)\s*[～~\-ー]\s*(\d{1,2})\/(\d{1,2})\([^)]*\)/;
    const singleDateRe = /(\d{1,2})\/(\d{1,2})\([^)]*\)/;
    const rangeM = rawText.match(dateRangeRe);
    const singleM = rawText.match(singleDateRe);

    let startMo, startDay, endMo, endDay;
    if (rangeM) {
      startMo = Number(rangeM[1]);
      startDay = Number(rangeM[2]);
      endMo = Number(rangeM[3]);
      endDay = Number(rangeM[4]);
    } else if (singleM) {
      startMo = Number(singleM[1]);
      startDay = Number(singleM[2]);
      endMo = startMo;
      endDay = startDay;
    } else {
      continue; // No date found, skip
    }

    // Clean title (remove the date portion from end)
    let title = rawText.replace(/\s*\d{1,2}\/\d{1,2}\([^)]*\).*$/, "").trim();
    if (!title) title = rawText.substring(0, 50).trim();

    // Year inference: if month < current month - 3, it's next year
    const now = new Date();
    const jstMonth = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })).getMonth() + 1;
    const startYear = startMo < jstMonth - 3 ? currentYear + 1 : currentYear;
    const endYear = endMo < startMo ? startYear + 1 : startYear;

    events.push({
      url,
      title,
      startDate: { y: startYear, mo: startMo, d: startDay },
      endDate: { y: endYear, mo: endMo, d: endDay },
    });
  }
  return events;
}

function createAsutamulandCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectAsutamulandEvents(maxDays) {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentYear = jstNow.getFullYear();

    // Fetch current + next month
    const allEvents = [];
    for (let i = 0; i < 2; i++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      try {
        const url = `${SITE_BASE}/events/event/on/${year}/${String(month).padStart(2, "0")}/`;
        const html = await fetchText(url, { timeout: 25000 });
        if (!html) continue;
        const events = parseMonthPage(html, year);
        allEvents.push(...events);
      } catch (_e) { /* skip month */ }
    }

    if (allEvents.length === 0) return [];

    // Deduplicate by URL
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }

    // Expand multi-day events into individual day entries
    const byId = new Map();
    const point = resolveEventPoint(source, VENUE, source.center, ADDRESS);
    const resolvedAddress = resolveEventAddress(source, VENUE, ADDRESS, point);

    for (const ev of uniqueMap.values()) {
      // Generate dates for period events
      const start = new Date(ev.startDate.y, ev.startDate.mo - 1, ev.startDate.d);
      const end = new Date(ev.endDate.y, ev.endDate.mo - 1, ev.endDate.d);

      for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        const y = dt.getFullYear();
        const mo = dt.getMonth() + 1;
        const d = dt.getDate();

        if (!inRangeJst(y, mo, d, maxDays)) continue;

        const dateKey = `${y}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.url}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate({ y, mo, d }, null);
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: VENUE,
          address: resolvedAddress || ADDRESS,
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: true,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createAsutamulandCollector };

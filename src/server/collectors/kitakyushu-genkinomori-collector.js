/**
 * 北九州市子育てふれあい交流プラザ「元気のもり」イベントコレクター
 * https://www.kosodate-fureai.jp/event/
 *
 * 北九州市小倉の子育て支援施設。WordPress月別ページ(/event/YYYY/MM)から
 * 全イベントを取得。全イベントが同一施設(AIM 3階)で開催。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE_URL = "https://www.kosodate-fureai.jp";
const FACILITY_NAME = "子育てふれあい交流プラザ 元気のもり";
const FACILITY_ADDRESS = "福岡県北九州市小倉北区浅野3-8-1 AIM 3階";
const FACILITY_POINT = { lat: 33.8866, lng: 130.8826 };

// Skip these category classes (not public events)
const SKIP_CATS = ["cat-close", "cat-group"];

/**
 * 月別ページHTMLからイベントを抽出
 *
 * <tr class="sun"><td>01日（日）</td><td class="event">
 *   <dl id="43808"><dt class="cat-event1"><span class="post-cat event1">主催</span>TITLE</dt>
 *   <dd>...details with ☆時　間 HH:MM～HH:MM...</dd></dl>
 * </td></tr>
 */
function parseMonthPage(html, year, month) {
  const events = [];
  // Match each day row: <tr...><td>DD日（曜）</td><td...>events</td></tr>
  const rowRe = /<tr[^>]*>\s*<td>(\d{1,2})日[^<]*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const day = Number(rm[1]);
    const cellHtml = rm[2];

    // Extract each <dl> event
    const dlRe = /<dl\s+id="(\d+)">\s*<dt\s+class="([^"]*)">([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/dl>/gi;
    let dm;
    while ((dm = dlRe.exec(cellHtml)) !== null) {
      const wpId = dm[1];
      const catClass = dm[2];
      const dtContent = dm[3];
      const ddContent = dm[4];

      // Skip closed days and group visits
      if (SKIP_CATS.some(c => catClass.includes(c))) continue;

      // Extract title (after <span>...category label...</span>)
      const title = stripTags(dtContent).trim();
      if (!title) continue;

      // Extract time from dd: ☆時　間　HH:MM～HH:MM or ①HH:MM～HH:MM
      const ddText = stripTags(ddContent);
      const timeRange = parseTimeRangeFromText(ddText);

      events.push({
        wpId,
        title,
        y: year,
        mo: month,
        d: day,
        timeRange,
      });
    }
  }
  return events;
}

function createKitakyushuGenkinomoriCollector(config, deps) {
  const { source } = config;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKitakyushuGenkinomoriEvents(maxDays) {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

    // Fetch 3 months: current + next 2
    const allEvents = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      try {
        const url = `${BASE_URL}/event/${year}/${String(month).padStart(2, "0")}`;
        const html = await fetchText(url);
        if (!html) continue;
        const events = parseMonthPage(html, year, month);
        allEvents.push(...events);
      } catch (_e) { /* skip month */ }
    }

    if (allEvents.length === 0) return [];

    const byId = new Map();

    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.wpId}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange,
      );

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: FACILITY_NAME,
        address: FACILITY_ADDRESS,
        url: `${BASE_URL}/event/${ev.y}/${String(ev.mo).padStart(2, "0")}`,
        lat: FACILITY_POINT.lat,
        lng: FACILITY_POINT.lng,
        time_unknown: ev.timeRange.startHour === null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKitakyushuGenkinomoriCollector };

/**
 * 熊本市 結婚・子育て応援サイトコレクター
 * Calendar.aspx ページからイベント情報を直接抽出
 *
 * Calendar: https://www.kumamoto-kekkon-kosodate.jp/hpkiji/pub/Calendar.aspx?c_id=3&sely=YYYY&selm=M
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

const CAL_BASE = "https://www.kumamoto-kekkon-kosodate.jp/hpkiji/pub/Calendar.aspx";

/**
 * Calendar.aspxのHTMLからイベントを抽出
 * @param {string} html
 * @param {number} year
 * @param {number} month
 */
function parseCalendarPage(html, year, month) {
  const events = [];
  // カレンダーセルからイベントを抽出
  const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let cellMatch;
  while ((cellMatch = cellRe.exec(html)) !== null) {
    const cell = cellMatch[1];
    if (!cell.includes("page")) continue;

    // 日付を取得
    const dayMatch = cell.match(/(\d{1,2})<\/span>/) || cell.match(/>(\d{1,2})</);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (day < 1 || day > 31) continue;

    // イベントリンクを取得
    const linkRe = /href="([^"]*page\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRe.exec(cell)) !== null) {
      const url = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]+>/g, "").trim();
      if (!title) continue;
      events.push({ year, month, day, title, url });
    }
  }
  return events;
}

function createKumamotoKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKumamotoKosodateEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    // 今月 + 来月 + 再来月のカレンダーを取得
    const months = [];
    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      months.push({ year: yy, month: mm });
    }

    const allEvents = [];
    for (const { year, month } of months) {
      try {
        const url = `${CAL_BASE}?c_id=3&sely=${year}&selm=${month}`;
        const html = await fetchText(url);
        allEvents.push(...parseCalendarPage(html, year, month));
      } catch (e) {
        console.warn(`[${label}] Calendar.aspx ${year}/${month} failed:`, e.message || e);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (allEvents.length === 0) return [];

    const results = [];
    const seen = new Set();

    for (const ev of allEvents) {
      const dd = { y: ev.year, mo: ev.month, d: ev.day };
      if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

      const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (seen.has(id)) continue;
      seen.add(id);

      // タイトルから時間をパース
      const timeRange = parseTimeRangeFromText(ev.title);

      // タイトルから会場名を推測
      let venueName = "";
      const venueMatch = ev.title.match(/[（(]([^）)]{3,20})[）)]/);
      if (venueMatch) venueName = sanitizeVenueText(venueMatch[1]);

      // ジオコーディング (熊本市の中心にフォールバック)
      const candidates = [];
      if (venueName) candidates.push(`熊本県熊本市 ${venueName}`);
      candidates.push("熊本県熊本市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, "熊本県熊本市");
      const resolvedAddress = resolveEventAddress(source, venueName, "熊本県熊本市", point);

      const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

      results.push({
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: resolvedAddress || "熊本県熊本市",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKumamotoKosodateCollector };

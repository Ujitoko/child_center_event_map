/**
 * 鹿児島市 夢すくすくねっと イベントコレクター
 * https://kagoshima-yumesukusuku.net/spot/event/
 *
 * 鹿児島市の子育てポータル。イベント一覧ページから直接抽出。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const LIST_URL = "https://kagoshima-yumesukusuku.net/spot/event/";
const DATE_BASE = "https://kagoshima-yumesukusuku.net/spot/date/";

/** リストページからイベントを抽出 */
function parseEventList(html) {
  const events = [];
  // <li> blocks with <h3> and <p> elements
  const liRe = /<li>\s*<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?:<\/li>|(?=<li>))/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const h3 = m[1];
    const rest = m[2];

    // URL and title from <a>
    const linkMatch = h3.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const title = stripTags(linkMatch[2]).trim();
    if (!title) continue;

    // Date from <p><span class="date">開催日時</span>2026年2月26日...</p>
    const dateMatch = rest.match(/開催日時[\s\S]*?(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const date = { y: Number(dateMatch[1]), mo: Number(dateMatch[2]), d: Number(dateMatch[3]) };

    // Time
    const timeText = stripTags(rest.match(/<p>[\s\S]*?開催日時[\s\S]*?<\/span>([\s\S]*?)<\/p>/i)?.[1] || "").trim();
    const timeRange = parseTimeRangeFromText(timeText);

    // Venue from <p>場所...</p>
    const venueMatch = rest.match(/場所\s*([^\s<]+(?:\s+[^\s<]+)*)/);
    const venueName = venueMatch ? sanitizeVenueText(venueMatch[1].replace(/\s*対象年齢.*$/, "").trim()) : "";

    events.push({ href, title, date, timeRange, venueName });
  }
  return events;
}

function createKagoshimaYumesukusukuColl(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKagoshimaYumesukusukuEvents(maxDays) {
    // 今月と来月のページを取得
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const allEvents = [];
    // メインページ
    try {
      const html = await fetchText(LIST_URL);
      if (html) allEvents.push(...parseEventList(html));
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }

    // 来月の月別ページ
    for (let i = 1; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      try {
        const url = `${DATE_BASE}${yy}/${String(mm).padStart(2, "0")}/`;
        const html = await fetchText(url);
        if (html) allEvents.push(...parseEventList(html));
      } catch (_e) { /* skip */ }
    }

    if (allEvents.length === 0) return [];

    // イベントレコード生成
    const byId = new Map();
    for (const ev of allEvents) {
      const d = ev.date;
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.href}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const candidates = [];
      if (ev.venueName) candidates.push(`鹿児島県鹿児島市 ${ev.venueName}`);
      candidates.push("鹿児島県鹿児島市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, ev.venueName, point, "鹿児島県鹿児島市");
      const resolvedAddress = resolveEventAddress(source, ev.venueName, "鹿児島県鹿児島市", point);

      const { startsAt, endsAt } = buildStartsEndsForDate(d, ev.timeRange);

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: ev.venueName, address: resolvedAddress || "鹿児島県鹿児島市",
        url: ev.href,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKagoshimaYumesukusukuColl };

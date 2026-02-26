/**
 * 新潟市 子育て講座カレンダーコレクター
 * https://www.city.niigata.lg.jp/kosodate/manabishogaku/search/eventjoho/kosodate/calendar/
 *
 * 月別の静的HTMLカレンダーページからイベントリンクを抽出。
 * 各日セル内の<a>リンクをイベントとして収集する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const BASE_URL = "https://www.city.niigata.lg.jp";
const CAL_PATH = "/kosodate/manabishogaku/search/eventjoho/kosodate/calendar/calendar";

/** カレンダーページからイベントを抽出 */
function parseCalendarPage(html, year, month) {
  const events = [];
  // <table id="calendar"> のセルを解析
  const tableMatch = html.match(/<table\s+id="calendar">([\s\S]*?)<\/table>/i);
  if (!tableMatch) return events;
  const table = tableMatch[1];

  // 各行 <tr> を処理
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(table)) !== null) {
    const row = rowMatch[1];
    // 各セル <td> を処理
    const cellRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRe.exec(row)) !== null) {
      const cell = cellMatch[1];
      // 日付を取得（セル内の最初の数字）
      const dayMatch = cell.match(/>(\d{1,2})日?</);
      if (!dayMatch) continue;
      const day = Number(dayMatch[1]);
      if (day < 1 || day > 31) continue;

      // セル内のイベントリンクを取得
      const linkRe = /<a\s+href="(\/kosodate[^"]*)"[^>]*>([^<]*)<\/a>/gi;
      let linkMatch;
      while ((linkMatch = linkRe.exec(cell)) !== null) {
        const href = linkMatch[1];
        const title = stripTags(linkMatch[2]).trim();
        if (!title) continue;
        // ナビゲーションリンクを除外
        if (title === "子育て・教育" || title === "生涯学習・社会教育" || title === "目的からさがす" || title === "講座・イベント" || title === "子育て") continue;
        events.push({
          url: `${BASE_URL}${href}`,
          title,
          year, month, day,
        });
      }
    }
  }
  return events;
}

/** タイトルから施設名を推測 */
function inferVenueFromTitle(title) {
  // 「施設名　イベント名」パターン
  const spaceMatch = title.match(/^(.{2,15}(?:図書館|公民館|センター|館|プラザ))\s+/);
  if (spaceMatch) return spaceMatch[1];
  // 「施設名　」パターン（全角スペース）
  const zenMatch = title.match(/^(.{2,15}(?:図書館|公民館|センター|館|プラザ))　/);
  if (zenMatch) return zenMatch[1];
  return "";
}

function createNiigataKosodateColl(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNiigataKosodateEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    // 今月+来月+再来月のカレンダーを取得
    const allEvents = [];
    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      const ym = `${yy}${String(mm).padStart(2, "0")}`;
      try {
        const url = `${CAL_PATH}${ym}.html`;
        const html = await fetchText(`${BASE_URL}${url}`);
        if (html) allEvents.push(...parseCalendarPage(html, yy, mm));
      } catch (e) {
        console.warn(`[${label}] calendar ${ym} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) return [];

    // イベントレコード生成
    const byId = new Map();
    for (const ev of allEvents) {
      const d = { y: ev.year, mo: ev.month, d: ev.day };
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const venue = sanitizeVenueText(inferVenueFromTitle(ev.title));
      const candidates = [];
      if (venue) candidates.push(`新潟県新潟市 ${venue}`);
      candidates.push("新潟県新潟市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venue, point, "新潟県新潟市");
      const resolvedAddress = resolveEventAddress(source, venue, "新潟県新潟市", point);

      const { startsAt, endsAt } = buildStartsEndsForDate(d, null);

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venue, address: resolvedAddress || "新潟県新潟市",
        url: ev.url,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createNiigataKosodateColl };

/**
 * かごしまメルヘン館 コレクタ (鹿児島市)
 * WP FullCalendar AJAX endpoint から子ども向けイベントを収集
 * おはなしのじかん、えほんのじかん、わらべうた教室、メルヘンおはなし会 等
 * ~8-10件/月
 */
const { fetchText } = require("../fetch-utils");

const AJAX_URL = "https://www.k-kb.or.jp/kinmeru/kinmeru_cms/wp-admin/admin-ajax.php";
const FACILITY_POINT = { lat: 31.5930, lng: 130.5507 };
const FACILITY_ADDRESS = "鹿児島市城山町5-1";
const FACILITY_NAME = "かごしまメルヘン館";

// 子ども向けイベントのキーワード (施設特有)
const CHILD_KEYWORDS = [
  "おはなし", "えほん", "わらべ", "メルヘン", "児童",
  "読み聞かせ", "子ども", "こども", "親子", "キッズ",
  "ベビー", "赤ちゃん", "幼児",
];

function createMeruhenkanCollector({ source }, { resolveEventPoint }) {
  return async function collectMeruhenkanEvents(maxDays) {
    const now = new Date();
    const end = new Date(now.getTime() + (maxDays || 30) * 86400000);
    const startStr = now.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    let json;
    try {
      const body = `action=WP_FullCalendar&type=event&start=${startStr}&end=${endStr}`;
      const resp = await fetch(AJAX_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      json = await resp.json();
    } catch (e) {
      console.error(`[${source.label}] AJAX fetch error:`, e.message);
      return [];
    }

    if (!Array.isArray(json)) return [];

    const events = [];
    const seen = new Set();

    for (const item of json) {
      const title = (item.title || "").trim();
      if (!title) continue;

      // Skip 休館日 and "more ..." entries
      if (/休館|more\s*\.\.\./.test(title)) continue;
      if (item.className === "wpfc-more") continue;

      // Keyword filter for child events
      const lowerTitle = title;
      const isChild = CHILD_KEYWORDS.some(kw => lowerTitle.includes(kw));
      if (!isChild) continue;

      // Parse start date
      const start = item.start;
      if (!start) continue;
      const dateStr = start.slice(0, 10);

      // Extract event ID from URL
      const urlMatch = (item.url || "").match(/\/event\/(\d+)\//);
      const eventId = urlMatch ? urlMatch[1] : dateStr;

      const id = `${source.key}:${eventId}:${title}:${dateStr}`;
      if (seen.has(id)) continue;
      seen.add(id);

      // Use start/end times from AJAX if available
      const startsAt = start.includes("T") ? start + "+09:00" : `${dateStr}T00:00:00+09:00`;
      let endsAt = null;
      if (item.end && item.end.includes("T") && item.end.slice(0, 10) === dateStr) {
        endsAt = item.end + "+09:00";
      }

      const point = resolveEventPoint(
        { source: source.key, venue_name: FACILITY_NAME, address: FACILITY_ADDRESS },
        FACILITY_POINT
      );

      events.push({
        id,
        source: source.key,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: FACILITY_NAME,
        address: FACILITY_ADDRESS,
        point,
        url: item.url || `https://www.k-kb.or.jp/kinmeru/event/`,
      });
    }

    return events;
  };
}

module.exports = { createMeruhenkanCollector };

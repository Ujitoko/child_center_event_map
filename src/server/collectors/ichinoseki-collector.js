/**
 * 一関市イベントカレンダーコレクター
 * Custom CGI calendar with structured detail pages
 *
 * List: https://www.city.ichinoseki.iwate.jp/event/?v=2&m=M&y=YYYY
 * Detail: https://www.city.ichinoseki.iwate.jp/event/?p=ID
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

const BASE = "https://www.city.ichinoseki.iwate.jp/event/";

/** Child-related keyword regex */
const CHILD_RE = /子育て|子ども|こども|キッズ|親子|赤ちゃん|ベビー|乳幼児|児童|幼児|放課後|サロン|おはなし|読み聞かせ|絵本|未就|育児|マタニティ|妊婦|ママ|パパ/;

/**
 * Parse list page table rows to extract events
 * @param {string} html
 * @param {number} year
 * @param {number} month
 */
function parseListPage(html, year, month) {
  const events = [];
  // Extract table rows
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let currentDay = 0;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const row = rowMatch[1];

    // Check for day in rowspan td: e.g. "3月1日（日）"
    const dayMatch = row.match(/(\d{1,2})月(\d{1,2})日/);
    if (dayMatch) {
      const m = Number(dayMatch[1]);
      const d = Number(dayMatch[2]);
      if (m === month) currentDay = d;
      else currentDay = 0; // different month in same calendar
    }

    if (currentDay === 0) continue;

    // Extract event link and title
    const linkMatch = row.match(/<a\s+href="\?p=(\d+)"[^>]*>([^<]+)<\/a>/i);
    if (!linkMatch) continue;

    const eventId = linkMatch[1];
    const title = linkMatch[2].trim();

    // Extract time from the row
    const timeMatch = row.match(/(\d{1,2}:\d{2})[〜～―-]+(\d{1,2}:\d{2})/);
    let timeRange = null;
    if (timeMatch) {
      timeRange = {
        startH: Number(timeMatch[1].split(":")[0]),
        startM: Number(timeMatch[1].split(":")[1]),
        endH: Number(timeMatch[2].split(":")[0]),
        endM: Number(timeMatch[2].split(":")[1]),
      };
    }

    // Extract venue from the row (inside <span> in venue column)
    const venueMatch = row.match(/<span>([^<]+)<\/span>/);
    const venueName = venueMatch ? venueMatch[1].trim() : "";

    events.push({
      eventId,
      title,
      year,
      month,
      day: currentDay,
      timeRange,
      venueName,
    });
  }
  return events;
}

function createIchinosekiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectIchinosekiEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    // Fetch current + next 2 months
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
        const url = `${BASE}?v=2&m=${month}&y=${year}`;
        const html = await fetchText(url);
        allEvents.push(...parseListPage(html, year, month));
      } catch (e) {
        console.warn(`[${label}] list ${year}/${month} failed:`, e.message || e);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    if (allEvents.length === 0) return [];

    // Filter to child-related events
    const childEvents = allEvents.filter(ev => CHILD_RE.test(ev.title) || CHILD_RE.test(ev.venueName));

    const results = [];
    const seen = new Set();

    for (const ev of childEvents) {
      if (!inRangeJst(ev.year, ev.month, ev.day, maxDays)) continue;

      const dateKey = `${ev.year}${String(ev.month).padStart(2, "0")}${String(ev.day).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.eventId}:${dateKey}`;
      if (seen.has(id)) continue;
      seen.add(id);

      // Fetch detail page for address
      let address = "";
      try {
        const detailHtml = await fetchText(`${BASE}?p=${ev.eventId}`);
        const addrMatch = detailHtml.match(/<td[^>]*class="table-td"[^>]*>住所[：:]?<\/td>\s*<td[^>]*>(.*?)<\/td>/is);
        if (addrMatch) address = addrMatch[1].replace(/<[^>]+>/g, "").trim();
      } catch (_) { /* ignore */ }

      await new Promise(r => setTimeout(r, 300));

      const venueName = sanitizeVenueText(ev.venueName);

      // Geocoding candidates
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`岩手県一関市 ${venueName}`);
      candidates.push("岩手県一関市");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address || "岩手県一関市");
      const resolvedAddress = resolveEventAddress(source, venueName, address || "岩手県一関市", point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.year, mo: ev.month, d: ev.day },
        ev.timeRange
      );

      results.push({
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: resolvedAddress || address || "岩手県一関市",
        url: `${BASE}?p=${ev.eventId}`,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createIchinosekiCollector };

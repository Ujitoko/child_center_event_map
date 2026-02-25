/**
 * 山形市 元気すくすくネット コレクター
 * https://www.kosodate-yamagata.jp/events
 *
 * WordPress Events Manager。全未来イベントが1ページに出力される。
 * div.evorgbox から日時・タイトル・施設名を抽出。
 * 休館日・お休み等のノイズをフィルタ。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const LIST_URL = "https://www.kosodate-yamagata.jp/events";

// Noise titles to filter out (closures, holidays)
const NOISE_RE = /お休み|休館日|休所|休み$/;

/**
 * Parse events from the list page HTML
 * <div class='evorgbox'>
 *   <div class='day'>02月25日(水)09:00 - 16:30</div>
 *   <div class='title'><a href="/events/34297/">TITLE</a></div>
 *   <div class='author'>VENUE</div>
 * </div>
 */
function parseListPage(html) {
  const events = [];
  const boxRe = /<div class='evorgbox'>([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m;
  while ((m = boxRe.exec(html)) !== null) {
    const block = m[1];

    // Date/time
    const dayM = block.match(/<div class='day'>([\s\S]*?)<\/div>/i);
    const dayText = dayM ? stripTags(dayM[1]).trim() : "";

    // Title + URL
    const titleM = block.match(/<div class='title'>\s*<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    const url = titleM ? titleM[1] : "";
    const title = titleM ? stripTags(titleM[2]).trim() : "";

    // Venue
    const venueM = block.match(/<div class='author'>([\s\S]*?)<\/div>/i);
    const venue = venueM ? stripTags(venueM[1]).trim() : "";

    if (title && dayText) {
      events.push({ dayText, title, url, venue });
    }
  }
  return events;
}

/**
 * Parse date and time from day text
 * "02月25日(水)09:00 - 16:30"
 * "02月25日(水) - 02月26日(木)09:00 - 12:00"
 * No year — infer from current JST year
 */
function parseDateTimeFromDayText(text) {
  if (!text) return [];
  const now = new Date();
  const jstYear = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now));
  const jstMonth = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", month: "numeric" }).format(now));

  // Extract dates
  const dateRe = /(\d{2})月(\d{2})日/g;
  const dates = [];
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    const mo = Number(dm[1]);
    const d = Number(dm[2]);
    const y = (mo < jstMonth - 1) ? jstYear + 1 : jstYear;
    dates.push({ y, mo, d });
  }

  // Extract time
  let startHour = null, startMinute = null, endHour = null, endMinute = null;
  // Match time range AFTER the date portion
  const timeM = text.match(/(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})/);
  if (timeM) {
    startHour = Number(timeM[1]);
    startMinute = Number(timeM[2]);
    endHour = Number(timeM[3]);
    endMinute = Number(timeM[4]);
  }

  const timeRange = { startHour, startMinute, endHour, endMinute };

  // If date range (2 dates), expand each date
  if (dates.length === 2) {
    // Return both start and end dates
    return dates.map(dd => ({ ...dd, timeRange }));
  }
  if (dates.length === 1) {
    return [{ ...dates[0], timeRange }];
  }
  return [];
}

function createYamagataSukusukuCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectYamagataSukusukuEvents(maxDays) {
    let html;
    try {
      html = await fetchText(LIST_URL);
    } catch (e) {
      console.warn(`[${label}] fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const parsed = parseListPage(html);
    if (parsed.length === 0) return [];

    const byId = new Map();

    for (const ev of parsed) {
      // Filter noise
      if (NOISE_RE.test(ev.title)) continue;

      const dateEntries = parseDateTimeFromDayText(ev.dayText);
      if (dateEntries.length === 0) continue;

      const venue = sanitizeVenueText(ev.venue);
      const eventUrl = ev.url.startsWith("http")
        ? ev.url
        : `https://www.kosodate-yamagata.jp${ev.url}`;

      // Geocode by venue name
      const candidates = [];
      if (venue) {
        candidates.push(`山形県山形市 ${venue}`);
        candidates.push(`山形市 ${venue}`);
      }

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      const addrFallback = venue ? `山形県山形市 ${venue}` : "山形県山形市";
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      for (const dd of dateEntries) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${eventUrl}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, dd.timeRange);

        const timeUnknown = dd.timeRange.startHour === null;

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || ev.venue,
          address: resolvedAddress || "",
          url: eventUrl,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: timeUnknown,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createYamagataSukusukuCollector };

/**
 * チアフルながの コレクター
 * https://www.cheerful-nagano.com/child/event/
 *
 * WordPress カスタム投稿タイプ child_event。
 * Phase 1: WP REST API でイベントID・リンクを一括取得
 * Phase 2: 詳細ページの JSON-LD (Event schema) から日付・会場・住所を抽出
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.cheerful-nagano.com";
const API_BASE = `${SITE_BASE}/wp-json/wp/v2/child_event`;
const MAX_API_PAGES = 4; // 100 per page × 4 = 400 items max
const DETAIL_BATCH = 3;

/**
 * WP REST API からイベントリストを取得
 * Returns array of { id, title, link }
 */
async function fetchApiEvents() {
  const items = [];
  for (let page = 1; page <= MAX_API_PAGES; page++) {
    try {
      const url = `${API_BASE}?per_page=100&page=${page}&_fields=id,title,link`;
      const json = await fetchText(url);
      if (!json) break;
      const data = JSON.parse(json);
      if (!Array.isArray(data) || data.length === 0) break;
      for (const item of data) {
        items.push({
          id: item.id,
          title: (item.title?.rendered || "").replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim(),
          link: item.link || `${SITE_BASE}/child/event/${item.id}/`,
        });
      }
      if (data.length < 100) break;
    } catch (e) {
      if (page === 1) throw e;
      break;
    }
  }
  return items;
}

/**
 * 詳細ページの JSON-LD Event ブロックから情報を抽出
 * JSON-LD の description フィールドが壊れている場合があるので
 * 個別フィールドを regex で抽出
 */
function parseDetailJsonLd(html) {
  if (!html) return null;

  // Find the second JSON-LD block (Event schema, not Yoast)
  const ldBlocks = [];
  const ldRe = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(html)) !== null) {
    ldBlocks.push(m[1]);
  }

  // Find the Event block
  for (const block of ldBlocks) {
    if (!block.includes('"Event"')) continue;
    // Extract individual fields with regex (JSON.parse may fail due to bad description)
    const startM = block.match(/"startDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    const endM = block.match(/"endDate"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
    const nameM = block.match(/"location"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]*)"/);
    const addrM = block.match(/"address"\s*:\s*"([^"]*)"/);

    if (startM) {
      return {
        startDate: startM[1],
        endDate: endM ? endM[1] : startM[1],
        venueName: nameM ? nameM[1] : "",
        address: addrM ? addrM[1] : "",
      };
    }
  }

  // Fallback: parse HTML structure
  // <div class="event-date">DATE</div>
  const dateM = html.match(/class="event-date"[^>]*>([\s\S]*?)<\/div>/i);
  const areaM = html.match(/class="event-area"[^>]*>([\s\S]*?)<\/div>/i);

  if (dateM) {
    const dateText = stripTags(dateM[1]).trim();
    const areaText = areaM ? stripTags(areaM[1]).trim() : "";
    // Parse venue(address) from event-area
    const parenM = areaText.match(/^(.+?)\((.+)\)$/);
    return {
      startDate: dateText,
      endDate: dateText,
      venueName: parenM ? parenM[1] : areaText,
      address: parenM ? parenM[2] : "",
      rawDate: true,
    };
  }

  return null;
}

/**
 * Parse date from YYYY-MM-DD string
 */
function parseDateYmd(str) {
  if (!str) return null;
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/**
 * Parse date from Japanese text "2026年2月26日（木）"
 */
function parseDateJapanese(str) {
  if (!str) return null;
  const m = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/**
 * Extract time from HTML detail table
 * <th>開催日時</th><td>...2026年2月26日（木）\n12:00～13:00</td>
 */
function parseTimeFromHtml(html) {
  if (!html) return { startHour: null, startMinute: null, endHour: null, endMinute: null };
  const cellM = html.match(/<th[^>]*>開催日時<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
  if (!cellM) return { startHour: null, startMinute: null, endHour: null, endMinute: null };
  const text = stripTags(cellM[1]);
  return parseTimeRangeFromText(text);
}

function createNaganoCheerfulCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNaganoCheerfulEvents(maxDays) {
    // Phase 1: Get event list from WP REST API
    let apiEvents;
    try {
      apiEvents = await fetchApiEvents();
    } catch (e) {
      console.warn(`[${label}] API fetch failed:`, e.message || e);
      return [];
    }
    if (!apiEvents || apiEvents.length === 0) return [];

    // Phase 2: Fetch detail pages in batches
    const byId = new Map();
    // Limit to recent entries (first 100 newest)
    const toFetch = apiEvents.slice(0, 100);

    for (let i = 0; i < toFetch.length; i += DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (entry) => {
          const html = await fetchText(entry.link);
          const info = parseDetailJsonLd(html);
          const timeRange = parseTimeFromHtml(html);
          return { entry, info, timeRange };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value.info) continue;
        const { entry, info, timeRange } = r.value;

        // Parse dates
        let startDate, endDate;
        if (info.rawDate) {
          startDate = parseDateJapanese(info.startDate);
          endDate = parseDateJapanese(info.endDate);
        } else {
          startDate = parseDateYmd(info.startDate);
          endDate = parseDateYmd(info.endDate);
        }
        if (!startDate) continue;

        // Check if any date in range
        const dates = [startDate];
        if (endDate && (endDate.y !== startDate.y || endDate.mo !== startDate.mo || endDate.d !== startDate.d)) {
          dates.push(endDate);
        }

        let anyInRange = false;
        for (const dd of dates) {
          if (inRangeJst(dd.y, dd.mo, dd.d, maxDays)) {
            anyInRange = true;
            break;
          }
        }
        if (!anyInRange) continue;

        // Geocoding
        const venue = sanitizeVenueText(info.venueName);
        const addr = sanitizeAddressText(info.address);
        const candidates = [];
        if (addr) {
          const full = addr.includes("長野") ? addr : `長野県${addr}`;
          candidates.push(full);
        }
        if (venue) candidates.push(`長野県 ${venue}`);

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = addr || (venue ? `長野県 ${venue}` : "長野県");
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        // Generate events for the start date only (multi-day events just use start)
        const dd = startDate;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${entry.id}:${entry.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const timeUnknown = timeRange.startHour === null;

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: entry.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || "",
          address: resolvedAddress || addr || "",
          url: entry.link,
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

module.exports = { createNaganoCheerfulCollector };

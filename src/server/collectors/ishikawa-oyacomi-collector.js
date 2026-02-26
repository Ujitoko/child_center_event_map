/**
 * いしかわ おやコミ！.net コレクター
 * https://www.i-oyacomi.net/event/
 *
 * 石川県の子育て支援ポータル。リストページ(2ページ)から
 * イベントURLを取得し、詳細ページでdate/time/venueを抽出。
 * 2種類の詳細フォーマット（Format A: dl/dt/dd, Format B: ul/li）を両方対応。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.i-oyacomi.net";
const MAX_LIST_PAGES = 2;
const DETAIL_BATCH = 5;

/**
 * リストページからイベントカード情報を抽出
 * <li><a href="/event/2026/02/10/1670"><div>2026 3月14日</div><div>無料</div><div>TITLE</div></a></li>
 */
function parseListPage(html) {
  const events = [];
  // Split by event-list-item links
  const blocks = html.split(/<a\s+href="(\/event\/[^"]+)"\s+class="event-list-item">/i);
  // blocks: [before, href1, content1, href2, content2, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const href = blocks[i];
    const content = blocks[i + 1] || "";
    // Year
    const yearM = content.match(/<span\s+class="year"[^>]*>\s*(\d{4})\s*<\/span>/i);
    if (!yearM) continue;
    // Date: <span class="val">M</span>月<span class="val">D</span>日
    const dateM = content.match(/<span\s+class="val">(\d{1,2})<\/span\s*>\s*月\s*<span\s+class="val">(\d{1,2})<\/span>\s*日/i);
    if (!dateM) continue;
    // Title
    const titleM = content.match(/<div\s+class="title">([^<]+)<\/div>/i);
    if (!titleM) continue;
    const title = titleM[1].trim();
    if (!title) continue;

    events.push({
      url: `${SITE_BASE}${href}`,
      title,
      y: Number(yearM[1]),
      mo: Number(dateM[1]),
      d: Number(dateM[2]),
    });
  }
  return events;
}

/**
 * 詳細ページからイベント情報を抽出
 * Format A: <dl><dt>開催日：</dt><dd>...</dd></dl>
 * Format B: <ul><li>日時 ...</li><li>場所 ...</li></ul>
 */
function parseDetailPage(html) {
  if (!html) return null;
  const result = { dateText: "", timeText: "", venue: "", address: "" };

  // Format A: dt/dd pattern
  const dtRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = dtRe.exec(html)) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (/開催日/.test(key)) result.dateText = val;
    if (/開催時間/.test(key)) result.timeText = val;
    if (/開催場所|会場/.test(key)) {
      result.venue = val;
      // Check for address pattern in venue text
      const addrM = val.match(/(石川県[\p{Script=Han}\d\-ー－番地号丁目の\s]+)/u);
      if (addrM) result.address = addrM[1].trim();
      // Also check for city-level address
      if (!result.address) {
        const cityM = val.match(/(金沢市|小松市|加賀市|白山市|能美市|野々市市|かほく市|羽咋市|七尾市|輪島市|珠洲市)([\p{Script=Han}\d\-ー－番地号丁目の\s]+)/u);
        if (cityM) result.address = `石川県${cityM[1]}${cityM[2]}`.trim();
      }
    }
  }

  // Format B: li pattern (if Format A didn't find data)
  if (!result.dateText) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    while ((m = liRe.exec(html)) !== null) {
      const text = stripTags(m[1]).replace(/\s+/g, " ").trim();
      if (/^日時/.test(text)) result.dateText = text.replace(/^日時\s*/, "");
      if (/^場所/.test(text)) {
        result.venue = text.replace(/^場所\s*/, "");
        const addrM = result.venue.match(/(石川県[\p{Script=Han}\d\-ー－番地号丁目の\s]+)/u);
        if (addrM) result.address = addrM[1].trim();
        if (!result.address) {
          const cityM = result.venue.match(/(金沢市|小松市|加賀市|白山市|能美市|野々市市|かほく市|羽咋市|七尾市|輪島市|珠洲市)([\p{Script=Han}\d\-ー－番地号丁目の\s]+)/u);
          if (cityM) result.address = `石川県${cityM[1]}${cityM[2]}`.trim();
        }
      }
    }
  }

  // Fallback: search for h3/bold labels
  if (!result.venue) {
    const venueM = html.match(/(?:会場|場所|開催場所)[：:]\s*([\s\S]*?)(?:<\/|<br)/i);
    if (venueM) result.venue = stripTags(venueM[1]).trim();
  }

  // Extract time from dateText if combined
  if (!result.timeText && result.dateText) {
    const timeM = result.dateText.match(/(\d{1,2}:\d{2})/);
    if (timeM) result.timeText = result.dateText;
  }

  return result;
}

/**
 * 日付テキストから年月日を抽出
 */
function parseDateFromText(text, fallbackYear) {
  if (!text) return null;
  // Full pattern: 2026年3月14日
  const fullM = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (fullM) return { y: Number(fullM[1]), mo: Number(fullM[2]), d: Number(fullM[3]) };
  // Short pattern: 3月14日
  const shortM = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (shortM) return { y: fallbackYear, mo: Number(shortM[1]), d: Number(shortM[2]) };
  return null;
}

function createIshikawaOyacomiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectIshikawaOyacomiEvents(maxDays) {
    // Step 1: Fetch list pages (1-2)
    const allListEvents = [];
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      try {
        const url = page === 1
          ? `${SITE_BASE}/event/`
          : `${SITE_BASE}/event/?page=${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const events = parseListPage(html);
        if (events.length === 0) break;
        allListEvents.push(...events);
      } catch (e) {
        if (page === 1) {
          console.warn(`[${label}] list fetch failed:`, e.message || e);
          return [];
        }
        break;
      }
    }

    if (allListEvents.length === 0) return [];

    // Filter to future events only
    const futureEvents = allListEvents.filter(ev => inRangeJst(ev.y, ev.mo, ev.d, maxDays));
    if (futureEvents.length === 0) return [];

    // Deduplicate by URL
    const uniqueMap = new Map();
    for (const ev of futureEvents) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }
    const toFetch = Array.from(uniqueMap.values()).slice(0, 40);

    // Step 2: Fetch detail pages
    const byId = new Map();

    for (let i = 0; i < toFetch.length; i += DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (ev) => {
          const html = await fetchText(ev.url);
          const detail = parseDetailPage(html);
          return { ev, detail };
        })
      );

      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const { ev, detail } = r.value;

        // Parse date from detail page or fallback to list date
        let dd;
        if (detail?.dateText) {
          dd = parseDateFromText(detail.dateText, ev.y);
        }
        if (!dd) dd = { y: ev.y, mo: ev.mo, d: ev.d };

        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Time
        const timeText = detail?.timeText || detail?.dateText || "";
        const timeRange = parseTimeRangeFromText(timeText);

        // Venue & address
        const venueRaw = detail?.venue || "";
        // Clean venue: remove address part in parentheses
        const cleanVenue = sanitizeVenueText(venueRaw.replace(/[（(][^）)]*[）)]/g, "").trim());
        const addr = detail?.address ? sanitizeAddressText(detail.address) : "";

        // Geocoding
        const candidates = [];
        if (addr) {
          const full = addr.includes("石川") ? addr : `石川県${addr}`;
          candidates.push(full);
        }
        if (cleanVenue) candidates.push(`石川県 ${cleanVenue}`);
        if (!addr && !cleanVenue) candidates.push("石川県金沢市");

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = addr || (cleanVenue ? `石川県 ${cleanVenue}` : "石川県金沢市");
        point = resolveEventPoint(source, cleanVenue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, cleanVenue, addrFallback, point);

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: cleanVenue || "",
          address: resolvedAddress || addr || "",
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: !timeRange || timeRange.startHour === null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createIshikawaOyacomiCollector };

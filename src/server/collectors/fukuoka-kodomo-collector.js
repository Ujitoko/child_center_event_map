/**
 * ふくおか子ども情報 コレクター
 * https://kodomo.city.fukuoka.lg.jp/event/
 *
 * WordPress カスタム投稿タイプ "event"。
 * 月別リストページ (?ym=YYYYMM) → 詳細ページ (event-details-1 テーブル)
 * 福岡市7区の子育てイベントを収集。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://kodomo.city.fukuoka.lg.jp";
const DETAIL_BATCH = 3;

/**
 * リストページから日付+イベントURLを抽出
 * ?ym=YYYYMM パラメータで月指定
 */
function parseListPage(html, year, month) {
  const events = [];
  // Match each event item
  const eventRe = /<div class="event__single-event">([\s\S]*?)<\/div>\s*(?=<div class="event__|<\/div>)/gi;

  // First, build day → events mapping from the list items
  const liRe = /<li class="event__item[^"]*">([\s\S]*?)<\/li>/gi;
  let liM;
  while ((liM = liRe.exec(html)) !== null) {
    const liContent = liM[1];

    // Extract day number
    const dayM = liContent.match(/<span class="event__item-day">(\d+)<\/span>/);
    if (!dayM) continue;
    const day = Number(dayM[1]);

    // Extract all events within this day
    const singleRe = /<div class="event__single-event">([\s\S]*?)<\/div>\s*<\/div>/gi;
    let sm;
    while ((sm = singleRe.exec(liContent)) !== null) {
      const block = sm[1];

      // Title and URL
      const linkM = block.match(/<a\s+class="event__item-title[^"]*"\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkM) continue;
      const url = linkM[1];
      const title = stripTags(linkM[2]).trim();
      if (!title) continue;

      // Ward from venue_icon
      const wardM = block.match(/<li class="event__item-category venue_icon">([^<]+)<\/li>/i);
      const ward = wardM ? wardM[1].trim() : "";

      events.push({ url, title, ward, y: year, mo: month, d: day });
    }
  }
  return events;
}

/**
 * 詳細ページから日時・会場を抽出
 */
function parseDetailPage(html) {
  if (!html) return null;

  const result = { dateTime: "", venue: "", address: "" };

  // event-details-1 table
  const table1M = html.match(/<table class="event-details-1">([\s\S]*?)<\/table>/i);
  if (table1M) {
    const rowRe = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(table1M[1])) !== null) {
      const key = stripTags(rm[1]).trim();
      const val = stripTags(rm[2]).trim();
      if (key === "日時") result.dateTime = val;
      if (key === "開催場所") result.venue = val;
    }
  }

  // Contact address from a.address__link
  const addrM = html.match(/<a\s+class="address__link"[^>]*>([\s\S]*?)<\/a>/i);
  if (addrM) result.address = stripTags(addrM[1]).trim();

  return result;
}

/**
 * 日時テキストから日付・時間を解析
 * "2026年2月4日（水） 10:00～11:30"
 */
function parseDateTimeText(text) {
  if (!text) return null;
  const dateM = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!dateM) return null;

  const dd = { y: Number(dateM[1]), mo: Number(dateM[2]), d: Number(dateM[3]) };
  const timeRange = parseTimeRangeFromText(text);
  return { dd, timeRange };
}

function createFukuokaKodomoCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectFukuokaKodomoEvents(maxDays) {
    // Determine months to fetch
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const months = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + i);
      months.push({
        y: d.getFullYear(),
        mo: d.getMonth() + 1,
        ym: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }

    // Step 1: Fetch list pages
    const allListEvents = [];
    for (const { y, mo, ym } of months) {
      try {
        const url = `${SITE_BASE}/event/?ym=${ym}`;
        const html = await fetchText(url);
        if (!html) continue;
        const events = parseListPage(html, y, mo);
        allListEvents.push(...events);
      } catch (_e) { /* skip month */ }
    }

    if (allListEvents.length === 0) return [];

    // Deduplicate by URL
    const uniqueEvents = new Map();
    for (const ev of allListEvents) {
      if (!uniqueEvents.has(ev.url)) uniqueEvents.set(ev.url, ev);
    }
    const toFetch = Array.from(uniqueEvents.values()).slice(0, 80);

    // Step 2: Fetch detail pages in batches
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
        if (r.status !== "fulfilled" || !r.value.detail) continue;
        const { ev, detail } = r.value;

        // Parse date/time from detail page (more reliable than list)
        let dd, timeRange;
        const parsed = parseDateTimeText(detail.dateTime);
        if (parsed) {
          dd = parsed.dd;
          timeRange = parsed.timeRange;
        } else {
          // Fallback to list page date
          dd = { y: ev.y, mo: ev.mo, d: ev.d };
          timeRange = { startHour: null, startMinute: null, endHour: null, endMinute: null };
        }

        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Geocoding
        const venue = sanitizeVenueText(detail.venue);
        const ward = ev.ward;
        const candidates = [];
        if (venue && ward) candidates.push(`福岡県福岡市${ward} ${venue}`);
        if (venue) candidates.push(`福岡県福岡市 ${venue}`);
        if (detail.address) {
          const full = detail.address.includes("福岡") ? detail.address : `福岡県${detail.address}`;
          candidates.push(full);
        }
        if (ward) candidates.push(`福岡県福岡市${ward}`);

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = ward ? `福岡県福岡市${ward}` : "福岡県福岡市";
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

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
          venue_name: venue || detail.venue || "",
          address: resolvedAddress || "",
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

module.exports = { createFukuokaKodomoCollector };

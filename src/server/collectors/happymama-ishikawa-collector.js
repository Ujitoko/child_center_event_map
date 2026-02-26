/**
 * はっぴーママいしかわ イベントコレクター
 * https://happymama-ishikawa.com/event/
 *
 * 石川県の子育てイベントポータル。
 * カスタムPHP。月別リストページ (?date=YYYY-MM) から全情報を取得。
 * 詳細ページ不要（リスト上に住所・会場・時間すべて掲載）。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const LIST_BASE = "https://happymama-ishikawa.com/event/index.php";

/**
 * リストページからイベントを抽出
 *
 * 各イベントは <article class="event-article"> 内に：
 *   .event-article-date: <h4>日付</h4> <p>時間</p>
 *   .event-article-content: <h3>タイトル</h3>
 *     <span class="placename">会場</span>
 *     住所／<a href="maps...">住所テキスト</a>
 */
function parseListPage(html) {
  const events = [];
  // Split by article blocks
  const articleRe = /<article\s+class="event-article[^"]*">([\s\S]*?)<\/article>/gi;
  let am;
  while ((am = articleRe.exec(html)) !== null) {
    const block = am[1];

    // Date: <h4>2026年3月1日(日)</h4> or <h4>2026年2月28日(土) 〜 2026年3月1日(日)</h4>
    const dateM = block.match(/<h4>([^<]+)<\/h4>/i);
    if (!dateM) continue;
    const dateText = dateM[1].trim();

    // Parse start date
    const startM = dateText.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!startM) continue;
    const dd = { y: Number(startM[1]), mo: Number(startM[2]), d: Number(startM[3]) };

    // Parse end date (multi-day events: 〜 separator)
    let endDd = null;
    const endM = dateText.match(/〜\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (endM) {
      endDd = { y: Number(endM[1]), mo: Number(endM[2]), d: Number(endM[3]) };
    }

    // Time: <p>10時00分 〜 11時00分</p> (inside .event-article-date div)
    const dateDiv = block.match(/event-article-date">([\s\S]*?)<\/div>/i);
    let startHour = null, startMinute = null, endHour = null, endMinute = null;
    if (dateDiv) {
      const timeM = dateDiv[1].match(/<p>(\d{1,2})時(\d{2})分\s*〜\s*(\d{1,2})時(\d{2})分<\/p>/i);
      if (timeM) {
        startHour = Number(timeM[1]);
        startMinute = Number(timeM[2]);
        endHour = Number(timeM[3]);
        endMinute = Number(timeM[4]);
      }
    }
    const timeRange = { startHour, startMinute, endHour, endMinute };

    // Title: <h3> inside .event-article-content
    const titleM = block.match(/<h3>\s*([\s\S]*?)\s*<\/h3>/i);
    const title = titleM ? stripTags(titleM[1]).trim() : "";
    if (!title) continue;

    // Venue: <span class="placename">
    const venueM = block.match(/<span\s+class="placename">([^<]+)<\/span>/i);
    const venue = venueM ? venueM[1].trim() : "";

    // Address: 住所／<a href="...">address text</a>
    let address = "";
    const addrM = block.match(/住所／<a[^>]*>([^<]+)<\/a>/i);
    if (addrM) {
      address = addrM[1].trim();
    }

    // Event image ID (for deduplication)
    const imgM = block.match(/eventinfo(\d+)\.jpg/);
    const eventId = imgM ? imgM[1] : "";

    events.push({ dd, endDd, timeRange, title, venue, address, eventId });
  }
  return events;
}

function createHappymamaIshikawaCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHappymamaIshikawaEvents(maxDays) {
    // Determine months to fetch (current + next 2)
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const months = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push(ym);
    }

    // Step 1: Fetch list pages for each month
    const allEvents = [];
    for (const ym of months) {
      try {
        const url = `${LIST_BASE}?date=${ym}`;
        const html = await fetchText(url);
        if (!html) continue;
        const events = parseListPage(html);
        allEvents.push(...events);
      } catch (_e) { /* skip month */ }
    }

    if (allEvents.length === 0) return [];

    // Step 2: Build event records
    const byId = new Map();

    for (const ev of allEvents) {
      // For multi-day events, generate one entry per day
      const dates = [ev.dd];
      if (ev.endDd) {
        // Generate intermediate dates
        const start = new Date(ev.dd.y, ev.dd.mo - 1, ev.dd.d);
        const end = new Date(ev.endDd.y, ev.endDd.mo - 1, ev.endDd.d);
        for (let d = new Date(start.getTime() + 86400000); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
        }
      }

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Geocoding
        const venue = sanitizeVenueText(ev.venue);
        const addr = sanitizeAddressText(ev.address);
        const candidates = [];
        if (addr) {
          const full = addr.includes("石川") ? addr : `石川県${addr}`;
          candidates.push(full);
        }
        if (venue) candidates.push(`石川県 ${venue}`);

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = addr || (venue ? `石川県 ${venue}` : "石川県金沢市");
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.eventId || ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(dd, ev.timeRange);

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue || "",
          address: resolvedAddress || addr || "",
          url: `${LIST_BASE}?date=${dd.y}-${String(dd.mo).padStart(2, "0")}`,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: !ev.timeRange || ev.timeRange.startHour === null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHappymamaIshikawaCollector };

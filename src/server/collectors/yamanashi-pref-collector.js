/**
 * 山梨県 CGIカレンダー イベントコレクター
 * https://www.pref.yamanashi.jp/cgi-bin/event_cal_multi/calendar.cgi
 *
 * 県公式 event_cal_multi CGI。type=2 (リスト表示) + event_target=1 (子ども向け)
 * で月別イベント一覧を取得。詳細ページから時間・会場・住所を抽出。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CGI_BASE = "https://www.pref.yamanashi.jp/cgi-bin/event_cal_multi/calendar.cgi";
const SITE_BASE = "https://www.pref.yamanashi.jp";
const DETAIL_BATCH = 3;

/**
 * CGIリストページからイベントを抽出
 *
 * <tr>
 *   <td class="cal_date ..."><p class="day"><span>1</span>日</p></td>
 *   <td>
 *     <li class="cal_event_index_4 ...">
 *       <a href="/event/...">タイトル</a>
 *     </li>
 *   </td>
 * </tr>
 */
function parseListPage(html, year, month) {
  const events = [];
  // Match each day row
  const rowRe = /<tr>\s*<td\s+class="cal_date[^"]*cal_day_(\d+)[^"]*">([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const day = Number(m[1]);
    const eventsTd = m[3];

    // Extract event links
    const linkRe = /<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(eventsTd)) !== null) {
      let href = lm[1].trim();
      const title = lm[2].trim();
      if (!title) continue;

      // Build full URL
      if (href.startsWith("/")) href = `${SITE_BASE}${href}`;

      events.push({ url: href, title, y: year, mo: month, d: day });
    }
  }
  return events;
}

/**
 * 詳細ページから時間・会場・住所を抽出
 */
function parseDetailPage(html) {
  if (!html) return null;
  const result = { timeText: "", venue: "", address: "" };

  // 開催日時 section: <h2>開催日時</h2> ... <p>時間テキスト</p>
  const timeSection = html.match(/<h2>開催日時<\/h2>([\s\S]*?)(?:<h2>|$)/i);
  if (timeSection) {
    const pM = timeSection[1].match(/<p>([^<]*(?:時|分)[^<]*)<\/p>/i);
    if (pM) result.timeText = pM[1].trim();
  }

  // 開催場所 section: table with 名称/住所 rows
  const venueSection = html.match(/<h2>開催場所<\/h2>([\s\S]*?)(?:<h2>|$)/i);
  if (venueSection) {
    const block = venueSection[1];
    // 名称
    const nameM = block.match(/<th[^>]*>名称<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (nameM) result.venue = stripTags(nameM[1]).trim();
    // 住所
    const addrM = block.match(/<th[^>]*>住所<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
    if (addrM) result.address = stripTags(addrM[1]).trim();
  }

  return result;
}

function createYamanashiPrefCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectYamanashiPrefEvents(maxDays) {
    const now = new Date();
    const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));

    // Fetch 3 months: current + next 2
    const allListEvents = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      try {
        const url = `${CGI_BASE}?type=2&event_target=1&year=${year}&month=${month}`;
        const html = await fetchText(url);
        if (!html) continue;
        const events = parseListPage(html, year, month);
        allListEvents.push(...events);
      } catch (_e) { /* skip month */ }
    }

    if (allListEvents.length === 0) return [];

    // Filter to in-range events
    const futureEvents = allListEvents.filter(ev =>
      inRangeJst(ev.y, ev.mo, ev.d, maxDays)
    );
    if (futureEvents.length === 0) return [];

    // Deduplicate by URL
    const uniqueMap = new Map();
    for (const ev of futureEvents) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }
    const toFetch = Array.from(uniqueMap.values()).slice(0, 40);

    // Fetch detail pages for time/venue/address
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

        // Find all days this event appears on
        const eventDays = allListEvents
          .filter(e => e.url === ev.url)
          .map(e => ({ y: e.y, mo: e.mo, d: e.d }));

        for (const dd of eventDays) {
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

          // Time
          const timeRange = detail?.timeText
            ? parseTimeRangeFromText(detail.timeText)
            : { startHour: null, startMinute: null, endHour: null, endMinute: null };

          // Venue & address
          const venue = sanitizeVenueText(detail?.venue || "");
          const addr = detail?.address ? sanitizeAddressText(detail.address) : "";

          // Geocoding
          const candidates = [];
          if (addr) {
            const full = addr.includes("山梨") ? addr : `山梨県${addr}`;
            candidates.push(full);
          }
          if (venue) candidates.push(`山梨県 ${venue}`);
          if (!addr && !venue) candidates.push("山梨県甲府市");

          let point = await geocodeForWard(candidates.slice(0, 3), source);
          const addrFallback = addr || (venue ? `山梨県 ${venue}` : "山梨県甲府市");
          point = resolveEventPoint(source, venue, point, addrFallback);
          const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

          const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
          const id = `${srcKey}:${ev.url}:${dateKey}`;
          if (byId.has(id)) continue;

          const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);

          byId.set(id, {
            id,
            source: srcKey,
            source_label: label,
            title: ev.title,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: venue || "",
            address: resolvedAddress || addr || "",
            url: ev.url,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            time_unknown: timeRange.startHour === null,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createYamanashiPrefCollector };

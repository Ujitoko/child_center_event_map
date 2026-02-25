/**
 * 子育てし大県"さが" イベントコレクター
 * https://saga-kosodate.jp/kosodate/events/
 *
 * 佐賀県の子育てポータル。リストページ(最大3ページ)から
 * イベントタイトル(日付入り)とsaga-taiken.jp詳細URLを取得し、
 * 詳細ページのテーブルから住所・開催期間を抽出。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const LIST_BASE = "https://saga-kosodate.jp/kosodate/events";
const MAX_LIST_PAGES = 3;
const DETAIL_BATCH = 3;

/**
 * リストページからイベントリンクを抽出
 * <li class="event__listArticle"><span class="event__listTitle">
 *   <a href="https://saga-taiken.jp/event_info/...">【2月28日・3月1日】タイトル</a>
 * </span></li>
 */
function parseListPage(html, currentYear) {
  const events = [];
  const liRe = /<li\s+class="event__listArticle">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const content = m[1];
    const linkM = content.match(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!linkM) continue;

    const url = linkM[1].trim();
    const linkText = linkM[2].trim();

    // Parse 【date】title pattern
    const bracketM = linkText.match(/^【([^】]+)】(.+)$/);
    if (!bracketM) continue;

    const dateStr = bracketM[1].trim();
    const title = bracketM[2].replace(/[（(][^）)]*[）)]\s*$/, "").trim();
    if (!title) continue;

    // Parse first date from bracket: "2月28日", "3月7日・8日", "2月27日～3月1日"
    const firstDateM = dateStr.match(/(\d{1,2})月(\d{1,2})日/);
    if (!firstDateM) continue;

    const mo = Number(firstDateM[1]);
    const d = Number(firstDateM[2]);
    // Infer year: if month < current month - 2, likely next year
    const jstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const curMo = jstNow.getMonth() + 1;
    let y = currentYear;
    if (mo < curMo - 2) y = currentYear + 1;

    events.push({ url, title, y, mo, d });
  }
  return events;
}

/**
 * saga-taiken.jp 詳細ページから住所・開催期間を抽出
 * <th>住所</th><td>佐賀県...</td>
 * <th>開催期間</th><td>日付テキスト</td>
 */
function parseDetailPage(html) {
  if (!html) return null;
  const result = { address: "", dateText: "", venue: "" };

  // Table rows: <th>key</th><td>value</td>
  const rowRe = /<th>([^<]+)<\/th>\s*<td>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = m[1].trim();
    const val = stripTags(m[2]).trim();
    if (key === "住所") result.address = val;
    if (key === "開催期間") result.dateText = val;
    if (key === "施設名" || key === "体験施設名") result.venue = val;
  }

  // Fallback: venue from ■場所 or 開催場所
  if (!result.venue) {
    const venueM = html.match(/(?:■場所|■開催場所|■会場)[：:]?\s*([^\n<]+)/i);
    if (venueM) result.venue = stripTags(venueM[1]).trim();
  }

  // Fallback: address from body text
  if (!result.address) {
    const addrM = html.match(/■住所[：:]?\s*([^\n<]+)/i);
    if (addrM) result.address = stripTags(addrM[1]).trim();
  }

  return result;
}

function createSagaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSagaKosodateEvents(maxDays) {
    const jstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const currentYear = jstNow.getFullYear();

    // Step 1: Fetch list pages
    const allListEvents = [];
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      try {
        const url = page === 1
          ? `${LIST_BASE}/`
          : `${LIST_BASE}?page=${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const events = parseListPage(html, currentYear);
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

    // Pre-filter to in-range events
    const futureEvents = allListEvents.filter(ev =>
      inRangeJst(ev.y, ev.mo, ev.d, maxDays)
    );
    if (futureEvents.length === 0) return [];

    // Deduplicate by URL
    const uniqueMap = new Map();
    for (const ev of futureEvents) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }
    const toFetch = Array.from(uniqueMap.values()).slice(0, 30);

    // Step 2: Fetch detail pages for address/venue
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

        const dd = { y: ev.y, mo: ev.mo, d: ev.d };
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Time from detail dateText
        const timeText = detail?.dateText || "";
        const timeRange = parseTimeRangeFromText(timeText);

        // Venue & address
        const venue = sanitizeVenueText(detail?.venue || "");
        const addr = detail?.address ? sanitizeAddressText(detail.address) : "";

        // Geocoding
        const candidates = [];
        if (addr) {
          const full = addr.includes("佐賀") ? addr : `佐賀県${addr}`;
          candidates.push(full);
        }
        if (venue) candidates.push(`佐賀県 ${venue}`);
        if (!addr && !venue) candidates.push("佐賀県佐賀市");

        let point = await geocodeForWard(candidates.slice(0, 3), source);
        const addrFallback = addr || (venue ? `佐賀県 ${venue}` : "佐賀県佐賀市");
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.title}:${dateKey}`;
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

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createSagaKosodateCollector };

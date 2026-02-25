/**
 * ながはぴ（nagahapi.jp）コレクター
 * https://nagahapi.jp/kosodate/event/
 *
 * 長崎県の子育てポータル「子育てココロンネット」。
 * リストページ(30件/page, 最大7ページ)からイベント情報を取得。
 * リストに開催日・施設名・市区名あり。詳細ページは時間取得用に一部フェッチ。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://nagahapi.jp";
const LIST_PATH = "/kosodate/event/";
const MAX_LIST_PAGES = 5; // 30 events/page × 5 = 150 max
const DETAIL_BATCH = 5;

/**
 * リストページからイベントを抽出
 *
 * <div class="event_list">
 *   <div class="event_detail">
 *     <p class="date"><span class="area">市名</span><span class="subject">対象：親子</span></p>
 *     <p class="title"><a href="/kosodate/event/detail.php?id=237">タイトル</a></p>
 *     <p class="detail_txt">開催日：2026年03月29日\n施設名：会場名</p>
 *   </div>
 * </div>
 */
function parseListPage(html) {
  const events = [];
  const blockRe = /<div\s+class="event_list">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[1];

    // Title + detail URL
    const titleM = block.match(/<p\s+class="title"><a\s+href="([^"]+)">([^<]+)<\/a><\/p>/i);
    if (!titleM) continue;
    const detailPath = titleM[1];
    const title = titleM[2].trim();
    if (!title) continue;
    const detailUrl = `${SITE_BASE}${detailPath}`;

    // City area
    const areaM = block.match(/<span\s+class="area[^"]*">([^<]+)<\/span>/i);
    const city = areaM ? areaM[1].trim() : "";

    // Target audience
    const subjectM = block.match(/<span\s+class="subject">([^<]+)<\/span>/i);
    const subject = subjectM ? subjectM[1].trim() : "";

    // Date + venue from detail_txt
    const detailTxtM = block.match(/<p\s+class="detail_txt">([\s\S]*?)<\/p>/i);
    let startDate = null, endDate = null, venue = "";
    if (detailTxtM) {
      const txt = stripTags(detailTxtM[1]).trim();

      // 開催日：2026年03月29日 or 開催日：2026年03月07日 ～ 2026年03月08日
      const dateM = txt.match(/開催日[：:]\s*(\d{4})年(\d{2})月(\d{2})日/);
      if (dateM) {
        startDate = { y: Number(dateM[1]), mo: Number(dateM[2]), d: Number(dateM[3]) };
      }
      const endM = txt.match(/～\s*(\d{4})年(\d{2})月(\d{2})日/);
      if (endM) {
        endDate = { y: Number(endM[1]), mo: Number(endM[2]), d: Number(endM[3]) };
      }

      // 施設名：venue
      const venueM = txt.match(/施設名[：:]\s*(.+)/);
      if (venueM) venue = venueM[1].trim();
    }

    if (!startDate) continue;

    events.push({ title, detailUrl, city, subject, startDate, endDate, venue });
  }
  return events;
}

/**
 * 詳細ページから時間・住所・座標を抽出
 */
function parseDetailPage(html) {
  if (!html) return null;
  const result = { timeText: "", address: "", lat: null, lng: null };

  // Table rows: <th>key</th><td>value</td>
  const rowRe = /<tr>\s*<th>([^<]+)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = m[1].trim();
    const val = stripTags(m[2]).trim();
    if (key === "開催時間") result.timeText = val;
    if (key === "住所") result.address = val.replace(/^〒\d{3}-\d{4}\s*/, "").trim();
  }

  // Leaflet marker coordinates: L.marker([lat, lng])
  const coordM = html.match(/L\.marker\(\[(\d+\.\d+),\s*(\d+\.\d+)\]\)/);
  if (coordM) {
    result.lat = parseFloat(coordM[1]);
    result.lng = parseFloat(coordM[2]);
  }

  return result;
}

function createNagahapiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNagahapiEvents(maxDays) {
    // Step 1: Fetch list pages
    const allListEvents = [];
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      try {
        const url = `${SITE_BASE}${LIST_PATH}?p=${page}`;
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

    // Filter to in-range events
    const futureEvents = allListEvents.filter(ev =>
      inRangeJst(ev.startDate.y, ev.startDate.mo, ev.startDate.d, maxDays)
    );
    if (futureEvents.length === 0) return [];

    // Deduplicate by detail URL
    const uniqueMap = new Map();
    for (const ev of futureEvents) {
      if (!uniqueMap.has(ev.detailUrl)) uniqueMap.set(ev.detailUrl, ev);
    }
    const toProcess = Array.from(uniqueMap.values());

    // Step 2: Fetch detail pages in batches for time/address/coordinates
    const detailCache = new Map();
    const toFetch = toProcess.slice(0, 60); // limit detail fetches

    for (let i = 0; i < toFetch.length; i += DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (ev) => {
          const html = await fetchText(ev.detailUrl);
          return { url: ev.detailUrl, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.detail) {
          detailCache.set(r.value.url, r.value.detail);
        }
      }
    }

    // Step 3: Build event records
    const byId = new Map();

    for (const ev of toProcess) {
      const detail = detailCache.get(ev.detailUrl);

      // Generate dates for multi-day events
      const dates = [ev.startDate];
      if (ev.endDate) {
        const start = new Date(ev.startDate.y, ev.startDate.mo - 1, ev.startDate.d);
        const end = new Date(ev.endDate.y, ev.endDate.mo - 1, ev.endDate.d);
        for (let d = new Date(start.getTime() + 86400000); d <= end && dates.length < 14; d.setDate(d.getDate() + 1)) {
          dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
        }
      }

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        // Time
        const timeRange = detail?.timeText
          ? parseTimeRangeFromText(detail.timeText)
          : { startHour: null, startMinute: null, endHour: null, endMinute: null };

        // Venue & address
        const venue = sanitizeVenueText(ev.venue);
        const addr = detail?.address ? sanitizeAddressText(detail.address) : "";

        // Use detail coordinates if available
        let point = null;
        if (detail?.lat && detail?.lng) {
          point = { lat: detail.lat, lng: detail.lng };
        }

        // Geocoding fallback
        if (!point) {
          const candidates = [];
          if (addr) {
            const full = addr.includes("長崎") ? addr : `長崎県${addr}`;
            candidates.push(full);
          }
          if (venue && ev.city) candidates.push(`長崎県${ev.city} ${venue}`);
          if (venue) candidates.push(`長崎県 ${venue}`);
          if (ev.city) candidates.push(`長崎県${ev.city}`);
          point = await geocodeForWard(candidates.slice(0, 3), source);
        }

        const addrFallback = addr || (venue && ev.city ? `長崎県${ev.city} ${venue}` : `長崎県${ev.city || ""}`);
        point = resolveEventPoint(source, venue, point, addrFallback);
        const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.detailUrl}:${dateKey}`;
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
          url: ev.detailUrl,
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

module.exports = { createNagahapiCollector };

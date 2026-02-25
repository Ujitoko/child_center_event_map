/**
 * 岡山市こそだてぽけっと イベントコレクター
 * https://www.city.okayama.jp/ft4/event4_list.php
 *
 * 岡山市の子育てイベントカレンダー。月間一覧ページ(最大14ページ)から
 * /kosodate/ パスのイベントのみを抽出。詳細ページから時間・会場を取得。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.city.okayama.jp";
const MAX_LIST_PAGES = 14;
const DETAIL_BATCH = 5;

/**
 * リストページからこそだてイベントを抽出
 *
 * <h2>2026年3月1日（日曜日）</h2>
 * ...
 * <div class="cat_lst"><a href="/kosodate/0000078088.html">タイトル【会場】</a></div>
 */
function parseListPage(html) {
  const events = [];
  let currentDate = null;

  // Split by lines and track current date header
  const dateHeaderRe = /<h2>(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const linkRe = /<div\s+class="cat_lst"><a\s+href="(\/kosodate\/[^"]+)">([^<]+)<\/a><\/div>/g;

  // First pass: find all date headers and their positions
  const datePositions = [];
  let m;
  const headerRe = /<h2>(\d{4})年(\d{1,2})月(\d{1,2})日[^<]*<\/h2>/g;
  while ((m = headerRe.exec(html)) !== null) {
    datePositions.push({
      pos: m.index,
      y: Number(m[1]),
      mo: Number(m[2]),
      d: Number(m[3]),
    });
  }

  // Second pass: find all kosodate links and associate with nearest preceding date
  while ((m = linkRe.exec(html)) !== null) {
    const linkPos = m.index;
    const path = m[1];
    const rawTitle = m[2].trim();

    // Find the date header that precedes this link
    let date = null;
    for (let i = datePositions.length - 1; i >= 0; i--) {
      if (datePositions[i].pos < linkPos) {
        date = datePositions[i];
        break;
      }
    }
    if (!date) continue;

    // Extract venue from 【】brackets
    let title = rawTitle;
    let venue = "";
    const bracketM = rawTitle.match(/【([^】]+)】$/);
    if (bracketM) {
      venue = bracketM[1].trim();
      title = rawTitle.replace(/【[^】]+】$/, "").trim();
    }

    // Remove leading date prefix like 【2026年3月1日】 or 【2026年1月10日から】
    title = title.replace(/^【\d{4}年\d{1,2}月\d{1,2}日[^】]*】\s*/, "").trim();

    events.push({
      url: `${SITE_BASE}${path}`,
      title,
      venue,
      y: date.y,
      mo: date.mo,
      d: date.d,
    });
  }
  return events;
}

/**
 * 詳細ページから時間・会場住所を抽出
 * <h2 class="block_index_NNNN">開催日時</h2> → <p>令和8年3月1日...午後2時...まで</p>
 * <h2 class="block_index_NNNN">開催場所</h2> → <p>施設名（住所）</p>
 */
function parseDetailPage(html) {
  if (!html) return null;
  const result = { timeText: "", venue: "", address: "" };

  // 開催日時
  const timeSection = html.match(/<h2[^>]*>開催日時<\/h2>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
  if (timeSection) {
    result.timeText = stripTags(timeSection[1]).trim();
  }

  // 開催場所
  const placeSection = html.match(/<h2[^>]*>開催場所<\/h2>\s*<div[^>]*>([\s\S]*?)<\/div>/i);
  if (placeSection) {
    const text = stripTags(placeSection[1]).trim();
    // Often: "施設名（住所）" format
    const addrM = text.match(/[（(]([^）)]*(?:岡山|市|区|町|丁目)[^）)]*)[）)]/);
    if (addrM) {
      result.address = addrM[1].trim();
      result.venue = text.replace(/[（(][^）)]*[）)]/, "").trim();
    } else {
      result.venue = text;
    }
  }

  return result;
}

function createOkayamaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOkayamaKosodateEvents(maxDays) {
    const jstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const year = jstNow.getFullYear();
    const month = jstNow.getMonth() + 1;

    // Fetch list pages for current month + next month
    const allListEvents = [];
    for (let mi = 0; mi < 2; mi++) {
      const d = new Date(jstNow);
      d.setMonth(d.getMonth() + mi);
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;

      for (let page = 1; page <= MAX_LIST_PAGES; page++) {
        try {
          const url = `${SITE_BASE}/ft4/event4_list.php?event4_range=m&event4_year=${y}&event4_month=${mo}&event4_day=1&page=${page}`;
          const html = await fetchText(url);
          if (!html) break;
          const events = parseListPage(html);
          // If no kosodate events on this page, still continue (other pages may have them)
          allListEvents.push(...events);
          // Stop if page looks like it's past the last
          if (!html.includes(`page=${page + 1}`)) break;
        } catch (_e) {
          break;
        }
      }
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
    const toFetch = Array.from(uniqueMap.values()).slice(0, 50);

    // Fetch detail pages in batches
    const detailCache = new Map();
    for (let i = 0; i < toFetch.length; i += DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (ev) => {
          const html = await fetchText(ev.url);
          return { url: ev.url, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.detail) {
          detailCache.set(r.value.url, r.value.detail);
        }
      }
    }

    // Build event records
    const byId = new Map();

    for (const ev of futureEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailCache.get(ev.url);

      // Time
      const timeText = detail?.timeText || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // Venue & address
      const venue = sanitizeVenueText(detail?.venue || ev.venue || "");
      const addr = detail?.address ? sanitizeAddressText(detail.address) : "";

      // Geocoding
      const candidates = [];
      if (addr) {
        const full = addr.includes("岡山") ? addr : `岡山市${addr}`;
        candidates.push(full);
      }
      if (venue) candidates.push(`岡山市 ${venue}`);
      if (!addr && !venue) candidates.push("岡山市北区");

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      const addrFallback = addr || (venue ? `岡山市 ${venue}` : "岡山市");
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);

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

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createOkayamaKosodateCollector };

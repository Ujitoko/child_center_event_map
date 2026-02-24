/**
 * イクちゃんネット（広島県子育てポータル）コレクター
 * https://ikuchan.or.jp/event/
 *
 * AJAX list.php でイベント一覧を取得し、詳細ページから
 * 住所・施設名・開催日時を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { getMonthsForRange, inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://ikuchan.or.jp";
const LIST_URL = `${SITE_BASE}/event/list.php`;
const DETAIL_BATCH = 5;

/** list.php HTML フラグメントからイベント URL を抽出 */
function parseListHtml(html) {
  const events = [];
  // <a href="/event/00006412.html">タイトル</a>
  const re = /<a\s+href="(\/event\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    const title = stripTags(m[2]).trim();
    if (title && href) {
      const idMatch = href.match(/(\d+)\.html/);
      const eventId = idMatch ? idMatch[1] : href;
      events.push({ id: eventId, title, url: `${SITE_BASE}${href}` });
    }
  }
  // 重複除去
  const seen = new Set();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/** 詳細ページから開催日時テキストを抽出 */
function extractDateTimeText(html) {
  // <dt>開催日時</dt><dd>...</dd>
  const m = html.match(/<dt[^>]*>\s*開催日時\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
  return m ? stripTags(m[1]).replace(/\s+/g, " ").trim() : "";
}

/** 詳細ページから住所と施設名を抽出 */
function extractVenueAddress(html) {
  let address = "";
  let venue = "";

  // 開催場所セクション内のサブDL
  const placeSection = html.match(/<dt[^>]*>\s*開催場所\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/i);
  if (placeSection) {
    const content = placeSection[1];
    // 住所
    const addrMatch = content.match(/住所[\s\S]*?<div\s+class="con">([\s\S]*?)<\/div>/i);
    if (addrMatch) address = stripTags(addrMatch[1]).replace(/\s+/g, " ").trim();
    // 施設名
    const venueMatch = content.match(/施設名[\s\S]*?<div\s+class="con">([\s\S]*?)<\/div>/i);
    if (venueMatch) venue = stripTags(venueMatch[1]).replace(/\s+/g, " ").trim();
  }

  return {
    venue: sanitizeVenueText(venue),
    address: sanitizeAddressText(address),
  };
}

/** 詳細ページからエリア（市区町村名）を抽出 */
function extractArea(html) {
  const m = html.match(/<p\s+class="area">([\s\S]*?)<\/p>/i);
  return m ? stripTags(m[1]).trim() : "";
}

/** 開催日時テキストから年月日を抽出 (複数日対応) */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];

  // "2026年2月14日" or "2月14日" パターン
  const fullRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = fullRe.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  if (dates.length > 0) {
    // 範囲 "〜" の場合は最初の日付のみ
    if (dates.length === 2 && text.includes("～")) return [dates[0]];
    return dates;
  }

  // 年なしパターン "2月14日"
  const now = new Date();
  const jstYear = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now);
  const currentYear = Number(jstYear);
  const jstMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", month: "numeric" }).format(now);
  const currentMonth = Number(jstMonth);

  const shortRe = /(\d{1,2})月(\d{1,2})日/g;
  while ((m = shortRe.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = (mo < currentMonth - 1) ? currentYear + 1 : currentYear;
    dates.push({ y, mo, d });
  }

  // 範囲の場合は最初のみ
  if (dates.length === 2 && text.includes("～")) return [dates[0]];
  return dates;
}

function buildGeoCandidates(venue, address, area) {
  const pref = "広島県";
  const candidates = [];
  if (address) {
    const full = address.includes("広島") ? address : `${pref}${address}`;
    candidates.push(full);
  }
  if (venue && area) {
    candidates.push(`${pref}${area} ${venue}`);
  }
  if (venue) {
    candidates.push(`${pref} ${venue}`);
  }
  if (area && !address) {
    candidates.push(`${pref}${area}`);
  }
  return [...new Set(candidates)];
}

function createIkuchanCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectIkuchanEvents(maxDays) {
    // Step 1: list.php で月別イベント一覧を取得
    const months = getMonthsForRange(maxDays);
    const allEvents = new Map(); // id → { id, title, url }

    for (const { year, month } of months) {
      const ym = `${year}${String(month).padStart(2, "0")}`;
      try {
        const url = `${LIST_URL}?mode=1&shop=&m=${ym}&a=&c=&t=`;
        const html = await fetchText(url);
        if (!html) continue;
        for (const e of parseListHtml(html)) {
          if (!allEvents.has(e.id)) allEvents.set(e.id, e);
        }
      } catch (_e) { /* skip month errors */ }
    }

    if (allEvents.size === 0) return [];

    // Step 2: 詳細ページをバッチ取得
    const entries = Array.from(allEvents.values()).slice(0, 120);
    const detailMap = new Map();

    for (let i = 0; i < entries.length; i += DETAIL_BATCH) {
      const batch = entries.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (e) => {
          const html = await fetchText(e.url);
          return { id: e.id, html };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.html) {
          detailMap.set(r.value.id, r.value.html);
        }
      }
    }

    // Step 3: イベントレコード生成
    const byId = new Map();

    for (const [eventId, entry] of allEvents) {
      const html = detailMap.get(eventId);
      if (!html) continue;

      const title = entry.title;
      const dateTimeText = extractDateTimeText(html);
      const { venue, address } = extractVenueAddress(html);
      const area = extractArea(html);
      const timeRange = parseTimeRangeFromText(dateTimeText);
      const dates = parseDatesFromText(dateTimeText);

      if (dates.length === 0) continue;

      // ジオコーディング (イベントごとに1回)
      const geoCandidates = buildGeoCandidates(venue, address, area);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `${area} ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `${area} ${venue}`, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${entry.url}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: resolvedAddress || "",
          url: entry.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createIkuchanCollector };

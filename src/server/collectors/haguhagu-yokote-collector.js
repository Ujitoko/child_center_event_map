/**
 * はぐはぐ横手 イベントコレクター
 * https://www.haguhagu-yokote.jp/event
 *
 * 秋田県横手市の子育てポータル (WordPress)。リストページから一覧を取得し、
 * 詳細ページから日時・住所・座標を抽出する。~35-50 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE = "https://www.haguhagu-yokote.jp";
const DETAIL_BATCH = 8;
const MAX_PAGES = 10;

/** リストページからイベントカードを抽出 */
function parseListPage(html) {
  const events = [];
  // <li class="clearfix"> ... <p class="place">VENUE</p> <h4><a href="URL">TITLE</a></h4> ...
  const cardRe = /<li\s+class="clearfix">([\s\S]*?)<\/li>/gi;
  let cm;
  while ((cm = cardRe.exec(html)) !== null) {
    const block = cm[1];
    // venue
    const venueMatch = block.match(/<p\s+class="place">([^<]+)<\/p>/);
    const venue = venueMatch ? venueMatch[1].trim() : "";
    // title + url
    const linkMatch = block.match(/<h4>\s*<a\s+href="([^"]+)">([^<]+)<\/a>/);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const title = linkMatch[2].trim();
    // date (month + day from list, no year)
    const monthMatch = block.match(/<span\s+class="date-month">([^<]+)<\/span>/);
    const dayMatch = block.match(/<span\s+class="date-day">([^<]+)<\/span>/);
    const month = monthMatch ? monthMatch[1].replace(/月/, "").trim() : "";
    const day = dayMatch ? dayMatch[1].trim() : "";
    events.push({ href, title, venue, monthStr: month, dayStr: day });
  }
  return events;
}

/** 詳細ページから日時・住所・座標を抽出 */
function parseDetailPage(html) {
  const meta = {};
  if (!html) return meta;
  // <dl class="info-dlist"> <dt>KEY</dt><dd>VALUE</dd> ...
  const dtRe = /<dt>([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi;
  let dm;
  while ((dm = dtRe.exec(html)) !== null) {
    const key = dm[1].trim();
    const rawVal = dm[2];
    if (key === "開催日") {
      meta.dateText = stripTags(rawVal).replace(/\s+/g, " ").trim();
    } else if (key === "開催時間") {
      meta.timeText = stripTags(rawVal).replace(/\s+/g, " ").trim();
    } else if (key === "開催場所") {
      // <span class="place-name"><a>NAME</a></span> <span class="place-address">ADDR</span>
      const nameMatch = rawVal.match(/<span\s+class="place-name"[^>]*>([\s\S]*?)<\/span>/);
      if (nameMatch) meta.venue = stripTags(nameMatch[1]).trim();
      const addrMatch = rawVal.match(/<span\s+class="place-address"[^>]*>([^<]+)<\/span>/);
      if (addrMatch) meta.address = addrMatch[1].trim();
    }
  }
  // LatLng from embedded Google Maps
  const latlngMatch = html.match(/LatLng\(\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
  if (latlngMatch) {
    meta.lat = parseFloat(latlngMatch[1]);
    meta.lng = parseFloat(latlngMatch[2]);
  }
  return meta;
}

/** 日付テキストから年月日を抽出 */
function parseDateFromText(text) {
  if (!text) return null;
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

function createHaguhaguYokoteCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHaguhaguYokoteEvents(maxDays) {
    // リストページをページネーション取得
    const allCards = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = page === 1 ? `${BASE}/event` : `${BASE}/event/page/${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
      } catch (e) {
        console.warn(`[${label}] list page ${page} failed:`, e.message || e);
        break;
      }
    }

    if (allCards.length === 0) return [];

    // 詳細ページをバッチ取得 (日付+住所+座標)
    const detailMap = new Map();
    const urls = [...new Set(allCards.map(c => c.href))].slice(0, 120);
    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const card of allCards) {
      const detail = detailMap.get(card.href) || {};
      const meta = detail.meta || {};

      // 日付: 詳細ページ優先 (年が分かる)
      const date = parseDateFromText(meta.dateText);
      if (!date) continue;
      if (!inRangeJst(date.y, date.mo, date.d, maxDays)) continue;

      const venueName = sanitizeVenueText(meta.venue || card.venue || "");
      const rawAddr = meta.address || "";
      const address = rawAddr
        ? sanitizeAddressText(rawAddr.startsWith("秋田県") ? rawAddr : `秋田県${rawAddr}`)
        : venueName ? `秋田県横手市 ${venueName}` : "秋田県横手市";

      // 時間
      const timeRange = parseTimeRangeFromText(meta.timeText || "");

      // 座標: 詳細ページの埋め込みGoogleMap優先
      let point = (meta.lat && meta.lng) ? { lat: meta.lat, lng: meta.lng } : null;
      if (!point) {
        const candidates = [];
        if (rawAddr) candidates.push(address);
        if (venueName) candidates.push(`秋田県横手市 ${venueName}`);
        candidates.push("秋田県横手市");
        point = await geocodeForWard(candidates.slice(0, 3), source);
      }
      point = resolveEventPoint(source, venueName, point, address);
      const resolvedAddress = resolveEventAddress(source, venueName, address, point);

      const dateKey = `${date.y}${String(date.mo).padStart(2, "0")}${String(date.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(date, timeRange);
      const id = `${srcKey}:${card.href}:${card.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: card.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: resolvedAddress || "",
        url: card.href,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHaguhaguYokoteCollector };

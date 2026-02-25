/**
 * こどもスマイルムーブメント イベントコレクター
 * https://kodomo-smile.metro.tokyo.lg.jp/events
 *
 * 東京都の官民連携こども体験イベントポータル (Rails)。
 * リストページから一覧取得 + 内部イベントの詳細ページから会場・住所抽出。
 * ~80-120 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE = "https://kodomo-smile.metro.tokyo.lg.jp";
const DETAIL_BATCH = 5;
const MAX_PAGES = 10;

/** リストページからイベントカードを抽出 */
function parseListPage(html) {
  const events = [];
  const cardRe = /<div\s+class="event-card">\s*<a\s+class="event-card__link"([^>]*)href="([^"]+)">([\s\S]*?)<\/a>\s*<\/div>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const attrs = m[1];
    const href = m[2];
    const block = m[3];
    const isExternal = /target="_blank"/.test(attrs);

    // title
    const titleM = block.match(/<h3\s+class="event-card__title">([\s\S]*?)<\/h3>/i);
    const title = titleM ? stripTags(titleM[1]).replace(/\s+/g, " ").trim() : "";
    if (!title) continue;

    // date (aria-label has structured date)
    const dateM = block.match(/<p\s+class="event-card__date"[^>]*aria-label="([^"]*)"[^>]*>([\s\S]*?)<\/p>/i);
    const dateAria = dateM ? dateM[1] : "";
    const dateVisible = dateM ? stripTags(dateM[2]).replace(/\s+/g, " ").trim() : "";

    // area
    const areaM = block.match(/<dd\s+class="event-card__area-name">([^<]+)<\/dd>/i);
    const area = areaM ? areaM[1].trim() : "";

    // skip online-only events
    if (area === "オンラインのみ" || area === "オンライン") continue;

    events.push({
      href: isExternal ? href : href.replace(/\?.*$/, ""),
      fullHref: href,
      isExternal,
      title,
      dateAria,
      dateVisible,
      area,
    });
  }
  return events;
}

/** aria-label日付から年月日リストを抽出 */
function parseDateFromAria(aria) {
  if (!aria) return [];
  // "2026年3月27日金曜日"
  const single = aria.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (single && !aria.includes("から")) {
    return [{ y: Number(single[1]), mo: Number(single[2]), d: Number(single[3]) }];
  }
  // "2026年3月1日日曜日から4月5日日曜日"
  const rangeM = aria.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?から(\d{1,2})月(\d{1,2})日/);
  if (rangeM) {
    const y = Number(rangeM[1]);
    const start = new Date(y, Number(rangeM[2]) - 1, Number(rangeM[3]));
    const endMo = Number(rangeM[4]);
    const endD = Number(rangeM[5]);
    const endY = endMo < Number(rangeM[2]) ? y + 1 : y;
    const end = new Date(endY, endMo - 1, endD);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }
    return dates;
  }
  // "2026年3月1日日曜日から2026年4月5日日曜日"
  const rangeM2 = aria.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?から(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (rangeM2) {
    const start = new Date(Number(rangeM2[1]), Number(rangeM2[2]) - 1, Number(rangeM2[3]));
    const end = new Date(Number(rangeM2[4]), Number(rangeM2[5]) - 1, Number(rangeM2[6]));
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }
    return dates;
  }
  if (single) return [{ y: Number(single[1]), mo: Number(single[2]), d: Number(single[3]) }];
  return [];
}

/** 詳細ページから会場・住所・時間を抽出 */
function parseDetailPage(html) {
  const meta = {};
  if (!html) return meta;
  // event-table の th/td ペア
  const rowRe = /<th\s+class="event-table__title">([^<]+)<\/th>\s*<td\s+class="event-table__data">([\s\S]*?)<\/td>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const key = rm[1].trim();
    const val = rm[2];
    if (key === "開催日時") {
      meta.dateTime = stripTags(val).replace(/\s+/g, " ").trim();
    } else if (key === "開催場所") {
      const raw = stripTags(val).replace(/\s+/g, " ").trim();
      // 「住所：」で分割
      const addrIdx = raw.indexOf("住所：");
      if (addrIdx >= 0) {
        meta.venue = raw.substring(0, addrIdx).replace(/場所：/, "").trim();
        meta.address = raw.substring(addrIdx + 3).trim();
      } else {
        meta.venue = raw.replace(/場所：/, "").trim();
      }
    } else if (key === "アクセス") {
      const text = stripTags(val).replace(/\s+/g, " ").trim();
      // アクセスに住所が含まれる場合
      const addrM = text.match(/(東京都[^\s,、]{5,})/);
      if (addrM && !meta.address) meta.address = addrM[1];
    } else if (key === "開催エリア") {
      meta.area = stripTags(val).trim();
    }
  }
  return meta;
}

function createKodomoSmileCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKodomoSmileEvents(maxDays) {
    // リストページをページネーション取得
    const allCards = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = page === 1 ? `${BASE}/events` : `${BASE}/events?page=${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
        // 最後のページ検出
        if (html.includes('pagination__next" aria-disabled="true"')) break;
      } catch (e) {
        console.warn(`[${label}] page ${page} failed:`, e.message || e);
        break;
      }
    }

    if (allCards.length === 0) return [];

    // 内部イベントの詳細ページをバッチ取得
    const detailMap = new Map();
    const internalUrls = [...new Set(allCards.filter(c => !c.isExternal).map(c => c.href))].slice(0, 100);
    for (let i = 0; i < internalUrls.length; i += DETAIL_BATCH) {
      const batch = internalUrls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (href) => {
          const html = await fetchText(`${BASE}${href}`);
          return { href, meta: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.href, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const card of allCards) {
      const dates = parseDateFromAria(card.dateAria);
      if (dates.length === 0) continue;

      const detail = detailMap.get(card.href) || {};
      const meta = detail.meta || {};

      const venueName = sanitizeVenueText(meta.venue || "");
      let address = meta.address
        ? sanitizeAddressText(meta.address.startsWith("東京都") ? meta.address : `東京都${meta.address}`)
        : "";
      if (!address && card.area) address = `東京都${card.area}`;

      // 時間: 詳細ページの開催日時から
      const timeRange = parseTimeRangeFromText(meta.dateTime || card.dateVisible || "");

      // ジオコード
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`東京都 ${card.area} ${venueName}`);
      if (card.area) candidates.push(`東京都${card.area}`);
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address || `東京都${card.area}`);
      const resolvedAddress = resolveEventAddress(source, venueName, address || `東京都${card.area}`, point);

      const eventUrl = card.isExternal ? card.fullHref : `${BASE}${card.href}`;

      // 日数制限: 範囲イベントは最初の30日のみ
      let count = 0;
      for (const dd of dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${eventUrl}:${card.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: card.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venueName, address: resolvedAddress || "",
          url: eventUrl,
          lat: point ? point.lat : null, lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKodomoSmileCollector };

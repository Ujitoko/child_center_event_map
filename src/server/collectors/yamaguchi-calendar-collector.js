/**
 * 山口カレンダー 子育てイベントコレクター
 * https://yamaguchi-calendar.jp/
 *
 * 山口県のイベントポータル(WordPress)。子育てカテゴリの一覧ページから
 * イベントURLを収集し、詳細ページから会場・住所を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const LIST_URL = "https://yamaguchi-calendar.jp/event_taxonomy_genre/%E5%AD%90%E8%82%B2%E3%81%A6/";
const DETAIL_BATCH = 5;
const MAX_LIST_PAGES = 4;

/** リストページからイベントカードを抽出 */
function parseListPage(html) {
  const events = [];
  const cardRe = /<article\s+class="cpn-event-list_item">([\s\S]*?)<\/article>/gi;
  let cm;
  while ((cm = cardRe.exec(html)) !== null) {
    const card = cm[1];
    // URL
    const urlMatch = card.match(/<h3\s+class="cpn-event-list_item_heading">\s*<a\s+href="(https?:\/\/yamaguchi-calendar\.jp\/event\/\d+\/)"[^>]*>/i);
    if (!urlMatch) continue;
    const href = urlMatch[1];
    // Title
    const titleMatch = card.match(/<h3\s+class="cpn-event-list_item_heading">\s*<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : "";
    if (!title) continue;
    // Date text
    const dateMatch = card.match(/<p\s+class="cpn-event-list_item_time">([\s\S]*?)<\/p>/i);
    const dateText = dateMatch ? stripTags(dateMatch[1]).trim() : "";
    // Area
    const areas = [];
    const areaRe = /<div\s+class="cpn-event-list_item_area_item">\s*<a[^>]*>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = areaRe.exec(card)) !== null) {
      areas.push(stripTags(am[1]).trim());
    }
    events.push({ href, title, dateText, area: areas.join("・") });
  }
  return events;
}

/** 日時テキストから全ての年月日を抽出 */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  return dates;
}

/** 詳細ページの<dl>からkey→valueマップを抽出 */
function parseDetailDl(html) {
  const meta = {};
  if (!html) return meta;
  const dlRe = /<dl\s+class="single_detail_table_row">\s*<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/dl>/gi;
  let m;
  while ((m = dlRe.exec(html)) !== null) {
    const key = stripTags(m[1]).trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 住所テキストから郵便番号を除去して正規化 */
function normalizeAddress(raw) {
  if (!raw) return "";
  return raw.replace(/〒\s*\d{3}[-ー]\d{4}\s*/, "").trim();
}

function createYamaguchiCalendarColl(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectYamaguchiCalendarEvents(maxDays) {
    // Step 1: リストページを取得してイベントURL収集
    let allCards = [];
    try {
      const page1Html = await fetchText(LIST_URL);
      if (!page1Html) return [];
      allCards = parseListPage(page1Html);

      for (let p = 2; p <= MAX_LIST_PAGES; p++) {
        try {
          const html = await fetchText(`${LIST_URL}page/${p}/`);
          if (html) allCards.push(...parseListPage(html));
        } catch (_e) { /* skip page errors */ }
      }
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }

    if (allCards.length === 0) return [];

    // Step 2: 日付でプレフィルター
    const cardsInRange = [];
    for (const c of allCards) {
      const dates = parseDatesFromText(c.dateText);
      const validDates = dates.filter(d => inRangeJst(d.y, d.mo, d.d, maxDays));
      if (validDates.length > 0) {
        for (const d of validDates) {
          cardsInRange.push({ ...c, date: d });
        }
      }
    }

    // Step 3: 詳細ページをバッチ取得
    const detailMap = new Map();
    const urls = [...new Set(cardsInRange.map(c => c.href))].slice(0, 80);
    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailDl(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value.meta);
      }
    }

    // Step 4: イベントレコード生成
    const byId = new Map();
    for (const card of cardsInRange) {
      const d = card.date;
      const meta = detailMap.get(card.href) || {};

      const venue = sanitizeVenueText(meta["会場"] || "");
      const rawAddr = normalizeAddress(meta["住所"] || "");
      const address = sanitizeAddressText(rawAddr);

      const timeText = meta["開催時間"] || card.dateText || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // ジオコーディング
      const candidates = [];
      if (address) candidates.push(address.includes("山口県") ? address : `山口県${address}`);
      if (venue && card.area) candidates.push(`山口県${card.area} ${venue}`);
      if (card.area) candidates.push(`山口県${card.area}`);
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venue, point, address || `山口県${card.area || ""}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `山口県${card.area || ""}`, point);

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange);
      const id = `${srcKey}:${card.href}:${card.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: card.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venue, address: resolvedAddress || "",
        url: card.href,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createYamaguchiCalendarColl };

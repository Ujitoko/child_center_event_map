/**
 * こべっこランド イベントコレクター
 * https://www.kobekko.or.jp/event/
 *
 * 神戸市の大型児童センター。カスタムPHP CMS。リスト+詳細ページ。
 * 固定施設。~15-20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.kobekko.or.jp";
const LIST_URL = `${BASE}/event/`;
const DETAIL_BATCH = 5;
const MAX_PAGES = 3;
const FACILITY = {
  name: "こべっこランド",
  address: "兵庫県神戸市兵庫区上庄通1-1-43",
  lat: 34.6601,
  lng: 135.1738,
};

/** リストページからイベントカード抽出 */
function parseListPage(html) {
  const events = [];
  // <li class="p-event-cards__item">...<a href="/event/index.php?c=event_view&pk=ID">...</a>...</li>
  const cardRe = /<li\s+class="p-event-cards__item">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const block = m[1];

    // リンクURL: <a href="/event/index.php?c=event_view&pk=601"
    const linkM = block.match(/<a\s+href="(\/event\/index\.php\?c=event_view&pk=(\d+))"/i);
    if (!linkM) continue;
    const href = linkM[1];
    const pk = linkM[2];

    // タイトル: <h3 class="p-event-card__title">TITLE<!-- YYYYMMDD--></h3>
    const titleM = block.match(/<h3\s+class="p-event-card__title">([\s\S]*?)<\/h3>/i);
    if (!titleM) continue;
    const titleRaw = titleM[1];

    // HTMLコメントからソート日付 (主要日付)
    const commentDateM = titleRaw.match(/<!--\s*(\d{4})(\d{2})(\d{2})\s*-->/);
    const title = stripTags(titleRaw.replace(/<!--[\s\S]*?-->/g, "")).trim();
    if (!title) continue;

    // 日付テキスト: <div class="p-event-card__date">...</div>
    const dateBlockM = block.match(/<div\s+class="p-event-card__date">([\s\S]*?)<\/div>/i);
    const dateText = dateBlockM ? stripTags(dateBlockM[1]).replace(/\s+/g, " ").trim() : "";

    let primaryDate = null;
    if (commentDateM) {
      primaryDate = {
        y: Number(commentDateM[1]),
        mo: Number(commentDateM[2]),
        d: Number(commentDateM[3]),
      };
    }

    events.push({ pk, href, title, dateText, primaryDate });
  }
  return events;
}

/** 詳細ページから日時スロットを抽出 */
function parseDetailSlots(html) {
  if (!html) return [];
  const slots = [];

  // pg-event-detail-block ごとに table を解析
  const blockRe = /<div\s+class="pg-event-detail-block">([\s\S]*?)<\/div>\s*(?:<div\s+class="c-btn-container">[\s\S]*?<\/div>)?/gi;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    const block = bm[1];
    const slot = {};

    // table row: <th>KEY</th><td>VALUE</td>
    const rowRe = /<th[^>]*>([^<]+)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
    let rm;
    while ((rm = rowRe.exec(block)) !== null) {
      const key = rm[1].trim();
      const val = stripTags(rm[2]).replace(/\s+/g, " ").trim();
      if (key === "日時") slot.dateTimeText = val;
      if (key === "場所") slot.venue = val;
    }
    if (slot.dateTimeText) slots.push(slot);
  }
  return slots;
}

/** 日時テキストから日付と時間を抽出 */
function parseDateTimeFromSlot(text, primaryDate) {
  if (!text) return { dates: primaryDate ? [primaryDate] : [], timeRange: null };

  const dates = [];

  // "M月D日" パターンで日付抽出
  const dateRe = /(\d{1,2})月(\d{1,2})日/g;
  let dm;
  const year = primaryDate ? primaryDate.y : new Date().getFullYear();
  while ((dm = dateRe.exec(text)) !== null) {
    dates.push({ y: year, mo: Number(dm[1]), d: Number(dm[2]) });
  }

  if (dates.length === 0 && primaryDate) {
    dates.push(primaryDate);
  }

  // 時間抽出: HH:MM～HH:MM or HH時MM分～HH時
  const timeRange = parseTimeRangeFromText(text);

  return { dates, timeRange };
}

function createKobekkoCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKobekkoEvents(maxDays) {
    // リストページ取得 (ページネーション)
    const allCards = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const url = page === 0
          ? LIST_URL
          : `${BASE}/event/index.php?c=event&sk=${page * 12}`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
      } catch (e) {
        break;
      }
    }

    if (allCards.length === 0) return [];

    // 詳細ページバッチ取得
    const detailMap = new Map();
    const uniquePks = [...new Set(allCards.map(c => c.pk))].slice(0, 30);
    for (let i = 0; i < uniquePks.length; i += DETAIL_BATCH) {
      const batch = uniquePks.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (pk) => {
          const html = await fetchText(`${BASE}/event/index.php?c=event_view&pk=${pk}`);
          return { pk, slots: parseDetailSlots(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.pk, r.value.slots);
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const card of allCards) {
      const slots = detailMap.get(card.pk) || [];

      if (slots.length > 0) {
        // 詳細ページのスロットから日付展開
        for (const slot of slots) {
          const { dates, timeRange } = parseDateTimeFromSlot(slot.dateTimeText, card.primaryDate);
          for (const dd of dates) {
            if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
            const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
            const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
            const id = `${srcKey}:${card.pk}:${card.title}:${dateKey}`;
            if (byId.has(id)) continue;
            byId.set(id, {
              id, source: srcKey, source_label: label,
              title: card.title,
              starts_at: startsAt, ends_at: endsAt,
              venue_name: FACILITY.name,
              address: resolvedAddr || FACILITY.address,
              url: `${BASE}${card.href}`,
              lat: point.lat, lng: point.lng,
            });
          }
        }
      } else if (card.primaryDate) {
        // 詳細がなければprimaryDateを使用
        const dd = card.primaryDate;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, null);
        const id = `${srcKey}:${card.pk}:${card.title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: card.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: FACILITY.name,
          address: resolvedAddr || FACILITY.address,
          url: `${BASE}${card.href}`,
          lat: point.lat, lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKobekkoCollector };

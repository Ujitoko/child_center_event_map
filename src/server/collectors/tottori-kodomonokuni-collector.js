/**
 * 鳥取砂丘こどもの国 イベントコレクター
 * https://kodomonokuni.tottori.jp/eventcalendar/
 *
 * WordPress + XO Event Calendar プラグイン。月別イベント一覧ページから
 * イベントカード抽出、詳細ページから時間を取得。固定施設。~30-50 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, getMonthsForRange } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");

const BASE = "https://kodomonokuni.tottori.jp";
const LIST_PATH = "/eventcalendar/";
const DETAIL_BATCH = 5;
const FACILITY = {
  name: "鳥取砂丘こどもの国",
  address: "鳥取県鳥取市浜坂1157-1",
  lat: 35.5387,
  lng: 134.2267,
};

/**
 * イベント一覧ページ (<article> カード) からイベント情報を抽出
 *
 * 構造:
 *   <article>
 *     <div class="TextBox">
 *       <h3>TITLE</h3>
 *       <div class="Kikan"><div class="EventDate">2026.2.28 (土)</div></div>
 *     </div>
 *     <a href="https://kodomonokuni.tottori.jp/eventcalendar/YYYYMMDD/ID/" title="TITLE"></a>
 *   </article>
 */
function parseListPage(html) {
  const events = [];
  const articleRe = /<article>([\s\S]*?)<\/article>/gi;
  let am;
  while ((am = articleRe.exec(html)) !== null) {
    const block = am[1];

    // タイトル: <h3>TITLE</h3>
    const titleM = block.match(/<h3>([\s\S]*?)<\/h3>/i);
    if (!titleM) continue;
    const title = stripTags(titleM[1]).replace(/\s+/g, " ").trim();
    if (!title) continue;

    // URL: <a href="https://kodomonokuni.tottori.jp/eventcalendar/YYYYMMDD/ID/" ...>
    const hrefM = block.match(/<a\s+href="(https:\/\/kodomonokuni\.tottori\.jp\/eventcalendar\/\d{8}\/\d+\/?)"/i);
    if (!hrefM) continue;
    const url = hrefM[1];

    // 日付: <div class="EventDate">2026.2.28 (土)</div>
    // or: <div class="EventDate">2026.1.10 (土) - 2026.2.28 (土)</div>
    const dateM = block.match(/<div\s+class="EventDate">([\s\S]*?)<\/div>/i);
    if (!dateM) continue;
    const dateText = stripTags(dateM[1]).replace(/\s+/g, " ").trim();

    events.push({ title, url, dateText });
  }
  return events;
}

/**
 * 日付テキストから開始日・終了日を解析
 * Format: "2026.2.28 (土)" or "2026.1.10 (土) - 2026.2.28 (土)"
 * 範囲の場合は全日付を展開する
 */
function parseDateRange(dateText) {
  const dates = [];
  if (!dateText) return dates;

  // YYYY.M.DD pattern
  const dateRe = /(\d{4})\.(\d{1,2})\.(\d{1,2})/g;
  const found = [];
  let dm;
  while ((dm = dateRe.exec(dateText)) !== null) {
    found.push({ y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]) });
  }

  if (found.length === 0) return dates;

  if (found.length === 1) {
    // 単一日
    dates.push(found[0]);
  } else if (found.length >= 2 && dateText.includes("-")) {
    // 範囲: start - end → 全日展開
    const start = found[0];
    const end = found[found.length - 1];
    const startDate = new Date(start.y, start.mo - 1, start.d);
    const endDate = new Date(end.y, end.mo - 1, end.d);
    // 最大90日の展開制限
    const maxExpand = 90;
    let count = 0;
    for (let d = new Date(startDate); d <= endDate && count < maxExpand; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
      count++;
    }
  } else {
    // 複数日付（範囲でない）
    dates.push(...found);
  }

  return dates;
}

/**
 * 詳細ページ本文から時間を抽出
 * Format: 【時間】９：３０～１６：３０ (full-width digits)
 */
function parseDetailTime(html) {
  if (!html) return null;

  // EntryBody からテキスト抽出
  const bodyM = html.match(/<section\s+id="EntryBody">([\s\S]*?)<\/section>/i);
  if (!bodyM) return null;
  const bodyText = normalizeJaDigits(stripTags(bodyM[1]).replace(/\s+/g, " "));

  // 【時間】HH:MM～HH:MM or 【時間】HH:MM~HH:MM
  const timeM = bodyText.match(/(?:【時間】|時間\s*[:：]\s*)(\d{1,2})\s*[:：]\s*(\d{2})\s*[～~ー\-]\s*(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (timeM) {
    return {
      startHour: Number(timeM[1]),
      startMinute: Number(timeM[2]),
      endHour: Number(timeM[3]),
      endMinute: Number(timeM[4]),
    };
  }

  // 開始時間のみ: 【時間】HH:MM
  const timeM2 = bodyText.match(/(?:【時間】|時間\s*[:：]\s*)(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (timeM2) {
    return { startHour: Number(timeM2[1]), startMinute: Number(timeM2[2]) };
  }

  return null;
}

function createTottoriKodomonokuniCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectTottoriKodomonokuniEvents(maxDays) {
    // 月別ページを取得 (当月 + 先月/次月 をカバー)
    const months = getMonthsForRange(maxDays);
    const allCards = [];
    const seenUrls = new Set();

    for (const { year, month } of months) {
      try {
        // 当月は /eventcalendar/ 、月指定は /eventcalendar/YYYY/M/
        const url = `${BASE}${LIST_PATH}${year}/${month}/`;
        const html = await fetchText(url);
        if (!html) continue;
        const cards = parseListPage(html);
        for (const c of cards) {
          if (!seenUrls.has(c.url)) {
            seenUrls.add(c.url);
            allCards.push(c);
          }
        }
      } catch (e) {
        // 404 for future months is expected
        if (!/404/.test(String(e.message || e))) {
          console.warn(`[${label}] ${year}/${month} fetch failed:`, e.message || e);
        }
      }
    }

    if (allCards.length === 0) return [];

    // 詳細ページバッチ取得 (時間取得)
    const detailMap = new Map();
    const uniqueUrls = allCards.map(c => c.url).slice(0, 60);
    for (let i = 0; i < uniqueUrls.length; i += DETAIL_BATCH) {
      const batch = uniqueUrls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (eventUrl) => {
          const html = await fetchText(eventUrl);
          return { eventUrl, time: parseDetailTime(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.eventUrl, r.value.time);
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const card of allCards) {
      const dates = parseDateRange(card.dateText);
      if (dates.length === 0) continue;

      const timeRange = detailMap.get(card.url) || null;

      let count = 0;
      for (const dd of dates) {
        if (count >= 60) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${card.url}:${card.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: card.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: FACILITY.name,
          address: resolvedAddr || FACILITY.address,
          url: card.url,
          lat: point.lat, lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createTottoriKodomonokuniCollector };

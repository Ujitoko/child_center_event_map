/**
 * えひめこどもの城 イベントコレクター
 * https://www.i-kodomo.jp/event/
 *
 * 愛媛県松山市の県営児童施設。年間イベント一覧ページから取得。
 * data-end-dateでフィルタリング。固定施設。~20-40 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const LIST_URL = "https://www.i-kodomo.jp/event/";
const BASE = "https://www.i-kodomo.jp/event/";
const FACILITY = {
  name: "えひめこどもの城",
  address: "愛媛県松山市西野町乙108番地1",
  lat: 33.8137,
  lng: 132.7130,
};

/** data-end-dateが未来かチェック */
function isEndDateFuture(endDateStr) {
  if (!endDateStr) return true;
  const m = endDateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (!m) return true;
  const endDate = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  return endDate >= new Date();
}

/** <li>要素からイベント情報を抽出 */
function parseEventItems(html) {
  const events = [];

  // <li class="view_timer" data-end-date="YYYY/M/D HH:MM"> or bare <li>
  const liRe = /<li(?:\s+class="view_timer"\s+data-end-date="([^"]*)")?[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const endDate = m[1] || null;
    const inner = m[2];

    // 過去イベントをスキップ
    if (endDate && !isEndDateFuture(endDate)) continue;

    // タイトル: <h5>TITLE</h5>
    const titleM = inner.match(/<h5>([\s\S]*?)<\/h5>/i);
    if (!titleM) continue;
    const title = stripTags(titleM[1]).replace(/\s+/g, " ").trim();
    if (!title) continue;

    // PDFリンクや外部リンクをスキップ
    const hrefM = inner.match(/<a\s+href="([^"]+)"/i);
    const href = hrefM ? hrefM[1] : "";
    if (href.endsWith(".pdf") || (href.startsWith("http") && !href.includes("i-kodomo.jp"))) continue;

    // 日付: <p class="day">...</p>
    const dayM = inner.match(/<p\s+class="day">([\s\S]*?)<\/p>/i);
    if (!dayM) continue;
    const dayText = stripTags(dayM[1]).replace(/\s+/g, " ").trim();

    // URL解決
    let url = "";
    if (href && !href.startsWith("http")) {
      url = new URL(href, BASE).href;
    } else if (href) {
      url = href;
    }

    events.push({ title, dayText, url, endDate });
  }
  return events;
}

/** 日付テキストから年月日を抽出 */
function parseDatesFromDayText(text) {
  const dates = [];
  if (!text) return dates;

  // 年を抽出: "2025年" or "2026年"
  const yearM = text.match(/(\d{4})年/);
  if (!yearM) return dates;
  let currentYear = Number(yearM[1]);

  // "X月全日" パターンはスキップ (毎日開催は扱わない)
  if (/\d{1,2}月全日/.test(text)) return dates;

  // "X月の土・日" パターンもスキップ (曜日指定は複雑すぎ)
  if (/\d{1,2}月の[月火水木金土日]/.test(text)) return dates;

  // "毎週" パターンもスキップ
  if (/毎週/.test(text)) return dates;

  // 個別の日付を抽出: "M月D日"
  const dateRe = /(\d{1,2})月(\d{1,2})日/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    const mo = Number(dm[1]);
    const d = Number(dm[2]);
    // 年境界: 前の月より小さい月なら翌年
    if (dates.length > 0) {
      const last = dates[dates.length - 1];
      if (mo < last.mo) currentYear = last.y + 1;
    }
    dates.push({ y: currentYear, mo, d });
  }

  // 日付範囲の展開: "M月D日～D日" or "M月D日～M月D日"
  // M月D日（X）～D日 パターン
  const rangeRe = /(\d{1,2})月(\d{1,2})日[^～~ー-]*?[～~ー-]\s*(\d{1,2})日/g;
  let rm;
  const expandedDates = [];
  while ((rm = rangeRe.exec(text)) !== null) {
    const mo = Number(rm[1]);
    const startD = Number(rm[2]);
    const endD = Number(rm[3]);
    if (endD > startD && endD - startD < 15) {
      for (let d = startD + 1; d <= endD; d++) {
        const exists = dates.some(dd => dd.y === currentYear && dd.mo === mo && dd.d === d);
        if (!exists) expandedDates.push({ y: currentYear, mo, d });
      }
    }
  }
  dates.push(...expandedDates);

  // ソートして重複除去
  dates.sort((a, b) => (a.y - b.y) || (a.mo - b.mo) || (a.d - b.d));
  const unique = [];
  for (const dd of dates) {
    const last = unique[unique.length - 1];
    if (!last || last.y !== dd.y || last.mo !== dd.mo || last.d !== dd.d) {
      unique.push(dd);
    }
  }
  return unique;
}

/** 時間テキストから時間範囲を抽出 */
function parseTimeFromDayText(text) {
  if (!text) return null;
  // "10:00～12:00" or "10:00～16:00（最終受付 15:00）"
  const tm = text.match(/(\d{1,2}):(\d{2})\s*[～~ー-]\s*(\d{1,2}):(\d{2})/);
  if (tm) {
    return {
      startHour: Number(tm[1]), startMinute: Number(tm[2]),
      endHour: Number(tm[3]), endMinute: Number(tm[4]),
    };
  }
  const tm2 = text.match(/(\d{1,2}):(\d{2})/);
  if (tm2) {
    return { startHour: Number(tm2[1]), startMinute: Number(tm2[2]) };
  }
  return null;
}

function createEhimeKodomonoShiroCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectEhimeKodomonoShiroEvents(maxDays) {
    let html;
    try {
      html = await fetchText(LIST_URL);
    } catch (e) {
      console.warn(`[${label}] fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const rawEvents = parseEventItems(html);
    if (rawEvents.length === 0) return [];

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const ev of rawEvents) {
      const dates = parseDatesFromDayText(ev.dayText);
      if (dates.length === 0) continue;

      const timeRange = parseTimeFromDayText(ev.dayText);

      let count = 0;
      for (const dd of dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${ev.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: ev.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: FACILITY.name,
          address: resolvedAddr || FACILITY.address,
          url: ev.url || LIST_URL,
          lat: point.lat, lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createEhimeKodomonoShiroCollector };

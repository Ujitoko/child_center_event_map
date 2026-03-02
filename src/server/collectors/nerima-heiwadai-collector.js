/**
 * 練馬区 平和台児童館 イベントコレクター
 *
 * heiwadai-jidou.jp/events_{M}.html の自由形式HTMLからイベントを抽出。
 * 当月・来月の2ページをfetch。
 */
const { fetchText } = require("../fetch-utils");
const { normalizeJaDigits } = require("../text-utils");
const { stripTags } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { NERIMA_SOURCE } = require("../../config/wards");

const SITE_URL = "https://heiwadai-jidou.jp";
const FACILITY_NAME = "平和台児童館";
const FACILITY_ADDRESS = "練馬区平和台2-18-14";

/**
 * イベントHTMLページからイベントを抽出
 *
 * パターン: タイトルは <strong data-sitecolor-text=""> 内、
 * 日付は近傍の "３月DD日" または "M月DD日" テキスト
 */
function parseHeiwadaiEventsPage(html, defaultYear, defaultMonth) {
  const events = [];

  // HTMLからテキストブロック（<p>単位）を抽出
  const pBlocks = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];

  for (const block of pBlocks) {
    const text = normalizeJaDigits(stripTags(block).replace(/\s+/g, " ").trim());
    if (!text || text.length < 10) continue;

    // タイトル抽出: <strong data-sitecolor-text=""> 内のテキスト
    const titleMatch = block.match(
      /<strong[^>]*data-sitecolor-text[^>]*>([^<]+)<\/strong>/
    );
    // または green色の<strong>内
    const titleMatch2 =
      !titleMatch &&
      block.match(
        /color:#008000[^>]*><strong[^>]*>([^<]+)<\/strong>/
      );
    let title = "";
    if (titleMatch) {
      title = stripTags(titleMatch[1]).trim();
    } else if (titleMatch2) {
      title = stripTags(titleMatch2[1]).trim();
    }
    if (!title || title.length < 2) continue;

    // 不要なタイトルをスキップ
    if (/休館|臨時|ページ|イベント\*/.test(title)) continue;

    // 日付抽出: "M月DD日" パターン（全角数字は正規化済み）
    const dateMatches = text.match(
      /(\d{1,2})月(\d{1,2})日/g
    );
    if (!dateMatches || dateMatches.length === 0) continue;

    // 時間抽出
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*[～〜~ー－-]\s*(\d{1,2}):(\d{2})/);
    let timeRange = null;
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]),
        startMinute: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]),
        endMinute: Number(timeMatch[4]),
      };
    }

    // 各日付にイベントを生成
    const seenDates = new Set();
    for (const dm of dateMatches) {
      const parts = dm.match(/(\d{1,2})月(\d{1,2})日/);
      if (!parts) continue;
      const mo = Number(parts[1]);
      const d = Number(parts[2]);
      const dateKey = `${mo}-${d}`;
      if (seenDates.has(dateKey)) continue;
      seenDates.add(dateKey);

      events.push({
        y: defaultYear,
        mo,
        d,
        title,
        timeRange,
      });
    }

    // 複数日パターン: "DD日・DD日" (月省略)
    const multiDayMatch = text.match(
      /(\d{1,2})月(\d{1,2})日[^0-9]*[・,、](\d{1,2})日/g
    );
    if (multiDayMatch) {
      for (const mdm of multiDayMatch) {
        const parts = mdm.match(
          /(\d{1,2})月(\d{1,2})日[^0-9]*[・,、](\d{1,2})日/
        );
        if (!parts) continue;
        const mo = Number(parts[1]);
        const d2 = Number(parts[3]);
        const dateKey = `${mo}-${d2}`;
        if (seenDates.has(dateKey)) continue;
        seenDates.add(dateKey);
        events.push({ y: defaultYear, mo, d: d2, title, timeRange });
      }
    }
  }
  return events;
}

function createCollectNerimaHeiwadaiEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = NERIMA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNerimaHeiwadaiEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const url = `${SITE_URL}/events_${month}.html`;
      try {
        const html = await fetchText(url);
        const evts = parseHeiwadaiEventsPage(html, year, month);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(
          `[${label}/平和台児童館] ${month}月 failed:`,
          e.message || e
        );
      }
    }

    const point = resolveEventPoint(
      source,
      FACILITY_NAME,
      null,
      `練馬区 ${FACILITY_NAME}`
    );
    const address = resolveEventAddress(
      source,
      FACILITY_NAME,
      FACILITY_ADDRESS,
      point
    );

    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:heiwadai:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: FACILITY_NAME,
        address: address || FACILITY_ADDRESS,
        url: `${SITE_URL}/events_${ev.mo}.html`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(
      `[${label}/平和台児童館] ${results.length} events collected`
    );
    return results;
  };
}

module.exports = { createCollectNerimaHeiwadaiEvents };

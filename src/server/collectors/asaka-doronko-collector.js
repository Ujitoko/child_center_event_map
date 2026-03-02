/**
 * 朝霞市 どろんこ保育園 ちきんえっぐ イベントコレクター
 *
 * 朝霞どろんこ保育園 子育て支援センター「ちきんえっぐ」
 * 月別おたよりページからテーブル + h3セクションのイベントを抽出
 * URL: https://www.doronko.jp/facilities/doronko-asaka/chickenegg/YYYY-MM/
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { ASAKA_SOURCE } = require("../../config/wards");

const VENUE = "朝霞どろんこ保育園 ちきんえっぐ";
const ADDRESS = "朝霞市大字浜崎69-1";

/**
 * テーブル行からイベントを抽出
 * <tr><th>カテゴリ</th><td>M月D日(曜) HH:MM～ 詳細</td></tr>
 */
function parseTableEvents(html, year, month) {
  const events = [];
  const rowRe =
    /<tr>\s*<th>([^<]+)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const category = stripTags(m[1]).trim();
    const rawBody = m[2];
    const body = normalizeJaDigits(stripTags(rawBody).replace(/\s+/g, " ").trim());

    // 施設情報テーブル（施設名、住所等）をスキップ
    if (/施設名|住所|電話|開所|定員|対象/.test(category)) continue;

    // 複数日付を抽出 (例: "3月3日(火)・10日(水)")
    const dateRe = /(\d{1,2})月(\d{1,2})日/g;
    let dm;
    const dates = [];
    while ((dm = dateRe.exec(body)) !== null) {
      dates.push({ mo: Number(dm[1]), d: Number(dm[2]) });
    }
    if (dates.length === 0) continue;

    // 時間抽出
    const timeRange = extractTimeRange(body);

    // タイトル生成: カテゴリ名 + 本文の先頭部分
    const titleBody = body
      .replace(/\d{1,2}月\d{1,2}日[（(][^)）]*[)）]/g, "")
      .replace(/\d{1,2}[:：]\d{2}\s*[～〜~]/g, "")
      .replace(/参加費[：:]?\s*\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const snippet = titleBody.length > 2 && titleBody.length < 50
      ? `「${titleBody.replace(/[※　\s]+$/, "")}`
      : "";
    const title = snippet
      ? `${category}${snippet}」`
      : category;

    for (const dt of dates) {
      events.push({
        y: year,
        mo: dt.mo,
        d: dt.d,
        title,
        timeRange,
      });
    }
  }
  return events;
}

/**
 * h3セクションからイベントを抽出
 * <h3 class="el_otayori_subTitle">イベント名</h3>
 * <p>●日　時：M月D日(曜)・D日(曜)　両日共HH:MM～</p>
 */
function parseH3Events(html, year, month) {
  const events = [];
  // h3 + 後続のpタグをまとめて取得
  const sectionRe =
    /<h3[^>]*class="el_otayori_subTitle"[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|<\/(?:div|section|article)>|$)/gi;
  let sm;
  while ((sm = sectionRe.exec(html)) !== null) {
    const heading = stripTags(sm[1]).trim();
    const bodyHtml = sm[2];
    const body = normalizeJaDigits(stripTags(bodyHtml).replace(/\s+/g, " ").trim());

    if (!heading || heading.length < 2) continue;

    // 日付抽出
    const dateRe = /(\d{1,2})月(\d{1,2})日/g;
    let dm;
    const dates = [];
    while ((dm = dateRe.exec(body)) !== null) {
      dates.push({ mo: Number(dm[1]), d: Number(dm[2]) });
    }
    // "D日" のみのパターン (前に月が出ている場合)
    if (dates.length === 0) continue;

    // 時間抽出
    const timeRange = extractTimeRange(body);

    for (const dt of dates) {
      events.push({
        y: year,
        mo: dt.mo,
        d: dt.d,
        title: heading,
        timeRange,
      });
    }
  }
  return events;
}

/**
 * 時間レンジを抽出
 * "HH:MM～HH:MM" or "HH:MM～" (終了時間なし → +1h)
 */
function extractTimeRange(text) {
  // フルレンジ: 10:30～11:30
  const fullMatch = text.match(
    /(\d{1,2})[:：](\d{2})\s*[～〜~ー－-]\s*(\d{1,2})[:：](\d{2})/
  );
  if (fullMatch) {
    return {
      startHour: Number(fullMatch[1]),
      startMinute: Number(fullMatch[2]),
      endHour: Number(fullMatch[3]),
      endMinute: Number(fullMatch[4]),
    };
  }
  // 開始のみ: 10:30～
  const startOnly = text.match(/(\d{1,2})[:：](\d{2})\s*[～〜~]/);
  if (startOnly) {
    return {
      startHour: Number(startOnly[1]),
      startMinute: Number(startOnly[2]),
      endHour: Number(startOnly[1]) + 1,
      endMinute: Number(startOnly[2]),
    };
  }
  return null;
}

function createCollectAsakaDoronkoEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = ASAKA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectAsakaDoronkoEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const mm = String(month).padStart(2, "0");
      const url = `https://www.doronko.jp/facilities/doronko-asaka/chickenegg/${year}-${mm}/`;
      try {
        const html = await fetchText(url);
        const tableEvts = parseTableEvents(html, year, month);
        const h3Evts = parseH3Events(html, year, month);
        rawEvents.push(...tableEvts, ...h3Evts);
      } catch (e) {
        console.warn(
          `[${label}/ちきんえっぐ] ${year}-${mm} failed:`,
          e.message || e
        );
      }
    }

    // 重複除去 + 範囲フィルタ
    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:doronko:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const point = resolveEventPoint(
        source,
        VENUE,
        null,
        `朝霞市 ${VENUE}`
      );
      const address = resolveEventAddress(
        source,
        VENUE,
        ADDRESS,
        point
      );

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );

      const mm = String(ev.mo).padStart(2, "0");
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: VENUE,
        address: address || ADDRESS,
        url: `https://www.doronko.jp/facilities/doronko-asaka/chickenegg/${ev.y}-${mm}/`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(
      `[${label}/ちきんえっぐ] ${results.length} events collected`
    );
    return results;
  };
}

module.exports = { createCollectAsakaDoronkoEvents };

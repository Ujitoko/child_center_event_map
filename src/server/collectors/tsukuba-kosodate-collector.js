/**
 * つくば市 子育て支援センター イベントコレクター
 *
 * 2ソース:
 * 1. ちきんえっぐ (doronko.jp) - テーブル形式、月別ページ
 * 2. つなぐ (syoujinkai-tsunagu.or.jp) - カレンダーテーブル
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");
const {
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const TSUKUBA_SOURCE = {
  key: "ibaraki_tsukuba",
  label: "つくば市",
  baseUrl: "https://www.city.tsukuba.lg.jp",
  center: { lat: 36.0835, lng: 140.0764 },
};

/**
 * ちきんえっぐ: <th>イベント種別</th><td>詳細 日時：M月D日...</td>
 */
function parseChickenegg(html, year, month) {
  const events = [];
  const rowRe =
    /<tr>\s*<th>([^<]+)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const category = stripTags(m[1]).trim();
    const body = normalizeJaDigits(stripTags(m[2]).replace(/\s+/g, " ").trim());

    // 施設情報テーブル（施設名、住所等）をスキップ
    if (/施設名|住所|電話|開所/.test(category)) continue;

    // 日時パターン: "日時：M月D日(曜) HH:MM～" or "M月D日"
    const dateMatch = body.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;

    const mo = Number(dateMatch[1]);
    const d = Number(dateMatch[2]);

    // 時間抽出
    const timeMatch = body.match(
      /(\d{1,2})[:：](\d{2})\s*[～〜~ー－-]\s*(\d{1,2})[:：](\d{2})/
    );
    let timeRange = null;
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]),
        startMinute: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]),
        endMinute: Number(timeMatch[4]),
      };
    } else {
      const startOnly = body.match(/(\d{1,2})[:：](\d{2})[～〜~]/);
      if (startOnly) {
        timeRange = {
          startHour: Number(startOnly[1]),
          startMinute: Number(startOnly[2]),
          endHour: Number(startOnly[1]) + 1,
          endMinute: Number(startOnly[2]),
        };
      }
    }

    // タイトル: カテゴリ名 + tdの最初の部分
    const firstPart = body.split(/日時/)[0].trim();
    const title =
      firstPart && firstPart.length > 2 && firstPart.length < 40
        ? `${category}「${firstPart.replace(/[※\s]+$/, "")}」`
        : category;

    events.push({ y: year, mo, d, title, timeRange, venue: "ちきんえっぐ" });
  }
  return events;
}

/**
 * つなぐ: カレンダーテーブルからリンク付きイベントを抽出
 * <td class="schedule_calendar_date">DD日(曜)</td>
 * <td class="schedule_calendar_am"><a href="#event_ID">Title</a></td>
 */
function parseTsunagu(html, year, month) {
  const events = [];
  const rowRe = /<tr>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const row = m[1];

    // 日付セル
    const dateCell = row.match(
      /schedule_calendar_date[^>]*>(\d{1,2})日/
    );
    if (!dateCell) continue;
    const d = Number(dateCell[1]);

    // イベントリンクを探す
    const linkRe = /<a\s+href="#[^"]*">([^<]+)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(row)) !== null) {
      let title = stripTags(lm[1]).replace(/\s+/g, " ").trim();
      if (!title || title.length < 2) continue;
      if (/フリー開放|休み|祝日/.test(title)) continue;
      events.push({ y: year, mo, d, title, timeRange: null, venue: "つなぐ" });
    }
  }
  return events;
}

function createCollectTsukubaKosodateEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = TSUKUBA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  const FACILITIES = {
    ちきんえっぐ: "つくば市吾妻1-7-1",
    つなぐ: "つくば市上横場2284-3",
  };

  return async function collectTsukubaKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    // ちきんえっぐ: 月別ページ
    for (const { year, month } of months) {
      const mm = String(month).padStart(2, "0");
      const url = `https://www.doronko.jp/facilities/popinzu-tsukubaekimae/chickenegg/${year}-${mm}/`;
      try {
        const html = await fetchText(url);
        const evts = parseChickenegg(html, year, month);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(
          `[${label}/ちきんえっぐ] ${year}-${mm} failed:`,
          e.message || e
        );
      }
    }

    // つなぐ: /schedule (当月) + /schedule-next (翌月)
    const tsunaguUrls = [
      { url: "https://syoujinkai-tsunagu.or.jp/kosodateshien/schedule", label: "当月" },
      { url: "https://syoujinkai-tsunagu.or.jp/kosodateshien/schedule-next", label: "翌月" },
    ];
    for (const tu of tsunaguUrls) {
      try {
        const html = await fetchText(tu.url);
        // ページから年月を推定
        const ymMatch = html.match(/(\d{4})年(\d{1,2})月/);
        const pageYear = ymMatch ? Number(ymMatch[1]) : new Date().getFullYear();
        const pageMonth = ymMatch ? Number(ymMatch[2]) : new Date().getMonth() + 1;
        const evts = parseTsunagu(html, pageYear, pageMonth);
        rawEvents.push(...evts);
      } catch (e) {
        console.warn(
          `[${label}/つなぐ${tu.label}] failed:`,
          e.message || e
        );
      }
    }

    // 重複除去 + 範囲フィルタ
    const byId = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:kosodate:${ev.venue}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const facilityAddr = FACILITIES[ev.venue] || "";
      const point = resolveEventPoint(
        source,
        ev.venue,
        null,
        `つくば市 ${ev.venue}`
      );
      const address = resolveEventAddress(
        source,
        ev.venue,
        facilityAddr,
        point
      );

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
        venue_name: ev.venue,
        address: address || facilityAddr,
        url:
          ev.venue === "ちきんえっぐ"
            ? `https://www.doronko.jp/facilities/popinzu-tsukubaekimae/chickenegg/${ev.y}-${String(ev.mo).padStart(2, "0")}/`
            : "https://syoujinkai-tsunagu.or.jp/kosodateshien/schedule",
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(
      `[${label}/子育て支援] ${results.length} events collected`
    );
    return results;
  };
}

module.exports = { createCollectTsukubaKosodateEvents };

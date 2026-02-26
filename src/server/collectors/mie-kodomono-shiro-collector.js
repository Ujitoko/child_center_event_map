/**
 * みえこどもの城 イベントコレクター
 * https://www.mie-cc.or.jp/map/event/
 *
 * 三重県松阪市の県立子ども施設。WordPressサイト。
 * RSSフィード(/map/event/feed/)からリスト取得、
 * 各詳細ページから開催期間・時間を抽出。
 * 全イベントが同一施設で開催。
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");

const RSS_URL = "https://www.mie-cc.or.jp/map/event/feed/";
const FACILITY_NAME = "みえこどもの城";
const FACILITY_ADDRESS = "三重県松阪市立野町1291 中部台運動公園内";
const FACILITY_POINT = { lat: 34.5659, lng: 136.5188 };
const DETAIL_BATCH = 5;

/**
 * RSSフィードからイベントリンク・タイトルを抽出
 */
function parseRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
    const linkMatch = block.match(/<link>(.*?)<\/link>/);
    if (titleMatch && linkMatch) {
      items.push({
        title: stripTags(titleMatch[1]).trim(),
        url: linkMatch[1].trim(),
      });
    }
  }
  return items;
}

/**
 * 詳細ページからイベント情報を抽出
 *
 * <ul>
 *   <li><p>開催期間</p><p>2026年2月7日(土)～28日(土)の土日祝</p></li>
 *   <li><p>開催時間</p><p>①10:00～11:30 ②13:00～15:30</p></li>
 *   <li><p>開催会場</p><p>1F 研修室</p></li>
 * </ul>
 */
function parseDetailPage(html) {
  const result = { dates: [], time: null, venue: "" };

  // Extract date/time/venue from <li><p>label</p><p>value</p></li> pattern
  const liRe = /<li>\s*<p>(.*?)<\/p>\s*<p>([\s\S]*?)<\/p>\s*<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const label = stripTags(m[1]).trim();
    const value = stripTags(m[2]).trim();

    if (label === "開催期間" || label === "開催日") {
      result.dates = parseDateRange(normalizeJaDigits(value));
    } else if (label === "開催時間") {
      result.time = parseTimeRangeFromText(normalizeJaDigits(value));
    } else if (label === "開催会場") {
      result.venue = value;
    }
  }

  return result;
}

/**
 * 日付文字列を解析して { y, mo, d } の配列を返す
 *
 * パターン:
 * - "2026年2月7日(土)～28日(土)の土日祝" → 範囲内の各日
 * - "2026年3月1日(日)" → 単日
 * - "2026年2月11日(火・祝), 3月8日(日)" → 複数日
 */
function parseDateRange(text) {
  const dates = [];
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const defaultYear = jstNow.getFullYear();

  // Single date or start of range: YYYY年M月D日
  const baseMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!baseMatch) return dates;

  const year = Number(baseMatch[1]);
  const month = Number(baseMatch[2]);
  const startDay = Number(baseMatch[3]);

  // Check for range: ～DD日
  const rangeMatch = text.match(/～(\d{1,2})日/);
  if (rangeMatch) {
    const endDay = Number(rangeMatch[1]);
    // Check if it's "の土日祝" (weekends only) or all days
    const weekendsOnly = /土日|土・日/.test(text);
    for (let d = startDay; d <= endDay; d++) {
      if (weekendsOnly) {
        const dt = new Date(year, month - 1, d);
        const dow = dt.getDay();
        if (dow !== 0 && dow !== 6) continue; // skip weekdays
      }
      dates.push({ y: year, mo: month, d });
    }
  } else {
    dates.push({ y: year, mo: month, d: startDay });
  }

  // Additional dates after comma/、: M月D日
  const extra = text.replace(baseMatch[0], "");
  const extraRe = /(\d{1,2})月(\d{1,2})日/g;
  let em;
  while ((em = extraRe.exec(extra)) !== null) {
    dates.push({ y: year, mo: Number(em[1]), d: Number(em[2]) });
  }

  return dates;
}

function createMieKodomonoShiroCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMieKodomonoShiroEvents(maxDays) {
    // Step 1: Fetch RSS feed
    let rssXml;
    try {
      rssXml = await fetchText(RSS_URL);
    } catch (_e) {
      console.log(`[${label}] RSS fetch failed`);
      return [];
    }
    if (!rssXml) return [];

    const rssItems = parseRss(rssXml);
    if (rssItems.length === 0) return [];

    // Step 2: Fetch detail pages in batches
    const allEvents = [];
    for (let i = 0; i < rssItems.length; i += DETAIL_BATCH) {
      const batch = rssItems.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const html = await fetchText(item.url);
            if (!html) return null;
            const detail = parseDetailPage(html);
            return { ...item, ...detail };
          } catch (_e) {
            return null;
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value && r.value.dates.length > 0) {
          allEvents.push(r.value);
        }
      }
    }

    // Step 3: Build events
    const point = resolveEventPoint(
      srcKey,
      FACILITY_NAME,
      FACILITY_POINT,
      FACILITY_ADDRESS
    );

    const byId = new Map();
    for (const ev of allEvents) {
      for (const dt of ev.dates) {
        if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;

        const dateKey = `${dt.y}${String(dt.mo).padStart(2, "0")}${String(dt.d).padStart(2, "0")}`;
        const slug = ev.url.split("/").filter(Boolean).pop() || "";
        const id = `${srcKey}:${slug}:${dateKey}`;
        if (byId.has(id)) continue;

        const timeRange = ev.time || {
          startHour: null,
          startMinute: null,
          endHour: null,
          endMinute: null,
        };
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dt.y, mo: dt.mo, d: dt.d },
          timeRange
        );

        const venueName = ev.venue
          ? `${FACILITY_NAME} ${ev.venue}`
          : FACILITY_NAME;

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venueName,
          address: FACILITY_ADDRESS,
          url: ev.url,
          lat: point ? point.lat : FACILITY_POINT.lat,
          lng: point ? point.lng : FACILITY_POINT.lng,
          time_unknown: !timeRange || timeRange.startHour === null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMieKodomonoShiroCollector };

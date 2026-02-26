/**
 * 亀山市 子育てゆうゆう イベントカレンダー コレクター
 * https://www.city.kameyama.mie.jp/kosodate_yuyu/event-calendar/
 *
 * 三重県亀山市の子育て支援情報サイト。WP カレンダー。
 * "子育て・キッズ" カテゴリのイベントを抽出。~20 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://www.city.kameyama.mie.jp";
const CAL_PATH = "/kosodate_yuyu/event-calendar";
const DETAIL_BATCH = 5;
const CHILD_CATEGORY = "子育て";

/** カレンダーページから子育てイベントを抽出 */
function parseCalendarPage(html, year, month) {
  if (!html) return [];
  const events = [];

  // <td id="dayDD" class="day ..."> から日付セルを取得
  const cellRe = /<td\s+id="day(\d{2})"\s+class="day[^"]*">([\s\S]*?)<\/td>/gi;
  let cm;
  while ((cm = cellRe.exec(html)) !== null) {
    const day = Number(cm[1]);
    if (day < 1 || day > 31) continue;
    const cellBody = cm[2];

    // 各 <li> からイベント抽出
    const liRe = /<li>([\s\S]*?)<\/li>/gi;
    let lm;
    while ((lm = liRe.exec(cellBody)) !== null) {
      const liBody = lm[1];

      // カテゴリチェック: <span class="kosodate">子育て・キッズ</span> 等
      const catText = stripTags(liBody).replace(/\s+/g, " ");
      if (!catText.includes(CHILD_CATEGORY)) continue;

      // イベントリンクとタイトル
      const linkM = liBody.match(/<a\s+href="(\/kosodate_yuyu\/events\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      if (!linkM) continue;

      const href = linkM[1];
      const title = stripTags(linkM[2]).trim();
      if (!title) continue;

      events.push({ day, href, title, year, month });
    }
  }
  return events;
}

/** 詳細ページから日時・場所を抽出 */
function parseDetailPage(html) {
  if (!html) return {};
  const result = {};
  const text = stripTags(html).replace(/\s+/g, " ");

  // ■ 日時 から時間を抽出
  const dateTimeM = text.match(/■\s*日時\s+([\s\S]*?)(?=■|$)/);
  if (dateTimeM) {
    result.timeRange = parseTimeRangeFromText(dateTimeM[1]);
  }

  // ■ 場所 から会場名を抽出
  const venueM = text.match(/■\s*場所\s+(.+?)(?=■|$)/);
  if (venueM) {
    result.venue = venueM[1].replace(/\s+/g, " ").trim().substring(0, 80);
  }

  return result;
}

function createKameyamaKosodateCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKameyamaKosodateEvents(maxDays) {
    const now = new Date();
    const months = [];
    for (let i = 0; i < 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth() + 1 });
    }

    // カレンダーページ取得
    const allEvents = [];
    for (const { y, m } of months) {
      const url = `${BASE}${CAL_PATH}/${y}/${String(m).padStart(2, "0")}/`;
      try {
        const html = await fetchText(url);
        if (html) allEvents.push(...parseCalendarPage(html, y, m));
      } catch (e) {
        console.log(`[${label}] calendar ${y}/${m} failed: ${e.message}`);
      }
    }

    if (allEvents.length === 0) return [];

    // 重複排除 (同じ href + day)
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      const key = `${ev.href}:${ev.year}${String(ev.month).padStart(2, "0")}${String(ev.day).padStart(2, "0")}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得 (時間・場所取得)
    const detailMap = new Map();
    const uniqueHrefs = [...new Set(uniqueEvents.map(e => e.href))];
    for (let i = 0; i < uniqueHrefs.length; i += DETAIL_BATCH) {
      const batch = uniqueHrefs.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (href) => {
          const html = await fetchText(`${BASE}${href}`);
          return { href, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.href, r.value.detail);
      }
    }

    const point = source.center;
    const byId = new Map();

    for (const ev of uniqueEvents) {
      const dd = { y: ev.year, mo: ev.month, d: ev.day };
      if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

      const detail = detailMap.get(ev.href) || {};
      const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, detail.timeRange || null);
      const venueName = detail.venue || label;
      const resolvedAddr = resolveEventAddress(source, venueName, null, point);

      const id = `${srcKey}:${ev.href}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName,
        address: resolvedAddr || `三重県亀山市`,
        url: `${BASE}${ev.href}`,
        lat: point.lat, lng: point.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKameyamaKosodateCollector };

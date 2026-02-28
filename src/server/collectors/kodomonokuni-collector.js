const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const { parseYmdFromJst, parseTimeRangeFromText, buildStartsEndsForDate } = require("../date-utils");
const { OTA_GUNMA_SOURCE } = require("../../config/wards");

const SITE_BASE = "https://kodomonokuni.or.jp";
const LIST_URL = `${SITE_BASE}/event/`;
const MAX_PAGES = 3;
const DETAIL_BATCH = 5;
const FETCH_TIMEOUT = 30000; // サイトが遅いため30秒

// 施設の固定住所 (群馬県太田市金山町456-1)
const FACILITY_ADDRESS = "群馬県太田市長手町480";
const FACILITY_NAME = "ぐんまこどもの国児童会館";

/**
 * ぐんまこどもの国児童会館 (kodomonokuni.or.jp) からイベントを収集
 * list+detail 方式: /event/ のリストから個別ページへ遷移して詳細取得
 */
function createCollectKodomonokuniEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;
  const source = OTA_GUNMA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = "こどもの国";

  return async function collectKodomonokuniEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;
    const currentYear = nowJst.y;

    // リストページ取得 (複数ページ)
    const listItems = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 ? LIST_URL : `${LIST_URL}page/${page}/`;
      try {
        const html = await fetchText(url, { timeout: FETCH_TIMEOUT });
        const items = parseListPage(html, currentYear);
        listItems.push(...items);
        // 次ページリンクが無ければ終了
        if (!html.includes(`/event/page/${page + 1}/`)) break;
      } catch (e) {
        console.warn(`[${label}] list page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 日付範囲フィルタ
    const inRange = listItems.filter((item) => {
      if (item.endDateKey) return item.endDateKey >= todayStr;
      return item.startDateKey >= todayStr && item.startDateKey <= endStr;
    });

    // 詳細ページをバッチ取得
    const detailMap = new Map();
    const urls = [...new Set(inRange.map((i) => i.detailUrl))];
    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url, { timeout: FETCH_TIMEOUT });
          return { url, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value.detail);
        }
      }
    }

    // ジオコーディング (施設固定なので1回だけ)
    let point = await geocodeForWard([FACILITY_ADDRESS], source);
    point = resolveEventPoint(source, FACILITY_NAME, point, FACILITY_ADDRESS);

    // イベントレコード生成
    const events = [];
    const seen = new Set();

    for (const item of inRange) {
      const detail = detailMap.get(item.detailUrl) || {};
      const venue = detail.venue || FACILITY_NAME;
      const title = item.title;

      // 日付範囲イベント: 開始日のみレコード生成
      const dateKey = item.startDateKey;
      if (dateKey < todayStr || dateKey > endStr) continue;

      const id = `${srcKey}:${item.detailUrl}:${title}:${dateKey.replace(/-/g, "")}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const timeRange = detail.time ? parseTimeRangeFromText(detail.time) : null;
      const ymd = dateKey.split("-");
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: parseInt(ymd[0]), mo: parseInt(ymd[1]), d: parseInt(ymd[2]) },
        timeRange
      );

      events.push({
        id,
        source: srcKey,
        source_label: source.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: FACILITY_ADDRESS,
        url: item.detailUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${events.length} events collected`);
    return events;
  };
}

/**
 * リストページから {title, detailUrl, startDateKey, endDateKey} を抽出
 * <a href="/event/slug/"><p>日付</p><p>タイトル</p></a>
 */
function parseListPage(html, currentYear) {
  const items = [];
  const linkRe = /<a[^>]+href="((?:https?:\/\/kodomonokuni\.or\.jp)?\/event\/[^"]+\/?)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].trim();
    // リストトップ・ページネーションリンクを除外
    if (/\/event\/?$/.test(href) || /\/page\/\d+/.test(href)) continue;
    const inner = m[2];
    // テキスト抽出 (日付行 + タイトル行)
    const text = stripTags(inner).replace(/\s+/g, " ").trim();
    // "3月1日(日) タイトル" 形式で分割
    const dateMatch = text.match(/^(\d{1,2}月\d{1,2}日[^)）]*[)）](?:[・～〜~][^)）]*[)）])?)\s+(.*)/);
    if (!dateMatch) continue;
    const dateText = dateMatch[1];
    const title = dateMatch[2].trim();
    if (!title) continue;

    // 日付パース: "3月1日(日)" or "2月4日(水)～3月3日(火)"
    const dm = dateText.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dm) continue;
    const mo1 = parseInt(dm[1]);
    const d1 = parseInt(dm[2]);
    let y1 = currentYear;
    if (mo1 < 3 && new Date().getMonth() >= 10) y1 = currentYear + 1;
    const startDateKey = `${y1}-${String(mo1).padStart(2, "0")}-${String(d1).padStart(2, "0")}`;

    let endDateKey = null;
    const rangeMatch = dateText.match(/[～〜~]\s*(\d{1,2})月(\d{1,2})日/);
    if (rangeMatch) {
      const mo2 = parseInt(rangeMatch[1]);
      const d2 = parseInt(rangeMatch[2]);
      let y2 = currentYear;
      if (mo2 < mo1) y2 = currentYear + 1;
      endDateKey = `${y2}-${String(mo2).padStart(2, "0")}-${String(d2).padStart(2, "0")}`;
    }

    items.push({
      title,
      detailUrl: href.startsWith("http") ? href : `${SITE_BASE}${href}`,
      startDateKey,
      endDateKey,
    });
  }
  return items;
}

/**
 * 詳細ページから dl/dt/dd のメタデータを抽出
 */
function parseDetailPage(html) {
  const result = {};
  const dtddRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  let m;
  while ((m = dtddRe.exec(html)) !== null) {
    const key = stripTags(m[1]).trim();
    const val = stripTags(m[2]).trim();
    if (/日にち|日時|開催日/.test(key)) result.date = val;
    if (/時間/.test(key)) result.time = val;
    if (/会場|場所/.test(key)) result.venue = val;
    if (/対象/.test(key)) result.target = val;
  }
  return result;
}

module.exports = { createCollectKodomonokuniEvents };

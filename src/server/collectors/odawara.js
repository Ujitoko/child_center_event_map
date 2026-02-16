const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { ODAWARA_SOURCE } = require("../../config/wards");

const PER_PAGE = 20;
const MAX_PAGES = 5;

/**
 * 一覧ページHTMLからイベントを抽出
 * - 日付: <p class="bCatListDate color11">開催日：2026年02月07日</p>
 * - タイトル+URL: <h5><a href="URL" target="_blank">Title</a></h5>
 */
function parseListPage(html, baseUrl) {
  const events = [];
  // 各イベントブロックを日付+タイトルのペアで抽出
  // 日付パターン
  const blockRe = /<p\s+class="bCatListDate[^"]*">([\s\S]*?)<\/p>[\s\S]*?<h5>([\s\S]*?)<\/h5>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const dateText = stripTags(m[1]);
    const h5Html = m[2];
    // 日付抽出: 開催日：YYYY年MM月DD日
    const dateMatch = dateText.match(/(\d{4})年(\d{2})月(\d{2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // リンク抽出
    const linkMatch = h5Html.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    const href = linkMatch[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(linkMatch[2]).trim();
    if (!href || !title) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ y, mo, d, title, url: absUrl });
  }
  return events;
}

function createCollectOdawaraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectOdawaraEvents(maxDays) {
    const source = `ward_${ODAWARA_SOURCE.key}`;
    const label = ODAWARA_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);

    // 日付範囲パラメータを構築
    const startY = nowJst.y;
    const startM = nowJst.m;
    const startD = nowJst.d;
    const endY = endJst.y;
    const endM = endJst.m;
    const endD = endJst.d;

    // ページネーションで一覧取得
    const rawEvents = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url =
        `${ODAWARA_SOURCE.baseUrl}/event/index.php` +
        `?start_y=${startY}&start_m=${startM}&start_d=${startD}` +
        `&end_y=${endY}&end_m=${endM}&end_d=${endD}` +
        `&evt_genre_chk%5B4%5D=1&pager_num=${page}`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseListPage(html, ODAWARA_SOURCE.baseUrl);
        if (pageEvents.length === 0) break;
        rawEvents.push(...pageEvents);
        // ページあたり件数未満なら最終ページ
        if (pageEvents.length < PER_PAGE) break;
      } catch (e) {
        console.warn(`[${label}] page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成（詳細ページなし、センター座標をフォールバック）
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        null
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${source}:${ev.url}:${ev.title}:${dateKeyStr}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: "",
        address: "",
        url: ev.url,
        lat: ODAWARA_SOURCE.center.lat,
        lng: ODAWARA_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectOdawaraEvents };

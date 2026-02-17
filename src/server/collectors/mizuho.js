const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { MIZUHO_SOURCE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * 一覧ページを解析し、日付ヘッダとイベントリンクを抽出
 * HTML構造:
 *   <h3>2月1日(日曜日)</h3>
 *   <ul><li><a href="/event/e001/p011414.html">Event Title</a></li></ul>
 * @param {string} html - ページHTML
 * @param {number} year - ページに対応する年
 * @param {string} baseUrl - ベースURL
 * @returns {Array<{y: number, mo: number, d: number, title: string, url: string}>}
 */
function parseListPage(html, year, baseUrl) {
  const events = [];
  let currentMonth = 0;
  let currentDay = 0;

  // 日付ヘッダーとリンクを順次検出
  const tokenRe = /<h3[^>]*>[^<]*?(\d{1,2})月(\d{1,2})日[^<]*<\/h3>|<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let m;
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[1] && m[2]) {
      // 日付ヘッダー
      currentMonth = Number(m[1]);
      currentDay = Number(m[2]);
    } else if (m[3] && m[4] && currentMonth > 0 && currentDay > 0) {
      // イベントリンク (日付ヘッダーの後のみ)
      const href = m[3].replace(/&amp;/g, "&").trim();
      const title = stripTags(m[4]).trim();
      if (!href || !title) continue;
      // e001 カテゴリのリンクのみ対象
      if (!/\/event\//.test(href) && !/\/e001\//.test(href)) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({
        y: year,
        mo: currentMonth,
        d: currentDay,
        title,
        url: absUrl,
      });
    }
  }
  return events;
}

/**
 * ジオコーディング候補リストを構築
 * 瑞穂町は東京都西多摩郡に所属
 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("瑞穂町") ? address : `瑞穂町${address}`;
    candidates.push(`東京都西多摩郡${full}`);
  }
  if (venue) {
    candidates.push(`東京都西多摩郡瑞穂町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectMizuhoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMizuhoEvents(maxDays) {
    const source = MIZUHO_SOURCE;
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得 (月別、e001 = 子育てカテゴリ)
    const rawEvents = [];
    for (const ym of months) {
      const mm = String(ym.month).padStart(2, "0");
      const url = `${source.baseUrl}/event/e001/event${ym.year}${mm}.html`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, ym.year, source.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, meta, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectMizuhoEvents };

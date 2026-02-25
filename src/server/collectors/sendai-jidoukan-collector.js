/**
 * 仙台市児童館・児童センター イベントコレクター
 * https://www.hm-sendai.jp/jidoukan/event/index.php
 *
 * 81館の児童館から乳幼児親子対象行事を一括取得。
 * リストページで全イベントが1ページに出力されるため、
 * 詳細ページへの遷移なしで効率的に収集可能。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://www.hm-sendai.jp/jidoukan";
const LIST_URL = `${SITE_BASE}/event/index.php`;

// 区 → 仙台市{区} mapping from CSS class
const WARD_MAP = {
  d_aobaku: "青葉区",
  d_miyaginoku: "宮城野区",
  d_wakabayasiku: "若林区",
  d_taihakuku: "太白区",
  d_izumiku: "泉区",
};

/**
 * リストページHTMLからイベントを抽出
 * <li class='d_aobaku cate_n ... 2026-01-29'>
 *   <span class='date'>1/29 (木)</span>
 *   <h4><a href='../shisetsu/view.php?article=n202601041'>TITLE</a></h4>
 *   <p class='bunrui'>CATEGORIES</p>
 *   <span class='jidoukan'><a href='URL'>FACILITY</a></span>
 * </li>
 */
function parseListHtml(html) {
  const events = [];
  // Match each <li> with cate_n (乳幼児対象) or cate_c (企画・定例イベント)
  const liRe = /<li\s+class='([^']*cate_[nc][^']*)'>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(html)) !== null) {
    const cls = m[1];
    const content = m[2];

    // Extract date from class (YYYY-MM-DD)
    const dateMatch = cls.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) continue;

    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);

    // Extract ward from class
    let ward = "";
    for (const [key, name] of Object.entries(WARD_MAP)) {
      if (cls.includes(key)) { ward = name; break; }
    }

    // Extract title from <h4><a>
    const titleMatch = content.match(/<h4><a\s+href='([^']*)'[^>]*>([\s\S]*?)<\/a><\/h4>/i);
    if (!titleMatch) continue;
    const articleHref = titleMatch[1];
    const title = stripTags(titleMatch[2]).trim();
    if (!title) continue;

    // Extract article ID
    const articleIdMatch = articleHref.match(/article=([a-z0-9]+)/i);
    const articleId = articleIdMatch ? articleIdMatch[1] : "";

    // Extract facility name from <span class='jidoukan'><a>
    const facilityMatch = content.match(/<span\s+class='jidoukan'><a\s+[^>]*>([\s\S]*?)<\/a><\/span>/i);
    const facility = facilityMatch ? stripTags(facilityMatch[1]).trim() : "";

    events.push({ y, mo, d, title, articleId, facility, ward });
  }
  return events;
}

function createSendaiJidoukanCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSendaiJidoukanEvents(maxDays) {
    let html;
    try {
      html = await fetchText(LIST_URL);
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }
    if (!html) return [];

    const parsed = parseListHtml(html);
    if (parsed.length === 0) return [];

    const byId = new Map();

    for (const ev of parsed) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.articleId || dateKey}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      // Geocoding by facility name + ward
      const venue = sanitizeVenueText(ev.facility);
      const candidates = [];
      if (venue && ev.ward) candidates.push(`宮城県仙台市${ev.ward} ${venue}`);
      if (venue) candidates.push(`宮城県仙台市 ${venue}`);
      if (ev.ward) candidates.push(`宮城県仙台市${ev.ward}`);

      let point = await geocodeForWard(candidates.slice(0, 3), source);
      const addrFallback = ev.ward ? `宮城県仙台市${ev.ward}` : "宮城県仙台市";
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      const detailUrl = ev.articleId
        ? `${SITE_BASE}/shisetsu/view.php?article=${ev.articleId}`
        : LIST_URL;

      const dd = { y: ev.y, mo: ev.mo, d: ev.d };
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, {
        startHour: null, startMinute: null, endHour: null, endMinute: null,
      });

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue || ev.facility,
        address: resolvedAddress || "",
        url: detailUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
        time_unknown: true,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createSendaiJidoukanCollector };

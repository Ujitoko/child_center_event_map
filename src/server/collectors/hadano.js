const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseDatesFromHtml,
} = require("../date-utils");
const { HADANO_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_URL_PATH = /kosodate/;
const CHILD_KEYWORD_RE =
  /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産)/;
const DETAIL_BATCH_SIZE = 6;

/**
 * カレンダーページHTMLからイベントリンクを抽出
 * リンク形式: <a href="/event-calendar/CATEGORY/ID.html">Title</a>
 */
function parseCalendarPage(html, baseUrl) {
  const events = [];
  const linkRe = /<a\s+href="((?:https?:\/\/[^"]*)?\/event-calendar\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].trim();
    const title = stripTags(m[2]).trim();
    if (!href || !title) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ title, url: absUrl, href });
  }
  return events;
}

/**
 * 子育て関連イベントかどうかを判定
 * - URLパスに kosodate を含む
 * - タイトルに子育てキーワードを含む
 */
function isChildRelated(ev) {
  if (CHILD_URL_PATH.test(ev.href)) return true;
  if (CHILD_KEYWORD_RE.test(ev.title)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("秦野市") ? address : `秦野市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県秦野市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHadanoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHadanoEvents(maxDays) {
    const source = `ward_${HADANO_SOURCE.key}`;
    const label = HADANO_SOURCE.label;

    // カレンダーページ取得
    let calendarHtml;
    try {
      calendarHtml = await fetchText(`${HADANO_SOURCE.baseUrl}/calendar.html`);
    } catch (e) {
      console.warn(`[${label}] calendar page fetch failed:`, e.message || e);
      return [];
    }

    // イベントリンク抽出
    const allLinks = parseCalendarPage(calendarHtml, HADANO_SOURCE.baseUrl);

    // 子育て関連フィルタ
    const childLinks = allLinks.filter(isChildRelated);

    // URL重複除去
    const uniqueMap = new Map();
    for (const ev of childLinks) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = uniqueEvents.map((e) => e.url).slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const dates = parseDatesFromHtml(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url, meta, dates, timeRange };
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
      const detail = detailMap.get(ev.url);
      if (!detail || !detail.dates || detail.dates.length === 0) continue;

      const venue = sanitizeVenueText((detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail.meta && detail.meta.address) || "");
      const timeRange = detail.timeRange || null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(HADANO_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), HADANO_SOURCE);
      point = resolveEventPoint(HADANO_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(HADANO_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      // 各日付でレコード生成
      for (const dt of detail.dates) {
        if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dt.y, mo: dt.mo, d: dt.d },
          timeRange
        );
        const dateKey = `${dt.y}${String(dt.mo).padStart(2, "0")}${String(dt.d).padStart(2, "0")}`;
        const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: address || "",
          url: ev.url,
          lat: point ? point.lat : HADANO_SOURCE.center.lat,
          lng: point ? point.lng : HADANO_SOURCE.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHadanoEvents };

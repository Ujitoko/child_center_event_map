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
const { ATSUGI_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_URL_PATHS = /\/kodomo\//;
const CHILD_TITLE_RE =
  /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産)/;
const DETAIL_BATCH_SIZE = 6;

function parseListPage(html, baseUrl) {
  const events = [];
  // <p class="calPageLink"><a href="URL">Title</a></p>
  const linkRe = /<p\s+class="calPageLink">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/p>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[2]).trim();
    if (!href || !title) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ title, url: absUrl });
  }
  return events;
}

function isChildRelated(ev) {
  if (CHILD_URL_PATHS.test(ev.url)) return true;
  if (CHILD_TITLE_RE.test(ev.title)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("厚木市") ? address : `厚木市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県厚木市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectAtsugiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectAtsugiEvents(maxDays) {
    const source = `ward_${ATSUGI_SOURCE.key}`;
    const label = ATSUGI_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得 (月別)
    const rawEvents = [];
    for (const ym of months) {
      const url = `${ATSUGI_SOURCE.baseUrl}/calendar.html?year=${ym.year}&month=${ym.month}&eventTypeNo=1`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, ATSUGI_SOURCE.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 子育て関連フィルタ
    const childEvents = rawEvents.filter(isChildRelated);

    // 重複除去 (url)
    const uniqueMap = new Map();
    for (const ev of childEvents) {
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
      const timeRange = detail.timeRange;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(ATSUGI_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), ATSUGI_SOURCE);
      point = resolveEventPoint(ATSUGI_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(ATSUGI_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      for (const dd of detail.dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dd.y, mo: dd.mo, d: dd.d },
          timeRange
        );
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
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectAtsugiEvents };

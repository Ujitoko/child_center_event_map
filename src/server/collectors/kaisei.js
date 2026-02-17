const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { KAISEI_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * RSS 2.0 feed (<item>) をパースしてタイトル・URL一覧を返す
 */
function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)
      || block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    if (!titleMatch || !linkMatch) continue;
    const title = stripTags(titleMatch[1]).trim();
    let url = linkMatch[1].trim();
    // http → https 統一
    if (url.startsWith("http://")) url = url.replace("http://", "https://");
    if (title && url) items.push({ title, url });
  }
  return items;
}

/**
 * 詳細ページから日付を抽出 (令和N年M月D日, YYYY年M月D日, M月D日)
 * 年度ベースの月推定も行う
 */
function parseDatesFromDetail(html) {
  const dates = [];
  const seen = new Set();
  const push = (y, mo, d) => {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return;
    const key = `${y}-${mo}-${d}`;
    if (seen.has(key)) return;
    seen.add(key);
    dates.push({ y, mo, d });
  };

  const text = stripTags(html);

  // 令和N年M月D日
  const reiwaRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = reiwaRe.exec(text)) !== null) {
    push(2018 + Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // YYYY年M月D日
  const jpRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = jpRe.exec(text)) !== null) {
    push(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // M月D日 (年は現在のJST年で補完)
  if (dates.length === 0) {
    const now = new Date();
    const jstYear = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
    const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
    while ((m = mdRe.exec(text)) !== null) {
      push(jstYear, Number(m[1]), Number(m[2]));
    }
  }

  return dates;
}

/**
 * 詳細ページから住所を抽出 (div-info__addr)
 */
function parseAddressFromDetail(html) {
  const addrMatch = html.match(
    /<div\s+class="div-info__addr"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (!addrMatch) return "";
  let addr = stripTags(addrMatch[1]).trim();
  // "住所：" プレフィクスを除去
  addr = addr.replace(/^住所[：:]\s*/, "");
  // 郵便番号を除去
  addr = addr.replace(/^\d{3}-?\d{4}\s*/, "");
  return addr.trim();
}

/**
 * ジオコーディング候補リストを構築 (開成町は神奈川県足柄上郡)
 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("開成町") ? address : `開成町${address}`;
    const withGun = full.includes("足柄上郡") ? full : `足柄上郡${full}`;
    candidates.push(`神奈川県${withGun}`);
  }
  if (venue) {
    candidates.push(`神奈川県足柄上郡開成町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectKaiseiEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectKaiseiEvents(maxDays) {
    const source = `ward_${KAISEI_SOURCE.key}`;
    const label = KAISEI_SOURCE.label;

    // RSS 2つ取得: /RSSFeed/menu/80 (イベント), /RSSFeed/menu/93 (相談・教室)
    const rssUrls = [
      { url: `${KAISEI_SOURCE.baseUrl}/RSSFeed/menu/80`, isChildCategory: false },
      { url: `${KAISEI_SOURCE.baseUrl}/RSSFeed/menu/93`, isChildCategory: true },
    ];

    const rawItems = [];
    for (const { url, isChildCategory } of rssUrls) {
      try {
        const xml = await fetchText(url);
        const items = parseRssItems(xml);
        for (const item of items) {
          // /93 は子育て相談カテゴリなので全件対象
          // /80 はタイトルフィルタ
          if (isChildCategory || WARD_CHILD_HINT_RE.test(item.title)) {
            rawItems.push(item);
          }
        }
      } catch (e) {
        console.warn(`[${label}] RSS fetch failed (${url}):`, e.message || e);
      }
    }

    // 重複除去 (URL)
    const uniqueItems = [...new Map(rawItems.map((i) => [i.url, i])).values()];

    // 詳細ページをバッチ取得
    const detailMap = new Map();
    for (let i = 0; i < uniqueItems.length; i += DETAIL_BATCH_SIZE) {
      const batch = uniqueItems.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const html = await fetchText(item.url);
          const dates = parseDatesFromDetail(html);
          const address = parseAddressFromDetail(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          // 会場抽出
          const bodyText = stripTags(html);
          const venueMatch = bodyText.match(
            /(?:会場|場所|ところ|開催場所)[：:・\s]\s*([^\n]{2,40})/
          );
          const venue = venueMatch ? venueMatch[1].trim() : "";
          return { url: item.url, dates, address, timeRange, venue };
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
    for (const item of uniqueItems) {
      const detail = detailMap.get(item.url);
      if (!detail || detail.dates.length === 0) continue;

      const venue = sanitizeVenueText(detail.venue || "");
      const rawAddress = sanitizeAddressText(detail.address || "");
      const timeRange = detail.timeRange;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(KAISEI_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), KAISEI_SOURCE);
      point = resolveEventPoint(KAISEI_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(KAISEI_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      for (const dd of detail.dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dd.y, mo: dd.mo, d: dd.d },
          timeRange
        );
        const id = `${source}:${item.url}:${item.title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source,
          source_label: label,
          title: item.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: address || "",
          url: item.url,
          lat: point ? point.lat : KAISEI_SOURCE.center.lat,
          lng: point ? point.lng : KAISEI_SOURCE.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKaiseiEvents };

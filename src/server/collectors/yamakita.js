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
const { YAMAKITA_SOURCE, KNOWN_YAMAKITA_FACILITIES, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * カテゴリページからリンク一覧を抽出
 * <li><a href="...">title</a></li> パターン
 */
function parseCategoryPage(html, baseUrl) {
  const items = [];
  const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[2]).trim();
    if (!href || !title) continue;
    // 詳細ページリンクのみ対象 (/XXXXXXXXXX.html)
    if (!/\/\d{10}\.html/.test(href) && !/\/\d+\.html/.test(href)) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
    items.push({ title, url: absUrl });
  }
  return items;
}

/**
 * 詳細ページのテーブルから日付を抽出
 * mol_tableblock 内のテーブルに月/日が列挙されている
 * 年度推定: ページ内の「令和N年度」表記から年度判定
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

  // 令和N年M月D日 (完全形)
  const reiwaFullRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = reiwaFullRe.exec(text)) !== null) {
    push(2018 + Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // YYYY年M月D日
  const jpFullRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = jpFullRe.exec(text)) !== null) {
    push(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // 完全形が見つかった場合はそれを使う
  if (dates.length > 0) return dates;

  // 年度推定: 「令和N年度」から
  let fiscalYear = null;
  const fyMatch = text.match(/令和\s*(\d{1,2})年度/);
  if (fyMatch) {
    fiscalYear = 2018 + Number(fyMatch[1]);
  }
  // 「YYYY年度」パターン
  if (!fiscalYear) {
    const fyMatch2 = text.match(/(\d{4})年度/);
    if (fyMatch2) fiscalYear = Number(fyMatch2[1]);
  }

  // テーブル内の M月D日 パターン
  const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = mdRe.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (fiscalYear) {
      // 年度判定: 4月以降は年度年、1-3月は年度年+1
      const y = mo >= 4 ? fiscalYear : fiscalYear + 1;
      push(y, mo, d);
    } else {
      // フォールバック: 現在のJST年
      const now = new Date();
      const jstYear = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
      push(jstYear, mo, d);
    }
  }

  return dates;
}

/**
 * ジオコーディング候補リストを構築 (山北町は神奈川県足柄上郡)
 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("山北町") ? address : `山北町${address}`;
    const withGun = full.includes("足柄上郡") ? full : `足柄上郡${full}`;
    candidates.push(`神奈川県${withGun}`);
  }
  if (venue) {
    candidates.push(`神奈川県足柄上郡山北町 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectYamakitaEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectYamakitaEvents(maxDays) {
    const source = `ward_${YAMAKITA_SOURCE.key}`;
    const label = YAMAKITA_SOURCE.label;

    // カテゴリページ取得 (子育てカテゴリ)
    const categoryUrl = `${YAMAKITA_SOURCE.baseUrl}/category/1-6-2-0-0.html`;
    let rawItems = [];
    try {
      const html = await fetchText(categoryUrl);
      rawItems = parseCategoryPage(html, YAMAKITA_SOURCE.baseUrl);
    } catch (e) {
      console.warn(`[${label}] category page fetch failed:`, e.message || e);
      return [];
    }

    // タイトルフィルタ
    const filteredItems = rawItems.filter((item) => WARD_CHILD_HINT_RE.test(item.title));

    // 重複除去 (URL)
    const uniqueItems = [...new Map(filteredItems.map((i) => [i.url, i])).values()];

    // 詳細ページをバッチ取得
    const detailMap = new Map();
    for (let i = 0; i < uniqueItems.length; i += DETAIL_BATCH_SIZE) {
      const batch = uniqueItems.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const html = await fetchText(item.url);
          const dates = parseDatesFromDetail(html);
          const timeRange = parseTimeRangeFromText(stripTags(html));
          return { url: item.url, dates, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // 会場固定: 健康福祉センター
    const defaultVenue = "健康福祉センター";
    const defaultAddress = KNOWN_YAMAKITA_FACILITIES[defaultVenue] || "";

    // ジオコーディング (固定会場なので1回だけ)
    let geoCandidates = buildGeoCandidates(defaultVenue, defaultAddress);
    if (getFacilityAddressFromMaster) {
      const fmAddr = getFacilityAddressFromMaster(YAMAKITA_SOURCE.key, defaultVenue);
      if (fmAddr) {
        const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
        geoCandidates.unshift(full);
      }
    }
    let defaultPoint = await geocodeForWard(geoCandidates.slice(0, 7), YAMAKITA_SOURCE);
    defaultPoint = resolveEventPoint(YAMAKITA_SOURCE, defaultVenue, defaultPoint, defaultAddress || `${label} ${defaultVenue}`);
    const resolvedAddress = resolveEventAddress(YAMAKITA_SOURCE, defaultVenue, defaultAddress || `${label} ${defaultVenue}`, defaultPoint);

    // イベントレコード生成
    const byId = new Map();
    for (const item of uniqueItems) {
      const detail = detailMap.get(item.url);
      if (!detail || detail.dates.length === 0) continue;

      const timeRange = detail.timeRange;
      const venue = sanitizeVenueText(defaultVenue);
      const address = sanitizeAddressText(resolvedAddress || "");

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
          lat: defaultPoint ? defaultPoint.lat : YAMAKITA_SOURCE.center.lat,
          lng: defaultPoint ? defaultPoint.lng : YAMAKITA_SOURCE.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectYamakitaEvents };

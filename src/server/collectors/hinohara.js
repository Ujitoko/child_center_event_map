const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseYmdFromJst,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE_URL = "https://www.vill.hinohara.tokyo.jp";

const CHILD_KEYWORDS_RE =
  /子育て|子ども|親子|乳幼児|幼児|赤ちゃん|ベビー|おはなし|リトミック|ママ|パパ|離乳食|健診|マタニティ|保育|児童|キッズ|読み聞かせ|予防接種/;

/**
 * ニュース一覧ページから子育て関連記事を抽出
 * HTML構造: <a href="../NNNNN.html">タイトル [YYYY年MM月DD日]</a>
 */
function parseNewsPage(html) {
  const items = [];
  const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const rawText = stripTags(m[2]).trim();
    if (!rawText || rawText.length < 5) continue;
    // 子育て関連フィルタ
    if (!CHILD_KEYWORDS_RE.test(rawText)) continue;
    // 日付抽出: [YYYY年MM月DD日]
    const dateMatch = rawText.match(/\[?(\d{4})年(\d{1,2})月(\d{1,2})日\]?/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // タイトル: 日付部分を除去
    const title = rawText.replace(/\s*\[?\d{4}年\d{1,2}月\d{1,2}日\]?\s*$/, "").trim();
    if (!title) continue;
    // URL構築
    let absUrl;
    if (href.startsWith("http")) {
      absUrl = href;
    } else if (href.startsWith("../")) {
      absUrl = `${BASE_URL}/${href.replace(/^\.\.\//, "")}`;
    } else {
      absUrl = `${BASE_URL}${href.startsWith("/") ? "" : "/"}${href}`;
    }
    items.push({ y, mo, d, title, url: absUrl });
  }
  return items;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("檜原村") ? address : `西多摩郡檜原村${address}`;
    candidates.push(`東京都${full}`);
  }
  if (venue) {
    candidates.push(`東京都西多摩郡檜原村 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHinoharaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const HINOHARA_SOURCE = require("../../config/wards").HINOHARA_SOURCE;

  return async function collectHinoharaEvents(maxDays) {
    const source = `ward_${HINOHARA_SOURCE.key}`;
    const label = HINOHARA_SOURCE.label;

    // ニュース一覧ページを取得
    const rawItems = [];
    try {
      const html = await fetchText(`${BASE_URL}/news/0001.html`);
      rawItems.push(...parseNewsPage(html));
    } catch (e) {
      console.warn(`[${label}] news page fetch failed:`, e.message || e);
    }

    // 重複除去
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const dateKey = `${item.y}-${String(item.mo).padStart(2, "0")}-${String(item.d).padStart(2, "0")}`;
      const key = `${item.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueItems.map((e) => e.url))].slice(0, 30);
    const detailMap = new Map();
    for (const url of detailUrls) {
      try {
        const html = await fetchText(url);
        const meta = parseDetailMeta(html);
        const plainText = stripTags(html);
        const timeRange = parseTimeRangeFromText(plainText);
        if (!meta.venue) {
          const placeMatch = plainText.match(/(?:場所|会場|開催場所|ところ)[：:・\s]\s*([^\n]{2,60})/);
          if (placeMatch) {
            let v = placeMatch[1].trim();
            v = v.replace(/\s*(?:住所|駐車|対象|定員|電話|内容|持ち物|日時|費用|備考).*$/, "").trim();
            if (v.length >= 2 && !/^[にでのをはがお]/.test(v)) meta.venue = v;
          }
        }
        detailMap.set(url, { meta, timeRange });
      } catch (e) { /* skip */ }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const item of uniqueItems) {
      if (!inRangeJst(item.y, item.mo, item.d, maxDays)) continue;

      const detail = detailMap.get(item.url);
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(HINOHARA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), HINOHARA_SOURCE);
      point = resolveEventPoint(HINOHARA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(HINOHARA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const dateKey = `${item.y}${String(item.mo).padStart(2, "0")}${String(item.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: item.y, mo: item.mo, d: item.d },
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
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHinoharaEvents };

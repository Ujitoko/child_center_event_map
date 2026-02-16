const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

// 子育て関連キーワード (WARD_CHILD_HINT_RE を補完)
const CHILD_KEYWORDS_RE =
  /子育て|子ども|子供|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|健診|健康診査|マタニティ|プレママ|ママ|パパ/;

/**
 * イベントが子育て関連かどうか判定
 * @param {Object} entry - calendar.json のエントリ
 * @returns {boolean}
 */
function isChildEvent(entry) {
  const title = entry.page_name || "";
  if (WARD_CHILD_HINT_RE.test(title)) return true;
  if (CHILD_KEYWORDS_RE.test(title)) return true;
  if (entry.event) {
    const typeName = entry.event.event_type_name || "";
    if (/子育て|子ども/.test(typeName)) return true;
  }
  return false;
}

/**
 * 日付範囲を展開 (最大30日でキャップ)
 * @param {string} startStr - "YYYY-MM-DD"
 * @param {string} endStr - "YYYY-MM-DD"
 * @returns {Array<{y: number, mo: number, d: number}>}
 */
function expandDateRange(startStr, endStr) {
  const dates = [];
  const startParts = startStr.split("-").map(Number);
  const endParts = endStr.split("-").map(Number);
  const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
  const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
  const dayMs = 86400000;
  const diffDays = Math.min(Math.floor((end - start) / dayMs), 30);
  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(start.getTime() + i * dayMs);
    dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
  }
  return dates;
}

/**
 * ジオコーディング候補リストを構築
 * calendar.json を利用する自治体はすべて神奈川県
 */
function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const cityName = source.label;
  const pref = "神奈川県";
  if (address) {
    const full = address.includes(cityName) ? address : `${cityName}${address}`;
    candidates.push(`${pref}${full}`);
  }
  if (venue) {
    candidates.push(`${pref}${cityName} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * 汎用 calendar.json コレクターファクトリー
 * 対応自治体: 寒川町, 愛川町, 三浦市, 大磯町, 葉山町
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string[]} [config.childKeywords] - 追加の子育てキーワード
 * @param {Object} deps - { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster }
 */
function createCalendarJsonCollector(config, deps) {
  const { source, childKeywords } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  // 追加キーワードがある場合は正規表現を拡張
  let extraKeywordsRe = null;
  if (childKeywords && childKeywords.length > 0) {
    extraKeywordsRe = new RegExp(childKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"));
  }

  return async function collectCalendarJsonEvents(maxDays) {
    const calendarUrl = `${source.baseUrl}/calendar.json`;
    let entries;
    try {
      const jsonText = await fetchText(calendarUrl);
      entries = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] calendar.json fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(entries)) {
      console.warn(`[${label}] calendar.json is not an array`);
      return [];
    }

    // 子育て関連イベントをフィルタ
    const childEntries = entries.filter((entry) => {
      if (isChildEvent(entry)) return true;
      if (extraKeywordsRe && extraKeywordsRe.test(entry.page_name || "")) return true;
      return false;
    });

    // 日付展開 + 範囲フィルタ
    const rawItems = [];
    for (const entry of childEntries) {
      if (!entry.page_name || !entry.url) continue;
      const dateList = Array.isArray(entry.date_list) ? entry.date_list : [];
      if (dateList.length === 0) continue;

      const eventPlace = (entry.event && entry.event.event_place) || "";

      for (const pair of dateList) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const startStr = pair[0];
        const endStr = pair[1];
        if (!startStr) continue;

        const dates = (startStr === endStr)
          ? (() => {
              const p = startStr.split("-").map(Number);
              return [{ y: p[0], mo: p[1], d: p[2] }];
            })()
          : expandDateRange(startStr, endStr);

        for (const dd of dates) {
          if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
          rawItems.push({
            title: entry.page_name,
            url: entry.url,
            eventPlace,
            y: dd.y,
            mo: dd.mo,
            d: dd.d,
          });
        }
      }
    }

    // URL + date で重複除去
    const uniqueMap = new Map();
    for (const item of rawItems) {
      const dateKey = `${item.y}${String(item.mo).padStart(2, "0")}${String(item.d).padStart(2, "0")}`;
      const key = `${item.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...item, dateKey });
    }
    const uniqueItems = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得 (URLごとに1回)
    const detailUrls = [...new Set(uniqueItems.map((e) => e.url))].slice(0, 120);
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
    for (const item of uniqueItems) {
      const detail = detailMap.get(item.url);

      // 会場: JSON の event_place を優先、なければ詳細ページから
      const jsonVenue = sanitizeVenueText(item.eventPlace || "");
      const detailVenue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const venue = jsonVenue || detailVenue;

      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress, source);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: item.y, mo: item.mo, d: item.d },
        timeRange
      );
      const id = `${srcKey}:${item.url}:${item.title}:${item.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
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

module.exports = { createCalendarJsonCollector };

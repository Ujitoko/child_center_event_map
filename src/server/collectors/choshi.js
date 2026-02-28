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
const { CHOSHI_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;
const FEED_URL = "https://www.city.choshi.chiba.jp/event.rss";

/**
 * RSS 2.0 フィードからイベント項目を抽出
 */
function parseRss2Feed(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || "";
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || "";
    const desc = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1] || "";

    if (!title.trim() || !link.trim()) continue;
    items.push({
      title: stripTags(title).trim(),
      url: link.trim(),
      pubDate: pubDate.trim(),
      description: stripTags(desc).trim(),
    });
  }
  return items;
}

/**
 * pubDate (RFC 2822) から年月日を抽出
 */
function parsePubDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  // JST変換
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return { y: jst.getUTCFullYear(), mo: jst.getUTCMonth() + 1, d: jst.getUTCDate() };
}

/**
 * 詳細ページからイベント日付を抽出（複数日対応）
 * 「開催日」ラベル以降の日付を優先、なければ全体から「更新日」直後を除外
 */
function parseDatesFromDetail(text) {
  // 「開催日」セクションからの抽出を優先
  const kaiIdx = text.indexOf("開催日");
  const searchText = kaiIdx >= 0 ? text.slice(kaiIdx) : text;

  const dates = [];

  // 西暦パターン
  const isoRe = /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  let m;
  while ((m = isoRe.exec(searchText)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  if (dates.length > 0) return dates;

  // 令和パターン
  const reRe = /令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g;
  while ((m = reRe.exec(searchText)) !== null) {
    dates.push({ y: 2018 + Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  return dates;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("銚子市") ? address : `銚子市${address}`;
    candidates.push(`千葉県${full}`);
  }
  if (venue) {
    candidates.push(`千葉県銚子市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectChoshiEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectChoshiEvents(maxDays) {
    const source = `ward_${CHOSHI_SOURCE.key}`;
    const label = CHOSHI_SOURCE.label;

    let xml;
    try {
      xml = await fetchText(FEED_URL);
    } catch (e) {
      console.warn(`[${label}] RSS feed fetch failed:`, e.message || e);
      return [];
    }

    const items = parseRss2Feed(xml);

    // 子育て関連フィルタ
    const filtered = items.filter(item => {
      return WARD_CHILD_HINT_RE.test(item.title) ||
        /子育て|子ども|子供|親子|乳幼児|幼児|キッズ|児童|教室|講座|おはなし会|家庭の日|読み聞かせ|絵本/.test(item.title) ||
        /子育て|子ども|親子|乳幼児/.test(item.description);
    });

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(filtered.map(e => e.url))].slice(0, 40);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          let venue = "";
          let address = "";
          // dt/dd パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
          // th/td パターン
          if (!venue || !address) {
            const trRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
            while ((mm = trRe.exec(html)) !== null) {
              const k = stripTags(mm[1]);
              const v = stripTags(mm[2]);
              if (!k || !v) continue;
              if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
              if (!address && /(住所|所在地)/.test(k)) address = v;
            }
          }
          const eventDates = parseDatesFromDetail(text);
          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, eventDates, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const item of filtered) {
      const detail = detailMap.get(item.url);
      let eventDates = (detail && detail.eventDates && detail.eventDates.length > 0)
        ? detail.eventDates
        : null;
      // フォールバック: pubDateから日付取得
      if (!eventDates) {
        const pd = parsePubDate(item.pubDate);
        if (pd) eventDates = [pd];
      }
      if (!eventDates || eventDates.length === 0) continue;

      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(CHOSHI_SOURCE.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), CHOSHI_SOURCE);
      point = resolveEventPoint(CHOSHI_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(CHOSHI_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      for (const eventDate of eventDates) {
        if (!inRangeJst(eventDate.y, eventDate.mo, eventDate.d, maxDays)) continue;
        const dateKey = `${eventDate.y}${String(eventDate.mo).padStart(2, "0")}${String(eventDate.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: eventDate.y, mo: eventDate.mo, d: eventDate.d },
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
          address: resolvedAddr || "",
          url: item.url,
          lat: point ? point.lat : CHOSHI_SOURCE.center.lat,
          lng: point ? point.lng : CHOSHI_SOURCE.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectChoshiEvents };

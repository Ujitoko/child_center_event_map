const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|きっず|児童|保育|離乳食|おはなし|すくすく|のびのび|ママ|パパ|マタニティ/;

/**
 * 草加市カレンダーページ (calendar/YYYYMM.html) から
 * inline JS push パターンでイベントを抽出
 */
function parseSokaCalendarPage(html, baseUrl) {
  const events = [];

  // title2.push('...');
  const titles = [];
  const titleRe = /title2\.push\('([\s\S]*?)'\);/g;
  let m;
  while ((m = titleRe.exec(html)) !== null) titles.push(m[1]);

  // cate2.push('...');
  const categories = [];
  const cateRe = /cate2\.push\('([^']*)'\);/g;
  while ((m = cateRe.exec(html)) !== null) categories.push(m[1]);

  // url2.push("...");
  const urls = [];
  const urlRe = /url2\.push\("([^"]*)"\);/g;
  while ((m = urlRe.exec(html)) !== null) urls.push(m[1]);

  // hiduke2.push("...");
  const dates = [];
  const dateRe = /hiduke2\.push\("([^"]*)"\);/g;
  while ((m = dateRe.exec(html)) !== null) dates.push(m[1]);

  const count = Math.min(titles.length, categories.length, urls.length, dates.length);
  for (let i = 0; i < count; i++) {
    const titleText = stripTags(titles[i]).replace(/&nbsp;/g, " ").trim();
    const cate2 = categories[i];
    const rawUrl = urls[i];
    const dateStr = dates[i]; // "YYYY/M/D"

    if (!titleText || !rawUrl || !dateStr) continue;

    // 子育てフィルタ: カテゴリ event06 OR キーワードマッチ
    const isChild = cate2 === "event06" || CHILD_RE.test(titleText) || WARD_CHILD_HINT_RE.test(titleText);
    if (!isChild) continue;

    // 日付パース
    const dp = dateStr.split("/").map(Number);
    if (dp.length < 3 || !dp[0] || !dp[1] || !dp[2]) continue;

    // URL 解決 (../cont/... → baseUrl/cont/...)
    let absUrl = rawUrl;
    if (rawUrl.startsWith("../")) {
      absUrl = `${baseUrl}/${rawUrl.replace(/^\.\.\//, "")}`;
    } else if (rawUrl.startsWith("/")) {
      absUrl = `${baseUrl}${rawUrl}`;
    } else if (!rawUrl.startsWith("http")) {
      absUrl = `${baseUrl}/calendar/${rawUrl}`;
    }

    events.push({
      title: titleText,
      url: absUrl,
      y: dp[0],
      mo: dp[1],
      d: dp[2],
    });
  }

  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("草加市") ? address : `草加市${address}`;
    candidates.push(full.includes("埼玉県") ? full : `埼玉県${full}`);
  }
  if (venue) {
    candidates.push(`埼玉県草加市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectSokaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectSokaEvents(maxDays) {
    const source = deps.source || { key: "soka", label: "草加市", baseUrl: "https://www.city.soka.saitama.jp", center: { lat: 35.8265, lng: 139.8055 } };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      const mm = String(month).padStart(2, "0");
      const url = `${baseUrl}/calendar/${year}${mm}.html`;
      try {
        const html = await fetchText(url);
        const parsed = parseSokaCalendarPage(html, baseUrl);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] calendar page fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 60);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          let venue = "";
          let address = "";

          // h2 + p パターン (場所/会場セクション)
          const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>\s*([\s\S]*?)(?=<h2|<\/main|<\/article|<footer|$)/gi;
          let hm;
          while ((hm = h2Re.exec(html)) !== null) {
            const heading = stripTags(hm[1]).trim();
            const body = hm[2];
            if (!venue && /^(?:場所|会場|開催場所|ところ)$/.test(heading)) {
              const pMatch = body.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
              if (pMatch) venue = stripTags(pMatch[1]).trim();
            }
          }

          // テキストから住所検出
          const addrMatch = text.match(/草加市[^\s、。,）)]{2,30}/);
          if (addrMatch) address = addrMatch[0];

          // 〒 パターン
          if (!address) {
            const pMatch = text.match(/[（(（]([^）)]*草加市[^）)]*)[）)]/);
            if (pMatch) address = pMatch[1].trim();
          }

          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const resolvedAddr = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, timeRange);
      const id = `${srcKey}:${ev.url}:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddr || "",
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectSokaEvents };

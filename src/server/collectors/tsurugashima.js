const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

/**
 * 鶴ヶ島市カレンダー一覧ページ (cal.php) からイベントリンクを抽出
 *
 * リンク形式: <a href="cal.php?mode=detail&lc=0&category=1&year=2026&month=2&day=18#ev0">タイトル</a>
 */
function parseTsurugashimaCalendarPage(html, baseUrl, fallbackYear, fallbackMonth) {
  const events = [];
  const linkRe = /<a\s+[^>]*href="(cal\.php\?mode=detail[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&");
    const title = stripTags(m[2]).trim();
    if (!title) continue;

    // URL パラメータから年月日を抽出
    const yearMatch = href.match(/year=(\d{4})/);
    const monthMatch = href.match(/month=(\d{1,2})/);
    const dayMatch = href.match(/day=(\d{1,2})/);
    const evMatch = href.match(/#ev(\d+)/);

    const y = yearMatch ? Number(yearMatch[1]) : fallbackYear;
    const mo = monthMatch ? Number(monthMatch[1]) : fallbackMonth;
    const d = dayMatch ? Number(dayMatch[1]) : null;
    if (!y || !mo || !d) continue;

    const absUrl = `${baseUrl}/${href}`;
    const evIndex = evMatch ? Number(evMatch[1]) : 0;

    events.push({ title, url: absUrl, y, mo, d, evIndex });
  }
  return events;
}

/**
 * 詳細ページから h2 区切りのイベントブロックを分割し、
 * evIndex に対応するブロックからメタ情報を抽出
 */
function parseDetailBlock(html, evIndex) {
  let venue = "";
  let address = "";

  // h2 でブロック分割
  const blocks = html.split(/<h2[^>]*>/i);
  // evIndex+1 番目のブロック (blocks[0] は h2 より前の部分)
  const targetIdx = evIndex + 1;
  const block = targetIdx < blocks.length ? blocks[targetIdx] : blocks[blocks.length - 1] || "";

  // h3 + 直後の p からメタ情報抽出
  const sectionRe = /<h3[^>]*>([\s\S]*?)<\/h3>\s*(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi;
  let sm;
  while ((sm = sectionRe.exec(block)) !== null) {
    const heading = stripTags(sm[1]).trim();
    const value = sm[2] ? stripTags(sm[2]).trim() : "";
    if (!value) continue;
    if (!venue && /^(?:会場|場所|開催場所|ところ)$/.test(heading)) {
      venue = value;
    }
  }

  // 鶴ヶ島市の住所パターン
  const blockText = stripTags(block);
  const addrMatch = blockText.match(/鶴ヶ島市[^\s、。,）)]{2,30}/);
  if (addrMatch) address = addrMatch[0];

  // 〒 パターン
  if (!address) {
    const postalMatch = blockText.match(/〒?\s*(\d{3}-?\d{4})\s*([^\n]{5,40})/);
    if (postalMatch) address = postalMatch[2].trim();
  }

  return { venue, address };
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("鶴ヶ島市") ? address : `鶴ヶ島市${address}`;
    candidates.push(full.includes("埼玉県") ? full : `埼玉県${full}`);
  }
  if (venue) {
    candidates.push(`埼玉県鶴ヶ島市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectTsurugashimaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectTsurugashimaEvents(maxDays) {
    const source = deps.source || { key: "tsurugashima", label: "鶴ヶ島市", baseUrl: "https://www.city.tsurugashima.lg.jp", center: { lat: 35.9328, lng: 139.3936 } };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const months = getMonthsForRange(maxDays);
    const rawEvents = [];

    for (const { year, month } of months) {
      // lc=0&category=1 は子育てカレンダー
      const url = `${baseUrl}/cal.php?lc=0&category=1&year=${year}&month=${month}`;
      try {
        const html = await fetchText(url);
        const parsed = parseTsurugashimaCalendarPage(html, baseUrl, year, month);
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] cal.php fetch failed (${year}/${month}):`, e.message || e);
      }
    }

    if (rawEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去 (URL#evN + date で一意)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得 (同一日の複数イベントは同じURLなので、URL#evN ベースで管理)
    const detailBaseUrls = [...new Set(uniqueEvents.map((e) => e.url.replace(/#.*$/, "")))].slice(0, 60);
    const detailMap = new Map();
    for (let i = 0; i < detailBaseUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailBaseUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          const timeRange = parseTimeRangeFromText(text);
          return { url, html, timeRange };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const detailBaseUrl = ev.url.replace(/#.*$/, "");
      const detail = detailMap.get(detailBaseUrl);
      let detailMeta = { venue: "", address: "" };
      let timeRange = null;
      if (detail) {
        detailMeta = parseDetailBlock(detail.html, ev.evIndex);
        timeRange = detail.timeRange;
      }

      const venue = sanitizeVenueText(detailMeta.venue);
      const rawAddress = sanitizeAddressText(detailMeta.address);

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

module.exports = { createCollectTsurugashimaEvents };

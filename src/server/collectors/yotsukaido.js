const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const {
  sanitizeVenueText,
  sanitizeAddressText,
} = require("../text-utils");
const { YOTSUKAIDO_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * リストカレンダーページからイベントを抽出
 * list_calendar{YYYYMM}.html 形式
 * <tr> 内の <td class="date" id="dayN">N日</td> + <p><img alt="CAT"><a href="...">TITLE</a></p>
 */
function parseListCalendarPage(html, baseUrl, pageYear, pageMonth) {
  const events = [];

  // 年月をページから取得 (タイトルから)
  const ymMatch = html.match(/(\d{4})年\s*(\d{1,2})月/);
  const y = ymMatch ? Number(ymMatch[1]) : pageYear;
  const mo = ymMatch ? Number(ymMatch[2]) : pageMonth;

  // <tr> ごとに分割
  const trParts = html.split(/<tr\b[^>]*>/i);
  for (let i = 1; i < trParts.length; i++) {
    const tr = trParts[i];

    // 日付を抽出: <td ... class="date" id="dayN">N日</td>
    const dayMatch = tr.match(/id="day(\d{1,2})"[^>]*>\s*(\d{1,2})日/);
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);

    // イベントがない行をスキップ (spacer.gif のみ)
    if (!/<a\s+href=/i.test(tr)) continue;

    // 各 <p> ブロックからイベントを抽出
    const pRe = /<p>\s*<img[^>]*alt="([^"]*)"[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(tr)) !== null) {
      const category = pm[1].trim();
      const href = pm[2].replace(/&amp;/g, "&").trim();
      const title = stripTags(pm[3]).trim();
      if (!href || !title) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;

      // 子育て関連フィルタ: カテゴリまたはタイトル
      const isChildCategory = /子育て|教育/.test(category);
      const isChildTitle = WARD_CHILD_HINT_RE.test(title);
      if (!isChildCategory && !isChildTitle) continue;

      events.push({ title, url: absUrl, y, mo, d });
    }
  }

  return events;
}

/**
 * ジオコーディング候補リストを構築
 */
function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("四街道市") ? address : `四街道市${address}`;
    candidates.push(`千葉県${full}`);
  }
  if (venue) {
    candidates.push(`千葉県四街道市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectYotsukaidoEvents(deps) {
  const {
    geocodeForWard,
    resolveEventPoint,
    resolveEventAddress,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectYotsukaidoEvents(maxDays) {
    const source = `ward_${YOTSUKAIDO_SOURCE.key}`;
    const label = YOTSUKAIDO_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 月別リストカレンダーページ取得
    const rawEvents = [];
    for (const ym of months) {
      const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${YOTSUKAIDO_SOURCE.baseUrl}/miryoku/event/kosodate/calendar/list_calendar${ymParam}.html`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseListCalendarPage(html, YOTSUKAIDO_SOURCE.baseUrl, ym.year, ym.month);
        rawEvents.push(...pageEvents);
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得 (会場・時間情報の補完)
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 80);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const text = stripTags(html);
          let venue = "";
          let address = "";
          // <dt>/<dd> パターン
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
          // <th>/<td> パターン
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
          const timeRange = parseTimeRangeFromText(text);
          return { url, venue, address, timeRange };
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
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(YOTSUKAIDO_SOURCE.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), YOTSUKAIDO_SOURCE);
      point = resolveEventPoint(YOTSUKAIDO_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(YOTSUKAIDO_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const id = `${source}:${ev.url}:${ev.title}:${ev.dateKey}`;
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
        lat: point ? point.lat : YOTSUKAIDO_SOURCE.center.lat,
        lng: point ? point.lng : YOTSUKAIDO_SOURCE.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectYotsukaidoEvents };

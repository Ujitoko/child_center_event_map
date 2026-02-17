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
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const DETAIL_BATCH_SIZE = 6;

/**
 * calendar_month テーブルからイベントを抽出
 * <table class="calendar_month"> / <table id="calendar_month">
 * 対象CMS: 富里市, 白子町, 九十九里町 等
 *
 * 構造:
 * <tr>
 *   <th class="cal_date">1</th>
 *   <td class="cal_day"><img alt="日曜日"></td>
 *   <td><ul><li><a href="../ID.html">title</a></li></ul></td>
 * </tr>
 */
function parseTableCalendarPage(html, baseUrl, pageYear, pageMonth) {
  const events = [];
  const ymMatch = html.match(/(\d{4})年\s*(\d{1,2})月/);
  const y = ymMatch ? Number(ymMatch[1]) : pageYear;
  const mo = ymMatch ? Number(ymMatch[2]) : pageMonth;

  const trParts = html.split(/<tr\b[^>]*>/i);
  for (let i = 1; i < trParts.length; i++) {
    const tr = trParts[i];

    // 日付: <th ... class="cal_date">N</th>
    const dayMatch = tr.match(/class="cal_date"[^>]*>\s*(\d{1,2})\s*<\/th>/);
    if (!dayMatch) continue;
    const d = Number(dayMatch[1]);

    // イベントリンクがない行はスキップ
    if (!/<a\s+href=/i.test(tr)) continue;

    // <li><a href="...">title</a></li> を抽出
    const linkRe = /<li[^>]*>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(tr)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      // <span class="list_icon">...</span> を除去してタイトル抽出
      const rawTitle = lm[2].replace(/<span[^>]*>[\s\S]*?<\/span>/gi, "");
      const title = stripTags(rawTitle).trim();
      if (!href || !title) continue;

      // 相対URL解決 (../ID.html パターン)
      let absUrl;
      if (href.startsWith("http")) {
        absUrl = href;
      } else if (href.startsWith("/")) {
        absUrl = `${baseUrl}${href}`;
      } else {
        // ../ID.html → baseUrl/ID.html
        absUrl = `${baseUrl}/${href.replace(/^\.\.\/?/, "")}`;
      }

      events.push({ title, url: absUrl, y, mo, d });
    }
  }
  return events;
}

function buildGeoCandidates(venue, address, source) {
  const candidates = [];
  const city = source.label;
  if (address) {
    const full = address.includes(city) ? address : `${city}${address}`;
    candidates.push(`千葉県${full}`);
  }
  if (venue) {
    candidates.push(`千葉県${city} ${venue}`);
  }
  return [...new Set(candidates)];
}

/**
 * テーブルカレンダー型コレクターファクトリー
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {boolean} [config.useKeywordFilter=true] - WARD_CHILD_HINT_REでフィルタ
 * @param {Object} deps
 */
function createTableCalendarCollector(config, deps) {
  const { source, useKeywordFilter = true } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectTableCalendarEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    const rawEvents = [];
    for (const ym of months) {
      const ymParam = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${source.baseUrl}/event/${ymParam}.html`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseTableCalendarPage(html, source.baseUrl, ym.year, ym.month);
        rawEvents.push(...pageEvents);
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // キーワードフィルタ (オプション)
    const filtered = useKeywordFilter
      ? rawEvents.filter(ev => WARD_CHILD_HINT_RE.test(ev.title))
      : rawEvents;

    // 重複除去
    const uniqueMap = new Map();
    for (const ev of filtered) {
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 80);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          let venue = "";
          let address = "";
          const metaRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
          let mm;
          while ((mm = metaRe.exec(html)) !== null) {
            const k = stripTags(mm[1]);
            const v = stripTags(mm[2]);
            if (!k || !v) continue;
            if (!venue && /(会場|開催場所|実施場所|場所)/.test(k)) venue = v;
            if (!address && /(住所|所在地)/.test(k)) address = v;
          }
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
          const timeRange = parseTimeRangeFromText(stripTags(html));
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
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      let geoCandidates = buildGeoCandidates(venue, rawAddress, source);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
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
        address: address || "",
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

module.exports = { createTableCalendarCollector };

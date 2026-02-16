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
const { MINAMIASHIGARA_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function parseListPage(html, baseUrl) {
  const events = [];
  // 日付パターン近くのリンクを抽出
  // 日付行: YYYY年MM月DD日 に続くリンク
  const blockRe = /(\d{4})年(\d{1,2})月(\d{1,2})日[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = blockRe.exec(html)) !== null) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const href = m[4].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[5]).trim();
    if (!href || !title) continue;
    const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    events.push({ y, mo, d, title, url: absUrl });
  }
  // フォールバック: リンクのみ抽出（日付が別のパターンの場合）
  if (events.length === 0) {
    const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1].replace(/&amp;/g, "&").trim();
      const title = stripTags(m[2]).trim();
      if (!href || !title) continue;
      if (!/\/event\//.test(href) && !/detail/.test(href)) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y: 0, mo: 0, d: 0, title, url: absUrl, needsDateFromDetail: true });
    }
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("南足柄市") ? address : `南足柄市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県南足柄市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectMinamiashigaraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMinamiashigaraEvents(maxDays) {
    const source = `ward_${MINAMIASHIGARA_SOURCE.key}`;
    const label = MINAMIASHIGARA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得 (月別、category=4 は子育て・教育)
    const rawEvents = [];
    for (const ym of months) {
      const endDay = lastDayOfMonth(ym.year, ym.month);
      const url =
        `${MINAMIASHIGARA_SOURCE.baseUrl}/event/` +
        `?start_y=${ym.year}&start_m=${ym.month}&start_d=1` +
        `&end_y=${ym.year}&end_m=${ym.month}&end_d=${endDay}` +
        `&category=4`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, MINAMIASHIGARA_SOURCE.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      let dateKey = "";
      if (ev.y && ev.mo && ev.d) {
        dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      }
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map((e) => e.url))].slice(0, 120);
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
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(MINAMIASHIGARA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), MINAMIASHIGARA_SOURCE);
      point = resolveEventPoint(MINAMIASHIGARA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(MINAMIASHIGARA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      // 日付ソース: 一覧ページの日付 or 詳細ページの日付
      let dateSources = [];
      if (ev.y && ev.mo && ev.d && !ev.needsDateFromDetail) {
        dateSources = [{ y: ev.y, mo: ev.mo, d: ev.d }];
      } else if (detail && detail.dates && detail.dates.length > 0) {
        dateSources = detail.dates;
      }
      if (dateSources.length === 0) continue;

      for (const dd of dateSources) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        const dateKeyStr = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dd.y, mo: dd.mo, d: dd.d },
          timeRange
        );
        const id = `${source}:${ev.url}:${ev.title}:${dateKeyStr}`;
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

module.exports = { createCollectMinamiashigaraEvents };

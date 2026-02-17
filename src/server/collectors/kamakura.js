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
const { KAMAKURA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_URL_PATHS = /\/(sei-fukushi|kodomo|kosodate|kyouiku)\//;
const DETAIL_BATCH_SIZE = 6;

function parseListPage(html, baseUrl) {
  const events = [];
  // type=2 リスト表示: テーブル行から日付とリンクを抽出
  // 日付行パターン: <td>2026年2月12日(木曜日)</td>
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rm;
  while ((rm = rowRe.exec(html)) !== null) {
    const row = rm[1];
    // 日付を抽出
    const dateMatch = row.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);
    // リンクを抽出
    const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(row)) !== null) {
      const href = lm[1].replace(/&amp;/g, "&").trim();
      const title = stripTags(lm[2]).trim();
      if (!href || !title) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y, mo, d, title, url: absUrl });
    }
  }
  return events;
}

function isChildRelated(ev) {
  if (CHILD_URL_PATHS.test(ev.url)) return true;
  if (WARD_CHILD_HINT_RE.test(ev.title)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("鎌倉市") ? address : `鎌倉市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県鎌倉市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectKamakuraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKamakuraEvents(maxDays) {
    const source = `ward_${KAMAKURA_SOURCE.key}`;
    const label = KAMAKURA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得
    const rawEvents = [];
    for (const ym of months) {
      const url = `${KAMAKURA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${ym.year}&month=${ym.month}`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, KAMAKURA_SOURCE.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 子育て関連フィルタ
    const childEvents = rawEvents.filter(isChildRelated);

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of childEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.url}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = [...new Set(uniqueEvents.map(e => e.url))].slice(0, 120);
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
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const detail = detailMap.get(ev.url);
      const venue = sanitizeVenueText((detail && detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail && detail.meta && detail.meta.address) || "");
      const timeRange = detail ? detail.timeRange : null;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(KAMAKURA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), KAMAKURA_SOURCE);
      point = resolveEventPoint(KAMAKURA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(KAMAKURA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
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

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKamakuraEvents };

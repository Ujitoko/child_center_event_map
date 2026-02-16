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
const { YOKOSUKA_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_CATEGORY = "子育て・教育";
const DETAIL_BATCH_SIZE = 6;

function parseListPage(html, baseUrl) {
  const events = [];
  // テーブル行: <td> に日付、次の <td> に <ul><li> のイベントリスト
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
    // 各 <li> からカテゴリとリンクを抽出
    const liRe = /<li>([\s\S]*?)<\/li>/gi;
    let lim;
    while ((lim = liRe.exec(row)) !== null) {
      const li = lim[1];
      // カテゴリ判定: <span class="event_categoryN">子育て・教育</span>
      const catMatch = li.match(/<span\s+class="event_category\d+">([\s\S]*?)<\/span>/);
      if (!catMatch || catMatch[1].trim() !== CHILD_CATEGORY) continue;
      // リンク抽出
      const linkMatch = li.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!linkMatch) continue;
      const href = linkMatch[1].replace(/&amp;/g, "&").trim();
      let title = stripTags(linkMatch[2]).trim();
      if (!href || !title) continue;
      // 締切情報・事前申込テキストを除去
      title = title.replace(/\s*事前申込(あり|なし).*$/, "").trim();
      title = title.replace(/\s*【締切】.*$/, "").trim();
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      events.push({ y, mo, d, title, url: absUrl });
    }
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("横須賀市") ? address : `横須賀市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県横須賀市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectYokosukaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectYokosukaEvents(maxDays) {
    const source = `ward_${YOKOSUKA_SOURCE.key}`;
    const label = YOKOSUKA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得
    const rawEvents = [];
    for (const ym of months) {
      const url = `${YOKOSUKA_SOURCE.baseUrl}/cgi-bin/event_cal/calendar.cgi?type=2&year=${ym.year}&month=${ym.month}`;
      try {
        const html = await fetchText(url);
        rawEvents.push(...parseListPage(html, YOKOSUKA_SOURCE.baseUrl));
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
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
        const fmAddr = getFacilityAddressFromMaster(YOKOSUKA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), YOKOSUKA_SOURCE);
      point = resolveEventPoint(YOKOSUKA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(YOKOSUKA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

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

module.exports = { createCollectYokosukaEvents };

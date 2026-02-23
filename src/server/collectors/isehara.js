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
const { ISEHARA_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const DETAIL_BATCH_SIZE = 6;

function parseListPage(html, baseUrl) {
  const events = [];
  // イベントリンク: <a href="/kosodate-portal/docs/ID/">Title</a>
  const linkRe = /<a\s+href="(\/kosodate-portal\/docs\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1].replace(/&amp;/g, "&").trim();
    const title = stripTags(m[2]).trim();
    if (!href || !title) continue;
    const absUrl = `${baseUrl}${href}`;
    events.push({ title, url: absUrl });
  }
  return events;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("伊勢原市") ? address : `伊勢原市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県伊勢原市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectIseharaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectIseharaEvents(maxDays) {
    const source = `ward_${ISEHARA_SOURCE.key}`;
    const label = ISEHARA_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // 一覧ページ取得 (月別、子育てポータル)
    const rawEvents = [];
    for (const ym of months) {
      const mm = String(ym.month).padStart(2, "0");
      const url = `${ISEHARA_SOURCE.baseUrl}/kosodate-portal/event-list/${ym.year}/${mm}/`;
      try {
        const html = await fetchText(url);
        const parsed = parseListPage(html, ISEHARA_SOURCE.baseUrl);
        // 一覧ページの年月を保持（詳細ページから日付が取れない場合のフォールバック用）
        for (const ev of parsed) {
          ev.listYear = ym.year;
          ev.listMonth = ym.month;
        }
        rawEvents.push(...parsed);
      } catch (e) {
        console.warn(`[${label}] month ${ym.year}/${ym.month} fetch failed:`, e.message || e);
      }
    }

    // 重複除去 (url)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      if (!uniqueMap.has(ev.url)) uniqueMap.set(ev.url, ev);
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得
    const detailUrls = uniqueEvents.map((e) => e.url).slice(0, 120);
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          const meta = parseDetailMeta(html);
          const plainText = stripTags(html);
          const timeRange = parseTimeRangeFromText(plainText);
          // parseDatesFromHtml はCMS公開日/更新日を拾ってしまい、
          // 実際のスケジュール日付(M月D日形式)が無視される。
          // 常に空配列を返し、M月D日フォールバックに任せる。
          return { url, meta, dates: [], timeRange, plainText };
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
      // 詳細ページから日付が取れない場合、一覧ページの年月で補完
      if (detail && (!detail.dates || detail.dates.length === 0) && ev.listYear && ev.listMonth) {
        // 詳細ページテキストから M月D日 パターンを探す
        if (detail.meta) {
          const text = detail.plainText || "";
          const mdRe = /(\d{1,2})月\s*(\d{1,2})日/g;
          let mdMatch;
          const fallbackDates = [];
          while ((mdMatch = mdRe.exec(text)) !== null) {
            const fmo = Number(mdMatch[1]);
            const fd = Number(mdMatch[2]);
            if (fmo >= 1 && fmo <= 12 && fd >= 1 && fd <= 31) {
              // 年度（令和N年度）を考慮: 4月以降は当年度、1-3月は翌年
              const fy = fmo >= 4 ? ev.listYear : (ev.listMonth >= 4 ? ev.listYear + 1 : ev.listYear);
              fallbackDates.push({ y: fy, mo: fmo, d: fd });
            }
          }
          if (fallbackDates.length > 0) {
            detail.dates = fallbackDates;
          } else {
            // 月の1日をフォールバック
            detail.dates = [{ y: ev.listYear, mo: ev.listMonth, d: 1 }];
          }
        }
      }
      if (!detail || !detail.dates || detail.dates.length === 0) continue;
      const venue = sanitizeVenueText((detail.meta && detail.meta.venue) || "");
      const rawAddress = sanitizeAddressText((detail.meta && detail.meta.address) || "");
      const timeRange = detail.timeRange;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, rawAddress);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(ISEHARA_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), ISEHARA_SOURCE);
      point = resolveEventPoint(ISEHARA_SOURCE, venue, point, rawAddress || `${label} ${venue}`);
      const address = resolveEventAddress(ISEHARA_SOURCE, venue, rawAddress || `${label} ${venue}`, point);

      for (const dd of detail.dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dd.y, mo: dd.mo, d: dd.d },
          timeRange
        );
        const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
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

module.exports = { createCollectIseharaEvents };

const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

/**
 * 東秩父村 子育て支援センター年間行事予定表PDFからイベントを抽出
 *
 * PDF抽出テキスト形式:
 * 4月8日（火）園庭あそび
 * 4月15日（火）折り紙あそび
 * 4月24日（木）栄養相談
 */

/**
 * 東秩父村PDFテキストからイベントを抽出
 */
function parseHigashichichibePdfEvents(text, currentYear) {
  const events = [];

  // 年度の判定: テキスト内から「令和N年度」や「R7」等を探す
  let fiscalYear = currentYear;
  const fyMatch = text.match(/令和\s*(\d+)\s*年度|R\s*(\d+)/);
  if (fyMatch) {
    const reiwaN = Number(fyMatch[1] || fyMatch[2]);
    fiscalYear = 2018 + reiwaN;
  }

  // イベント行を抽出: "M月D日（曜日）イベント名"
  const lines = text.split(/\n/);
  for (const line of lines) {
    const dateMatch = line.match(/(\d{1,2})月(\d{1,2})日\s*[（(]([月火水木金土日])[）)]\s*(.+)/);
    if (!dateMatch) continue;

    const mo = Number(dateMatch[1]);
    const d = Number(dateMatch[2]);
    let title = dateMatch[4].trim();

    // 余計なテキストを除去
    title = title.replace(/\s*[※＊].*$/, "").trim();
    if (!title || title.length < 2) continue;

    // 年度から年を決定 (4-12月 = 年度年, 1-3月 = 年度年+1)
    const y = mo >= 4 ? fiscalYear : fiscalYear + 1;

    // 固定の時間帯: 10:00～11:30
    const timeRange = { startHour: 10, startMin: 0, endHour: 11, endMin: 30 };

    events.push({ y, mo, d, title, timeRange });
  }

  return events;
}

function buildGeoCandidates(venue) {
  const candidates = [];
  if (venue) {
    candidates.push(`埼玉県秩父郡東秩父村 ${venue}`);
    candidates.push(`埼玉県東秩父村 ${venue}`);
  }
  return candidates;
}

function createCollectHigashichichibEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHigashichichibEvents(maxDays) {
    const source = deps.source || {
      key: "higashichichibu", label: "東秩父村",
      baseUrl: "https://www.vill.higashichichibu.saitama.jp",
      center: { lat: 36.0500, lng: 139.1900 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 1. 子育て支援センターページからPDFリンクを取得
    const supportUrl = `${baseUrl}/soshiki/04/kosodate-sien.html`;
    let supportHtml;
    try {
      supportHtml = await fetchText(supportUrl);
    } catch (e) {
      console.warn(`[${label}] support page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンクを抽出
    const pdfRe = /<a\s+href="([^"]*\.pdf)"[^>]*>/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(supportHtml)) !== null) {
      const href = pm[1];
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found on support page`);
      return [];
    }

    const allEvents = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // 最初の2件のPDFを処理 (年間予定表が含まれるはず)
    for (const pdfUrl of pdfUrls.slice(0, 2)) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 30) continue;
        const events = parseHigashichichibePdfEvents(markdown, currentYear);
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] PDF fetch/parse failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // 固定会場: 城山保育園
    const defaultVenue = "城山保育園";

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venue = defaultVenue;

      let geoCandidates = buildGeoCandidates(venue);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, `東秩父村 城山保育園`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}`;
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
        url: supportUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectHigashichichibEvents };

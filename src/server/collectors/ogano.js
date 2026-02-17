const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

/**
 * 小鹿野町 子育て支援センターだよりPDFからイベントを抽出
 *
 * PDF抽出テキスト形式:
 * 2/3（火） 豆まき会
 * 2/4（水） 新聞紙で遊ぼう 10:00～11:30
 * 2/5（木） 発育測定・栄養相談 10:00～11:30
 */

/**
 * 小鹿野町PDFテキストからイベントを抽出
 */
function parseOganoPdfEvents(text, defaultYear) {
  const events = [];

  // 年の判定: テキスト内から「令和N年M月」や「YYYY年M月」を探す
  let y = defaultYear;
  const yearMatch = text.match(/令和\s*(\d+)\s*年|(\d{4})\s*年/);
  if (yearMatch) {
    if (yearMatch[2]) {
      y = Number(yearMatch[2]);
    } else if (yearMatch[1]) {
      y = 2018 + Number(yearMatch[1]);
    }
  }

  // イベント行を抽出
  // パターン1: "M/D（曜日）イベント名 HH:MM～HH:MM"
  // パターン2: "M月D日（曜日）イベント名"
  const lines = text.split(/\n/);
  for (const line of lines) {
    // M/D形式
    let dateMatch = line.match(/(\d{1,2})[\/／](\d{1,2})\s*[（(]([月火水木金土日])[）)]/);
    if (!dateMatch) {
      // M月D日形式
      dateMatch = line.match(/(\d{1,2})月(\d{1,2})日\s*[（(]([月火水木金土日])[）)]/);
    }
    if (!dateMatch) continue;

    const mo = Number(dateMatch[1]);
    const d = Number(dateMatch[2]);

    // 日付以降のテキストからイベント名を取得
    const afterDate = line.substring(line.indexOf(dateMatch[0]) + dateMatch[0].length).trim();
    if (!afterDate) continue;

    // 時刻抽出
    let startHour = null;
    let startMin = null;
    let endHour = null;
    let endMin = null;
    const timeMatch = afterDate.match(/(\d{1,2})[：:](\d{2})\s*[～〜-]\s*(\d{1,2})[：:](\d{2})/);
    if (timeMatch) {
      startHour = Number(timeMatch[1]);
      startMin = Number(timeMatch[2]);
      endHour = Number(timeMatch[3]);
      endMin = Number(timeMatch[4]);
    } else {
      const singleTime = afterDate.match(/(\d{1,2})[：:](\d{2})/);
      if (singleTime) {
        startHour = Number(singleTime[1]);
        startMin = Number(singleTime[2]);
      }
    }

    // イベント名: 時刻部分を除去
    let title = afterDate
      .replace(/\d{1,2}[：:]\d{2}\s*[～〜-]\s*\d{1,2}[：:]\d{2}/, "")
      .replace(/\d{1,2}[：:]\d{2}/, "")
      .trim();
    // 末尾の余計な情報を除去
    title = title.replace(/\s*[※＊].*$/, "").trim();
    if (!title) continue;

    const timeRange = startHour !== null
      ? { startHour, startMin: startMin || 0, endHour, endMin }
      : null;

    events.push({ y, mo, d, title, timeRange });
  }

  return events;
}

function buildGeoCandidates(venue) {
  const candidates = [];
  if (venue) {
    candidates.push(`埼玉県秩父郡小鹿野町 ${venue}`);
    candidates.push(`埼玉県小鹿野町 ${venue}`);
  }
  return candidates;
}

function createCollectOganoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectOganoEvents(maxDays) {
    const source = deps.source || {
      key: "ogano", label: "小鹿野町",
      baseUrl: "https://www.town.ogano.lg.jp",
      center: { lat: 36.0153, lng: 138.9833 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 1. 子育て支援センターだよりページからPDFリンクを取得
    const dayoriUrl = `${baseUrl}/kosodate-kyouiku/kosodate-sien-center/shiensentadayori/`;
    let dayoriHtml;
    try {
      dayoriHtml = await fetchText(dayoriUrl);
    } catch (e) {
      console.warn(`[${label}] dayori page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンクを抽出 (最新の数件を処理)
    const pdfRe = /<a\s+href="([^"]*kosodatesien[^"]*\.pdf|[^"]*dayori[^"]*\.pdf)"[^>]*>/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(dayoriHtml)) !== null) {
      const href = pm[1];
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
    }

    // フォールバック: wp-content/uploads の PDF を検索
    if (pdfUrls.length === 0) {
      const wpPdfRe = /<a\s+href="([^"]*wp-content\/uploads[^"]*\.pdf)"[^>]*>/gi;
      while ((pm = wpPdfRe.exec(dayoriHtml)) !== null) {
        const href = pm[1];
        const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
        if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
      }
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found on dayori page`);
      return [];
    }

    const allEvents = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // 最新3件のPDFを処理
    for (const pdfUrl of pdfUrls.slice(0, 3)) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 30) continue;
        const events = parseOganoPdfEvents(markdown, currentYear);
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

    // 固定会場: 小鹿野町子育て支援センター (小鹿野町飯田2732)
    const defaultVenue = "小鹿野町子育て支援センター";

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
      const address = resolveEventAddress(source, venue, `小鹿野町飯田2732`, point);

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
        url: dayoriUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectOganoEvents };

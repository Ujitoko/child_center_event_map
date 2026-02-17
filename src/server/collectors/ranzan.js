const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 嵐山町 子育て広場「レピ」にこにこだよりPDFからイベントを抽出
 *
 * PDFテキスト形式:
 * 日付とイベントが行形式で記載
 * 例: "2日（月） ママリフレッシュ リンパマッサージ 10:30~"
 *     "5日（木）・6日（金）・9日（月） プレイパークであそぼう！"
 */
function parseRanzanPdfEvents(text) {
  const events = [];

  // 年月判定
  let year = null;
  let month = null;
  // 令和N年M月 or 20XX年M月
  const ymMatch = text.match(/令和\s*(\d+)\s*年\s*(\d{1,2})\s*月/);
  if (ymMatch) {
    year = 2018 + Number(ymMatch[1]);
    month = Number(ymMatch[2]);
  }
  if (!year) {
    const ymMatch2 = text.match(/(20\d{2})\s*年?\s*(\d{1,2})\s*月/);
    if (ymMatch2) {
      year = Number(ymMatch2[1]);
      month = Number(ymMatch2[2]);
    }
  }
  // "R8.2" パターン（URLから推測）
  if (!year) {
    const rMatch = text.match(/R\s*(\d+)\s*[.\s]\s*(\d{1,2})/i);
    if (rMatch) {
      year = 2018 + Number(rMatch[1]);
      month = Number(rMatch[2]);
    }
  }
  // 英語月名
  if (!month) {
    const monthNames = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12 };
    for (const [name, num] of Object.entries(monthNames)) {
      if (text.includes(name)) { month = num; break; }
    }
  }
  if (!year || !month) {
    const now = new Date();
    year = year || now.getFullYear();
    month = month || (now.getMonth() + 1);
  }

  const lines = text.split(/\n/);

  for (const line of lines) {
    // "D日（曜）" or "D日(曜)" パターンを探す
    // 複数日: "5日（木）・6日（金）・9日（月）"
    const dayPattern = /(\d{1,2})\s*日\s*[（(]\s*[月火水木金土日]\s*[）)]/g;
    const days = [];
    let dm;
    while ((dm = dayPattern.exec(line)) !== null) {
      days.push(Number(dm[1]));
    }
    if (days.length === 0) continue;

    // イベント名を抽出: 日付部分を除いた残りの文字列
    let eventPart = line.replace(/(\d{1,2}\s*日\s*[（(]\s*[月火水木金土日]\s*[）)][\s・]*)+/g, "").trim();
    // 先頭の記号や空白を除去
    eventPart = eventPart.replace(/^[・\s]+/, "").trim();
    if (!eventPart || eventPart.length < 2) continue;

    // 時刻を抽出
    let timeRange = null;
    const timeMatch = eventPart.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      };
    } else {
      const startOnly = eventPart.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]/);
      if (startOnly) {
        timeRange = {
          startHour: Number(startOnly[1]), startMin: Number(startOnly[2]),
          endHour: null, endMin: null,
        };
      }
    }

    // イベント名から時刻部分を除去
    let title = eventPart
      .replace(/\d{1,2}\s*[：:]\s*\d{2}\s*[～〜~-]\s*(\d{1,2}\s*[：:]\s*\d{2})?/g, "")
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 2) continue;

    // 健診・検診等の行政イベントは除外
    if (/健診|検診|予防接種/i.test(title)) continue;

    for (const d of days) {
      events.push({ y: year, mo: month, d, title, timeRange });
    }
  }

  return events;
}

function createCollectRanzanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectRanzanEvents(maxDays) {
    const source = deps.source || {
      key: "ranzan", label: "嵐山町",
      baseUrl: "https://www.town.ranzan.saitama.jp",
      center: { lat: 36.0533, lng: 139.3233 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // レピのページからPDFリンクを取得
    const pageUrl = `${baseUrl}/0000000949.html`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンクを抽出
    const pdfRe = /href="([^"]*\.pdf)"/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(html)) !== null) {
      const href = pm[1];
      // 駐車場案内等を除外
      if (/parking|駐車/i.test(href)) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
      if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found`);
      return [];
    }

    const allEvents = [];

    for (const pdfUrl of pdfUrls.slice(0, 2)) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;
        const events = parseRanzanPdfEvents(markdown);
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

    const defaultVenue = "子育て広場レピ";
    const defaultAddress = "嵐山町大字菅谷728-1 健康増進センター2階";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県比企郡${defaultAddress}`, `埼玉県比企郡嵐山町 ${defaultVenue}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, defaultVenue);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, defaultVenue, point, `${label} ${defaultVenue}`);
      const address = resolveEventAddress(source, defaultVenue, defaultAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: defaultVenue, address: address || "",
        url: pageUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectRanzanEvents };

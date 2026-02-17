const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 横瀬町 赤ちゃんくらす/相談室 年間日程PDFからイベントを抽出
 *
 * テキスト形式:
 * M月D日\tイベント内容
 * 年度切替: "令和N年" 行
 */
function parseYokozePdfEvents(text, defaultYear) {
  const events = [];

  // 年度判定
  let fiscalYear = defaultYear;
  const fyMatch = text.match(/令和\s*(\d+)\s*年度/);
  if (fyMatch) {
    fiscalYear = 2018 + Number(fyMatch[1]);
  }

  // PDFタイトルからイベント名を取得
  let pdfTitle = "";
  const titleMatch = text.match(/(赤ちゃんくらす|赤ちゃん・ちびっこ.+?相談室|なんでも相談室)/);
  if (titleMatch) pdfTitle = titleMatch[1];

  const lines = text.split(/\n/);
  let currentYear = fiscalYear;

  for (const line of lines) {
    // 年切替: "令和N年" (年度ではない)
    const yearSwitch = line.match(/令和\s*(\d+)\s*年(?!度)/);
    if (yearSwitch) {
      currentYear = 2018 + Number(yearSwitch[1]);
    }

    // 日付行: "M月D日" + タブ/スペース + 内容
    const m = line.match(/(\d{1,2})月\s*(\d{1,2})日[\t\s]+(.+)/);
    if (!m) continue;
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let content = m[3].trim();

    // 年の判定: 4-12月は年度年、1-3月は年度年+1
    let y = currentYear;
    if (!yearSwitch) {
      y = (mo >= 4) ? fiscalYear : fiscalYear + 1;
    }

    // タイトル: PDFタイトル + 内容
    const title = pdfTitle ? `${pdfTitle}（${content}）` : content;

    events.push({
      y, mo, d, title,
      timeRange: { startHour: 10, startMin: 0, endHour: 11, endMin: 30 },
    });
  }

  // 相談室PDFは日付のみリスト形式のことがある
  if (events.length === 0) {
    const dateRe = /(\d{1,2})月\s*(\d{1,2})日/g;
    let dm;
    while ((dm = dateRe.exec(text)) !== null) {
      const mo = Number(dm[1]);
      const d = Number(dm[2]);
      const y = (mo >= 4) ? fiscalYear : fiscalYear + 1;
      events.push({
        y, mo, d,
        title: pdfTitle || "赤ちゃん・ちびっこなんでも相談室",
        timeRange: { startHour: 10, startMin: 0, endHour: 11, endMin: 30 },
      });
    }
  }

  return events;
}

function createCollectYokozeEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectYokozeEvents(maxDays) {
    const source = deps.source || {
      key: "yokoze", label: "横瀬町",
      baseUrl: "https://www.town.yokoze.saitama.jp",
      center: { lat: 35.9797, lng: 139.0947 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 母子保健事業ページからPDFリンクを取得
    const pageUrl = `${baseUrl}/kosodate-kyoiku/kosodate-hoiku/630`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンク抽出
    const pdfRe = /<a\s+href="([^"]*\.pdf)"[^>]*>/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(html)) !== null) {
      const href = pm[1];
      // 赤ちゃん関連のPDFのみ対象
      if (!decodeURIComponent(href).includes("赤ちゃん")) continue;
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
      if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found`);
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const allEvents = [];

    for (const pdfUrl of pdfUrls) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 30) continue;
        const events = parseYokozePdfEvents(markdown, currentYear);
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

    const defaultVenue = "横瀬町総合福祉センター";
    const defaultAddress = "横瀬町横瀬2000";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県秩父郡${defaultAddress}`, `埼玉県横瀬町 ${defaultVenue}`];
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

module.exports = { createCollectYokozeEvents };

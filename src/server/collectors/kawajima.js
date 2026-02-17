const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生会|手形|ハイハイ|ぷくぷく|のびのび|くるコロ|プラレール|ひなまつり/;

/**
 * 川島町 かわみんハウスだよりPDFからイベントを抽出
 *
 * PDFテキスト形式:
 * ≪イベント名≫ D日(曜日) HH:MM~HH:MM
 * == イベント名 == D日(曜日) ...
 * イベント名：D日(曜日) ...
 */
function parseKawajimaPdfEvents(text, defaultYear, defaultMonth) {
  const events = [];

  // 年月の判定
  let y = defaultYear;
  let mo = defaultMonth;
  const ymMatch = text.match(/(\d{4})年\s*(\d{1,2})月|令和\s*(\d+)\s*年\s*(\d{1,2})月/);
  if (ymMatch) {
    if (ymMatch[1]) {
      y = Number(ymMatch[1]);
      mo = Number(ymMatch[2]);
    } else if (ymMatch[3]) {
      y = 2018 + Number(ymMatch[3]);
      mo = Number(ymMatch[4]);
    }
  }

  const lines = text.split(/\n/);

  // 現在のセクションタイトル
  let currentTitle = "";

  for (const line of lines) {
    // セクションタイトル: ≪...≫ or == ... ==
    const sectionMatch = line.match(/[≪《](.+?)[≫》]|==\s*(.+?)\s*==/);
    if (sectionMatch) {
      currentTitle = (sectionMatch[1] || sectionMatch[2]).trim();
    }

    // 日付抽出: "D日(曜日)" or "D日、D日(曜日)"
    const dayRe = /(\d{1,2})日\s*[（(]([月火水木金土日])[）)]/g;
    let dm;
    const daysInLine = [];
    while ((dm = dayRe.exec(line)) !== null) {
      daysInLine.push(Number(dm[1]));
    }

    // "D日、D日" パターン（括弧なし）
    if (daysInLine.length === 0) {
      const multiDayMatch = line.match(/(\d{1,2})日[、,]\s*(\d{1,2})日/);
      if (multiDayMatch) {
        daysInLine.push(Number(multiDayMatch[1]), Number(multiDayMatch[2]));
      }
    }

    if (daysInLine.length === 0) continue;

    // イベント名の決定
    let title = currentTitle;
    // 行内にイベント名がある場合: "イベント名：D日" or "☺イベント名 D日"
    const inlineTitle = line.match(/^[☺☆★●○◎・\s]*(.+?)[\s：:]+\d{1,2}日/);
    if (inlineTitle) {
      const candidate = inlineTitle[1].replace(/[≪《≫》=]/g, "").trim();
      if (candidate.length >= 2 && !/^\d+$/.test(candidate)) {
        title = candidate;
      }
    }
    if (!title) continue;

    // 時刻抽出
    let startHour = null;
    let startMin = null;
    let endHour = null;
    let endMin = null;
    const timeMatch = line.match(/(\d{1,2})[：:](\d{2})\s*[～〜~-]\s*(\d{1,2})[：:](\d{2})/);
    if (timeMatch) {
      startHour = Number(timeMatch[1]);
      startMin = Number(timeMatch[2]);
      endHour = Number(timeMatch[3]);
      endMin = Number(timeMatch[4]);
    } else {
      const singleTime = line.match(/(\d{1,2})[：:](\d{2})/);
      if (singleTime) {
        startHour = Number(singleTime[1]);
        startMin = Number(singleTime[2]);
      }
    }

    const timeRange = startHour !== null
      ? { startHour, startMin: startMin || 0, endHour, endMin }
      : null;

    for (const d of daysInLine) {
      if (d < 1 || d > 31) continue;
      events.push({ y, mo, d, title, timeRange });
    }
  }

  return events;
}

function createCollectKawajimaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKawajimaEvents(maxDays) {
    const source = deps.source || {
      key: "kawajima", label: "川島町",
      baseUrl: "https://www.town.kawajima.saitama.jp",
      center: { lat: 35.9806, lng: 139.4814 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // かわみんハウスだよりページからPDFリンクを取得
    const dayoriUrl = `${baseUrl}/item/1495.htm`;
    let dayoriHtml;
    try {
      dayoriHtml = await fetchText(dayoriUrl);
    } catch (e) {
      console.warn(`[${label}] dayori page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンク抽出
    const pdfRe = /<a\s+href="([^"]*\.pdf)"[^>]*>/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(dayoriHtml)) !== null) {
      const href = pm[1];
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
      if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found`);
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const allEvents = [];

    // 最新2件のPDFを処理
    for (const pdfUrl of pdfUrls.slice(0, 2)) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;
        const events = parseKawajimaPdfEvents(markdown, currentYear, currentMonth);
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] PDF fetch/parse failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const defaultVenue = "かわみんハウス";
    const defaultAddress = "川島町大字畑中348";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県比企郡${defaultAddress}`, `埼玉県川島町 ${defaultVenue}`];
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

module.exports = { createCollectKawajimaEvents };

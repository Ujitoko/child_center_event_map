const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 長瀞町 子育て支援事業計画PDFからイベントを抽出
 *
 * テキスト形式:
 * セクションタイトル: 第N曜日 HH:MM～HH:MM
 * 日付リスト: M/D、M/D(曜日)、...
 */
function parseNagatoroPdfEvents(text, defaultYear) {
  const events = [];

  // 年度判定
  let fiscalYear = defaultYear;
  const fyMatch = text.match(/令和\s*(\d+)\s*年度|[RＲ]\s*(\d+)\s*年度/);
  if (fyMatch) {
    const n = Number(fyMatch[1] || fyMatch[2]);
    fiscalYear = 2018 + n;
  }

  const lines = text.split(/\n/);
  let currentTitle = "";
  let currentTimeRange = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // セクションタイトル検出
    // "ぴょんぴょん組", "ぴよぴよ組", "ママのコーヒータイム", "ママよんで",
    // "おたんじょう会", "リサイクルくる", "もぐもぐタイム"
    const titleCandidates = [
      "ぴょんぴょん", "ぴよぴよ", "ママのコーヒータイム", "ママよんで",
      "おたんじょう会", "リサイクル", "もぐもぐ", "おひさま教室",
    ];
    for (const tc of titleCandidates) {
      if (line.includes(tc)) {
        // タイトルとして設定
        const colonIdx = line.indexOf(":");
        const colonIdx2 = line.indexOf("：");
        const idx = colonIdx >= 0 ? colonIdx : colonIdx2;
        currentTitle = idx >= 0 ? line.substring(0, idx).trim() : line.split(/\s{2,}/)[0].trim();
        if (!currentTitle) currentTitle = tc;

        // 同行の時刻を抽出
        const timeMatch = line.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
        if (timeMatch) {
          currentTimeRange = {
            startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
            endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
          };
        }
        break;
      }
    }

    // 時刻行（タイトル行とは別の行に時刻がある場合）
    if (!line.match(/\d{1,2}\/\d{1,2}/)) {
      const timeOnly = line.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
      if (timeOnly && currentTitle) {
        currentTimeRange = {
          startHour: Number(timeOnly[1]), startMin: Number(timeOnly[2]),
          endHour: Number(timeOnly[3]), endMin: Number(timeOnly[4]),
        };
      }
    }

    // 日付リスト抽出: "M/D" or "M/D(曜日)" パターン
    const dateRe = /(\d{1,2})\/(\d{1,2})(?:\s*[（(]([月火水木金土日])[）)])?/g;
    let dm;
    const datesInLine = [];
    while ((dm = dateRe.exec(line)) !== null) {
      datesInLine.push({ mo: Number(dm[1]), d: Number(dm[2]) });
    }

    if (datesInLine.length === 0) continue;
    if (!currentTitle) continue;

    for (const date of datesInLine) {
      // 年度判定: 4-12月は年度年、1-3月は年度年+1
      const y = (date.mo >= 4) ? fiscalYear : fiscalYear + 1;
      events.push({
        y,
        mo: date.mo,
        d: date.d,
        title: currentTitle,
        timeRange: currentTimeRange ? { ...currentTimeRange } : { startHour: 10, startMin: 0, endHour: 11, endMin: 30 },
      });
    }
  }

  return events;
}

/**
 * おひさま教室PDFからイベントを抽出
 */
function parseOhisamaPdfEvents(text, defaultYear) {
  const events = [];

  let fiscalYear = defaultYear;
  const fyMatch = text.match(/令和\s*(\d+)\s*年度|[RＲ]\s*(\d+)/);
  if (fyMatch) {
    const n = Number(fyMatch[1] || fyMatch[2]);
    if (n < 100) fiscalYear = 2018 + n;
  }

  // 日付抽出: M/D(曜日)
  const dateRe = /(\d{1,2})\/(\d{1,2})\s*[（(]([月火水木金土日])[）)]/g;
  let dm;
  while ((dm = dateRe.exec(text)) !== null) {
    const mo = Number(dm[1]);
    const d = Number(dm[2]);
    const y = (mo >= 4) ? fiscalYear : fiscalYear + 1;
    events.push({
      y, mo, d,
      title: "おひさま教室",
      timeRange: { startHour: 9, startMin: 45, endHour: 11, endMin: 0 },
    });
  }

  return events;
}

function createCollectNagatoroEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectNagatoroEvents(maxDays) {
    const source = deps.source || {
      key: "nagatoro", label: "長瀞町",
      baseUrl: "https://www.town.nagatoro.saitama.jp",
      center: { lat: 36.1139, lng: 139.1083 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    const allEvents = [];

    // 子育て支援事業ページからPDFリンクを取得
    const kosodateUrl = `${baseUrl}/life/%E5%AD%90%E8%82%B2%E3%81%A6%E6%94%AF%E6%8F%B4%E4%BA%8B%E6%A5%AD/`;
    // 母子保健事業ページからもPDFリンクを取得
    const boshiUrl = `${baseUrl}/life/%E6%AF%8D%E5%AD%90%E4%BF%9D%E5%81%A5%E4%BA%8B%E6%A5%AD-3/`;

    const pdfUrls = [];
    for (const pageUrl of [kosodateUrl, boshiUrl]) {
      try {
        const html = await fetchText(pageUrl);
        const pdfRe = /<a\s+href="([^"]*\.pdf)"[^>]*>/gi;
        let pm;
        while ((pm = pdfRe.exec(html)) !== null) {
          const href = pm[1];
          const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
          if (!pdfUrls.includes(absUrl)) pdfUrls.push(absUrl);
        }
      } catch (e) {
        console.warn(`[${label}] page fetch failed:`, e.message || e);
      }
    }

    if (pdfUrls.length === 0) {
      console.warn(`[${label}] no PDF links found`);
      return [];
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    for (const pdfUrl of pdfUrls) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;

        let events = [];
        if (markdown.includes("おひさま教室") || markdown.includes("親子遊び")) {
          events = parseOhisamaPdfEvents(markdown, currentYear);
        }
        // メインの事業計画PDFも試す
        const mainEvents = parseNagatoroPdfEvents(markdown, currentYear);
        events.push(...mainEvents);

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

    const defaultVenue = "多世代ふれ愛ベース長瀞";
    const defaultAddress = "長瀞町本野上396-1";
    const VENUE_MAP = {
      "もぐもぐ": { name: "世代間交流支援センターひのくち館", address: "長瀞町長瀞1279-1" },
    };

    const byId = new Map();
    for (const ev of uniqueEvents) {
      // もぐもぐタイムは別会場
      let venueName = defaultVenue;
      let venueAddress = defaultAddress;
      for (const [keyword, venue] of Object.entries(VENUE_MAP)) {
        if (ev.title.includes(keyword)) {
          venueName = venue.name;
          venueAddress = venue.address;
          break;
        }
      }

      let geoCandidates = [`埼玉県秩父郡${venueAddress}`, `埼玉県長瀞町 ${venueName}`];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venueName);
        if (fmAddr) geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(source, venueName, venueAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
      );
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: kosodateUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectNagatoroEvents };

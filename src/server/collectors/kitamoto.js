const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|ねんねこ|よちよち|てくてく|ぐんぐん|わんぱく|ベビーマッサージ|育児|栄養相談|壁面|豆まき|ひな|お楽しみ|身体測定|工作|製作|ふれあい遊び|読み聞かせ/;

const FACILITIES = {
  "1": { name: "北本市立児童館", address: "北本市本町1-111" },
  "2": { name: "北本市子育て支援センター", address: "北本市本宿7-80-1" },
  "3": { name: "北本駅子育て支援センター", address: "北本市中央2-172" },
  "5": { name: "Coccoひろば北本", address: "北本市中丸9-55" },
  "7": { name: "中丸保育園子育て支援センター", address: "北本市二ツ家2-45" },
};

/**
 * 児童館だより形式パース
 * "D日（曜日） イベント名 HH:MM～HH:MM"
 */
function parseJidoukanPdf(text, y, mo) {
  const events = [];
  const lines = text.split(/\n/);
  for (const line of lines) {
    const m = line.match(/(\d{1,2})日\s*[（(]([月火水木金土日])[）)]\s+(.+?)(?:\s+(\d{1,2})[：:](\d{2})\s*[～〜~-]\s*(\d{1,2})[：:](\d{2}))?(?:\s*[（(].+?[）)])?$/);
    if (!m) continue;
    const d = Number(m[1]);
    let title = m[3].trim();
    if (!title || title.length < 2) continue;
    let timeRange = null;
    if (m[4]) {
      timeRange = {
        startHour: Number(m[4]), startMin: Number(m[5]),
        endHour: Number(m[6]), endMin: Number(m[7]),
      };
    }
    events.push({ y, mo, d, title, timeRange });
  }
  return events;
}

/**
 * 子育て支援センターだより形式パース
 * "日時…M月D日(曜日)" + 次行に時刻
 */
function parseSienCenterPdf(text, y, mo) {
  const events = [];
  const lines = text.split(/\n/);
  let currentTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // タイトル行候補（★◆●等で始まる、または前行にタイトルがある）
    const titleMatch = line.match(/^[★☆◆●◎]\s*(.+)/);
    if (titleMatch) {
      currentTitle = titleMatch[1].trim();
    }

    // 日時行: "日時…M月D日(曜日)" or "日時：M月D日（曜日）"
    const dateMatch = line.match(/日\s*時\s*[…：:．]\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*[（(]([月火水木金土日])[）)]/);
    if (dateMatch) {
      const evMo = Number(dateMatch[1]);
      const d = Number(dateMatch[2]);
      // 時刻を同行または次行から抽出
      let timeRange = null;
      const timeInLine = line.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
      if (timeInLine) {
        timeRange = {
          startHour: Number(timeInLine[1]), startMin: Number(timeInLine[2]),
          endHour: Number(timeInLine[3]), endMin: Number(timeInLine[4]),
        };
      } else if (i + 1 < lines.length) {
        const nextTime = lines[i + 1].match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
        if (nextTime) {
          timeRange = {
            startHour: Number(nextTime[1]), startMin: Number(nextTime[2]),
            endHour: Number(nextTime[3]), endMin: Number(nextTime[4]),
          };
        }
      }
      if (currentTitle) {
        events.push({ y, mo: evMo, d, title: currentTitle, timeRange });
      }
    }
  }
  return events;
}

/**
 * 中丸保育園形式パース
 * "◎イベント名" + "日時：M月D日（曜日）HH:MM～"
 */
function parseNakamaruPdf(text, y, mo) {
  const events = [];
  const lines = text.split(/\n/);
  let currentTitle = "";

  for (const line of lines) {
    const titleMatch = line.match(/[◎☆★●]\s*(.+)/);
    if (titleMatch) {
      currentTitle = titleMatch[1].replace(/[～〜~].+$/, "").trim();
    }
    const dateMatch = line.match(/日\s*時\s*[：:]\s*(\d{1,2})\s*月?\s*(\d{1,2})\s*日\s*[（(]([月火水木金土日])[）)]/);
    if (dateMatch && currentTitle) {
      const evMo = Number(dateMatch[1]);
      const d = Number(dateMatch[2]);
      let timeRange = null;
      const timeMatch = line.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
      if (timeMatch) {
        timeRange = {
          startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
          endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
        };
      } else {
        const startMatch = line.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/);
        if (startMatch) {
          timeRange = {
            startHour: Number(startMatch[1]), startMin: Number(startMatch[2]),
            endHour: null, endMin: null,
          };
        }
      }
      events.push({ y, mo: evMo, d, title: currentTitle, timeRange });
    }
  }
  return events;
}

/**
 * Coccoひろば形式パース
 * "M月D日（曜日）「イベント名」" or "M月D日（曜日）イベント名"
 */
function parseCoccoPdf(text, y, mo) {
  const events = [];
  const re = /(\d{1,2})月\s*(\d{1,2})日\s*[（(]([月火水木金土日])[）)]\s*[「「]?(.+?)[」」]?$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const evMo = Number(m[1]);
    const d = Number(m[2]);
    const title = m[4].trim();
    if (!title || title.length < 2) continue;
    events.push({ y, mo: evMo, d, title, timeRange: null });
  }
  return events;
}

function detectYearMonth(text) {
  let y = null;
  let mo = null;
  const ymMatch = text.match(/(\d{4})\s*[年（(]|令和\s*(\d+)\s*年/);
  if (ymMatch) {
    if (ymMatch[1]) y = Number(ymMatch[1]);
    else if (ymMatch[2]) y = 2018 + Number(ymMatch[2]);
  }
  const moMatch = text.match(/(\d{1,2})\s*月\s*号/);
  if (moMatch) mo = Number(moMatch[1]);
  return { y, mo };
}

function createCollectKitamotoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectKitamotoEvents(maxDays) {
    const source = deps.source || {
      key: "kitamoto", label: "北本市",
      baseUrl: "https://www.city.kitamoto.lg.jp",
      center: { lat: 36.0270, lng: 139.5318 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 子育て支援センターページからPDFリンクを取得
    const pageUrl = `${baseUrl}/soshiki/kodomokenko/kosodatesien/gyomu/g9/1421649199995.html`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンク抽出
    const pdfRe = /<a\s+href="([^"]*material\/files\/group\/41\/\d+\.pdf)"[^>]*>/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(html)) !== null) {
      const href = pm[1];
      const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
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

    for (const pdfUrl of pdfUrls) {
      // 施設番号を判定（URL末尾の数字）
      const numMatch = pdfUrl.match(/(\d)\.pdf$/);
      const facilityId = numMatch ? numMatch[1] : null;
      const facility = facilityId ? FACILITIES[facilityId] : null;

      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;

        const detected = detectYearMonth(markdown);
        const y = detected.y || currentYear;
        const mo = detected.mo || currentMonth;

        let events = [];
        if (facilityId === "1") {
          events = parseJidoukanPdf(markdown, y, mo);
        } else if (facilityId === "7") {
          events = parseNakamaruPdf(markdown, y, mo);
        } else if (facilityId === "5") {
          events = parseCoccoPdf(markdown, y, mo);
        } else {
          events = parseSienCenterPdf(markdown, y, mo);
        }

        for (const ev of events) {
          ev.facility = facility;
          ev.pdfUrl = pdfUrl;
        }
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
      const key = `${ev.title}:${dateKey}:${ev.facility ? ev.facility.name : ""}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const defaultVenue = "北本市子育て支援センター";
    const defaultAddress = "北本市本宿7-80-1";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility ? ev.facility.name : defaultVenue;
      const venueAddress = ev.facility ? ev.facility.address : defaultAddress;

      let geoCandidates = [`埼玉県${venueAddress}`, `埼玉県北本市 ${venueName}`];
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
      const id = `${srcKey}:pdf:${ev.title}:${ev.dateKey}:${venueName}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
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

module.exports = { createCollectKitamotoEvents };

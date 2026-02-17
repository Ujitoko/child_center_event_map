const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|体操|歯|おひさま|ふれあい|雪|レース|お楽しみ|工作|製作|ひなまつり|オニ|豆まき|遊び|0歳|測定|フォト/;

const FACILITIES = {
  kita: { name: "伊奈町子育て支援センター", address: "伊奈町内宿台5-214-3" },
  pino: { name: "ふれあい広場おおきな樹", address: "伊奈町小室1027-2" },
  kaoru: { name: "カオルキッズルーム", address: "伊奈町小針新宿523-1" },
  kimura: { name: "らっぴーひろば", address: "伊奈町小室6965-1" },
};

/**
 * kita形式パース
 * "★タイトル" + "日時：M月D日（曜日）N時～N時N分"
 */
function parseKitaPdf(text, defaultYear) {
  const events = [];
  const lines = text.split(/\n/);
  let currentTitle = "";

  // 年度判定
  let y = defaultYear;
  const yearMatch = text.match(/令和\s*(\d+)\s*年|(\d{4})\s*年/);
  if (yearMatch) {
    y = yearMatch[1] ? 2018 + Number(yearMatch[1]) : Number(yearMatch[2]);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // タイトル行
    const titleMatch = line.match(/^[★☆◆●◎]\s*(.+)/);
    if (titleMatch) {
      currentTitle = titleMatch[1].trim();
    }

    // 日付抽出: "M月D日（曜日）" 複数あり得る
    const dateRe = /(\d{1,2})月\s*(\d{1,2})日\s*[（(]([月火水木金土日])[）)]/g;
    let dm;
    const datesInLine = [];
    while ((dm = dateRe.exec(line)) !== null) {
      datesInLine.push({ mo: Number(dm[1]), d: Number(dm[2]) });
    }
    if (datesInLine.length === 0) continue;

    // 時刻抽出（漢字形式）: "N時N分～N時N分" or "N時～N時N分"
    let timeRange = null;
    const fullText = line + (i + 1 < lines.length ? " " + lines[i + 1] : "");
    const kanjiTime = fullText.match(/(\d{1,2})時\s*(\d{1,2})?分?\s*[～〜~-]\s*(\d{1,2})時\s*(\d{1,2})?分?/);
    if (kanjiTime) {
      timeRange = {
        startHour: Number(kanjiTime[1]),
        startMin: kanjiTime[2] ? Number(kanjiTime[2]) : 0,
        endHour: Number(kanjiTime[3]),
        endMin: kanjiTime[4] ? Number(kanjiTime[4]) : 0,
      };
    }
    // コロン形式も試す
    if (!timeRange) {
      const colonTime = fullText.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
      if (colonTime) {
        timeRange = {
          startHour: Number(colonTime[1]), startMin: Number(colonTime[2]),
          endHour: Number(colonTime[3]), endMin: Number(colonTime[4]),
        };
      }
    }

    const title = currentTitle || line.replace(/\d{1,2}月\s*\d{1,2}日\s*[（(][月火水木金土日][）)]/g, "").replace(/\d{1,2}時.+$/, "").trim();
    if (!title || title.length < 2) continue;

    for (const date of datesInLine) {
      // 年度判定: 1-3月は翌年度
      let evY = y;
      if (date.mo >= 1 && date.mo <= 3 && y === defaultYear) {
        // 年度跨ぎの可能性チェック
        const now = new Date();
        if (now.getMonth() + 1 >= 4) evY = y + 1;
      }
      events.push({ y: evY, mo: date.mo, d: date.d, title, timeRange });
    }
  }
  return events;
}

/**
 * pino形式パース
 * "M月D日(曜日) N時N分～ イベント名"
 */
function parsePinoPdf(text, defaultYear) {
  const events = [];
  const lines = text.split(/\n/);

  let y = defaultYear;
  const yearMatch = text.match(/令和\s*(\d+)\s*年|(\d{4})\s*年/);
  if (yearMatch) {
    y = yearMatch[1] ? 2018 + Number(yearMatch[1]) : Number(yearMatch[2]);
  }

  // 月号判定
  let baseMo = null;
  const moMatch = text.match(/(\d{1,2})\s*月\s*号|(\d{1,2})\s*月/);
  if (moMatch) baseMo = Number(moMatch[1] || moMatch[2]);

  for (const line of lines) {
    // "M月D日(曜日) 時刻 イベント名" or "M月D日(曜日) イベント名"
    const m = line.match(/(\d{1,2})月\s*(\d{1,2})日\s*[（(]([月火水木金土日])[）)]\s+(.+)/);
    if (!m) continue;
    const mo = Number(m[1]);
    const d = Number(m[2]);
    let rest = m[4].trim();

    // 時刻を先頭から抽出
    let timeRange = null;
    const timeMatch = rest.match(/^(\d{1,2})時\s*(\d{1,2})?分?\s*[～〜~-]\s*(\d{1,2})時?\s*(\d{1,2})?分?\s*/);
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]),
        startMin: timeMatch[2] ? Number(timeMatch[2]) : 0,
        endHour: timeMatch[3] ? Number(timeMatch[3]) : null,
        endMin: timeMatch[4] ? Number(timeMatch[4]) : null,
      };
      rest = rest.slice(timeMatch[0].length).trim();
    }
    if (!timeRange) {
      const colonTime = rest.match(/^(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*/);
      if (colonTime) {
        timeRange = {
          startHour: Number(colonTime[1]), startMin: Number(colonTime[2]),
          endHour: Number(colonTime[3]), endMin: Number(colonTime[4]),
        };
        rest = rest.slice(colonTime[0].length).trim();
      }
    }

    const title = rest || "イベント";
    if (title.length < 2) continue;

    let evY = y;
    if (mo >= 1 && mo <= 3) {
      const now = new Date();
      if (now.getMonth() + 1 >= 4) evY = y + 1;
    }
    events.push({ y: evY, mo, d, title, timeRange });
  }
  return events;
}

function createCollectInaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectInaEvents(maxDays) {
    const source = deps.source || {
      key: "ina_saitama", label: "伊奈町",
      baseUrl: "https://www.town.saitama-ina.lg.jp",
      center: { lat: 35.9936, lng: 139.6219 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 子育て支援拠点ページからPDFリンクを取得
    const pageUrl = `${baseUrl}/0000000347.html`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンク抽出
    const pdfRe = /<a\s+href="([^"]*cmsfiles\/contents\/0000000\/347\/[^"]*\.pdf)"[^>]*>/gi;
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
    const allEvents = [];

    for (const pdfUrl of pdfUrls) {
      // 施設キーを判定
      const urlLower = pdfUrl.toLowerCase();
      let facilityKey = null;
      if (urlLower.includes("kita")) facilityKey = "kita";
      else if (urlLower.includes("pino")) facilityKey = "pino";
      else if (urlLower.includes("kaoru")) facilityKey = "kaoru";
      else if (urlLower.includes("kimura")) facilityKey = "kimura";

      // kaoru/kimuraはjina.ai抽出が失敗するためスキップ
      if (facilityKey === "kaoru" || facilityKey === "kimura") continue;

      const facility = facilityKey ? FACILITIES[facilityKey] : null;

      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) continue;

        let events = [];
        if (facilityKey === "kita") {
          events = parseKitaPdf(markdown, currentYear);
        } else if (facilityKey === "pino") {
          events = parsePinoPdf(markdown, currentYear);
        } else {
          events = parseKitaPdf(markdown, currentYear);
        }

        for (const ev of events) {
          ev.facility = facility;
        }
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] PDF fetch/parse failed (${facilityKey}):`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      if (!CHILD_RE.test(ev.title)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}:${ev.facility ? ev.facility.name : ""}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.facility ? ev.facility.name : "伊奈町子育て支援センター";
      const venueAddress = ev.facility ? ev.facility.address : "伊奈町内宿台5-214-3";

      let geoCandidates = [`埼玉県北足立郡${venueAddress}`, `埼玉県伊奈町 ${venueName}`];
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

module.exports = { createCollectInaEvents };

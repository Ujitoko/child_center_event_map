const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 毛呂山町 子育て支援センター「もろっこ」「ゆずっこ」カレンダーPDFからイベントを抽出
 *
 * PDFテキスト形式:
 * 前半: カレンダーグリッド (日付 + 健診名が混在)
 * 後半: 曜日別の定期イベント (月 火 水 木 金 ヘッダ後にイベント名)
 * 特別イベント: "M/D（曜）パパと遊ぼう！" など
 */
function parseMoroyamaPdfEvents(text) {
  const events = [];

  // 年月判定
  let year = null;
  let month = null;
  const ymMatch = text.match(/(20\d{2})\s*年?\s*[（(]?\s*令和/);
  if (ymMatch) year = Number(ymMatch[1]);
  if (!year) {
    const ymMatch2 = text.match(/令和\s*(\d+)\s*年/);
    if (ymMatch2) year = 2018 + Number(ymMatch2[1]);
  }
  if (!year) {
    const ymMatch3 = text.match(/(20\d{2})\s*年/);
    if (ymMatch3) year = Number(ymMatch3[1]);
  }
  // 月: "3月" or "#N月" or "N がつ"
  const moMatch = text.match(/(?:^|\s|#)\s*(\d{1,2})\s*月/m);
  if (moMatch) month = Number(moMatch[1]);
  if (!month) {
    const zenMonth = text.match(/([１-９][０-２]?)\s*月/);
    if (zenMonth) {
      const s = zenMonth[1].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      month = Number(s);
    }
  }
  if (!year || !month) {
    const now = new Date();
    year = year || now.getFullYear();
    month = month || (now.getMonth() + 1);
  }

  const lastDay = new Date(year, month, 0).getDate();

  // 曜日別イベントの解析
  // テキスト内で「月 火 水 木 金」ヘッダを見つけ、その後の行を曜日ごとにマッピング
  const lines = text.split(/\n/);
  let dowHeaderIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^月\s+火\s+水\s+木\s+金$/.test(trimmed)) {
      dowHeaderIdx = i;
      break;
    }
  }

  // 曜日ヘッダの後の行からイベントを抽出
  const weeklyEvents = []; // { dow: 0-4 (月-金), title, timeRange }

  if (dowHeaderIdx >= 0) {
    // ヘッダ後の行を1ブロックとして収集
    const afterHeader = lines.slice(dowHeaderIdx + 1).join("\n");

    // 定期イベントパターン
    const recurringPatterns = [
      { name: "リトミック", timeMatch: /リトミック\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 0 },
      { name: "みんなのお誕生日", timeMatch: /お誕生日\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 1 },
      { name: "手話の日", timeMatch: /手話の日\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 2 },
      { name: "はいはいレース", timeMatch: /はいはいレース\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 0 },
      { name: "ぷち誕生会", timeMatch: /ぷち誕生会\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 2 },
      { name: "保健師の日", timeMatch: /保健師の日\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/, dow: 0 },
      { name: "育児ほっと相談室", timeMatch: /育児ほっと相談室\s*(\d{1,2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/, dow: 3 },
      { name: "ボールプールの日", timeMatch: null, dow: 1 },
      { name: "英語あそび", timeMatch: /英語あそび\s*(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 4 },
      { name: "Babyはぴ", timeMatch: /Baby.*?(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/, dow: 1 },
    ];

    for (const pat of recurringPatterns) {
      if (afterHeader.includes(pat.name) || text.includes(pat.name)) {
        let timeRange = null;
        if (pat.timeMatch) {
          const tm = text.match(pat.timeMatch);
          if (tm) {
            if (tm.length >= 5) {
              timeRange = { startHour: Number(tm[1]), startMin: 0, endHour: Number(tm[3]), endMin: Number(tm[4]) };
            } else {
              timeRange = { startHour: Number(tm[1]), startMin: Number(tm[2]), endHour: null, endMin: null };
            }
          }
        }
        weeklyEvents.push({ dow: pat.dow, title: pat.name, timeRange });
      }
    }
  }

  // 全角数字の時刻もパース
  const fullText = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));

  // 曜日別イベントから各日のイベントを生成
  for (const we of weeklyEvents) {
    // dow: 0=月, 1=火, 2=水, 3=木, 4=金 → JS getDay(): 1=月, 2=火, 3=水, 4=木, 5=金
    const jsDow = we.dow + 1;
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month - 1, d);
      if (date.getDay() === jsDow) {
        // 祝日チェック (簡易)
        events.push({ y: year, mo: month, d, title: we.title, timeRange: we.timeRange });
      }
    }
  }

  // 特別イベントの抽出: "M/D（曜）イベント名" or "M月D日" パターン
  const specialRe = /(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?\s*[（(]\s*[月火水木金土日]\s*[）)]\s*[^0-9\n]{2,}/g;
  let sm;
  while ((sm = specialRe.exec(fullText)) !== null) {
    const mo = Number(sm[1]);
    const d = Number(sm[2]);
    if (mo !== month) continue;
    const afterDate = sm[0].replace(/\d{1,2}\s*[\/月]\s*\d{1,2}\s*日?\s*[（(]\s*[月火水木金土日]\s*[）)]/, "").trim();
    let title = afterDate.split(/[（(]/)[0].trim();
    if (!title || title.length < 2 || /健診|検診|予防接種/.test(title)) continue;
    // 時刻
    let timeRange = null;
    const tm = sm[0].match(/(\d{1,2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
    if (tm) {
      timeRange = { startHour: Number(tm[1]), startMin: 0, endHour: Number(tm[2]), endMin: Number(tm[3]) };
    }
    events.push({ y: year, mo: month, d, title, timeRange });
  }

  return events;
}

function createCollectMoroyamaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMoroyamaEvents(maxDays) {
    const source = deps.source || {
      key: "moroyama", label: "毛呂山町",
      baseUrl: "https://www.town.moroyama.saitama.jp",
      center: { lat: 35.9417, lng: 139.3167 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // カレンダーPDFページを取得
    const pageUrl = `${baseUrl}/soshikikarasagasu/kosodateshiencenter/1/10775.html`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // PDFリンクを抽出 (駐車場案内を除外)
    const pdfRe = /href="([^"]*\.pdf)"/gi;
    const pdfUrls = [];
    let pm;
    while ((pm = pdfRe.exec(html)) !== null) {
      const href = pm[1];
      if (/parking|駐車|案内図/.test(href)) continue;
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
        const events = parseMoroyamaPdfEvents(markdown);
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

    const defaultVenue = "もろっこ";
    const defaultAddress = "毛呂山町川角305-1 保健センター2F";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県入間郡${defaultAddress}`, `埼玉県入間郡毛呂山町 ${defaultVenue}`];
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

module.exports = { createCollectMoroyamaEvents };

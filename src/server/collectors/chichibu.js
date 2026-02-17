const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 秩父市 下郷児童館・子育て支援センター 月次PDFカレンダーからイベントを抽出
 *
 * PDFテキスト形式 (カレンダーレイアウト):
 * 週ヘッダ: 日 ＳＵＮ 月 ＭＯＮ 火 ＴＵＥ 水 ＷＥＤ 木 ＴＨＵ 金 ＦＲＩ 土 ＳＡＴ
 * 週行: D D D D D D D (or ## D D D D D D D)
 * イベントが週内に記載される
 *
 * 定期イベント:
 * - ひよこの日: 毎週木曜日
 * - ひよこタイム: 毎週火・水曜日
 */
function parseChichibuPdfEvents(text) {
  const events = [];

  // 年月判定
  let year = null;
  let month = null;
  const ymMatch = text.match(/(\d{4})\s*年?\s*(?:#\s*)?(\d{1,2})\s*月?/);
  if (ymMatch) {
    year = Number(ymMatch[1]);
    month = Number(ymMatch[2]);
  }
  // "２０２６" + "２February" パターン
  if (!year) {
    const fullWidthYear = text.match(/[２2]\s*[０0]\s*[２2]\s*([０-９0-9])/);
    if (fullWidthYear) {
      const lastDigit = fullWidthYear[1].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      year = 2020 + Number(lastDigit);
    }
  }
  if (!month) {
    const monthNames = { "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12 };
    for (const [name, num] of Object.entries(monthNames)) {
      if (text.includes(name)) { month = num; break; }
    }
  }
  // フォールバック: 全角数字の月
  if (!month) {
    const zenMonth = text.match(/[１-９][０-９]?(?=\s*[Mm]onth|February|March|April|May|June|July|August|September|October|November|December|月)/);
    if (zenMonth) {
      const s = zenMonth[0].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      month = Number(s);
    }
  }

  if (!year || !month) {
    // ファイル名からフォールバック
    const now = new Date();
    year = year || now.getFullYear();
    month = month || (now.getMonth() + 1);
  }

  // 週ごとのブロックに分割
  // 週の開始: 数字が7つ並ぶ行 "1 2 3 4 5 6 7" or "## 8 9 10 11 12 13 14"
  const lines = text.split(/\n/);
  const weekBlocks = [];
  let currentDays = null;
  let currentLines = [];

  for (const line of lines) {
    // 週ヘッダ行を検出: "## N N N ..." or "N N N N N N N"
    const dayLine = line.replace(/^#+\s*/, "").trim();
    const nums = dayLine.split(/\s+/).filter(s => /^\d{1,2}$/.test(s)).map(Number);
    if (nums.length >= 5 && nums.length <= 7 && nums.every(n => n >= 1 && n <= 31)) {
      // 前の週ブロックを保存
      if (currentDays) {
        weekBlocks.push({ days: currentDays, text: currentLines.join("\n") });
      }
      currentDays = nums;
      currentLines = [];
    } else if (currentDays) {
      currentLines.push(line);
    }
  }
  if (currentDays) {
    weekBlocks.push({ days: currentDays, text: currentLines.join("\n") });
  }

  // 各週ブロックからイベントを抽出
  const eventNames = [
    "制作", "豆まき", "ひよこの日", "背骨コンディショニング", "筆ペン", "書道",
    "ママサロン", "リズムで遊ぼう", "発達遊び", "巡回相談", "ベビーマッサージ",
    "誕生日撮影会", "お誕生日会", "誕生会", "発育測定", "他県他市",
    "図書館司書", "読み聞かせ", "ヨガ", "ふれあい遊び", "離乳食",
    "手形", "足形", "工作", "おはなし", "わらべうた", "季節の行事",
    "親子体操", "英語", "音楽", "ハロウィン", "クリスマス", "七夕",
    "水遊び", "プール", "お楽しみ会", "コンサート", "おひなさま",
  ];

  for (const block of weekBlocks) {
    const blockText = block.text.replace(/\s+/g, " ");
    // ブロック内からイベント名をマッチ
    for (const evName of eventNames) {
      if (blockText.includes(evName)) {
        // このイベントがどの曜日か推定
        // 木曜=ひよこの日は固定
        let targetDay = null;
        if (evName === "ひよこの日") {
          // 木曜日 (index 4 in 日月火水木金土)
          targetDay = findDayOfWeek(year, month, block.days, 4);
        } else {
          // 位置ベースで推定は困難なので、週の中日を使う
          targetDay = block.days[Math.floor(block.days.length / 2)];
        }

        if (targetDay) {
          let timeRange = null;
          // イベント名近くの時刻を探す
          const evIdx = blockText.indexOf(evName);
          const nearby = blockText.substring(Math.max(0, evIdx - 30), evIdx + evName.length + 50);
          const timeMatch = nearby.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
          if (timeMatch) {
            timeRange = {
              startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
              endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
            };
          }
          events.push({ y: year, mo: month, d: targetDay, title: evName, timeRange });
        }
      }
    }
  }

  // 定期イベントを追加（ひよこの日=毎週木曜、ひよこタイム=毎週火・水）
  const allDays = getDaysOfWeekInMonth(year, month);
  // ひよこの日 - 毎週木曜
  for (const d of allDays.thu) {
    if (!events.some(e => e.title === "ひよこの日" && e.d === d)) {
      events.push({
        y: year, mo: month, d, title: "ひよこの日",
        timeRange: { startHour: 10, startMin: 10, endHour: 11, endMin: 0 },
      });
    }
  }
  // ひよこタイム - 毎週火・水
  for (const d of [...allDays.tue, ...allDays.wed]) {
    events.push({
      y: year, mo: month, d, title: "ひよこタイム",
      timeRange: { startHour: 14, startMin: 0, endHour: 15, endMin: 0 },
    });
  }

  return events;
}

function findDayOfWeek(year, month, weekDays, dowTarget) {
  // dowTarget: 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  for (const d of weekDays) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === dowTarget) return d;
  }
  return null;
}

function getDaysOfWeekInMonth(year, month) {
  const result = { sun: [], mon: [], tue: [], wed: [], thu: [], fri: [], sat: [] };
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    result[keys[dow]].push(d);
  }
  return result;
}

function createCollectChichibuEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectChichibuEvents(maxDays) {
    const source = deps.source || {
      key: "chichibu", label: "秩父市",
      baseUrl: "https://www.city.chichibu.lg.jp",
      center: { lat: 35.9917, lng: 139.0853 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // PDFリンクページを取得
    const pageUrl = `${baseUrl}/10065.html`;
    let html;
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // 下郷PDFリンクを抽出
    const pdfRe = /href="([^"]*shitagou[^"]*\.pdf)"/gi;
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

    const allEvents = [];

    for (const pdfUrl of pdfUrls.slice(0, 2)) {
      try {
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 100) continue;
        const events = parseChichibuPdfEvents(markdown);
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

    const defaultVenue = "下郷児童館・子育て支援センター";
    const defaultAddress = "秩父市阿保町9-28";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県${defaultAddress}`, `埼玉県秩父市 ${defaultVenue}`];
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

module.exports = { createCollectChichibuEvents };

const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

/**
 * 皆野町 子育て支援センター「きらきらクラブ」情報紙PDFからイベントを抽出
 *
 * PDFテキスト形式 (カレンダーグリッド):
 * 週ヘッダ: 月 火 水 木 金
 * 日付行: D D D D D
 * イベント行: イベント名と時刻が混在
 *
 * 定期イベント: 毎週木曜日 = 絵本読み聞かせ (10:30～)
 */
function parseMinanoPdfEvents(text) {
  const events = [];

  // 年月判定
  let year = null;
  let month = null;
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
  // "２がつ" "３がつ" パターン
  if (!month) {
    const zenMonthMap = { "１": 1, "２": 2, "３": 3, "４": 4, "５": 5, "６": 6, "７": 7, "８": 8, "９": 9 };
    const zenMatch = text.match(/([１-９][０-９]?)\s*がつ/);
    if (zenMatch) {
      const s = zenMatch[1].replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFF10 + 0x30));
      month = Number(s);
    }
  }
  if (!year || !month) {
    const now = new Date();
    year = year || now.getFullYear();
    month = month || (now.getMonth() + 1);
  }

  // 週ブロックに分割
  const lines = text.split(/\n/);
  const weekBlocks = [];
  let currentDays = null;
  let currentLines = [];

  for (const line of lines) {
    const trimmed = line.replace(/^[>#\s]+/, "").trim();
    if (!trimmed) continue;

    // 日付行を検出: 3-5個の数字が並ぶ行
    const nums = trimmed.split(/\s+/).filter(s => /^\d{1,2}$/.test(s)).map(Number);
    if (nums.length >= 3 && nums.length <= 7 && nums.every(n => n >= 1 && n <= 31)) {
      // 連続した数字か確認
      const sorted = [...nums].sort((a, b) => a - b);
      const maxGap = sorted.reduce((max, n, i) => i > 0 ? Math.max(max, n - sorted[i - 1]) : max, 0);
      if (maxGap <= 3) {
        if (currentDays) {
          weekBlocks.push({ days: currentDays, text: currentLines.join("\n") });
        }
        currentDays = nums;
        currentLines = [];
        continue;
      }
    }
    if (currentDays) {
      currentLines.push(trimmed);
    }
  }
  if (currentDays) {
    weekBlocks.push({ days: currentDays, text: currentLines.join("\n") });
  }

  // 各週ブロックからイベントを抽出
  const eventPatterns = [
    "節分", "赤ちゃんデー", "避難訓練", "製作", "リトミック",
    "ベビーマッサージ", "ママサロン", "ママリフレッシュ", "ヨガ",
    "誕生会", "お誕生日会", "親子ヨガ", "ふれあい遊び",
    "クリスマス", "ハロウィン", "七夕", "おひなさま", "ひなまつり",
    "わくわく", "工作", "お楽しみ", "コンサート", "水遊び",
  ];

  for (const block of weekBlocks) {
    const blockText = block.text;

    for (const evName of eventPatterns) {
      if (blockText.includes(evName)) {
        // 時刻を抽出
        let timeRange = null;
        const evIdx = blockText.indexOf(evName);
        const nearby = blockText.substring(Math.max(0, evIdx - 30), evIdx + evName.length + 50);
        const timeMatch = nearby.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
        if (timeMatch) {
          timeRange = {
            startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
            endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
          };
        } else {
          const startOnly = nearby.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]/);
          if (startOnly) {
            timeRange = {
              startHour: Number(startOnly[1]), startMin: Number(startOnly[2]),
              endHour: null, endMin: null,
            };
          }
        }

        // 週の中で最も早い平日を使用（月曜=index 0）
        const targetDay = block.days[0];
        if (targetDay) {
          events.push({ y: year, mo: month, d: targetDay, title: evName, timeRange });
        }
      }
    }
  }

  // 定期イベント: 毎週木曜日 = 絵本読み聞かせ (10:30～)
  if (text.includes("木曜日") && text.includes("絵本")) {
    const lastDay = new Date(year, month, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 4) { // 木曜
        if (!events.some(e => e.title === "絵本読み聞かせ" && e.d === d)) {
          events.push({
            y: year, mo: month, d, title: "絵本読み聞かせ",
            timeRange: { startHour: 10, startMin: 30, endHour: 11, endMin: 0 },
          });
        }
      }
    }
  }

  return events;
}

function createCollectMinanoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMinanoEvents(maxDays) {
    const source = deps.source || {
      key: "minano", label: "皆野町",
      baseUrl: "https://www.town.minano.saitama.jp",
      center: { lat: 36.0567, lng: 139.1000 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const portalBase = "https://myoujou-kunikami.jp";

    // きらきらクラブのお知らせページからPDFリンクを取得
    const listUrl = `${portalBase}/kirakira/info/`;
    let html;
    try {
      html = await fetchText(listUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // 情報紙ページのリンクを抽出
    const infoRe = /href="(\/kirakira\/info\/\d{4}\/\d{2}\/\d+\/)"/g;
    const infoUrls = [];
    let im;
    while ((im = infoRe.exec(html)) !== null) {
      const absUrl = `${portalBase}${im[1]}`;
      if (!infoUrls.includes(absUrl)) infoUrls.push(absUrl);
    }

    // 「情報紙」を含むリンクのみフィルタ（タイトルチェック）
    const pdfUrls = [];
    for (const infoUrl of infoUrls.slice(0, 3)) {
      try {
        const infoHtml = await fetchText(infoUrl);
        // サムネイル画像URLからPDF URLを推測
        // パターン: uploads/YYYY/MM/HASH-pdf.jpg → uploads/YYYY/MM/HASH.pdf
        const thumbRe = /wp-content\/uploads\/(\d{4}\/\d{2}\/[a-f0-9-]+)-pdf(?:-\d+x\d+)?\.jpg/g;
        let tm;
        while ((tm = thumbRe.exec(infoHtml)) !== null) {
          const pdfUrl = `${portalBase}/kirakira/wp-content/uploads/${tm[1]}.pdf`;
          if (!pdfUrls.includes(pdfUrl)) pdfUrls.push(pdfUrl);
        }
      } catch (e) {
        // skip
      }
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
        const events = parseMinanoPdfEvents(markdown);
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

    const defaultVenue = "きらきらクラブ";
    const defaultAddress = "皆野町大字皆野2637-3";

    const byId = new Map();
    for (const ev of uniqueEvents) {
      let geoCandidates = [`埼玉県秩父郡${defaultAddress}`, `埼玉県秩父郡皆野町 ${defaultVenue}`];
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
        url: `${portalBase}/kirakira/`,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectMinanoEvents };

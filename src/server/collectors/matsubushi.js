const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童|保育|離乳食|おはなし|絵本|紙芝居|リトミック|ママ|パパ|マタニティ|ひろば|誕生|手形|ハイハイ|えほん|じかん|工作|製作|遊び|ふれあい|ワークショップ|サロン|ヨガ|測定|相談|支援センター|ちびっ子/;

/**
 * 松伏町 広報まつぶし（子育て関連ページ）のPDFからイベントを抽出
 *
 * テキスト形式:
 * "イベント名 M/D(曜) HH:MM～HH:MM 場所 対象 定員"
 * "ベビーデー 2/4(水) 10:00-11:40, 13:00-14:40"
 */

// 施設マッピング
const FACILITIES = {
  "松伏地域子育て支援センター": "松伏町松伏2428-1",
  "北部地域子育て支援センター": "松伏町築比地674-2",
  "児童館ちびっ子らんど": "松伏町松葉1-6-3",
};

function parseMatsubushiPdfEvents(text) {
  const events = [];
  const lines = text.split(/\n/);

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
  if (!year || !month) {
    const now = new Date();
    year = year || now.getFullYear();
    month = month || (now.getMonth() + 1);
  }

  // 現在の施設コンテキスト
  let currentFacility = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 施設名の検出
    for (const [fName] of Object.entries(FACILITIES)) {
      if (trimmed.includes(fName)) {
        currentFacility = fName;
      }
    }

    // 日付パターンを探す: M/D(曜) or M月D日(曜)
    const datePattern = /(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?\s*[（(]\s*([月火水木金土日])\s*[）)]/g;
    const dates = [];
    let dm;
    while ((dm = datePattern.exec(trimmed)) !== null) {
      const mo = Number(dm[1]);
      const d = Number(dm[2]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        dates.push({ mo, d });
      }
    }
    if (dates.length === 0) continue;

    // 時刻を抽出
    let timeRange = null;
    const timeMatch = trimmed.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);
    if (timeMatch) {
      timeRange = {
        startHour: Number(timeMatch[1]), startMin: Number(timeMatch[2]),
        endHour: Number(timeMatch[3]), endMin: Number(timeMatch[4]),
      };
    } else {
      const startOnly = trimmed.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~]/);
      if (startOnly) {
        timeRange = {
          startHour: Number(startOnly[1]), startMin: Number(startOnly[2]),
          endHour: null, endMin: null,
        };
      }
    }

    // イベント名を抽出: 日付より前の部分
    const firstDateIdx = trimmed.search(/\d{1,2}\s*[\/月]\s*\d{1,2}\s*日?\s*[（(]/);
    let title = firstDateIdx > 0 ? trimmed.substring(0, firstDateIdx).trim() : "";
    // 行内にイベント名がない場合、全体をチェック
    if (!title || title.length < 2) {
      // 日付・時刻部分を除去して残りをタイトルとして使う
      title = trimmed
        .replace(/\d{1,2}\s*[\/月]\s*\d{1,2}\s*日?\s*[（(]\s*[月火水木金土日]\s*[）)]/g, "")
        .replace(/\d{1,2}\s*[：:]\s*\d{2}\s*[～〜~-]\s*(\d{1,2}\s*[：:]\s*\d{2})?/g, "")
        .replace(/[,、]\s*/g, " ")
        .trim();
    }
    if (!title || title.length < 2) continue;
    // 子育て関連フィルタ
    if (!CHILD_RE.test(title) && !CHILD_RE.test(trimmed) && !currentFacility) continue;

    const venue = currentFacility || "松伏地域子育て支援センター";

    for (const { mo, d } of dates) {
      events.push({
        y: year, mo, d, title, timeRange,
        venue, address: FACILITIES[venue] || null,
      });
    }
  }

  return events;
}

function createCollectMatsubushiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectMatsubushiEvents(maxDays) {
    const source = deps.source || {
      key: "matsubushi", label: "松伏町",
      baseUrl: "https://www.town.matsubushi.lg.jp",
      center: { lat: 35.9267, lng: 139.8133 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 広報まつぶし一覧ページから最新号のリンクを取得
    const listUrl = `${baseUrl}/www/contents/1369361899924/index.html`;
    let html;
    try {
      html = await fetchText(listUrl);
    } catch (e) {
      console.warn(`[${label}] page fetch failed:`, e.message || e);
      return [];
    }

    // 最新号のリンクを抽出
    const issueRe = /href="(\/www\/contents\/\d+\/index\.html)"/g;
    const issueUrls = [];
    let im;
    while ((im = issueRe.exec(html)) !== null) {
      const absUrl = `${baseUrl}${im[1]}`;
      if (!issueUrls.includes(absUrl)) issueUrls.push(absUrl);
    }

    if (issueUrls.length === 0) {
      console.warn(`[${label}] no issue links found`);
      return [];
    }

    // 最新2号分から子育てページのPDFを探す
    const allEvents = [];

    for (const issueUrl of issueUrls.slice(0, 2)) {
      try {
        const issueHtml = await fetchText(issueUrl);
        // "simple/N-N.pdf" or "simple/N.pdf" パターンのPDFリンクを取得
        const pdfRe = /href="([^"]*simple\/[^"]*\.pdf)"/gi;
        let pm;
        while ((pm = pdfRe.exec(issueHtml)) !== null) {
          const href = pm[1];
          const absUrl = href.startsWith("http") ? href : `${baseUrl}${href.startsWith("/") ? "" : "/"}${href}`;
          try {
            const markdown = await fetchChiyodaPdfMarkdown(absUrl);
            if (!markdown || markdown.length < 50) continue;
            // 子育て関連のPDFかチェック
            if (!CHILD_RE.test(markdown)) continue;
            const events = parseMatsubushiPdfEvents(markdown);
            if (events.length > 0) {
              allEvents.push(...events);
              break; // 1号につき子育てPDFが見つかったら次の号へ
            }
          } catch (e) {
            // PDFフェッチ失敗はスキップ
          }
        }
      } catch (e) {
        console.warn(`[${label}] issue fetch failed:`, e.message || e);
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

    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venueName = ev.venue || "松伏地域子育て支援センター";
      const venueAddress = ev.address || FACILITIES[venueName] || null;

      let geoCandidates = [`埼玉県北葛飾郡${venueAddress || "松伏町松伏2428-1"}`, `埼玉県北葛飾郡松伏町 ${venueName}`];
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
        url: listUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (from PDF)`);
    return results;
  };
}

module.exports = { createCollectMatsubushiEvents };

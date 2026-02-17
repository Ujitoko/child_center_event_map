const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");
const { WARD_CHILD_HINT_RE } = require("../../config/wards");

const CHILD_RE =
  /子育て|子ども|こども|親子|乳幼児|幼児|赤ちゃん|ベビー|キッズ|児童館|保育|離乳食|おはなし|すくすく|のびのび|ママ|パパ|マタニティ|ワンダーランド|支援センター|プラネタリウム|ひろば|読み聞かせ/;

/**
 * 吉川市イベントカレンダーPDFからイベントを抽出
 *
 * PDF形式 (表形式):
 * 日付  曜日  時刻  会場  イベント名  申し込み期間  問い合わせ先  電話番号
 * 2月1日  日 午前10時15分～11時50分  児童館ワンダーランド ぞうのへや  親子でスポーツタイム  ー ...
 */

/**
 * 日本語時刻テキストをパース
 * "午前10時15分～11時50分" → { startHour: 10, startMin: 15, endHour: 11, endMin: 50 }
 * "午後3時～3時50分" → { startHour: 15, startMin: 0, endHour: 15, endMin: 50 }
 */
function parseJaTime(text) {
  if (!text) return null;

  // 全角数字を半角に
  const norm = text.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));

  const parts = norm.split(/[～〜ー―−-]/);
  if (parts.length === 0) return null;

  function parseTimePart(s) {
    const isPm = /午後/.test(s);
    const hm = s.match(/(\d{1,2})時(?:(\d{1,2})分)?/);
    if (!hm) return null;
    let h = Number(hm[1]);
    const m = hm[2] ? Number(hm[2]) : 0;
    if (isPm && h < 12) h += 12;
    return { h, m };
  }

  const start = parseTimePart(parts[0]);
  if (!start) return null;
  const end = parts.length > 1 ? parseTimePart(parts[1]) : null;

  // endが午前/午後指定なしの場合、startの午前/午後を引き継ぐ
  if (end && end.h < start.h && !/午前|午後/.test(parts[1])) {
    end.h += 12;
  }

  return {
    startHour: start.h,
    startMin: start.m,
    endHour: end ? end.h : null,
    endMin: end ? end.m : null,
  };
}

/**
 * PDFテキストからイベントを抽出
 */
function parsePdfEvents(text, defaultYear) {
  const events = [];
  const lines = text.split(/\n/);

  for (const line of lines) {
    // 日付パターン: "M月D日" で始まる行
    const dateMatch = line.match(/(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;

    const mo = Number(dateMatch[1]);
    const d = Number(dateMatch[2]);
    // 年の推定: 現在の年 or 翌年
    const y = defaultYear;

    // 日付以降のテキストを取得
    const afterDate = line.substring(line.indexOf(dateMatch[0]) + dateMatch[0].length);

    // 曜日を除去
    const withoutDay = afterDate.replace(/^\s*[日月火水木金土祝]\s*/, "");

    // 2+スペース区切りでフィールド分割
    const fields = withoutDay.split(/\s{2,}/).filter(f => f.trim());
    if (fields.length < 2) continue;

    // fields[0] = 時刻, fields[1] = 会場, fields[2] = イベント名 (理想的)
    // ただし区切りが不明瞭な場合もある
    let timeText = "";
    let venue = "";
    let title = "";

    if (fields.length >= 3) {
      timeText = fields[0];
      venue = fields[1];
      title = fields[2];
    } else if (fields.length === 2) {
      // 時刻+会場 or 会場+イベント名
      if (/[時分]/.test(fields[0]) || /午前|午後/.test(fields[0])) {
        timeText = fields[0];
        title = fields[1];
      } else {
        venue = fields[0];
        title = fields[1];
      }
    } else {
      title = fields[0];
    }

    if (!title) continue;

    const timeRange = parseJaTime(timeText);

    events.push({
      y,
      mo,
      d,
      title: title.trim(),
      venue: venue.trim(),
      timeRange,
    });
  }

  return events;
}

function buildGeoCandidates(venue) {
  const candidates = [];
  if (venue) {
    candidates.push(`埼玉県吉川市 ${venue}`);
    // 部屋名を除去してリトライ
    const short = venue.replace(/\s+\S*(へや|ルーム|室|ホール).*$/, "").trim();
    if (short !== venue && short) {
      candidates.push(`埼玉県吉川市 ${short}`);
    }
  }
  return candidates;
}

function createCollectYoshikawaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectYoshikawaEvents(maxDays) {
    const source = deps.source || {
      key: "yoshikawa", label: "吉川市",
      baseUrl: "https://www.city.yoshikawa.saitama.jp",
      center: { lat: 35.8917, lng: 139.8428 },
    };
    const srcKey = `ward_${source.key}`;
    const label = source.label;
    const baseUrl = source.baseUrl;

    // 1. カレンダー一覧ページから月別リンクを取得
    const listUrl = `${baseUrl}/index.cfm/26,0,226,1217,html`;
    let listHtml;
    try {
      listHtml = await fetchText(listUrl);
    } catch (e) {
      console.warn(`[${label}] calendar list page fetch failed:`, e.message || e);
      return [];
    }

    // 月別ページのリンクを抽出: "YYYY年M月イベントカレンダー"
    const monthLinkRe = /<a\s+href="(\/index\.cfm\/26,\d+,226,1217,html)"[^>]*>[\s\S]*?(\d{4})年(\d{1,2})月[\s\S]*?<\/a>/gi;
    const monthPages = [];
    let mlm;
    while ((mlm = monthLinkRe.exec(listHtml)) !== null) {
      monthPages.push({
        url: `${baseUrl}${mlm[1]}`,
        year: Number(mlm[2]),
        month: Number(mlm[3]),
      });
    }

    if (monthPages.length === 0) {
      console.log(`[${label}] no monthly calendar links found`);
      return [];
    }

    // 必要な月のみ処理
    const neededMonths = getMonthsForRange(maxDays);
    const neededSet = new Set(neededMonths.map(m => `${m.year}-${m.month}`));
    const relevantPages = monthPages.filter(p => neededSet.has(`${p.year}-${p.month}`));

    if (relevantPages.length === 0) {
      // フォールバック: 最新の月を使用
      relevantPages.push(monthPages[0]);
    }

    const allEvents = [];

    for (const page of relevantPages.slice(0, 3)) {
      try {
        // 2. 月別ページからPDF URLを取得
        const pageHtml = await fetchText(page.url);
        const pdfMatch = pageHtml.match(/<a\s+href="([^"]+\.pdf)"/i);
        if (!pdfMatch) {
          console.warn(`[${label}] no PDF link found on ${page.url}`);
          continue;
        }
        const pdfUrl = pdfMatch[1].startsWith("http")
          ? pdfMatch[1]
          : `${baseUrl}${pdfMatch[1]}`;

        // 3. jina.ai経由でPDF→Markdown
        const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        if (!markdown || markdown.length < 50) {
          console.warn(`[${label}] PDF markdown too short`);
          continue;
        }

        // 4. パース
        const events = parsePdfEvents(markdown, page.year);
        allEvents.push(...events);
      } catch (e) {
        console.warn(`[${label}] PDF fetch/parse failed for ${page.year}/${page.month}:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // 子育てフィルタ + 範囲フィルタ + 重複除去
    const uniqueMap = new Map();
    for (const ev of allEvents) {
      const titleVenue = `${ev.title} ${ev.venue}`;
      if (!CHILD_RE.test(titleVenue) && !WARD_CHILD_HINT_RE.test(titleVenue)) continue;
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${ev.venue}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      const venue = sanitizeVenueText(ev.venue);

      let geoCandidates = buildGeoCandidates(venue);
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          geoCandidates.unshift(fmAddr.includes("埼玉県") ? fmAddr : `埼玉県${fmAddr}`);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), source);
      point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const id = `${srcKey}:pdf:${ev.title}:${ev.venue}:${ev.dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: address || "",
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

module.exports = { createCollectYoshikawaEvents };

/**
 * 土浦市 児童館だよりPDFコレクター
 *
 * 3施設（ポプラ・都和・新治児童館）の行事案内ページからPDFリンクを取得し、
 * jina.ai proxy経由でPDFテキスト化、イベントを抽出する。
 *
 * PDFテキスト形式:
 * - 「N日（曜日）イベント名 時間」パターン
 * - 月はPDFタイトル or ページテキストから推定
 */
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
} = require("../date-utils");
const { TSUCHIURA_SOURCE } = require("../../config/wards");

const BASE = TSUCHIURA_SOURCE.baseUrl;

/** 施設定義 */
const FACILITIES = [
  {
    id: "popura",
    name: "ポプラ児童館",
    pagePath: "/kosodate-kyoiku/kodomofukushi/jidoukan/jidokan/popura/page001460.html",
  },
  {
    id: "tsuwa",
    name: "都和児童館",
    pagePath: "/kosodate-kyoiku/kodomofukushi/jidoukan/jidokan/tsuwa/page001465.html",
  },
  {
    id: "nihari",
    name: "新治児童館",
    pagePath: "/kosodate-kyoiku/kodomofukushi/jidoukan/jidokan/nihari/page002124.html",
  },
];

/** PDFテキストから年月を推定 */
function detectYearMonth(text) {
  const nText = text.normalize("NFKC");

  // 「令和N年M月」
  const reiwa = nText.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月/);
  if (reiwa) return { year: 2018 + Number(reiwa[1]), month: Number(reiwa[2]) };

  // 「2026年3月」
  const western = nText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (western) return { year: Number(western[1]), month: Number(western[2]) };

  // 「3月号」のような月のみ
  const monthOnly = nText.match(/(\d{1,2})\s*月\s*号/);
  if (monthOnly) {
    const now = new Date();
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return { year: jst.getUTCFullYear(), month: Number(monthOnly[1]) };
  }

  return null;
}

/** PDFテキストからイベントを抽出 */
function parseTsuchiuraPdfEvents(text, fallbackYm) {
  const events = [];
  const nText = text.normalize("NFKC");

  const ym = detectYearMonth(nText) || fallbackYm;
  if (!ym) return events;
  const { year, month } = ym;

  const lines = nText.split(/\n/);

  // スキップキーワード
  const SKIP_RE = /休館|お休み|閉館|祝日/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (SKIP_RE.test(trimmed)) continue;

    // パターン: "N日（曜日）イベント名" or "N日(曜日) イベント名"
    const dayMatch = trimmed.match(/(\d{1,2})\s*日\s*[（(][日月火水木金土][）)]/);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (day < 1 || day > 31) continue;

    // 日付+曜日以降のテキストをタイトルとする
    const afterDate = trimmed.slice(dayMatch.index + dayMatch[0].length).trim();
    if (!afterDate) continue;

    // 時刻パターンを分離
    let title = afterDate;
    let timeRange = null;

    // 時刻: "午前10時～午前11時30分" or "10:00～11:30" or "10時～11時"
    const timeMatch1 = afterDate.match(/午前(\d{1,2})時(\d{1,2})?分?\s*[～〜~-]\s*午前(\d{1,2})時(\d{1,2})?分?/);
    const timeMatch2 = afterDate.match(/午後(\d{1,2})時(\d{1,2})?分?\s*[～〜~-]\s*午後(\d{1,2})時(\d{1,2})?分?/);
    const timeMatch3 = afterDate.match(/午前(\d{1,2})時(\d{1,2})?分?\s*[～〜~-]\s*午後(\d{1,2})時(\d{1,2})?分?/);
    const timeMatch4 = afterDate.match(/(\d{1,2})\s*[：:]\s*(\d{2})\s*[～〜~-]\s*(\d{1,2})\s*[：:]\s*(\d{2})/);

    if (timeMatch1) {
      timeRange = {
        startHour: Number(timeMatch1[1]),
        startMin: Number(timeMatch1[2] || 0),
        endHour: Number(timeMatch1[3]),
        endMin: Number(timeMatch1[4] || 0),
      };
      title = afterDate.replace(timeMatch1[0], "").trim();
    } else if (timeMatch3) {
      timeRange = {
        startHour: Number(timeMatch3[1]),
        startMin: Number(timeMatch3[2] || 0),
        endHour: Number(timeMatch3[3]) + 12,
        endMin: Number(timeMatch3[4] || 0),
      };
      title = afterDate.replace(timeMatch3[0], "").trim();
    } else if (timeMatch2) {
      timeRange = {
        startHour: Number(timeMatch2[1]) + 12,
        startMin: Number(timeMatch2[2] || 0),
        endHour: Number(timeMatch2[3]) + 12,
        endMin: Number(timeMatch2[4] || 0),
      };
      title = afterDate.replace(timeMatch2[0], "").trim();
    } else if (timeMatch4) {
      timeRange = {
        startHour: Number(timeMatch4[1]),
        startMin: Number(timeMatch4[2]),
        endHour: Number(timeMatch4[3]),
        endMin: Number(timeMatch4[4]),
      };
      title = afterDate.replace(timeMatch4[0], "").trim();
    }

    // タイトル整形
    title = title.replace(/[（(].*?[）)]/g, "").trim();
    if (!title) continue;
    // 一般的な枠のみスキップ
    if (/^(?:自由来館|自由利用|開放日|開館)$/.test(title)) continue;

    events.push({ y: year, mo: month, d: day, title, timeRange });
  }

  return events;
}

/**
 * HTMLからPDFリンクを抽出（「児童館だより」「行事案内」等のテキストを含むリンク）
 */
function extractPdfLinks(html, pageUrl) {
  const nHtml = html.normalize("NFKC");
  const links = [];

  // href="...pdf" のパターン
  const aRe = /<a[^>]+href="([^"]*\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let am;
  while ((am = aRe.exec(nHtml)) !== null) {
    const href = am[1];
    const linkText = stripTags(am[2]).trim();
    // 児童館だより or 行事案内 or 月号を含むリンク
    if (/児童館だより|行事案内|月号|おたより/.test(linkText) || /\/data\/doc\//.test(href)) {
      try {
        const absUrl = new URL(href, pageUrl).href;
        if (!links.includes(absUrl)) links.push(absUrl);
      } catch {}
    }
  }

  return links;
}

/**
 * Factory: 土浦市児童館コレクター
 */
function createCollectTsuchiuraJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = TSUCHIURA_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectTsuchiuraJidokanEvents(maxDays) {
    const byId = new Map();

    for (const facility of FACILITIES) {
      const pageUrl = `${BASE}${facility.pagePath}`;
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch (e) {
        console.warn(`[${label}] ${facility.name} page fetch failed: ${e.message}`);
        continue;
      }
      if (!html) continue;

      // PDFリンクを抽出
      const pdfUrls = extractPdfLinks(html, pageUrl);
      if (pdfUrls.length === 0) {
        console.warn(`[${label}] ${facility.name}: no PDF links found`);
        continue;
      }

      // 施設のジオコーディング（施設単位で1回）
      const geoCandidates = [];
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(srcKey, facility.name);
        if (fmAddr) {
          geoCandidates.push(/[都道府県]/.test(fmAddr) ? fmAddr : `茨城県${fmAddr}`);
        }
      }
      geoCandidates.push(`茨城県${label} ${facility.name}`);

      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, facility.name, point, `${label} ${facility.name}`);
      const address = resolveEventAddress(source, facility.name, "", point);

      // 最新2つのPDFを処理
      for (const pdfUrl of pdfUrls.slice(0, 2)) {
        let markdown;
        try {
          markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
        } catch (e) {
          console.warn(`[${label}] ${facility.name} PDF fetch failed: ${e.message}`);
          continue;
        }
        if (!markdown || markdown.length < 50) continue;

        // ファイル名から年月のフォールバック推定
        let fallbackYm = null;
        const fnMatch = pdfUrl.match(/(\d{4})[\-_]?(\d{1,2})/);
        if (fnMatch) {
          fallbackYm = { year: Number(fnMatch[1]), month: Number(fnMatch[2]) };
        }

        const events = parseTsuchiuraPdfEvents(markdown, fallbackYm);

        for (const ev of events) {
          if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
          const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
          const id = `${srcKey}:${facility.id}:${ev.title}:${dateKey}`;
          if (byId.has(id)) continue;

          const { startsAt, endsAt } = buildStartsEndsForDate(
            { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
          );

          byId.set(id, {
            id,
            source: srcKey,
            source_label: label,
            title: `${ev.title}（${facility.name}）`,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: facility.name,
            address: address || "",
            url: pageUrl,
            lat: point ? point.lat : source.center.lat,
            lng: point ? point.lng : source.center.lng,
          });
        }
      }
    }

    console.log(`[${label}] ${byId.size} events collected (児童館 PDF)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectTsuchiuraJidokanEvents };

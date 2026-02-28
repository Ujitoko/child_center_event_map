/**
 * 常総市 水海道子育て支援センター スケジュールコレクター
 *
 * 支援センター一覧ページから最新の行事スケジュールリンクを発見し、
 * テーブル形式の月間スケジュールからイベントを抽出する。
 *
 * HTML構造:
 * - <table> 行: <th>M月D日</th><td>曜日</td><td>活動内容</td>
 * - 「自由開放」以外の活動名を抽出
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { JOSO_SOURCE } = require("../../config/wards");

const BASE = JOSO_SOURCE.baseUrl;
const INDEX_PATH = "/kurashi_gyousei/kurashi/kosodate_hoiku/kosodate_shisetsu/childcare_support_centr/";

const FACILITY_NAME = "水海道子育て支援センター";

/** スキップ対象 */
const SKIP_RE = /^(?:自由開放|休館|お休み|閉館|祝日|休み)$/;

/**
 * 一覧ページから最新行事スケジュールリンクを取得
 */
function findScheduleLinks(html, pageUrl) {
  const nHtml = html.normalize("NFKC");
  const links = [];
  const aRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(nHtml)) !== null) {
    const text = stripTags(m[2]).normalize("NFKC").trim();
    // 「行事」「スケジュール」を含むリンクを対象
    if (/行事|スケジュール|予定/.test(text)) {
      try {
        const absUrl = new URL(m[1], pageUrl).href;
        if (!links.includes(absUrl)) links.push(absUrl);
      } catch {}
    }
  }
  return links;
}

/**
 * テーブルベースのスケジュールHTMLからイベントを抽出
 */
function parseSchedulePage(html) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  // 年を推定（ページ内の「令和N年」or「20XX年」）
  let year;
  const reiwaMatch = nHtml.match(/令和\s*(\d{1,2})\s*年/);
  if (reiwaMatch) {
    year = 2018 + Number(reiwaMatch[1]);
  } else {
    const westernMatch = nHtml.match(/(20\d{2})\s*年/);
    if (westernMatch) {
      year = Number(westernMatch[1]);
    } else {
      const now = new Date();
      const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      year = jst.getUTCFullYear();
    }
  }

  // <tr>ごとに処理してテーブル行を解析
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tm;
  while ((tm = trRe.exec(nHtml)) !== null) {
    const row = tm[1];

    // <th>/<td>セルを抽出（日付が<th>に入っているパターンに対応）
    const cellRe = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const cells = [];
    let cm;
    while ((cm = cellRe.exec(row)) !== null) {
      cells.push(stripTags(cm[1]).normalize("NFKC").trim());
    }
    if (cells.length < 2) continue;

    // 最初のセルから日付を抽出: "M月D日"
    const dateMatch = cells[0].match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (!dateMatch) continue;
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    // 2番目以降のセルから活動内容を抽出
    const contentText = cells.slice(1).join(" ").trim();
    if (!contentText) continue;

    // 午前/午後のブロックを分割
    const blocks = contentText.split(/(?:午前|午後)\s*[：:]/);

    for (const block of blocks) {
      const cleaned = block.trim();
      if (!cleaned) continue;

      // 「」内のイベント名を抽出
      const bracketRe = /「([^」]+)」/g;
      let bm;
      const foundTitles = [];
      while ((bm = bracketRe.exec(cleaned)) !== null) {
        foundTitles.push(bm[1].trim());
      }

      if (foundTitles.length > 0) {
        for (const title of foundTitles) {
          if (SKIP_RE.test(title)) continue;
          const timeRange = parseTimeRangeFromText(cleaned);
          events.push({ y: year, mo: month, d: day, title, timeRange });
        }
      } else {
        // 「」がない場合、テキスト全体をタイトルにする（自由開放除外）
        const plainTitle = cleaned
          .replace(/\d{1,2}時\d{0,2}分?[～〜~-]?/g, "")
          .replace(/[（(][^）)]*[）)]/g, "")
          .trim();
        if (!plainTitle || SKIP_RE.test(plainTitle)) continue;
        // 自由開放を含む行をスキップ
        if (/自由開放/.test(cleaned)) continue;
        const timeRange = parseTimeRangeFromText(cleaned);
        events.push({ y: year, mo: month, d: day, title: plainTitle, timeRange });
      }
    }
  }

  return events;
}

/**
 * Factory: 常総市子育て支援センターコレクター
 */
function createCollectJosoKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = JOSO_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectJosoKosodateEvents(maxDays) {
    const byId = new Map();

    // 一覧ページから行事リンクを取得
    const indexUrl = `${BASE}${INDEX_PATH}`;
    let indexHtml;
    try {
      indexHtml = await fetchText(indexUrl);
    } catch (e) {
      console.warn(`[${label}] index page fetch failed: ${e.message}`);
      return [];
    }
    if (!indexHtml) return [];

    const scheduleUrls = findScheduleLinks(indexHtml, indexUrl);
    if (scheduleUrls.length === 0) {
      console.warn(`[${label}] no schedule links found`);
      return [];
    }

    // 施設のジオコーディング
    const geoCandidates = [];
    if (getFacilityAddressFromMaster) {
      const fmAddr = getFacilityAddressFromMaster(srcKey, FACILITY_NAME);
      if (fmAddr) {
        geoCandidates.push(/[都道府県]/.test(fmAddr) ? fmAddr : `茨城県${fmAddr}`);
      }
    }
    geoCandidates.push(`茨城県${label} ${FACILITY_NAME}`);

    let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
    point = resolveEventPoint(source, FACILITY_NAME, point, `${label} ${FACILITY_NAME}`);
    const address = resolveEventAddress(source, FACILITY_NAME, "", point);

    // 最新2つのスケジュールページを処理
    for (const schedUrl of scheduleUrls.slice(0, 2)) {
      let html;
      try {
        html = await fetchText(schedUrl);
      } catch (e) {
        console.warn(`[${label}] schedule fetch failed: ${e.message}`);
        continue;
      }
      if (!html) continue;

      const events = parseSchedulePage(html);

      for (const ev of events) {
        if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
        const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
        const id = `${srcKey}:joso_kosodate:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
        );

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: `${ev.title}（${FACILITY_NAME}）`,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: FACILITY_NAME,
          address: address || "",
          url: schedUrl,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    console.log(`[${label}] ${byId.size} events collected (子育て支援センター)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectJosoKosodateEvents };

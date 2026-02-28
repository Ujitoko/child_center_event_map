/**
 * 結城市 月別子育てイベント情報コレクター
 *
 * /kosodate-kyouiku/kosodate/ 配下の「N月の子育てイベント情報」ページから
 * イベントを抽出する。
 *
 * HTML構造:
 * - <h2>イベント名</h2>
 * - <h3>日時</h3><p>M月D日（曜日）時刻</p>
 * - <h3>場所</h3><p>施設名（住所）</p>
 */
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { YUKI_SOURCE } = require("../../config/wards");

const BASE = YUKI_SOURCE.baseUrl;
const INDEX_PATH = "/kosodate-kyouiku/kosodate/";

/**
 * 一覧ページから「N月の子育てイベント情報」リンクを取得
 */
function findEventPageLinks(html, pageUrl) {
  const nHtml = html.normalize("NFKC");
  const links = [];
  const aRe = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(nHtml)) !== null) {
    const text = stripTags(m[2]).normalize("NFKC").trim();
    if (/\d{1,2}月の子育てイベント/.test(text)) {
      try {
        const absUrl = new URL(m[1], pageUrl).href;
        if (!links.includes(absUrl)) links.push(absUrl);
      } catch {}
    }
  }
  return links;
}

/**
 * イベント詳細ページからイベントを抽出
 * h2=タイトル → h3="日時" → p=日時テキスト → h3="場所" → p=場所テキスト
 */
function parseEventPage(html) {
  const events = [];
  const nHtml = html.normalize("NFKC");

  // 年を推定: ページ内の令和N年は対象年齢の記述であることが多いため、
  // 現在年をデフォルトとし、「日時」フィールドに明示的な年がある場合のみ上書き
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const defaultYear = jst.getUTCFullYear();

  // h2でイベントブロックを分割
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2Positions = [];
  let hm;
  while ((hm = h2Re.exec(nHtml)) !== null) {
    const text = stripTags(hm[1]).normalize("NFKC").trim();
    if (!text) continue;
    // ナビゲーション等を除外
    if (text.length < 3 || /ページ|メニュー|トップ|ホーム|検索|目次|アンケート|お問い合わせ/.test(text)) continue;
    h2Positions.push({ title: text, startIndex: hm.index + hm[0].length });
  }

  for (let i = 0; i < h2Positions.length; i++) {
    const { title, startIndex } = h2Positions[i];
    const endIndex = h2Positions[i + 1] ? h2Positions[i + 1].startIndex : nHtml.length;
    const section = nHtml.slice(startIndex, endIndex);

    // h3 + p で「日時」「場所」を抽出
    let dateText = "";
    let venueText = "";

    const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    let h3m;
    while ((h3m = h3Re.exec(section)) !== null) {
      const h3Label = stripTags(h3m[1]).normalize("NFKC").trim();
      // h3直後の<p>を取得
      const afterH3 = section.slice(h3m.index + h3m[0].length);
      const pMatch = afterH3.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (!pMatch) continue;
      const pText = stripTags(pMatch[1]).normalize("NFKC").trim();

      if (/日時/.test(h3Label)) {
        dateText = pText;
      } else if (/場所|会場|集合/.test(h3Label)) {
        venueText = pText;
      }
    }

    if (!dateText) continue;

    // 日付パース: "M月D日（曜日）..."
    const dateMatch = dateText.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (!dateMatch) continue;
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    // 日時フィールド内に明示的な年がある場合はそれを使う
    let year = defaultYear;
    const yearInDate = dateText.match(/令和\s*(\d{1,2})\s*年/);
    if (yearInDate) {
      year = 2018 + Number(yearInDate[1]);
    } else {
      const westernYear = dateText.match(/(20\d{2})\s*年/);
      if (westernYear) year = Number(westernYear[1]);
    }

    const timeRange = parseTimeRangeFromText(dateText);

    events.push({
      y: year, mo: month, d: day,
      title,
      venue: venueText,
      timeRange,
    });
  }

  return events;
}

/**
 * Factory: 結城市子育てイベントコレクター
 */
function createCollectYukiKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = YUKI_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectYukiKosodateEvents(maxDays) {
    const byId = new Map();

    // 一覧ページからリンク取得
    const indexUrl = `${BASE}${INDEX_PATH}`;
    let indexHtml;
    try {
      indexHtml = await fetchText(indexUrl);
    } catch (e) {
      console.warn(`[${label}] index page fetch failed: ${e.message}`);
      return [];
    }
    if (!indexHtml) return [];

    const pageUrls = findEventPageLinks(indexHtml, indexUrl);
    if (pageUrls.length === 0) {
      console.warn(`[${label}] no event page links found`);
      return [];
    }

    // 最新2ページを処理
    for (const pageUrl of pageUrls.slice(0, 2)) {
      let html;
      try {
        html = await fetchText(pageUrl);
      } catch (e) {
        console.warn(`[${label}] event page fetch failed: ${e.message}`);
        continue;
      }
      if (!html) continue;

      const events = parseEventPage(html);

      for (const ev of events) {
        if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
        const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
        const id = `${srcKey}:yuki_kosodate:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: ev.y, mo: ev.mo, d: ev.d }, ev.timeRange
        );

        // ジオコーディング
        const venueName = ev.venue || `${label}`;
        const geoCandidates = [];
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(srcKey, venueName);
          if (fmAddr) {
            geoCandidates.push(/[都道府県]/.test(fmAddr) ? fmAddr : `茨城県${fmAddr}`);
          }
        }
        if (ev.venue) geoCandidates.push(`茨城県${label} ${ev.venue}`);
        geoCandidates.push(`茨城県${label}`);

        let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
        point = resolveEventPoint(source, venueName, point, `${label} ${venueName}`);
        const address = resolveEventAddress(source, venueName, "", point);

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venueName,
          address: address || "",
          url: pageUrl,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    console.log(`[${label}] ${byId.size} events collected (子育てイベント)`);
    return Array.from(byId.values());
  };
}

module.exports = { createCollectYukiKosodateEvents };

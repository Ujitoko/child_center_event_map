/**
 * 三郷市 今月の子育て情報コレクター
 *
 * https://www.city.misato.lg.jp/soshiki/kodomomirai/kodomoshien/4/1527.html
 * から子育てイベントを抽出する。
 *
 * HTML構造:
 * - <h3>施設名/イベント名</h3>
 * - <h4>イベント名</h4>
 * - <p><strong>【日時】</strong>M月D日 ...</p>
 * - <p><strong>【場所】</strong>施設名（住所）</p>
 */
const { fetchText } = require("../fetch-utils");
const { normalizeJaDigits } = require("../text-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { MISATO_SOURCE } = require("../../config/wards");

const PAGE_URL =
  "https://www.city.misato.lg.jp/soshiki/kodomomirai/kodomoshien/4/1527.html";

/** 非イベント見出しをスキップ */
const SKIP_HEADING_RE =
  /^(?:ページ|メニュー|トップ|ホーム|検索|目次|アンケート|お問い合わせ|問い合わせ|関連|リンク|注意|備考|もくじ|カレンダー|イベントなび)$/;

/** 見出しが短すぎるか空か判定 */
function isSkippableHeading(text) {
  if (!text || text.length < 2) return true;
  if (SKIP_HEADING_RE.test(text)) return true;
  // リンクのみの見出しをスキップ
  if (/^https?:\/\//.test(text)) return true;
  return false;
}

/**
 * ページHTMLからイベントブロックを抽出
 *
 * h3/h4の見出しを検出し、それぞれの直後にある<p>タグ群を
 * 【日時】【場所】等のフィールドマーカーで解析する。
 *
 * h3がイベントでない場合（施設名など）、配下のh4がイベントとなる。
 * h3がイベント（【日時】を持つ）場合はh3自体がイベント。
 */
function parseEventsFromHtml(html) {
  const events = [];
  const nHtml = normalizeJaDigits(html.normalize("NFKC"));

  // 現在年を推定
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const defaultYear = jst.getUTCFullYear();
  const currentMonth = jst.getUTCMonth() + 1;

  // h3/h4 見出し位置をすべて取得
  const headingRe = /<h([34])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [];
  let hm;
  while ((hm = headingRe.exec(nHtml)) !== null) {
    const level = Number(hm[1]);
    const rawTitle = stripTags(hm[2]).replace(/\s+/g, " ").trim();
    headings.push({
      level,
      title: rawTitle,
      endIndex: hm.index + hm[0].length,
      startIndex: hm.index,
    });
  }

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (isSkippableHeading(h.title)) continue;

    // 見出し直後～次の見出しまでのテキスト区間を取得
    const nextStart =
      headings[i + 1] ? headings[i + 1].startIndex : nHtml.length;
    const section = nHtml.slice(h.endIndex, nextStart);

    // <p>タグ内のテキストを結合
    const pTexts = [];
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let pm;
    while ((pm = pRe.exec(section)) !== null) {
      pTexts.push(stripTags(pm[1]).replace(/\s+/g, " ").trim());
    }
    const bodyText = pTexts.join("\n");

    // 【日時】がない見出しは施設名等のセクションヘッダ→スキップ
    if (!/【日時】/.test(bodyText)) continue;

    // フィールド抽出
    const fields = {};
    const allText = bodyText;
    const fieldRe = /【([^】]+)】/g;
    const fieldPositions = [];
    let fm;
    while ((fm = fieldRe.exec(allText)) !== null) {
      fieldPositions.push({
        label: fm[1],
        startContent: fm.index + fm[0].length,
      });
    }

    for (let fi = 0; fi < fieldPositions.length; fi++) {
      const fp = fieldPositions[fi];
      const endPos =
        fieldPositions[fi + 1]
          ? fieldPositions[fi + 1].startContent - fieldPositions[fi + 1].label.length - 2
          : allText.length;
      fields[fp.label] = allText.slice(fp.startContent, endPos).trim();
    }

    const dateText = fields["日時"] || "";
    const venueRaw = fields["場所"] || fields["会場"] || "";
    if (!dateText) continue;

    // タイトル
    const title = h.title;

    // 日付パース: "M月D日" パターン（複数日対応）
    const dateMatches = dateText.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/g);
    if (!dateMatches || dateMatches.length === 0) continue;

    // 時間パース
    const timeRange = parseTimeRangeFromText(dateText);

    // 場所パース: "施設名（住所）" or "施設名"
    let venueName = venueRaw;
    let venueAddress = "";
    const addrInParen = venueRaw.match(/[（(]([^）)]*(?:市|区|町|村|丁目|番)[^）)]*)[）)]/);
    if (addrInParen) {
      venueAddress = addrInParen[1].trim();
      venueName = venueRaw.replace(/[（(][^）)]*[）)]/, "").trim();
    }

    // 年推定: 日時フィールドに令和/西暦があればそれを使用
    let year = defaultYear;
    const reiwaInDate = dateText.match(/令和\s*(\d{1,2})\s*年/);
    if (reiwaInDate) {
      year = 2018 + Number(reiwaInDate[1]);
    } else {
      const westernYear = dateText.match(/(20\d{2})\s*年/);
      if (westernYear) year = Number(westernYear[1]);
    }

    // 各日付にイベントを生成
    const seenDates = new Set();
    for (const dm of dateMatches) {
      const parts = dm.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
      if (!parts) continue;
      const mo = Number(parts[1]);
      const d = Number(parts[2]);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) continue;

      const dateKey = `${mo}-${d}`;
      if (seenDates.has(dateKey)) continue;
      seenDates.add(dateKey);

      // 年推定: 現在月より大幅に前の月は翌年と推定
      let eventYear = year;
      if (mo < currentMonth - 2) {
        eventYear = year + 1;
      }

      events.push({
        y: eventYear,
        mo,
        d,
        title,
        venueName: venueName || "",
        venueAddress: venueAddress || "",
        timeRange,
      });
    }
  }

  return events;
}

/**
 * Factory: 三郷市子育て情報コレクター
 */
function createCollectMisatoKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const source = MISATO_SOURCE;
  const srcKey = source.key;
  const label = source.label;

  return async function collectMisatoKosodateEvents(maxDays) {
    let html;
    try {
      html = await fetchText(PAGE_URL);
    } catch (e) {
      console.warn(`[${label}/子育て情報] fetch failed: ${e.message}`);
      return [];
    }
    if (!html) return [];

    const rawEvents = parseEventsFromHtml(html);
    const byId = new Map();

    for (const ev of rawEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:misato_kosodate:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );

      // ジオコーディング
      const geoCandidates = [];
      if (ev.venueAddress) {
        // 住所が三郷市を含まない場合は付与
        const addr = /三郷市/.test(ev.venueAddress)
          ? `埼玉県${ev.venueAddress}`
          : `埼玉県三郷市${ev.venueAddress}`;
        geoCandidates.push(addr);
      }
      if (ev.venueName) {
        geoCandidates.push(`埼玉県三郷市 ${ev.venueName}`);
      }
      geoCandidates.push(`埼玉県三郷市`);

      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(
        source,
        ev.venueName || ev.title,
        point,
        `三郷市 ${ev.venueName || ev.title}`
      );
      const address = resolveEventAddress(
        source,
        ev.venueName || ev.title,
        ev.venueAddress || "",
        point
      );

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: ev.venueName || "",
        address: address || ev.venueAddress || "",
        url: PAGE_URL,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected (子育て情報)`);
    return results;
  };
}

module.exports = { createCollectMisatoKosodateEvents };

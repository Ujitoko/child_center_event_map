const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");
const { ICHIKAWA_SOURCE } = require("../../config/wards");

const MAX_PAGES = 5;

/**
 * 市川市イベントポータル (JSP) から子育てイベントを収集
 * カテゴリ ct=1 (こども・教育) でフィルタ済み
 */
function parseListPage(html, baseUrl) {
  const events = [];
  // event_wrapper ブロックを抽出
  // 各ブロックの後に <a href="event.jsp?id=NNN...">申込む</a> がある
  const blockRe = /<div class="event_wrapper clearfix">([\s\S]*?)(?=<div class="event_wrapper clearfix"|<div class="page_)/g;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    const block = bm[1];

    // タイトル
    const titleMatch = block.match(/<div class="event_title">\s*([\s\S]*?)\s*<\/div>/);
    if (!titleMatch) continue;
    const rawTitle = stripTags(titleMatch[1]).trim();
    if (!rawTitle) continue;

    // 開催期間 (日付)
    const dateMatch = block.match(/開催期間[\s\S]*?<div class="event_explain_exp">(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    const y = Number(dateMatch[1]);
    const mo = Number(dateMatch[2]);
    const d = Number(dateMatch[3]);

    // 開催場所
    const venueMatch = block.match(/開催場所[\s\S]*?<div class="event_explain_exp"><span>([\s\S]*?)<\/span>/);
    const venue = venueMatch ? stripTags(venueMatch[1]).trim() : "";

    // 詳細リンク (event.jsp?id=NNN)
    const linkMatch = block.match(/<a\s+href="(event\.jsp\?id=\d+[^"]*)"/);
    const url = linkMatch
      ? `${baseUrl}/portal/${linkMatch[1].replace(/&amp;/g, "&")}`
      : "";

    // タイトルから時間を抽出
    // 形式: "2月20日（金）②10:15～あかちゃん相談..."
    let title = rawTitle;
    const timeInTitle = rawTitle.match(/[①②③④⑤⑥⑦⑧⑨⑩]?\s*(\d{1,2}:\d{2})[～~ー\-]([^\s【]*)/);
    const timeRange = timeInTitle
      ? parseTimeRangeFromText(`${timeInTitle[1]}～${timeInTitle[2] || ""}`)
      : null;
    // タイトルから日付部分を除去
    title = title.replace(/^\d{1,2}月\d{1,2}日[（(][^）)]*[）)]\s*/, "");
    title = title.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, "");
    title = title.replace(/^\d{1,2}:\d{2}[～~ー\-]\s*/, "");
    title = title.trim();
    if (!title) title = rawTitle;

    // 【施設名】をvenueとして使用
    const bracketVenue = rawTitle.match(/【([^】]+)】/);
    const finalVenue = sanitizeVenueText(bracketVenue ? bracketVenue[1] : venue);

    events.push({ y, mo, d, title, url, venue: finalVenue, timeRange });
  }
  return events;
}

/**
 * 次ページの有無を判定
 */
function hasNextPage(html) {
  return /<span class='pageNext'/.test(html) || /class='pageNext'/.test(html);
}

function createCollectIchikawaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = ICHIKAWA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectIchikawaEvents(maxDays) {
    const rawEvents = [];

    // ページネーション対応 (POSTだがGETでもp=Nが効く)
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${source.baseUrl}/portal/category.jsp?ct=1&p=${page}`;
      try {
        const html = await fetchText(url);
        const pageEvents = parseListPage(html, source.baseUrl);
        if (pageEvents.length === 0) break;
        rawEvents.push(...pageEvents);
        if (!hasNextPage(html)) break;
      } catch (e) {
        console.warn(`[${label}] page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 重複除去 (title + date)
    const uniqueMap = new Map();
    for (const ev of rawEvents) {
      const dateKey = `${ev.y}-${String(ev.mo).padStart(2, "0")}-${String(ev.d).padStart(2, "0")}`;
      const key = `${ev.title}:${dateKey}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, { ...ev, dateKey });
    }
    const uniqueEvents = Array.from(uniqueMap.values());

    // イベントレコード生成
    const byId = new Map();
    for (const ev of uniqueEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      let venue = ev.venue;
      // 「保健センター・医療施設」等 → ・以降のカテゴリを切り捨て
      if (venue && /・/.test(venue)) venue = venue.split("・")[0].trim();
      // 非施設名パターンを除外
      if (venue && /^(令和\d+年|子育て支援|子育て相談|育児相談)/.test(venue)) venue = "";
      // 教室名・事業名は施設名ではないので除外
      if (venue && /教室|相談|講座|健診|セミナー|イベント/.test(venue)) venue = "";

      // venue空の場合、タイトルからfallback抽出
      if (!venue && ev.title) {
        // 1) 《施設名》ブラケットから抽出 (例: 《市川市保健センター》)
        const angleBracket = ev.title.match(/《([^》]+)》/);
        if (angleBracket) {
          let v = angleBracket[1].trim();
          // "市川市" prefix を除去してKNOWN_ICHIKAWAマッチしやすくする
          v = v.replace(/^市川市/, "");
          venue = sanitizeVenueText(v);
        }
        // 2) タイトルからこども館名を抽出 (例: "南八幡こども館 2月 あつまれ赤ちゃん")
        if (!venue) {
          const kodomokan = ev.title.match(/([\p{Script=Han}\p{Script=Hiragana}ー]+こども館)/u);
          if (kodomokan) venue = kodomokan[1];
        }
      }

      // ジオコーディング
      const candidates = [];
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr) {
          const full = /千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`;
          candidates.push(full);
        }
      }
      if (venue) {
        candidates.push(`千葉県${label} ${venue}`);
      }
      let point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(source, venue, `${label} ${venue}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        ev.timeRange
      );
      const dateKeyStr = ev.dateKey.replace(/-/g, "");
      const id = `${srcKey}:${ev.title}:${dateKeyStr}`;
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
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectIchikawaEvents };

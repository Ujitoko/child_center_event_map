const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");
const { ICHIKAWA_SOURCE } = require("../../config/wards");

const MAX_PAGES = 7;

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

/**
 * 市川市 ikuji365.net 子育てイベントコレクター
 * https://ichikawa.ikuji365.net/event/
 * 全イベントが子育て関連のためキーワードフィルタ不要
 */
const IKUJI365_BASE = "https://ichikawa.ikuji365.net";
const IKUJI365_LIMIT = 20;
const IKUJI365_MAX_PAGES = 8; // 最大160件

function parseIkujiListPage(html) {
  const items = [];
  // リスト内の各イベントリンクを抽出
  // <a class="p-notice__listLink" href="https://ichikawa.ikuji365.net/G0000121/system/event/10804.html">
  //   <div class="p-notice__listHeading">Title</div>
  //   <p class="p-notice__listSummary">開催日：2026年03月07日（土）...</p>
  // </a>
  const linkRe = /<a\s+[^>]*href="(https?:\/\/ichikawa\.ikuji365\.net\/[^"]+\/system\/event\/\d+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const inner = m[2];
    // タイトル: p-notice__listHeading div or h3
    const headingMatch = inner.match(/<div\s+class="p-notice__listHeading">([\s\S]*?)<\/div>/) ||
                         inner.match(/<h3>([\s\S]*?)<\/h3>/);
    const title = headingMatch ? stripTags(headingMatch[1]).trim() : "";
    if (!title) continue;
    // 開催日 (リスト上の日付)
    const dateMatch = inner.match(/開催日[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (!dateMatch) continue;
    items.push({
      url: href,
      title,
      y: Number(dateMatch[1]),
      mo: Number(dateMatch[2]),
      d: Number(dateMatch[3]),
    });
  }
  return items;
}

function parseIkujiDetailPage(html) {
  const text = stripTags(html);
  const result = { venue: "", address: "", timeRange: null };
  // 開催場所
  const venueMatch = text.match(/開催場所\s*[:：]?\s*(.+?)(?:\n|開催時間|郵便番号|住所|対象)/);
  if (venueMatch) result.venue = venueMatch[1].trim();
  // 住所
  const addrMatch = text.match(/住所\s*[:：]?\s*(.+?)(?:\n|対象|費用|問い合わせ|授乳)/);
  if (addrMatch) result.address = addrMatch[1].trim();
  // 開催時間
  const timeMatch = text.match(/開催時間\s*[:：]?\s*(\d{1,2}:\d{2})\s*[～~ー\-]\s*(\d{1,2}:\d{2})/);
  if (timeMatch) {
    result.timeRange = {
      startH: Number(timeMatch[1].split(":")[0]),
      startM: Number(timeMatch[1].split(":")[1]),
      endH: Number(timeMatch[2].split(":")[0]),
      endM: Number(timeMatch[2].split(":")[1]),
    };
  }
  return result;
}

function createCollectIchikawaIkujiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;
  const source = ICHIKAWA_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = `${source.label}ikuji365`;

  return async function collectIchikawaIkujiEvents(maxDays) {
    // ページネーションでリスト取得
    const allItems = [];
    for (let page = 0; page < IKUJI365_MAX_PAGES; page++) {
      const offset = page * IKUJI365_LIMIT;
      const url = `${IKUJI365_BASE}/event/?offset=${offset}&limit=${IKUJI365_LIMIT}&_filter=event`;
      try {
        const html = await fetchText(url);
        const items = parseIkujiListPage(html);
        if (items.length === 0) break;
        allItems.push(...items);
      } catch (e) {
        console.warn(`[${label}] page ${page} fetch failed:`, e.message || e);
        break;
      }
    }

    // 重複除去 & 日付フィルタ
    const uniqueMap = new Map();
    for (const item of allItems) {
      if (!inRangeJst(item.y, item.mo, item.d, maxDays)) continue;
      const key = `${item.url}:${item.y}-${item.mo}-${item.d}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    }
    const filtered = Array.from(uniqueMap.values());

    // 詳細ページをバッチ取得 (会場・住所・時間)
    const BATCH = 6;
    const byId = new Map();
    for (let i = 0; i < filtered.length; i += BATCH) {
      const batch = filtered.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          let detail = { venue: "", address: "", timeRange: null };
          try {
            const html = await fetchText(item.url);
            detail = parseIkujiDetailPage(html);
          } catch (_e) { /* use fallback */ }
          return { ...item, ...detail };
        })
      );
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        const ev = r.value;
        const venue = sanitizeVenueText(ev.venue || "");
        const rawAddress = ev.address || "";

        // ジオコーディング
        const candidates = [];
        if (getFacilityAddressFromMaster && venue) {
          const fmAddr = getFacilityAddressFromMaster(source.key, venue);
          if (fmAddr) {
            candidates.push(/千葉県/.test(fmAddr) ? fmAddr : `千葉県${fmAddr}`);
          }
        }
        if (rawAddress && rawAddress.includes("市川市")) {
          candidates.push(/千葉県/.test(rawAddress) ? rawAddress : `千葉県${rawAddress}`);
        }
        if (venue) {
          candidates.push(`千葉県市川市 ${venue}`);
        }
        let point = await geocodeForWard(candidates.slice(0, 5), source);
        point = resolveEventPoint(source, venue, point, rawAddress || `市川市 ${venue}`);
        const address = resolveEventAddress(source, venue, rawAddress || `市川市 ${venue}`, point);

        const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: ev.y, mo: ev.mo, d: ev.d },
          ev.timeRange
        );
        const id = `${srcKey}:ikuji:${ev.url}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: source.label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: address || "",
          url: ev.url,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectIchikawaEvents, createCollectIchikawaIkujiEvents };

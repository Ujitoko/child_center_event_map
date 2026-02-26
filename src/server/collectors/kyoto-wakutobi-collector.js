/**
 * 京都わくわくのトビラ（wakutobi）イベントコレクター
 * https://wakutobi.city.kyoto.lg.jp/event/search/
 *
 * 京都市の子育てイベントポータル。CakePHP ベースの HTML を
 * リスト→詳細の2段階でスクレイピングし、日時・場所を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE_URL = "https://wakutobi.city.kyoto.lg.jp";
const SEARCH_URL = `${BASE_URL}/event/search/`;
const DETAIL_BATCH = 8;

/** リストページからイベントカードを抽出 */
function parseListPage(html) {
  const events = [];
  // <div class="each"><a href="/event/detail/12345">
  const cardRe = /<div\s+class="each">\s*<a\s+href="(\/event\/detail\/\d+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const href = m[1];
    const inner = m[2];
    const titleMatch = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : "";
    const dateMatch = inner.match(/<span\s+class="date_from">([\s\S]*?)<\/span>/i);
    const dateText = dateMatch ? stripTags(dateMatch[1]).trim() : "";
    if (title && href) {
      events.push({ href: `${BASE_URL}${href}`, title, dateText });
    }
  }
  return events;
}

/** ページネーションの最大ページ数を取得 */
function getMaxPage(html) {
  const pageNums = [];
  const re = /\/event\/search\/page:(\d+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    pageNums.push(Number(m[1]));
  }
  return pageNums.length > 0 ? Math.max(...pageNums) : 1;
}

/** 詳細ページの evSrchTbl テーブルから key→value マップを抽出 */
function parseDetailTable(html) {
  const meta = {};
  if (!html) return meta;
  const rowRe = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 日時テキストから年月日を抽出 */
function parseDateFromText(text) {
  if (!text) return null;
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

/** 場所テキストから施設名と住所を分離 */
function parseVenueAddress(raw) {
  if (!raw) return { venue: "", address: "" };
  let text = raw.replace(/\s+/g, " ").trim();

  // 京都市xxx区xxx のパターンで住所部分を分離
  const addrMatch = text.match(/(京都[市府][\p{Script=Han}]+区[\p{Script=Han}\d\-ー－番地号丁目の]+)/u);
  let address = "";
  let venue = text;

  if (addrMatch) {
    address = addrMatch[1];
    // 住所部分をvenueから除去
    venue = text.replace(addrMatch[0], "").trim();
  }

  // 括弧内の住所を抽出
  if (!address) {
    const parenMatch = text.match(/[（(]([^）)]*京都[^）)]*)[）)]/);
    if (parenMatch) {
      address = parenMatch[1];
      venue = text.replace(parenMatch[0], "").trim();
    }
  }

  return {
    venue: sanitizeVenueText(venue),
    address: sanitizeAddressText(address),
  };
}

function buildGeoCandidates(venue, address) {
  const pref = "京都府";
  const candidates = [];
  if (address) {
    const full = address.includes("京都") ? address : `${pref}${address}`;
    candidates.push(full);
  }
  if (venue) {
    candidates.push(`${pref}京都市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createKyotoWakutobiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKyotoWakutobiEvents(maxDays) {
    // Step 1: リストページを取得してイベントURLを収集
    let allCards = [];
    try {
      const page1Html = await fetchText(SEARCH_URL);
      if (!page1Html) return [];
      const maxPage = getMaxPage(page1Html);
      allCards = parseListPage(page1Html);

      // 追加ページを取得 (最大5ページ)
      const pagesToFetch = Math.min(maxPage, 5);
      for (let p = 2; p <= pagesToFetch; p++) {
        try {
          const html = await fetchText(`${SEARCH_URL}page:${p}`);
          if (html) allCards.push(...parseListPage(html));
        } catch (_e) { /* skip page errors */ }
      }
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }

    if (allCards.length === 0) return [];

    // Step 2: 日付でプレフィルター (リストの dateText から)
    const cardsInRange = allCards.filter((c) => {
      const d = parseDateFromText(c.dateText);
      return d && inRangeJst(d.y, d.mo, d.d, maxDays);
    });

    // Step 3: 詳細ページをバッチ取得
    const detailMap = new Map();
    const urls = [...new Set(cardsInRange.map((c) => c.href))].slice(0, 100);

    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailTable(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value.meta);
        }
      }
    }

    // Step 4: イベントレコード生成
    const byId = new Map();

    for (const card of cardsInRange) {
      const d = parseDateFromText(card.dateText);
      if (!d || !inRangeJst(d.y, d.mo, d.d, maxDays)) continue;

      const detail = detailMap.get(card.href) || {};

      // 場所
      const placeText = detail["場所"] || "";
      const { venue, address } = parseVenueAddress(placeText);

      // 時間
      const timeText = detail["日時"] || card.dateText || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // ジオコーディング
      const geoCandidates = buildGeoCandidates(venue, address);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `京都市 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `京都市 ${venue}`, point);

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange);
      const id = `${srcKey}:${card.href}:${card.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: card.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue,
        address: resolvedAddress || "",
        url: card.href,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKyotoWakutobiCollector };

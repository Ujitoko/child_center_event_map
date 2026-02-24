/**
 * ふく育（福井県子育て応援サイト）コレクター
 * https://www.fuku-iku.jp/event.php
 *
 * イベント一覧を1ページで取得し、詳細ページの th/td テーブルから
 * 開催日・時間・場所・住所を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const LIST_URL = "https://www.fuku-iku.jp/event.php";
const DETAIL_BATCH = 5;

/** リストページからイベントカード URL を抽出 */
function parseListPage(html) {
  const events = [];
  // <a href="https://www.fuku-iku.jp/event/q00XXXX.html" class="item_card">
  const re = /<a\s+href="(https:\/\/www\.fuku-iku\.jp\/event\/q\d+\.html)"[^>]*class="item_card"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const inner = m[2];
    const titleMatch = inner.match(/<p\s+class="title">([\s\S]*?)<\/p>/i);
    const title = titleMatch ? stripTags(titleMatch[1]).trim() : "";
    const dateMatch = inner.match(/<p\s+class="date">([\s\S]*?)<\/p>/i);
    const dateText = dateMatch ? stripTags(dateMatch[1]).trim() : "";
    if (title && url) events.push({ url, title, dateText });
  }
  // URL で重複除去
  const seen = new Set();
  return events.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

/** 詳細ページの th/td テーブルを解析 */
function parseDetailTable(html) {
  const meta = {};
  if (!html) return meta;
  const rowRe = /<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 日付テキストから年月日を抽出 */
function parseDateFromText(text) {
  if (!text) return null;
  // "2026/01/31" or "2026.02.28" pattern
  const m = text.match(/(\d{4})[\/.](\d{1,2})[\/.](\d{1,2})/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  // "2026年3月1日" pattern
  const m2 = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m2) return { y: Number(m2[1]), mo: Number(m2[2]), d: Number(m2[3]) };
  return null;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("福井") ? address : `福井県${address}`;
    candidates.push(full);
  }
  if (venue) {
    candidates.push(`福井県 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createFukuikuCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectFukuikuEvents(maxDays) {
    // Step 1: リストページを取得 (全月分が1ページに含まれる)
    let cards = [];
    try {
      const html = await fetchText(LIST_URL);
      if (!html) return [];
      cards = parseListPage(html);
    } catch (e) {
      console.warn(`[${label}] list fetch failed:`, e.message || e);
      return [];
    }

    if (cards.length === 0) return [];

    // Step 2: 詳細ページをバッチ取得
    const detailMap = new Map();
    const urls = cards.map((c) => c.url).slice(0, 50);

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

    // Step 3: イベントレコード生成
    const byId = new Map();

    for (const card of cards) {
      const meta = detailMap.get(card.url) || {};

      // 日付: 詳細ページの開催日を優先、なければリストの dateText
      const dateText = meta["開催日"] || card.dateText || "";
      const d = parseDateFromText(dateText);
      if (!d || !inRangeJst(d.y, d.mo, d.d, maxDays)) continue;

      // 場所
      const venue = sanitizeVenueText(meta["開催場所"] || "");
      const address = sanitizeAddressText(meta["住所"] || "");

      // 時間
      const timeText = meta["時間"] || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // ジオコーディング
      const geoCandidates = buildGeoCandidates(venue, address);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `福井県 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `福井県 ${venue}`, point);

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange);
      const id = `${srcKey}:${card.url}:${card.title}:${dateKey}`;

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
        url: card.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createFukuikuCollector };

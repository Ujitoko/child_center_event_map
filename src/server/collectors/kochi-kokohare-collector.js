/**
 * ココハレ（高知の子育て応援WEBメディア）コレクター
 * https://kokoharekochi.com/play/
 *
 * WordPress カスタム投稿タイプ "play" のリストページをスクレイプし、
 * 詳細ページの施設テーブルから開催日・時間・場所・住所を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://kokoharekochi.com";
const DETAIL_BATCH = 5;
const MAX_LIST_PAGES = 10;

/** リストページからイベントカード情報を抽出 */
function parseListPage(html) {
  const events = [];
  const itemRe = /<li class="c-entries__item">([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRe.exec(html)) !== null) {
    const item = m[1];
    const hrefM = item.match(/href="([^"]+)"/);
    const titleM = item.match(/class="c-entries__item--ttl"[^>]*>([\s\S]*?)<\//);
    const dateM = item.match(/class="c-entries__item--date[^"]*"[^>]*>([\s\S]*?)<\//);

    const url = hrefM ? hrefM[1] : "";
    const title = titleM ? stripTags(titleM[1]).trim() : "";
    const dateText = dateM ? stripTags(dateM[1]).trim() : "";

    if (title && url) {
      events.push({ url, title, dateText });
    }
  }
  return events;
}

/** 詳細ページの施設テーブルから key→value マップを抽出 */
function parseDetailTable(html) {
  const meta = {};
  if (!html) return meta;
  const tableM = html.match(/<table class="c-entry__facility--table">([\s\S]*?)<\/table>/i);
  if (!tableM) return meta;
  const rowRe = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(tableM[1])) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 開催日テキストから年月日を抽出 (複数日対応) */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];

  // "2026 年 3 月 20 日" or "2026年3月20日" パターン
  const fullRe = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  let m;
  while ((m = fullRe.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }

  if (dates.length > 0) return dates;

  // 年なしパターン "3月20日"
  const now = new Date();
  const jstYear = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now));
  const jstMonth = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", month: "numeric" }).format(now));

  const shortRe = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/g;
  while ((m = shortRe.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = (mo < jstMonth - 1) ? jstYear + 1 : jstYear;
    dates.push({ y, mo, d });
  }

  return dates;
}

/** リストのdateTextから日付抽出（"開催期間：2026 年 3 月 20 日～21 日"等） */
function parseDatesFromListDateText(text) {
  if (!text) return [];
  // "開催期間：" prefix を除去
  const cleaned = text.replace(/^開催期間[：:]?\s*/, "");
  return parseDatesFromText(cleaned);
}

/** 場所テキストから施設名と住所を分離 */
function parseVenueAddress(placeText) {
  if (!placeText) return { venue: "", address: "" };

  // "施設名（高知県○○市○○町X-X-X）" パターン
  const parenM = placeText.match(/^(.+?)[（(](高知県[^）)]+)[）)]/);
  if (parenM) {
    return {
      venue: sanitizeVenueText(parenM[1]),
      address: sanitizeAddressText(parenM[2]),
    };
  }

  // 住所が直接含まれるケース
  const addrM = placeText.match(/(高知県[\p{Script=Han}\d\-ー－番地号丁目の]+)/u);
  if (addrM) {
    const addr = addrM[1];
    const venue = placeText.replace(addr, "").replace(/[（()）]/g, "").trim();
    return {
      venue: sanitizeVenueText(venue),
      address: sanitizeAddressText(addr),
    };
  }

  return {
    venue: sanitizeVenueText(placeText),
    address: "",
  };
}

function buildGeoCandidates(venue, address) {
  const pref = "高知県";
  const candidates = [];
  if (address) {
    const full = address.includes("高知") ? address : `${pref}${address}`;
    candidates.push(full);
  }
  if (venue) {
    candidates.push(`${pref} ${venue}`);
  }
  return [...new Set(candidates)];
}

function createKochiKokohareCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKochiKokohareEvents(maxDays) {
    // Step 1: リストページをスクレイプ (最新から数ページ)
    const allCards = new Map(); // url → card

    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      try {
        const url = page === 1
          ? `${SITE_BASE}/play/`
          : `${SITE_BASE}/play/page/${page}/`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;

        let allPast = true;
        for (const card of cards) {
          if (!allCards.has(card.url)) {
            allCards.set(card.url, card);
          }
          // リストの日付で範囲チェック (大まかなフィルタ)
          const listDates = parseDatesFromListDateText(card.dateText);
          for (const d of listDates) {
            if (inRangeJst(d.y, d.mo, d.d, maxDays)) {
              allPast = false;
            }
          }
        }
        // 全部過去のイベントなら以降のページは不要
        if (allPast && page > 2) break;
      } catch (_e) { break; }
    }

    if (allCards.size === 0) return [];

    // Step 2: 詳細ページをバッチ取得
    const entries = Array.from(allCards.values()).slice(0, 80);
    const detailMap = new Map();

    for (let i = 0; i < entries.length; i += DETAIL_BATCH) {
      const batch = entries.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (e) => {
          const html = await fetchText(e.url);
          return { url: e.url, meta: parseDetailTable(html) };
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

    for (const [url, card] of allCards) {
      const meta = detailMap.get(url) || {};

      // 日付: 詳細ページの開催日を優先
      const dateText = meta["開催日"] || card.dateText || "";
      const dates = parseDatesFromText(dateText);
      if (dates.length === 0) continue;

      // 場所
      const placeText = meta["場所"] || "";
      const { venue, address } = parseVenueAddress(placeText);

      // 時間
      const timeText = meta["時間"] || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // ジオコーディング
      const geoCandidates = buildGeoCandidates(venue, address);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `高知県 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `高知県 ${venue}`, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${url}:${card.title}:${dateKey}`;

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
          url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKochiKokohareCollector };

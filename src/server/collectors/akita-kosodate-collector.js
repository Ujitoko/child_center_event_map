/**
 * 秋田市子育て情報ポータル コレクター
 * https://www.kosodate-akita.com/event/
 *
 * カレンダーリストページからイベントURLを収集し、詳細ページの EventBody テーブルから
 * 開催日・場所・内容を抽出する。全イベントが子育て関連。
 */
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, getMonthsForRange, inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const SITE_BASE = "https://www.kosodate-akita.com/event";
const DETAIL_BATCH = 5;

const KNOWN_FACILITIES = {
  "秋田市保健センター": "秋田県秋田市八橋南一丁目8-3",
  "秋田市子ども広場": "秋田県秋田市大町二丁目3-27",
  "秋田市子ども未来センター": "秋田県秋田市東通仲町4-1",
  "中央市民サービスセンター": "秋田県秋田市山王一丁目1-1",
  "土崎図書館": "秋田県秋田市土崎港西三丁目2-34",
  "明徳館": "秋田県秋田市千秋明徳町4-4",
  "新屋図書館": "秋田県秋田市新屋大川町12-26",
  "河辺市民サービスセンター": "秋田県秋田市河辺和田字北条ケ崎30-1",
  "雄和市民サービスセンター": "秋田県秋田市雄和妙法字上大部48-1",
  "フォンテAKITA": "秋田県秋田市中通二丁目8-1",
  "アルヴェ": "秋田県秋田市東通仲町4-1",
  "遊学舎": "秋田県秋田市上北手荒巻字堺切24-2",
  "東部市民サービスセンター": "秋田県秋田市広面字鍋沼37",
  "西部市民サービスセンター": "秋田県秋田市新屋扇町13-34",
  "南部市民サービスセンター": "秋田県秋田市御野場一丁目5-1",
  "北部市民サービスセンター": "秋田県秋田市土崎港西三丁目2-34",
};

/** リストページからイベント eid リンクを抽出 */
function parseListPage(html) {
  const events = [];
  const re = /<a\s+href="event\.php\?eid=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const eid = m[1];
    const title = stripTags(m[2]).trim();
    if (title && eid) {
      events.push({ eid, title, url: `${SITE_BASE}/event.php?eid=${eid}` });
    }
  }
  // 重複除去 (同じeidが複数日に出現)
  const seen = new Set();
  return events.filter((e) => {
    if (seen.has(e.eid)) return false;
    seen.add(e.eid);
    return true;
  });
}

/** 詳細ページの EventBody テーブルから key→value マップを抽出 */
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

/** 開催日テキストから年月日を抽出 */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];
  // "2026年2月2日" パターン
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  // 範囲指定 "〜" の場合は最初の日付のみ (期間イベントの初日)
  if (dates.length >= 2) {
    // 開始日と終了日が同じ場合は1つだけ
    if (dates[0].y === dates[1].y && dates[0].mo === dates[1].mo && dates[0].d === dates[1].d) {
      return [dates[0]];
    }
    // 異なる場合は開始日のみ
    return [dates[0]];
  }
  return dates;
}

/** 施設名からKNOWN_FACILITIESの住所を検索 */
function lookupFacilityAddress(venue) {
  if (!venue) return "";
  for (const [name, addr] of Object.entries(KNOWN_FACILITIES)) {
    if (venue.includes(name)) return addr;
  }
  return "";
}

function buildGeoCandidates(venue, address) {
  const pref = "秋田県秋田市";
  const candidates = [];
  // KNOWN_FACILITIES から住所取得
  const facilityAddr = lookupFacilityAddress(venue);
  if (facilityAddr) candidates.push(facilityAddr);
  if (address) {
    const full = address.includes("秋田") ? address : `${pref} ${address}`;
    candidates.push(full);
  }
  if (venue) {
    candidates.push(`${pref} ${venue}`);
  }
  return [...new Set(candidates)];
}

function createAkitaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectAkitaKosodateEvents(maxDays) {
    // Step 1: カレンダーリストページから eid を収集
    const months = getMonthsForRange(maxDays);
    const allEids = new Map(); // eid → { eid, title, url }

    for (const { year, month } of months) {
      const ym = `${year}-${String(month).padStart(2, "0")}`;
      try {
        const html = await fetchText(`${SITE_BASE}/index.php?c=&ym=${ym}`);
        if (!html) continue;
        for (const e of parseListPage(html)) {
          if (!allEids.has(e.eid)) allEids.set(e.eid, e);
        }
      } catch (_e) { /* skip month errors */ }
    }

    if (allEids.size === 0) return [];

    // Step 2: 詳細ページをバッチ取得
    const detailMap = new Map();
    const eids = Array.from(allEids.values()).slice(0, 100);

    for (let i = 0; i < eids.length; i += DETAIL_BATCH) {
      const batch = eids.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (e) => {
          const html = await fetchText(e.url);
          return { eid: e.eid, meta: parseDetailTable(html), html };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.eid, r.value);
        }
      }
    }

    // Step 3: イベントレコード生成
    const byId = new Map();

    for (const [eid, entry] of allEids) {
      const detail = detailMap.get(eid);
      if (!detail) continue;
      const meta = detail.meta;

      const title = entry.title;

      // 開催日
      const dateText = meta["開催日"] || "";
      const dates = parseDatesFromText(dateText);
      if (dates.length === 0) continue;

      // 場所
      const rawVenue = meta["開催場所"] || "";
      const venue = sanitizeVenueText(rawVenue.replace(/\s*\d+階.*$/, "").replace(/[（(][^）)]*(?:秋田市役所|内)[^）)]*[）)]/g, ""));

      // 内容テキストから時間・住所を抽出
      const content = meta["イベント内容"] || "";
      const timeRange = parseTimeRangeFromText(content) || parseTimeRangeFromText(dateText);

      // 内容テキストから住所を抽出
      let address = "";
      const addrMatch = content.match(/秋田[市県][\p{Script=Han}\d\-ー－番地号丁目の]+/u);
      if (addrMatch) address = sanitizeAddressText(addrMatch[0]);

      // ジオコーディング
      const geoCandidates = buildGeoCandidates(venue, address);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `秋田市 ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `秋田市 ${venue}`, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${entry.url}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: resolvedAddress || "",
          url: entry.url,
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

module.exports = { createAkitaKosodateCollector };

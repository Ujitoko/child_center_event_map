/**
 * 子育て王国とっとりサイト WP REST API コレクター
 * https://www.kosodate-ohkoku-tottori.net/event/
 *
 * WP REST API で子育てイベントを取得し、content 内の TABLE_Honbun テーブルから
 * 開催日・時間・場所を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const API_BASE = "https://www.kosodate-ohkoku-tottori.net/event/wp-json/wp/v2/posts";

/** TABLE_Honbun テーブルから key→value マップを抽出 */
function parseHonbunTable(html) {
  const meta = {};
  if (!html) return meta;
  const rowRe = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) {
    const key = stripTags(m[1]).replace(/\s+/g, "").trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 場所フィールドから施設名と住所を分離 */
function parsePlace(raw) {
  if (!raw) return { venue: "", address: "" };
  let text = raw.replace(/\s+/g, " ").trim();
  // 括弧内の住所を抽出
  const parenMatch = text.match(/[（(]([^）)]{3,80})[）)]/);
  let address = "";
  if (parenMatch) {
    const inner = parenMatch[1];
    if (/[0-9０-９]+[-ー－][0-9０-９]+|[0-9０-９]+番地|[0-9０-９]+丁目|鳥取[市県]|米子市|倉吉市|境港市/.test(inner)) {
      address = inner;
    }
    text = text.replace(parenMatch[0], "").trim();
  }
  return { venue: sanitizeVenueText(text), address: sanitizeAddressText(address) };
}

/** タイトルから【市町村名】を抽出 */
function extractMunicipality(title) {
  const m = title.match(/【([^】]{2,10})】/);
  return m ? m[1] : "";
}

/** 開催日テキストから年月日を抽出 (複数日対応) */
function parseDatesFromText(text) {
  if (!text) return [];
  const dates = [];
  // "2026年3月15日" or "令和8年3月15日" patterns
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  if (dates.length > 0) return dates;

  // "3月15日" (year inferred from current)
  const now = parseYmdFromJst(new Date());
  const re2 = /(\d{1,2})月(\d{1,2})日/g;
  while ((m = re2.exec(text)) !== null) {
    const mo = Number(m[1]);
    const d = Number(m[2]);
    const y = (mo < now.m - 1) ? now.y + 1 : now.y;
    dates.push({ y, mo, d });
  }
  return dates;
}

/** 時間テキストから開始・終了時刻を抽出 */
function parseTimeFromText(text) {
  if (!text) return null;
  return parseTimeRangeFromText(text);
}

function buildGeoCandidates(venue, address, municipality) {
  const pref = "鳥取県";
  const candidates = [];
  if (address) {
    const full = address.includes(pref) ? address
      : address.includes(municipality) ? `${pref}${address}`
      : municipality ? `${pref}${municipality}${address}`
      : `${pref}${address}`;
    candidates.push(full);
  }
  if (venue && municipality) {
    candidates.push(`${pref}${municipality} ${venue}`);
  }
  if (venue) {
    candidates.push(`${pref} ${venue}`);
  }
  return [...new Set(candidates)];
}

function createTottoriKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectTottoriKosodateEvents(maxDays) {
    // WP REST API: 過去30日〜未来maxDays日のイベントを取得
    const now = new Date();
    const afterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1週間前から
    const afterStr = afterDate.toISOString();

    let posts = [];
    try {
      const url = `${API_BASE}?after=${afterStr}&per_page=100&_fields=id,title,content,link,date`;
      const jsonText = await fetchText(url);
      posts = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] WP API fetch failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(posts)) {
      console.warn(`[${label}] WP API response is not an array`);
      return [];
    }

    const byId = new Map();

    for (const post of posts) {
      const title = stripTags(post.title?.rendered || "").trim();
      if (!title) continue;

      const postUrl = post.link || "";
      const contentHtml = post.content?.rendered || "";
      const meta = parseHonbunTable(contentHtml);

      // 開催日を抽出
      const dateText = meta["開催日"] || meta["日時"] || meta["日にち"] || "";
      const dates = parseDatesFromText(dateText);

      // WP投稿日からもフォールバック (YYYY-MM-DDThh:mm:ss)
      if (dates.length === 0 && post.date) {
        const pd = post.date.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (pd) dates.push({ y: Number(pd[1]), mo: Number(pd[2]), d: Number(pd[3]) });
      }

      if (dates.length === 0) continue;

      // 時間
      const timeText = meta["時間"] || meta["時　間"] || meta["開催時間"] || "";
      const timeRange = parseTimeFromText(timeText);

      // 場所
      const placeText = meta["場所"] || meta["場　所"] || meta["会場"] || meta["開催場所"] || "";
      const { venue, address } = parsePlace(placeText);

      // 市町村 (タイトルの【】から)
      const municipality = extractMunicipality(title);

      // ジオコーディング
      const geoCandidates = buildGeoCandidates(venue, address, municipality);
      let point = await geocodeForWard(geoCandidates.slice(0, 5), source);
      point = resolveEventPoint(source, venue, point, address || `${municipality} ${venue}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `${municipality} ${venue}`, point);

      for (const dd of dates) {
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${postUrl}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: title.replace(/【[^】]*】\s*/, ""), // 【市町村】を除去
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: resolvedAddress || "",
          url: postUrl,
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

module.exports = { createTottoriKosodateCollector };

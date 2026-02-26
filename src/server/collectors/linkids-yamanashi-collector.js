/**
 * リンキッズやまなし イベントコレクター
 * https://linkids.net/event/
 *
 * 山梨県の子育て情報サイト (WordPress)。
 * WP REST API で「おでかけイベント」カテゴリ(ID:19)を取得。
 * タイトルから日付、本文から会場・住所を抽出。
 * ~80-100 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const API_URL = "https://linkids.net/wp-json/wp/v2/posts";
const CATEGORY_ID = 19; // おでかけイベント
const PER_PAGE = 100;
const MAX_PAGES = 3;

/**
 * 年推定: pubYear を基本に、結果が6ヶ月以上過去なら翌年を試す
 */
function inferYear(mo, d, pubYear) {
  const now = new Date();
  const candidate = new Date(pubYear, mo - 1, d);
  // 6ヶ月以上過去なら翌年の可能性
  if (now - candidate > 180 * 24 * 3600 * 1000) return pubYear + 1;
  return pubYear;
}

/**
 * タイトルから日付を抽出
 * パターン: "3/2(日）...", "4/26（土）～5/25(日）...", "3月2日(日)..."
 */
function parseDateFromTitle(title, pubYear) {
  const dates = [];
  if (!title) return dates;

  // パターン1: M/D～M/D (範囲)
  const rangeM = title.match(/(\d{1,2})[/／](\d{1,2})\s*[（(][^)）]*[)）]\s*[～~ー－-]\s*(\d{1,2})[/／](\d{1,2})/);
  if (rangeM) {
    const m1 = Number(rangeM[1]), d1 = Number(rangeM[2]);
    const m2 = Number(rangeM[3]), d2 = Number(rangeM[4]);
    const y = inferYear(m1, d1, pubYear);
    const start = new Date(y, m1 - 1, d1);
    const end = new Date(y, m2 - 1, d2);
    if (end < start) end.setFullYear(end.getFullYear() + 1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }
    return dates;
  }

  // パターン2: M/D・D (複数日)
  const multiM = title.match(/(\d{1,2})[/／](\d{1,2})\s*[（(][^)）]*[)）]\s*[・,]\s*(\d{1,2})/);
  if (multiM) {
    const mo = Number(multiM[1]);
    const y = inferYear(mo, Number(multiM[2]), pubYear);
    dates.push({ y, mo, d: Number(multiM[2]) });
    dates.push({ y, mo, d: Number(multiM[3]) });
    return dates;
  }

  // パターン3: M月D日
  const jpM = title.match(/(\d{1,2})月(\d{1,2})日/);
  if (jpM) {
    const mo = Number(jpM[1]), d = Number(jpM[2]);
    dates.push({ y: inferYear(mo, d, pubYear), mo, d });
    return dates;
  }

  // パターン4: M/D
  const slashM = title.match(/(\d{1,2})[/／](\d{1,2})/);
  if (slashM) {
    const mo = Number(slashM[1]), d = Number(slashM[2]);
    dates.push({ y: inferYear(mo, d, pubYear), mo, d });
    return dates;
  }

  return dates;
}

/**
 * 本文(content.rendered)から会場・時間・住所を抽出
 * ブラケットラベル: 【場所】, 【時間】, 【住所】, 【日時】
 */
function parseContent(html) {
  if (!html) return {};
  const text = stripTags(html).replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const meta = {};

  const venueM = text.match(/【場所】\s*([^【\n]+)/);
  if (venueM) meta.venueName = venueM[1].trim();

  const addrM = text.match(/【住所】\s*([^【\n]+)/);
  if (addrM) meta.address = addrM[1].trim();

  const timeM = text.match(/【時間】\s*([^【\n]+)/);
  if (timeM) meta.timeText = timeM[1].trim();

  const datetimeM = text.match(/【日時】\s*([^【\n]+)/);
  if (datetimeM && !meta.timeText) meta.timeText = datetimeM[1].trim();

  return meta;
}

/** 時間テキストから開始時刻を抽出 */
function parseTimeRange(timeText) {
  if (!timeText) return null;
  const m = timeText.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (m) return { startHour: Number(m[1]), startMinute: Number(m[2]) };
  const m2 = timeText.match(/(\d{1,2})時/);
  if (m2) return { startHour: Number(m2[1]), startMinute: 0 };
  return null;
}

function createLinkidsYamanashiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectLinkidsYamanashiEvents(maxDays) {
    const allPosts = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = `${API_URL}?categories=${CATEGORY_ID}&per_page=${PER_PAGE}&page=${page}&_fields=id,date,title,content,link`;
        const raw = await fetchText(url);
        if (!raw) break;
        const posts = JSON.parse(raw);
        if (!Array.isArray(posts) || posts.length === 0) break;
        allPosts.push(...posts);
        if (posts.length < PER_PAGE) break; // last page
      } catch {
        break;
      }
    }

    if (allPosts.length === 0) {
      console.log(`[${label}] 0 events collected (API returned no posts)`);
      return [];
    }

    const byId = new Map();

    for (const post of allPosts) {
      const title = stripTags(post.title?.rendered || "").trim();
      if (!title) continue;

      const link = post.link || `https://linkids.net/?p=${post.id}`;

      // 公開日から年を推定
      const pubDateM = (post.date || "").match(/(\d{4})/);
      const pubYear = pubDateM ? Number(pubDateM[1]) : new Date().getFullYear();

      // タイトルから日付抽出
      const dates = parseDateFromTitle(title, pubYear);
      if (dates.length === 0) continue;

      // 本文からメタデータ抽出
      const meta = parseContent(post.content?.rendered || "");
      const venueName = sanitizeVenueText(meta.venueName || "");
      let address = meta.address ? sanitizeAddressText(meta.address) : "";
      if (address && !address.startsWith("山梨") && !/^(東京|神奈川|長野|静岡)/.test(address)) {
        address = `山梨県${address}`;
      }

      const timeRange = parseTimeRange(meta.timeText);

      // ジオコード
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`山梨県 ${venueName}`);
      if (candidates.length === 0) candidates.push("山梨県甲府市");
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address || "山梨県甲府市");
      const resolvedAddress = resolveEventAddress(source, venueName, address, point);

      let count = 0;
      for (const dd of dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${link}:${title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venueName, address: resolvedAddress || "",
          url: link,
          lat: point ? point.lat : null, lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createLinkidsYamanashiCollector };

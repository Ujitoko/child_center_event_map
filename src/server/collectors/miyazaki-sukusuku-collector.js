/**
 * すくすくみやざきコレクター
 * 宮崎県子育て応援ポータル「すくすくみやざき」からイベント情報を収集
 *
 * List: https://kodomoseisaku.pref.miyazaki.lg.jp/search/child/event_informations/list/{YYYY}
 * Detail: https://kodomoseisaku.pref.miyazaki.lg.jp/search/child/event_informations/detail/{ID}
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

const BASE = "https://kodomoseisaku.pref.miyazaki.lg.jp";

/**
 * リストページからイベントIDとタイトルを抽出
 */
function parseListPage(html) {
  const items = [];
  const re = /<a[^>]*href="\/search\/child\/event_informations\/detail\/(\d+)"[^>]*>[\s\S]*?<div class="day">([\s\S]*?)<\/div>[\s\S]*?<div class="title">([\s\S]*?)<\/div>[\s\S]*?<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    const dayText = m[2].replace(/<[^>]+>/g, "").trim();
    const title = m[3].replace(/<[^>]+>/g, "").trim();
    if (!title) continue;
    // 「常時開催」はスキップ（日付なし）
    if (dayText.includes("常時開催")) continue;
    items.push({ id, title, dayText });
  }
  return items;
}

/**
 * 詳細ページから日時・場所・住所を抽出
 */
function parseDetailPage(html) {
  const fields = {};
  const re = /<dl>\s*<dt>(.*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>\s*<\/dl>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const key = m[1].replace(/<[^>]+>/g, "").trim();
    const val = m[2].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
    if (key) fields[key] = val;
  }
  return fields;
}

/**
 * "2026年2月22日～2026年2月23日" や "2026年3月8日" をパース
 */
function parseDateField(text) {
  if (!text) return [];
  const dates = [];
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    dates.push({ y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) });
  }
  return dates;
}

function createMiyazakiSukusukuCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMiyazakiSukusukuEvents(maxDays) {
    const now = new Date();
    const jstYear = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric" }).format(now));

    // 今年と来年のリストを取得
    const years = [jstYear];
    const jstMonth = Number(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", month: "numeric" }).format(now));
    if (jstMonth >= 11) years.push(jstYear + 1);

    const allItems = [];
    for (const year of years) {
      try {
        const html = await fetchText(`${BASE}/search/child/event_informations/list/${year}`);
        allItems.push(...parseListPage(html));
      } catch (e) {
        console.warn(`[${label}] list page ${year} failed:`, e.message || e);
      }
    }

    if (allItems.length === 0) return [];

    const results = [];
    const seen = new Set();

    for (const item of allItems) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);

      // 詳細ページ取得
      let fields;
      try {
        const detailHtml = await fetchText(`${BASE}/search/child/event_informations/detail/${item.id}`);
        fields = parseDetailPage(detailHtml);
      } catch (e) {
        continue;
      }

      // 日付パース
      const dateField = fields["開催日時"] || "";
      const dates = parseDateField(dateField);
      if (dates.length === 0) continue;

      const startDate = dates[0];
      if (!inRangeJst(startDate.y, startDate.mo, startDate.d, maxDays)) continue;

      // 時間パース
      const timeRange = parseTimeRangeFromText(dateField) || parseTimeRangeFromText(fields["イベント内容"] || "");

      // 場所・住所
      const venueName = sanitizeVenueText(fields["開催場所"] || "");
      const rawAddress = (fields["住所"] || "").replace(/（[^）]*）/g, "").trim();

      // ジオコーディング
      const candidates = [];
      if (rawAddress) candidates.push(rawAddress);
      if (venueName) candidates.push(`宮崎県 ${venueName}`);
      if (rawAddress && venueName) candidates.push(`${rawAddress} ${venueName}`);

      let point = await geocodeForWard(candidates.slice(0, 5), source);
      point = resolveEventPoint(source, venueName, point, rawAddress);
      const resolvedAddress = resolveEventAddress(source, venueName, rawAddress, point);

      const { startsAt, endsAt } = buildStartsEndsForDate(startDate, timeRange);
      const dateKey = `${startDate.y}${String(startDate.mo).padStart(2, "0")}${String(startDate.d).padStart(2, "0")}`;
      const eventUrl = `${BASE}/search/child/event_informations/detail/${item.id}`;
      const id = `${srcKey}:${item.id}:${item.title}:${dateKey}`;

      results.push({
        id,
        source: srcKey,
        source_label: label,
        title: item.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: resolvedAddress || rawAddress || "",
        url: eventUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });

      // Rate limit
      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMiyazakiSukusukuCollector };

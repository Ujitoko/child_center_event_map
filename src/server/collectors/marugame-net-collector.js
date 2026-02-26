/**
 * まるがめ子育て応援サイト（marugame.net）コレクター
 * https://marugame.net/event/
 *
 * 香川県丸亀市を中心とした子育てイベントポータル。
 * WordPressサイト。リストページ(/event/page/N/, 10件/page)から
 * イベントカード情報を取得し、詳細ページで時間・会場を取得。
 * datetime属性から日付取得可能。全イベントが子育て関連。
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");

const SITE_BASE = "https://marugame.net";
const LIST_PATH = "/event/";
const MAX_LIST_PAGES = 10;
const DETAIL_BATCH = 5;

const KNOWN_FACILITIES = {
  MARUTASU: {
    addr: "香川県丸亀市大手町二丁目4番11号",
    lat: 34.2876,
    lng: 133.7975,
  },
  まるタス: {
    addr: "香川県丸亀市大手町二丁目4番11号",
    lat: 34.2876,
    lng: 133.7975,
  },
  ひまわりセンター: {
    addr: "香川県丸亀市飯山町川原972-1",
    lat: 34.2659,
    lng: 133.8263,
  },
  飯山総合保健福祉センター: {
    addr: "香川県丸亀市飯山町川原972-1",
    lat: 34.2659,
    lng: 133.8263,
  },
  綾歌保健福祉センター: {
    addr: "香川県丸亀市綾歌町栗熊西1060-2",
    lat: 34.2358,
    lng: 133.8533,
  },
  丸亀市役所: {
    addr: "香川県丸亀市大手町二丁目3番1号",
    lat: 34.2867,
    lng: 133.7967,
  },
  丸亀市保健福祉センター: {
    addr: "香川県丸亀市大手町二丁目1番20号",
    lat: 34.2872,
    lng: 133.7954,
  },
  丸亀市生涯学習センター: {
    addr: "香川県丸亀市大手町二丁目1番20号",
    lat: 34.2872,
    lng: 133.7954,
  },
  県立図書館: {
    addr: "香川県高松市林町2217-1",
    lat: 34.3073,
    lng: 134.0722,
  },
  香川県立ミュージアム: {
    addr: "香川県高松市玉藻町5-5",
    lat: 34.3516,
    lng: 134.0508,
  },
};

/**
 * リストページからイベントカードを抽出
 *
 * <article class="p-event-list__item p-article07 is-active">
 *   <a class="p-hover-effect--type1" href="URL">
 *     <time class="p-article07__date p-date" datetime="2026-02-25">2月<span>25</span>2026</time>
 *   </a>
 *   <h3 class="p-article07__title"><a href="URL" title="TITLE">TITLE</a></h3>
 * </article>
 */
function parseListPage(html) {
  const events = [];
  const articleRe =
    /<article[^>]*p-event-list__item[^>]*>([\s\S]*?)<\/article>/gi;
  let am;
  while ((am = articleRe.exec(html)) !== null) {
    const block = am[1];

    // Extract datetime from <time datetime="YYYY-MM-DD">
    const dtMatch = block.match(/datetime="(\d{4})-(\d{2})-(\d{2})"/);
    if (!dtMatch) continue;

    // Extract title and URL from h3
    const titleMatch = block.match(
      /<h3[^>]*>\s*<a\s+href="([^"]*)"[^>]*title="([^"]*)">/
    );
    if (!titleMatch) continue;

    events.push({
      url: titleMatch[1],
      title: stripTags(titleMatch[2]).trim(),
      y: Number(dtMatch[1]),
      mo: Number(dtMatch[2]),
      d: Number(dtMatch[3]),
    });
  }
  return events;
}

/**
 * 詳細ページからイベント情報を抽出
 *
 * <table class="event"><tbody>
 *   <tr><th>日　時</th><td>DATE+TIME</td></tr>
 *   <tr><th>場　所</th><td>VENUE</td></tr>
 * </tbody></table>
 */
function parseDetailPage(html) {
  const result = { time: null, venue: null };
  const trRe = /<tr>\s*<th>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const hdr = stripTags(m[1]).replace(/\s+/g, "");
    const val = stripTags(m[2]).trim();
    if (hdr === "日時") {
      const normalized = normalizeJaDigits(val);
      result.time = parseTimeRangeFromText(normalized);
    } else if (hdr === "場所") {
      result.venue = val;
    }
  }
  return result;
}

function createMarugameNetCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMarugameNetEvents(maxDays) {
    // Step 1: Collect from list pages
    const allItems = [];
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
      try {
        const url =
          page === 1
            ? `${SITE_BASE}${LIST_PATH}`
            : `${SITE_BASE}${LIST_PATH}page/${page}/`;
        const html = await fetchText(url);
        if (!html) break;

        const items = parseListPage(html);
        if (items.length === 0) break;
        allItems.push(...items);

        // Check if there's a next page
        if (!html.includes(`/page/${page + 1}/`)) break;
      } catch (_e) {
        break;
      }
    }

    if (allItems.length === 0) return [];

    // Step 2: Filter by date range
    const inRange = allItems.filter((ev) =>
      inRangeJst(ev.y, ev.mo, ev.d, maxDays)
    );

    // Step 3: Fetch detail pages in batches for time/venue
    const detailMap = new Map();
    for (let i = 0; i < inRange.length; i += DETAIL_BATCH) {
      const batch = inRange.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (ev) => {
          try {
            const html = await fetchText(ev.url);
            if (!html) return null;
            return { url: ev.url, ...parseDetailPage(html) };
          } catch (_e) {
            return null;
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value) {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    // Step 4: Build events
    const byId = new Map();
    for (const ev of inRange) {
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const slug = ev.url
        .replace(SITE_BASE, "")
        .replace(/^\/event\//, "")
        .replace(/\/$/, "");
      const id = `${srcKey}:${slug}:${dateKey}`;
      if (byId.has(id)) continue;

      const detail = detailMap.get(ev.url) || {};
      const timeRange = detail.time || { startHour: null, startMinute: null, endHour: null, endMinute: null };
      const venueRaw = detail.venue || "";

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d },
        timeRange
      );

      // Resolve venue → point from KNOWN_FACILITIES
      let point = null;
      let address = "";
      const fac = Object.entries(KNOWN_FACILITIES).find(([k]) =>
        venueRaw.includes(k)
      );
      if (fac) {
        point = { lat: fac[1].lat, lng: fac[1].lng };
        address = fac[1].addr;
      } else if (venueRaw) {
        // Try geocoding the venue text
        try {
          const geoResult = await geocodeForWard(
            `香川県 ${venueRaw}`,
            source.center,
            source.geoMaxKm || 50
          );
          if (geoResult) {
            point = geoResult;
          }
        } catch (_e) {
          /* skip */
        }
      }

      if (point) {
        point = resolveEventPoint(srcKey, ev.title, point, address || venueRaw);
      }

      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueRaw || "",
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
        time_unknown: !timeRange || timeRange.startHour === null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMarugameNetCollector };

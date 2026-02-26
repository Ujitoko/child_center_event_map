/**
 * 四日市こどもポータル イベントコレクター
 * https://yokkaichi-kodomoportal.com/event/
 *
 * 三重県四日市市の子育てポータル。WordPress REST API (/wp-json/wp/v2/event)
 * でイベント一覧を取得し、詳細ページ内の table.table01 から日時・会場・
 * 住所を抽出。全イベントが子育て関連。
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");

const API_BASE = "https://yokkaichi-kodomoportal.com/wp-json/wp/v2/event";
const PER_PAGE = 100;

const KNOWN_FACILITIES = {
  なやプラザ: {
    addr: "三重県四日市市蔵町4-17",
    lat: 34.9674,
    lng: 136.6249,
  },
  すわ公園交流館: {
    addr: "三重県四日市市諏訪栄町22-25",
    lat: 34.9663,
    lng: 136.6234,
  },
  四日市市総合会館: {
    addr: "三重県四日市市諏訪町2-2",
    lat: 34.9664,
    lng: 136.6195,
  },
  あさけプラザ: {
    addr: "三重県四日市市下之宮町296-1",
    lat: 34.9963,
    lng: 136.6157,
  },
  こども子育て交流プラザ: {
    addr: "三重県四日市市栄町1-11 くすの木パーキング3階",
    lat: 34.966,
    lng: 136.622,
  },
};

/**
 * WP REST APIレスポンスからイベントリンク・タイトルを抽出
 */
function parseApiResponse(json) {
  try {
    const items = JSON.parse(json);
    if (!Array.isArray(items)) return [];
    return items.map((item) => ({
      wpId: item.id,
      title: stripTags(item.title?.rendered || "").trim(),
      url: item.link || "",
    }));
  } catch (_e) {
    return [];
  }
}

/**
 * 詳細ページの table.table01 からイベント日時・会場・住所を抽出
 *
 * <table class="table01">
 *   <tr><th>開催日</th><td>３月15日（日）</td></tr>
 *   <tr><th>開催時間</th><td>10：00～16：00</td></tr>
 *   <tr><th>会場</th><td>四日市市なやプラザ</td></tr>
 *   <tr><th>アクセス</th><td>四日市市蔵町4-17</td></tr>
 * </table>
 */
function parseDetailPage(html) {
  const result = { dates: [], time: null, venue: "", address: "" };

  const trRe = /<tr>\s*<th>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const hdr = stripTags(m[1]).trim();
    const val = normalizeJaDigits(stripTags(m[2]).trim());

    if (hdr === "開催日") {
      result.dates = parseDateText(val);
    } else if (hdr === "開催時間") {
      result.time = parseTimeRangeFromText(val);
    } else if (hdr === "会場") {
      result.venue = val;
    } else if (hdr === "アクセス") {
      result.address = val.split(/\n/)[0].trim(); // first line only
    }
  }

  return result;
}

/**
 * 開催日テキストを解析
 *
 * パターン:
 * - "3月15日(日)" → 当年の単日
 * - "2026年2月17日(土)・21日(土)" → 複数日
 * - "毎週火曜日 次回は2026年3月3日(火)" → "次回は"以降の日付
 */
function parseDateText(text) {
  const dates = [];
  const now = new Date();
  const jstNow = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const defaultYear = jstNow.getFullYear();

  // Look for "次回は" pattern first
  const nextMatch = text.match(/次回[はの].*?(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (nextMatch) {
    dates.push({
      y: Number(nextMatch[1]),
      mo: Number(nextMatch[2]),
      d: Number(nextMatch[3]),
    });
    return dates;
  }

  // Full date: YYYY年M月D日
  const fullRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let fm;
  let baseYear = defaultYear;
  let baseMonth = null;
  while ((fm = fullRe.exec(text)) !== null) {
    baseYear = Number(fm[1]);
    baseMonth = Number(fm[2]);
    dates.push({ y: baseYear, mo: baseMonth, d: Number(fm[3]) });
  }

  // If no YYYY年 found, try M月D日
  if (dates.length === 0) {
    const moRe = /(\d{1,2})月(\d{1,2})日/g;
    let mm;
    while ((mm = moRe.exec(text)) !== null) {
      baseMonth = Number(mm[1]);
      dates.push({ y: defaultYear, mo: baseMonth, d: Number(mm[2]) });
    }
  }

  // Additional days after ・ or ,: D日
  if (dates.length === 1 && baseMonth) {
    const extraDays = text.match(/[・,、]\s*(\d{1,2})日/g);
    if (extraDays) {
      for (const ed of extraDays) {
        const dm = ed.match(/(\d{1,2})日/);
        if (dm) {
          dates.push({ y: baseYear, mo: baseMonth, d: Number(dm[1]) });
        }
      }
    }
  }

  return dates;
}

function createYokkaichiKodomoCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectYokkaichiKodomoEvents(maxDays) {
    // Step 1: Fetch event list from WP REST API
    let apiJson;
    try {
      apiJson = await fetchText(`${API_BASE}?per_page=${PER_PAGE}&_fields=id,title,link`);
    } catch (_e) {
      console.log(`[${label}] API fetch failed`);
      return [];
    }

    const apiItems = parseApiResponse(apiJson);
    if (apiItems.length === 0) return [];

    // Step 2: Fetch detail pages
    const allEvents = [];
    const BATCH = 5;
    for (let i = 0; i < apiItems.length; i += BATCH) {
      const batch = apiItems.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const html = await fetchText(item.url);
            if (!html) return null;
            const detail = parseDetailPage(html);
            return { ...item, ...detail };
          } catch (_e) {
            return null;
          }
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value && r.value.dates.length > 0) {
          allEvents.push(r.value);
        }
      }
    }

    // Step 3: Build events
    const byId = new Map();
    for (const ev of allEvents) {
      for (const dt of ev.dates) {
        if (!inRangeJst(dt.y, dt.mo, dt.d, maxDays)) continue;

        const dateKey = `${dt.y}${String(dt.mo).padStart(2, "0")}${String(dt.d).padStart(2, "0")}`;
        const id = `${srcKey}:${ev.wpId}:${dateKey}`;
        if (byId.has(id)) continue;

        const timeRange = ev.time || {
          startHour: null,
          startMinute: null,
          endHour: null,
          endMinute: null,
        };
        const { startsAt, endsAt } = buildStartsEndsForDate(
          { y: dt.y, mo: dt.mo, d: dt.d },
          timeRange
        );

        // Resolve location
        let point = null;
        let address = ev.address || "";
        const fac = Object.entries(KNOWN_FACILITIES).find(([k]) =>
          (ev.venue || "").includes(k)
        );
        if (fac) {
          point = { lat: fac[1].lat, lng: fac[1].lng };
          if (!address) address = fac[1].addr;
        } else if (address || ev.venue) {
          try {
            const geoResult = await geocodeForWard(
              `三重県 ${address || ev.venue}`,
              source.center,
              source.geoMaxKm || 30
            );
            if (geoResult) point = geoResult;
          } catch (_e) {
            /* skip */
          }
        }

        if (point) {
          point = resolveEventPoint(srcKey, ev.title, point, address || ev.venue);
        }

        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: ev.venue || "",
          address,
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          time_unknown: !timeRange || timeRange.startHour === null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createYokkaichiKodomoCollector };

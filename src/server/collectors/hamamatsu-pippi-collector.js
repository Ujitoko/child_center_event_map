/**
 * 浜松市子育て情報サイト ぴっぴ イベントコレクター
 * https://www.hamamatsu-pippi.net/event/eventinfo/
 *
 * 浜松市の子育てポータル。全イベントが子ども向け。
 * リストページから基本情報取得 + 詳細ページから住所取得。
 * ~50-100 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE = "https://www.hamamatsu-pippi.net";
const LIST_URL = `${BASE}/event/eventinfo/`;
const MAX_PAGES = 10;
const DETAIL_BATCH = 5;

/** リストページからイベントカード抽出 */
function parseListPage(html) {
  const events = [];
  const cardRe = /<article\s+class="item-(\d+)">([\s\S]*?)<\/article>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const eventId = m[1];
    const block = m[2];

    // タイトル: <span class="event_title"><a href="URL">TITLE</a></span>
    const titleM = block.match(/<span\s+class="event_title">\s*<a\s+href="([^"]+)">([^<]+)<\/a>/i);
    if (!titleM) continue;
    const href = titleM[1];
    const title = titleM[2].trim();
    if (!title) continue;

    // 日付: <time>YYYY年M月D日</time> ... <time>YYYY年M月D日</time>
    const times = [];
    const timeRe = /<time>(\d{4})年(\d{1,2})月(\d{1,2})日<\/time>/g;
    let tm;
    while ((tm = timeRe.exec(block)) !== null) {
      times.push({ y: Number(tm[1]), mo: Number(tm[2]), d: Number(tm[3]) });
    }
    if (times.length === 0) continue;

    const startDate = times[0];
    const endDate = times.length > 1 ? times[1] : times[0];

    // 会場名: <span class="event_shisetu">VENUE</span>
    const venueM = block.match(/<span\s+class="event_shisetu">([^<]+)<\/span>/i);
    const venue = venueM ? venueM[1].trim() : "";

    // エリア: <span class="event-chiiki-*"><a>AREA</a></span>
    const areaM = block.match(/class="event-chiiki-[^"]*"[^>]*><a[^>]*>([^<]+)<\/a>/i);
    const area = areaM ? areaM[1].trim() : "";

    events.push({ eventId, href, title, startDate, endDate, venue, area });
  }
  return events;
}

/** 次ページがあるかチェック */
function hasNextPage(html) {
  return /<span\s+class="next">/.test(html);
}

/** 詳細ページから住所と時間を抽出 */
function parseDetailPage(html) {
  if (!html) return {};
  const result = {};

  // <th>日時</th><td>...<span class="inline">時間：HH:MM～HH:MM</span>...</td>
  const dateRowM = html.match(/<th[^>]*>日時<\/th>\s*<td>([\s\S]*?)<\/td>/i);
  if (dateRowM) {
    const spans = [];
    const spanRe = /<span\s+class="inline">\s*([\s\S]*?)\s*<\/span>/gi;
    let sm;
    while ((sm = spanRe.exec(dateRowM[1])) !== null) {
      spans.push(stripTags(sm[1]).trim());
    }

    // 時間を抽出
    for (const s of spans) {
      if (s.startsWith("時間")) {
        const timeText = s.replace(/^時間[：:]?\s*/, "");
        result.timeRange = parseTimeRangeFromText(timeText);
      }
    }

    // 個別日付を抽出 (時間以外のspan)
    const dates = [];
    for (const s of spans) {
      if (s.startsWith("時間")) continue;
      // "YYYY年M月D日(曜)" or "YYYY年M月D日(曜)～YYYY年M月D日(曜)"
      const singleM = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/g);
      if (singleM) {
        for (const ds of singleM) {
          const dm = ds.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
          if (dm) dates.push({ y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]) });
        }
      }
    }
    if (dates.length > 0) result.dates = dates;
  }

  // <th>開催場所</th><td>...<span class="oneline">VENUE</span><span class="oneline">ADDRESS</span>...</td>
  const venueRowM = html.match(/<th[^>]*>開催場所<\/th>\s*<td>([\s\S]*?)<\/td>/i);
  if (venueRowM) {
    const lines = [];
    const lineRe = /<span\s+class="oneline">\s*([\s\S]*?)\s*<\/span>/gi;
    let lm;
    while ((lm = lineRe.exec(venueRowM[1])) !== null) {
      lines.push(stripTags(lm[1]).trim());
    }
    if (lines.length >= 1) result.venue = lines[0];
    if (lines.length >= 2) {
      // 2行目が住所かチェック (浜松市で始まるか数字を含む)
      const line2 = lines[1];
      if (/浜松市|静岡県|^\d|丁目|番/.test(line2)) {
        result.address = line2;
      }
    }
  }

  return result;
}

/** 日付範囲を展開 (startDate～endDateの各日) */
function expandDateRange(startDate, endDate, maxDays) {
  const dates = [];
  const start = new Date(startDate.y, startDate.mo - 1, startDate.d);
  const end = new Date(endDate.y, endDate.mo - 1, endDate.d);
  // 365日以上のレンジは maxDays 分だけ
  const maxExpand = Math.min(maxDays + 7, 90);
  let count = 0;
  for (let d = new Date(start); d <= end && count < maxExpand; d.setDate(d.getDate() + 1)) {
    dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    count++;
  }
  return dates;
}

function createHamamatsuPippiCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectHamamatsuPippiEvents(maxDays) {
    // リストページ取得
    const allCards = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = page === 1 ? LIST_URL : `${BASE}/event/eventinfo/index.p${page}.html`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
        if (!hasNextPage(html)) break;
      } catch (e) {
        break;
      }
    }

    if (allCards.length === 0) return [];

    // 日付範囲でフィルタ: endDate が今日以降かつ startDate が maxDays+30 以内
    const now = new Date();
    const filtered = allCards.filter(card => {
      const end = new Date(card.endDate.y, card.endDate.mo - 1, card.endDate.d);
      return end >= now;
    });

    // 詳細ページバッチ取得 (住所・正確な日付・時間取得)
    const detailMap = new Map();
    const toFetch = filtered.slice(0, 50);
    for (let i = 0; i < toFetch.length; i += DETAIL_BATCH) {
      const batch = toFetch.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (card) => {
          const url = card.href.startsWith("http") ? card.href : `${BASE}${card.href}`;
          const html = await fetchText(url);
          return { eventId: card.eventId, detail: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.detail) {
          detailMap.set(r.value.eventId, r.value.detail);
        }
      }
    }

    const byId = new Map();
    const venueCache = new Map();

    for (const card of filtered) {
      const detail = detailMap.get(card.eventId) || {};
      const venue = sanitizeVenueText(detail.venue || card.venue || "");
      let address = detail.address ? sanitizeAddressText(detail.address) : "";
      if (address && !address.startsWith("静岡") && !address.startsWith("浜松")) {
        address = `静岡県${address}`;
      } else if (address && address.startsWith("浜松")) {
        address = `静岡県${address}`;
      }

      // ジオコード (会場キャッシュ)
      const venueKey = venue || card.venue;
      let point = venueCache.get(venueKey) || null;
      if (!point && venueKey) {
        const candidates = [];
        if (address) candidates.push(address);
        candidates.push(`静岡県浜松市 ${venueKey}`);
        point = await geocodeForWard(candidates.slice(0, 3), source);
        point = resolveEventPoint(source, venue, point, address || `静岡県浜松市 ${venueKey}`);
        if (point) venueCache.set(venueKey, point);
      }

      const resolvedAddr = resolveEventAddress(source, venue, address || `静岡県浜松市`, point);

      // 日付展開
      const isSingleDay = card.startDate.y === card.endDate.y &&
                          card.startDate.mo === card.endDate.mo &&
                          card.startDate.d === card.endDate.d;

      let dates;
      if (detail.dates && detail.dates.length > 0) {
        // 詳細ページの個別日付を使用
        dates = detail.dates;
      } else if (isSingleDay) {
        dates = [card.startDate];
      } else {
        dates = expandDateRange(card.startDate, card.endDate, maxDays);
      }

      const timeRange = detail.timeRange || null;
      const eventUrl = card.href.startsWith("http") ? card.href : `${BASE}${card.href}`;

      let count = 0;
      for (const dd of dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${card.eventId}:${card.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: card.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venue,
          address: resolvedAddr || "",
          url: eventUrl,
          lat: point ? point.lat : null, lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createHamamatsuPippiCollector };

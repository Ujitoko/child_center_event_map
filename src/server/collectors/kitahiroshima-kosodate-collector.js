/**
 * 北広島市 子育てイベントカレンダーコレクター
 * https://www.city.kitahiroshima.hokkaido.jp/kosodate/eventcal/
 *
 * <table id="event_month"> 縦型リスト (1行=1日)。
 * リンク2種: eventcal/detail (構造化詳細), hotnews/kosodate (一般情報→タイトルから抽出)。
 * ~15-30 events/month
 */
const { fetchText } = require("../fetch-utils");
const {
  inRangeJst,
  buildStartsEndsForDate,
  getMonthsForRange,
} = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText } = require("../text-utils");

const SITE_BASE = "https://www.city.kitahiroshima.hokkaido.jp";
const DETAIL_BATCH = 5;

// 北広島市の主要施設
const KNOWN_FACILITIES = {
  "保健センター": { address: "北広島市中央4丁目2番地1", lat: 43.3414, lng: 141.5636 },
  "夢プラザ": { address: "北広島市大曲370番地2", lat: 43.3003, lng: 141.5275 },
  "ふれあい学習センター": { address: "北広島市大曲370番地2", lat: 43.3003, lng: 141.5275 },
  "地域子育て支援センターあいあい": { address: "北広島市栄町1丁目2番1号", lat: 43.3372, lng: 141.5638 },
  "あいあい": { address: "北広島市栄町1丁目2番1号", lat: 43.3372, lng: 141.5638 },
  "中央公民館": { address: "北広島市中央6丁目2番地1", lat: 43.3422, lng: 141.5598 },
  "南ヶ丘会館": { address: "北広島市南の里2番地5", lat: 43.3195, lng: 141.5542 },
  "西の里きらきら保育園": { address: "北広島市西の里474番地1", lat: 43.3080, lng: 141.5087 },
  "大地太陽森の家保育園": { address: "北広島市大曲南ヶ丘3丁目1番1号", lat: 43.3102, lng: 141.5341 },
  "大曲いちい保育園": { address: "北広島市大曲並木4丁目1番3号", lat: 43.2965, lng: 141.5145 },
  "広島天使幼稚園": { address: "北広島市中央6丁目4番地1", lat: 43.3430, lng: 141.5580 },
  "広島幼稚園": { address: "北広島市広葉町3丁目1番地", lat: 43.3350, lng: 141.5575 },
};

/** カレンダーページからイベントリンクを抽出 */
function parseCalendarPage(html) {
  const events = [];

  // 年月を取得: <h2 id="event_title">2026年3月</h2>
  const ymMatch = html.match(/<h2\s+id="event_title">(\d{4})年(\d{1,2})月/i);
  if (!ymMatch) return events;
  const year = Number(ymMatch[1]);
  const month = Number(ymMatch[2]);

  // <table id="event_month"> を抽出
  const tableMatch = html.match(/<table\s+id="event_month">([\s\S]*?)<\/table>/i);
  if (!tableMatch) return events;
  const table = tableMatch[1];

  // 各行を処理
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(table)) !== null) {
    const row = rowMatch[1];

    // 日番号を <th> から取得
    const dayMatch = row.match(/<th[^>]*>\s*(\d{1,2})\s*<\/th>/i);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (day < 1 || day > 31) continue;

    // イベントリンクを取得
    const linkRe = /<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRe.exec(row)) !== null) {
      const href = linkMatch[1].trim();
      const title = stripTags(linkMatch[2]).trim();
      if (!title || !href) continue;

      // ナビゲーションリンク除外 (月切替)
      if (/eventcal\/\d{6}\.html/.test(href) && !/detail/.test(href)) continue;

      const absUrl = href.startsWith("http") ? href : new URL(href, `${SITE_BASE}/kosodate/eventcal/`).href;

      // リンクタイプ判定
      const isEventcalDetail = /\/kosodate\/eventcal\/detail\//.test(absUrl);

      events.push({ y: year, mo: month, d: day, title, url: absUrl, isEventcalDetail });
    }
  }

  return events;
}

/** eventcal/detail ページから会場・時間を抽出 */
function parseDetailPage(html) {
  const text = stripTags(html);
  let venue = "";
  let timeRange = null;

  // 場所: class="pagetitle_a4" の後のテキスト
  const venueRe = /<(?:h[1-6])\s+class="pagetitle_a4"[^>]*>\s*場所\s*<\/(?:h[1-6])>([\s\S]*?)(?=<(?:h[1-6])\s+class="pagetitle_a4"|<div\s+id="otoiawase"|$)/i;
  const venueMatch = html.match(venueRe);
  if (venueMatch) {
    venue = stripTags(venueMatch[1]).trim().split(/\n/)[0].trim();
  }

  // 時間: class="pagetitle_a4" の後のテキスト
  const timeRe = /<(?:h[1-6])\s+class="pagetitle_a4"[^>]*>\s*時間\s*<\/(?:h[1-6])>([\s\S]*?)(?=<(?:h[1-6])\s+class="pagetitle_a4"|<div\s+id="otoiawase"|$)/i;
  const timeMatch = html.match(timeRe);
  if (timeMatch) {
    const timeText = stripTags(timeMatch[1]).trim();
    // 10時00分～12時00分
    const tm = timeText.match(/(\d{1,2})時(\d{2})分(?:\s*[～~ー-]\s*(\d{1,2})時(\d{2})分)?/);
    if (tm) {
      timeRange = { startHour: Number(tm[1]), startMinute: Number(tm[2]) };
      if (tm[3]) {
        timeRange.endHour = Number(tm[3]);
        timeRange.endMinute = Number(tm[4]);
      }
    }
  }

  return { venue, timeRange };
}

/** タイトルから会場を推測 (Type 2リンク用: "乳児健診（夢プラザ）") */
function inferVenueFromTitle(title) {
  const m = title.match(/[（(]([^）)]{2,20})[）)]/);
  return m ? m[1] : "";
}

function createKitahiroshimaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKitahiroshimaKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    const allEvents = [];
    for (const ym of months) {
      const ymStr = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${SITE_BASE}/kosodate/eventcal/${ymStr}.html`;
      try {
        const html = await fetchText(url);
        if (html) allEvents.push(...parseCalendarPage(html));
      } catch (e) {
        console.warn(`[${label}] calendar ${ymStr} failed:`, e.message || e);
      }
    }

    if (allEvents.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // eventcal/detail ページをバッチ取得
    const detailUrls = [...new Set(allEvents.filter(e => e.isEventcalDetail).map(e => e.url))];
    const detailMap = new Map();
    for (let i = 0; i < detailUrls.length; i += DETAIL_BATCH) {
      const batch = detailUrls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, ...parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          detailMap.set(r.value.url, r.value);
        }
      }
    }

    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      // 会場解決
      let venue = "";
      let timeRange = null;
      if (ev.isEventcalDetail) {
        const detail = detailMap.get(ev.url);
        if (detail) {
          venue = detail.venue;
          timeRange = detail.timeRange;
        }
      }
      if (!venue) {
        venue = inferVenueFromTitle(ev.title);
      }
      venue = sanitizeVenueText(venue);

      // 施設マスターで座標解決
      const fac = Object.entries(KNOWN_FACILITIES).find(([k]) => venue.includes(k));
      let point = null;
      let address = "";

      if (fac) {
        point = { lat: fac[1].lat, lng: fac[1].lng };
        address = `北海道${fac[1].address}`;
      } else {
        const candidates = [];
        if (venue) candidates.push(`北海道北広島市 ${venue}`);
        candidates.push("北海道北広島市");
        point = await geocodeForWard(candidates.slice(0, 3), source);
        point = resolveEventPoint(source, venue, point, `北海道北広島市 ${venue}`);
        address = resolveEventAddress(source, venue, "北海道北広島市", point) || "北海道北広島市";
      }

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, timeRange
      );

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venue,
        address,
        url: ev.url,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKitahiroshimaKosodateCollector };

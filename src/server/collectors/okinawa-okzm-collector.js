/**
 * 沖縄こどもの国 (Okinawa Zoo & Museum) イベントコレクター
 * https://www.okzm.jp/event/
 *
 * WordPress card-based event listing with pagination.
 * Single facility at 沖縄市胡屋5-7-1. ~20-40 events/month.
 *
 * List page cards: <a href="/event/NNNN/"> with <h3 class="article__title">
 * and <dl class="article__date"><dt>開催日</dt><dd>DATE_TEXT</dd></dl>.
 * Date formats: "2026年2月14日（土）", "2026年2月14日(土)・15日(日)", "第2・4土曜日".
 * Time extracted from detail page body text (HH:MM～HH:MM patterns).
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { normalizeJaDigits } = require("../text-utils");

const BASE = "https://www.okzm.jp";
const LIST_URL = `${BASE}/event/`;
const MAX_PAGES = 5;
const DETAIL_BATCH = 5;
const FACILITY = {
  name: "沖縄こどもの国",
  address: "沖縄県沖縄市胡屋5-7-1",
  lat: 26.3342,
  lng: 127.7603,
};

/** 曜日名→wday index (日=0) */
const WDAY_MAP = { "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6 };

/**
 * カードHTMLからイベント情報を抽出
 *
 * Card structure:
 *   <a href="https://www.okzm.jp/event/NNNN/">
 *     <p class="article__label">事前申込み</p>
 *     <div class="article__img"><img ...></div>
 *     <p class="article__category"><span>アニマルゾーン</span></p>
 *     <h3 class="article__title">TITLE</h3>
 *     <dl class="article__date"><dt>開催日</dt><dd>DATE_TEXT</dd></dl>
 *   </a>
 */
function parseListPage(html) {
  const events = [];
  const cardRe = /<a\s+href="(https?:\/\/www\.okzm\.jp\/event\/(\d+)\/)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const href = m[1];
    const eventId = m[2];
    const block = m[3];

    const titleM = block.match(/<h3[^>]*class="article__title"[^>]*>([^<]+)<\/h3>/i);
    const title = titleM ? titleM[1].trim() : "";
    if (!title) continue;

    const dateM = block.match(/<dd>([^<]+)<\/dd>/i);
    const dateText = dateM ? normalizeJaDigits(dateM[1].trim()) : "";

    events.push({ href, eventId, title, dateText });
  }
  return events;
}

/**
 * 日付テキストから具体的な日付を抽出
 * - "2026年2月14日（土）" → [{y:2026, mo:2, d:14}]
 * - "2026年2月14日(土)・15日(日)・21日(土)・22日（日）" → 4 dates
 * - "2026年1月18・25日(日)" → [{y:2026, mo:1, d:18}, {y:2026, mo:1, d:25}]
 * - "第2・4土曜日" → expanded via expandRecurring()
 * - "2026年1月2日（金）～2月2日（月）" → date range
 */
function parseDatesFromText(text, maxDays) {
  const dates = [];
  const norm = text
    .replace(/[（(]/g, "(")
    .replace(/[）)]/g, ")")
    .replace(/[〜～]/g, "～")
    .replace(/年年/g, "年") // fix double-年 typo (e.g., "2026年年2月")
    .replace(/(\d{1,2})[・、,](\d{1,2})日/g, "$1日・$2日"); // "18・25日" → "18日・25日"

  // Pattern: explicit YYYY年M月D日 dates (possibly with ・/、-linked day ranges)
  const fullDateRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
  let dm;
  const seenFull = [];
  while ((dm = fullDateRe.exec(norm)) !== null) {
    seenFull.push({
      y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]),
      idx: dm.index, matchLen: dm[0].length,
    });
  }

  if (seenFull.length > 0) {
    for (const sd of seenFull) {
      dates.push({ y: sd.y, mo: sd.mo, d: sd.d });
    }

    // Extract extra "NN日" after each full date within the same month context
    // e.g., "2026年2月14日(土)・15日(日)・21日(土)・22日(日)"
    // e.g., "2026年1月10日(土)、11日(日)、12日(月)"
    for (let i = 0; i < seenFull.length; i++) {
      const sf = seenFull[i];
      const afterDate = sf.idx + sf.matchLen;
      const nextIdx = (i + 1 < seenFull.length) ? seenFull[i + 1].idx : norm.length;
      const segment = norm.substring(afterDate, nextIdx);
      const extraDayRe = /[・,、]\s*(\d{1,2})日/g;
      let em;
      while ((em = extraDayRe.exec(segment)) !== null) {
        const ed = Number(em[1]);
        if (ed >= 1 && ed <= 31) {
          const exists = dates.some(dd => dd.y === sf.y && dd.mo === sf.mo && dd.d === ed);
          if (!exists) dates.push({ y: sf.y, mo: sf.mo, d: ed });
        }
      }
      // Also handle "NN・NN日" pattern (e.g., "1月18・25日")
      const inlineDayRe = /[・](\d{1,2})日/g;
      let idm;
      while ((idm = inlineDayRe.exec(segment)) !== null) {
        const ed = Number(idm[1]);
        if (ed >= 1 && ed <= 31) {
          const exists = dates.some(dd => dd.y === sf.y && dd.mo === sf.mo && dd.d === ed);
          if (!exists) dates.push({ y: sf.y, mo: sf.mo, d: ed });
        }
      }
    }

    // Handle date range: "YYYY年M月D日～M月D日" or "YYYY年M月D日～YYYY年M月D日"
    const rangeRe = /(\d{4})年(\d{1,2})月(\d{1,2})日[^～]*～\s*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/;
    const rm = norm.match(rangeRe);
    if (rm) {
      const sy = Number(rm[1]), smo = Number(rm[2]), sd = Number(rm[3]);
      const ey = rm[4] ? Number(rm[4]) : sy, emo = Number(rm[5]), ed = Number(rm[6]);
      const start = new Date(sy, smo - 1, sd);
      const end = new Date(ey, emo - 1, ed);
      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const cy = cur.getFullYear(), cmo = cur.getMonth() + 1, cd = cur.getDate();
        const exists = dates.some(dd => dd.y === cy && dd.mo === cmo && dd.d === cd);
        if (!exists) dates.push({ y: cy, mo: cmo, d: cd });
      }
    }

    return dates;
  }

  // Check 令和 year pattern: "令和N年M月D日"
  const reiwaDates = [...norm.matchAll(/令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/g)];
  if (reiwaDates.length > 0) {
    for (const rdm of reiwaDates) {
      const y = Number(rdm[1]) + 2018;
      dates.push({ y, mo: Number(rdm[2]), d: Number(rdm[3]) });
    }
    return dates;
  }

  // Recurring pattern: "第N・M曜日" - expand into specific dates
  const recurM = norm.match(/第([0-9０-９][・,、][0-9０-９]|[0-9０-９])\s*(日|月|火|水|木|金|土)曜日/);
  if (recurM) {
    const nthStr = normalizeJaDigits(recurM[1]);
    const nths = nthStr.split(/[・,、]/).map(Number).filter(n => n >= 1 && n <= 5);
    const wday = WDAY_MAP[recurM[2]];
    if (nths.length > 0 && wday !== undefined) {
      return expandRecurring(nths, wday, maxDays);
    }
  }

  return dates;
}

/**
 * 第N曜日パターンを展開 (e.g., 第2・4土曜日 → specific dates within maxDays)
 */
function expandRecurring(nths, wday, maxDays) {
  const dates = [];
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const end = new Date(jstNow);
  end.setDate(end.getDate() + maxDays);

  for (let d = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed
    // Find all occurrences of wday in this month
    let count = 0;
    for (let day = 1; day <= 31; day++) {
      const dd = new Date(year, month, day);
      if (dd.getMonth() !== month) break;
      if (dd.getDay() === wday) {
        count++;
        if (nths.includes(count)) {
          dates.push({ y: year, mo: month + 1, d: day });
        }
      }
    }
  }
  return dates;
}

/**
 * 詳細ページからテキストを取得して時間情報を抽出
 */
function parseDetailTime(html) {
  if (!html) return null;
  // Remove navigation/footer to avoid noise
  const bodyText = stripTags(html).replace(/\s+/g, " ");
  return parseTimeRangeFromText(bodyText);
}

function createOkinawaOkzmCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOkinawaOkzmEvents(maxDays) {
    // Fetch list pages (paginate up to MAX_PAGES)
    const allCards = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = page === 1 ? LIST_URL : `${LIST_URL}page/${page}/`;
      let html;
      try {
        html = await fetchText(url);
      } catch (_e) {
        break; // 404 or error means no more pages
      }
      if (!html) break;

      const cards = parseListPage(html);
      if (cards.length === 0) break;
      allCards.push(...cards);

      // Check if there is a next page link
      const hasNext = html.includes(`/event/page/${page + 1}/`);
      if (!hasNext) break;
    }

    if (allCards.length === 0) return [];

    // Deduplicate by eventId (same event can appear on multiple pages)
    const uniqueCards = [];
    const seenIds = new Set();
    for (const card of allCards) {
      if (!seenIds.has(card.eventId)) {
        seenIds.add(card.eventId);
        uniqueCards.push(card);
      }
    }

    // Parse dates from card text to identify events in range
    const eventsInRange = [];
    for (const card of uniqueCards) {
      const dates = parseDatesFromText(card.dateText, maxDays);
      const inRange = dates.filter(dd => inRangeJst(dd.y, dd.mo, dd.d, maxDays));
      if (inRange.length > 0) {
        eventsInRange.push({ ...card, dates: inRange });
      }
    }

    if (eventsInRange.length === 0) return [];

    // Fetch detail pages in batches to extract time information
    const detailTimeMap = new Map();
    const detailIds = eventsInRange.map(e => e.eventId).slice(0, 40);
    for (let i = 0; i < detailIds.length; i += DETAIL_BATCH) {
      const batch = detailIds.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (eid) => {
          const dhtml = await fetchText(`${BASE}/event/${eid}/`);
          return { eid, time: parseDetailTime(dhtml) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.time) {
          detailTimeMap.set(r.value.eid, r.value.time);
        }
      }
    }

    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);
    const byId = new Map();

    for (const ev of eventsInRange) {
      const timeRange = detailTimeMap.get(ev.eventId) || null;
      const eventUrl = ev.href;

      let count = 0;
      for (const dd of ev.dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${eventUrl}:${ev.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: FACILITY.name,
          address: resolvedAddr || FACILITY.address,
          url: eventUrl,
          lat: point.lat,
          lng: point.lng,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createOkinawaOkzmCollector };

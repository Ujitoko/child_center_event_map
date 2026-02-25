/**
 * もこぼっくす イベントコレクター
 * https://mocobox.jp/calendar/
 *
 * 愛媛県の子育て情報サイト。カレンダーページから日別イベント一覧を取得し、
 * 詳細ページから住所を抽出する。~64 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE = "https://mocobox.jp";
const DETAIL_BATCH = 5;

/**
 * カレンダーページから日別イベントを抽出
 * 構造: <dl id="cal2026-02-DD" data-event-date="YYYY-MM-DD"> ... <a href=".../detail/index/NNN">【area】【venue】title date (time)</a> ...
 */
function parseCalendarPage(html) {
  const events = [];
  // 各日の<dl>ブロック
  const dayRe = /<dl\s+id="cal[^"]*"\s+data-event-date="(\d{4}-\d{2}-\d{2})">([\s\S]*?)<\/dl>/gi;
  let dm;
  while ((dm = dayRe.exec(html)) !== null) {
    const dateStr = dm[1]; // YYYY-MM-DD
    const block = dm[2];
    // 各イベントリンク (text部分)
    const linkRe = /<p\s+class="text">\s*<a\s+href="(https?:\/\/mocobox\.jp\/detail\/index\/\d+)">([\s\S]*?)<\/a>/gi;
    let lm;
    while ((lm = linkRe.exec(block)) !== null) {
      const href = lm[1];
      const raw = stripTags(lm[2]).replace(/\s+/g, " ").trim();
      // 【area】【venue】title date (time) のパターン
      const bracketRe = /【([^】]*)】/g;
      const brackets = [];
      let bm;
      while ((bm = bracketRe.exec(raw)) !== null) {
        brackets.push(bm[1].trim());
      }
      const area = brackets[0] || "";
      const venue = brackets[1] || "";
      // 【...】以降のテキストからタイトルを抽出
      const afterBrackets = raw.replace(/【[^】]*】/g, "").trim();
      // 日付・時間部分を除去してタイトルを抽出
      const title = afterBrackets
        .replace(/\d{4}年\d{1,2}月[\s\S]*$/, "")
        .replace(/令和\d+年\d{1,2}月[\s\S]*$/, "")
        .replace(/\d{1,2}月[\s\S]*$/, "")
        .replace(/\(\s*\d{1,2}:\d{2}[\s\S]*$/, "")
        .replace(/\u3000+$/, "")
        .trim();
      if (title && href) {
        events.push({ href, title, area, venue, dateStr });
      }
    }
  }
  return events;
}

/** 詳細ページの<dl>からkey→valueマップを抽出 */
function parseDetailDl(html) {
  const meta = {};
  if (!html) return meta;
  // 住所: <dt>住所</dt><dd class="detail-address-data"><a href="maps.google...">address MAP</a></dd>
  const addrRe = /<dt>住所<\/dt>\s*<dd[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i;
  const am = addrRe.exec(html);
  if (am) {
    meta.address = stripTags(am[1]).replace(/\s*MAP\s*$/i, "").replace(/\s+/g, " ").trim();
  }
  // 営業時間
  const timeRe = /<dt>営業時間<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i;
  const tm = timeRe.exec(html);
  if (tm) {
    meta.hours = stripTags(tm[1]).replace(/\s+/g, " ").trim();
  }
  return meta;
}

function createMocoboxCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMocoboxEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    // 今月+来月+再来月のカレンダーを取得
    const allCards = [];
    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      try {
        const url = `${BASE}/calendar/index/${yy}-${String(mm).padStart(2, "0")}`;
        const html = await fetchText(url);
        if (html) allCards.push(...parseCalendarPage(html));
      } catch (e) {
        console.warn(`[${label}] calendar ${yy}/${mm} failed:`, e.message || e);
      }
    }

    if (allCards.length === 0) return [];

    // 日付フィルター＆重複除去
    const cardsInRange = [];
    const seen = new Set();
    for (const c of allCards) {
      const [ys, ms, ds] = c.dateStr.split("-").map(Number);
      if (!inRangeJst(ys, ms, ds, maxDays)) continue;
      const key = `${c.href}:${c.dateStr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cardsInRange.push({ ...c, y: ys, mo: ms, d: ds });
    }

    // 詳細ページをバッチ取得 (住所取得用)
    const detailMap = new Map();
    const urls = [...new Set(cardsInRange.map(c => c.href))].slice(0, 100);
    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailDl(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const card of cardsInRange) {
      const detail = detailMap.get(card.href) || {};
      const meta = detail.meta || {};

      const venueName = sanitizeVenueText(card.venue || "");
      const address = meta.address
        ? sanitizeAddressText(meta.address.startsWith("愛媛県") ? meta.address : `愛媛県${meta.address}`)
        : card.area ? `愛媛県${card.area}` : "";

      // 時間: 詳細ページの営業時間 or カレンダーテキストから
      const timeText = meta.hours || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // ジオコード
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`愛媛県 ${card.area} ${venueName}`);
      if (card.area) candidates.push(`愛媛県${card.area}`);
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address);
      const resolvedAddress = resolveEventAddress(source, venueName, address, point);

      const dateKey = `${card.y}${String(card.mo).padStart(2, "0")}${String(card.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate({ y: card.y, mo: card.mo, d: card.d }, timeRange);
      const id = `${srcKey}:${card.href}:${card.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: card.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: resolvedAddress || "",
        url: card.href,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMocoboxCollector };

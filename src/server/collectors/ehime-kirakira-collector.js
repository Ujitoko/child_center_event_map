/**
 * 愛媛きらきらナビ イベントコレクター
 * https://www.ehime-kirakira.com/event/
 *
 * 愛媛県の子育てポータル。カレンダーページからイベントURL一覧を取得し、
 * 詳細ページから会場・座標を抽出する。
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE_URL = "https://www.ehime-kirakira.com";
const DETAIL_BATCH = 5;

/** カレンダーページからイベントを抽出 */
function parseCalendarPage(html) {
  const events = [];
  // <a href="...detail..."><h3 class="event02ListTi">TITLE<span>AREA</span></h3><p class="icoCal">DATE</p></a>
  const linkRe = /<a\s+href="(https?:\/\/www\.ehime-kirakira\.com\/event\/detail[^"]+)"[^>]*>\s*<h3\s+class="event02ListTi">([\s\S]*?)<\/h3>\s*<p\s+class="icoCal">([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const h3Inner = m[2];
    const dateText = stripTags(m[3]).trim();
    // タイトルは<span>前のテキスト
    const title = h3Inner.replace(/<span[^>]*>[\s\S]*?<\/span>/gi, "").trim();
    // エリアは<span>内
    const areas = [];
    const areaRe = /<span>([^<]+)<\/span>/g;
    let am;
    while ((am = areaRe.exec(h3Inner)) !== null) {
      areas.push(am[1].trim());
    }
    if (title && href) {
      events.push({ href, title, dateText, area: areas.join("・") });
    }
  }
  return events;
}

/** 日時テキストから年月日を抽出 */
function parseDateFromText(text) {
  if (!text) return null;
  const m = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

/** 詳細ページの<dl>からkey→valueマップを抽出 */
function parseDetailDl(html) {
  const meta = {};
  if (!html) return meta;
  const dlRe = /<dl><dt>([^<]+)<\/dt><dd>([\s\S]*?)<\/dd><\/dl>/gi;
  let m;
  while ((m = dlRe.exec(html)) !== null) {
    const key = stripTags(m[1]).trim();
    const val = stripTags(m[2]).replace(/\s+/g, " ").trim();
    if (key && val) meta[key] = val;
  }
  return meta;
}

/** 詳細ページからGoogleMap座標を抽出 */
function parseLatLng(html) {
  if (!html) return null;
  const m = html.match(/LatLng\('([0-9.]+)',\s*'([0-9.]+)'\)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

/** 開催場所テキストから施設名と住所を分離 */
function parseVenueAddress(raw, area) {
  if (!raw) return { venue: "", address: "" };
  let text = raw.replace(/\s+/g, " ").trim();
  // 「エリア：施設名」形式
  const colonIdx = text.indexOf("：");
  let venue = text;
  let address = "";
  if (colonIdx > 0) {
    venue = text.substring(colonIdx + 1).trim();
  }
  // 住所パターンを抽出
  const addrMatch = text.match(/(愛媛県[\p{Script=Han}ぁ-ん]+[市町村][\p{Script=Han}ぁ-ん\d\-ー－番地号丁目の]*)/u);
  if (addrMatch) {
    address = addrMatch[1];
  } else if (area) {
    address = `愛媛県${area}`;
  }
  return { venue: sanitizeVenueText(venue), address: sanitizeAddressText(address) };
}

function createEhimeKirakiraColl(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectEhimeKirakiraEvents(maxDays) {
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
        const url = `${BASE_URL}/event/calendar/?Eyear=${yy}&Emonth=${mm}`;
        const html = await fetchText(url);
        if (html) allCards.push(...parseCalendarPage(html));
      } catch (e) {
        console.warn(`[${label}] calendar ${yy}/${mm} failed:`, e.message || e);
      }
    }

    if (allCards.length === 0) return [];

    // 日付フィルター＆URL重複除去
    const cardsInRange = [];
    const seenUrl = new Set();
    for (const c of allCards) {
      const d = parseDateFromText(c.dateText);
      if (!d || !inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      if (seenUrl.has(c.href + c.dateText)) continue;
      seenUrl.add(c.href + c.dateText);
      cardsInRange.push({ ...c, date: d });
    }

    // 詳細ページをバッチ取得
    const detailMap = new Map();
    const urls = [...new Set(cardsInRange.map(c => c.href))].slice(0, 80);
    for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
      const batch = urls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailDl(html), latLng: parseLatLng(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") detailMap.set(r.value.url, r.value);
      }
    }

    // イベントレコード生成
    const byId = new Map();
    for (const card of cardsInRange) {
      const d = card.date;
      const detail = detailMap.get(card.href) || {};
      const meta = detail.meta || {};

      const placeText = meta["開催場所"] || "";
      const { venue, address } = parseVenueAddress(placeText, card.area);

      const timeText = meta["開催日時"] || card.dateText || "";
      const timeRange = parseTimeRangeFromText(timeText);

      // 座標: 詳細ページの埋め込みGoogleMap優先、なければジオコード
      let point = detail.latLng || null;
      if (!point) {
        const candidates = [];
        if (address) candidates.push(address);
        if (venue) candidates.push(`愛媛県 ${card.area || ""} ${venue}`);
        if (card.area) candidates.push(`愛媛県${card.area}`);
        point = await geocodeForWard(candidates.slice(0, 3), source);
      }
      point = resolveEventPoint(source, venue, point, address || `愛媛県${card.area || ""}`);
      const resolvedAddress = resolveEventAddress(source, venue, address || `愛媛県${card.area || ""}`, point);

      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange);
      const id = `${srcKey}:${card.href}:${card.title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: card.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venue, address: resolvedAddress || "",
        url: card.href,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createEhimeKirakiraColl };

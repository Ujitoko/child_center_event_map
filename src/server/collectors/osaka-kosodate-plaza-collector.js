/**
 * 大阪子ども子育てプラザ イベントコレクター
 * https://osaka-kosodate-plaza.jp/
 *
 * 大阪市6区のプラザ施設のイベント。月別リストページから取得し、
 * 詳細ページから開催時間を抽出。各施設は固定住所。~72 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { stripTags } = require("../html-utils");

const BASE = "https://osaka-kosodate-plaza.jp";
const DETAIL_BATCH = 8;

const WARDS = [
  { path: "kita", name: "北区子ども・子育てプラザ", address: "大阪府大阪市北区本庄東1-24-11", lat: 34.7106, lng: 135.5128 },
  { path: "tsurumi", name: "鶴見区子ども・子育てプラザ", address: "大阪府大阪市鶴見区今津中1-1-14", lat: 34.7032, lng: 135.5797 },
  { path: "abeno", name: "阿倍野区子ども・子育てプラザ", address: "大阪府大阪市阿倍野区阪南町2-23-21", lat: 34.6318, lng: 135.5138 },
  { path: "hirano", name: "平野区子ども・子育てプラザ", address: "大阪府大阪市平野区瓜破3-3-64", lat: 34.6142, lng: 135.5623 },
  { path: "nishinari", name: "西成区子ども・子育てプラザ", address: "大阪府大阪市西成区梅南1-2-6", lat: 34.6334, lng: 135.5004 },
  { path: "minato", name: "港区子ども・子育てプラザ", address: "大阪府大阪市港区磯路1-7-17", lat: 34.6608, lng: 135.4610 },
];

/** リストページからイベントカードを抽出 */
function parseListPage(html) {
  const events = [];
  // <section class="event">内の <div><a href="..."><h4>TITLE</h4><p class="date">DATE</p></a></div>
  const cardRe = /<a\s+href="(\/[a-z]+\/event\/\d{4}\/\d{2}\/\d{6}\/)"[^>]*>\s*(?:<aside>[\s\S]*?<\/aside>)?\s*<h4>([^<]+)<\/h4>\s*<p\s+class="date"><span>[^<]*<\/span>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const href = m[1];
    const title = m[2].trim();
    const dateText = stripTags(m[3]).replace(/\s+/g, " ").trim();
    if (title && href) events.push({ href, title, dateText });
  }
  return events;
}

/** 詳細ページから開催時間を抽出 */
function parseDetailTime(html) {
  if (!html) return null;
  const m = html.match(/<dt>開催時間<\/dt>\s*<dd>([\s\S]*?)<\/dd>/i);
  if (m) return stripTags(m[1]).replace(/\s+/g, " ").trim();
  return null;
}

/** 日付テキストからリストを抽出 */
function parseDates(text) {
  if (!text) return [];
  // 単日: "2026年2月26日（木）"
  const single = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (single && !text.includes("〜")) {
    return [{ y: Number(single[1]), mo: Number(single[2]), d: Number(single[3]) }];
  }
  // 範囲: "2026年3月1日（日）〜 2026年3月31日（火）"
  const rangeM = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日.*?〜.*?(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (rangeM) {
    const start = new Date(Number(rangeM[1]), Number(rangeM[2]) - 1, Number(rangeM[3]));
    const end = new Date(Number(rangeM[4]), Number(rangeM[5]) - 1, Number(rangeM[6]));
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
    }
    return dates;
  }
  if (single) return [{ y: Number(single[1]), mo: Number(single[2]), d: Number(single[3]) }];
  return [];
}

function createOsakaKosodatePlazaCollector(config, deps) {
  const { source } = config;
  const { resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectOsakaPlazaEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const byId = new Map();

    // Process wards in batches of 3 to parallelize network calls
    const WARD_BATCH = 3;
    for (let wi = 0; wi < WARDS.length; wi += WARD_BATCH) {
      const wardBatch = WARDS.slice(wi, wi + WARD_BATCH);
      await Promise.allSettled(wardBatch.map(async (ward) => {
        const allCards = [];
        for (let i = 0; i < 3; i++) {
          let mm = mo + i;
          let yy = y;
          if (mm > 12) { mm -= 12; yy++; }
          try {
            const url = `${BASE}/${ward.path}/event/${yy}/${String(mm).padStart(2, "0")}/`;
            const html = await fetchText(url);
            if (html) allCards.push(...parseListPage(html));
          } catch (e) {
            console.warn(`[${label}] ${ward.path} ${yy}/${mm} failed:`, e.message || e);
          }
        }

        const detailMap = new Map();
        const urls = [...new Set(allCards.map(c => c.href))].slice(0, 60);
        for (let i = 0; i < urls.length; i += DETAIL_BATCH) {
          const batch = urls.slice(i, i + DETAIL_BATCH);
          const results = await Promise.allSettled(
            batch.map(async (href) => {
              const html = await fetchText(`${BASE}${href}`);
              return { href, time: parseDetailTime(html) };
            })
          );
          for (const r of results) {
            if (r.status === "fulfilled") detailMap.set(r.value.href, r.value.time);
          }
        }

        const point = { lat: ward.lat, lng: ward.lng };

        for (const card of allCards) {
          const dates = parseDates(card.dateText);
          const timeText = detailMap.get(card.href) || "";
          const timeRange = parseTimeRangeFromText(timeText);

          for (const dd of dates) {
            if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
            const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
            const eventUrl = `${BASE}${card.href}`;
            const id = `${srcKey}:${eventUrl}:${card.title}:${dateKey}`;
            if (byId.has(id)) continue;

            const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
            const resolvedAddr = resolveEventAddress(source, ward.name, ward.address, point);

            byId.set(id, {
              id, source: srcKey, source_label: label,
              title: card.title,
              starts_at: startsAt, ends_at: endsAt,
              venue_name: ward.name, address: resolvedAddr || ward.address,
              url: eventUrl,
              lat: point.lat, lng: point.lng,
            });
          }
        }
      }));
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createOsakaKosodatePlazaCollector };

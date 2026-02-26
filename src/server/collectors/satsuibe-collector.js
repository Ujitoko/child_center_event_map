/**
 * サツイベ 子供向けイベントコレクター
 * https://sapporo.magazine.events/category/child
 *
 * 札幌市のイベント情報サイト。子供向けカテゴリのリスト+詳細ページ(JSON-LD)。
 * ~28-36 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const BASE = "https://sapporo.magazine.events";
const DETAIL_BATCH = 5;
const MAX_PAGES = 3;

/** リストページからイベントURLを抽出 */
function parseListPage(html) {
  const events = [];
  // Split by post blocks
  const blocks = html.split(/<div\s+class="post">/i).slice(1);
  for (const raw of blocks) {
    const block = raw.split(/<div\s+class="post">/i)[0]; // stop at next post
    // URL
    const urlM = block.match(/<a\s+href="(https:\/\/sapporo\.magazine\.events\/area\/[a-z-]+\/(\d+)\.html)"/i);
    if (!urlM) continue;
    const url = urlM[1];
    const eventId = urlM[2];
    // Title
    const titleM = block.match(/<h3[^>]*>([^<]+)<\/h3>/i);
    const title = titleM ? titleM[1].trim() : "";
    if (!title) continue;

    events.push({ url, eventId, title });
  }
  return events;
}

/** 詳細ページからJSON-LD + dt/dd情報を抽出 */
function parseDetailPage(html) {
  if (!html) return null;
  const meta = {};

  // JSON-LD
  const jsonLdM = html.match(/<script\s+type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i);
  if (jsonLdM) {
    try {
      const ld = JSON.parse(jsonLdM[1]);
      if (ld["@type"] === "Event") {
        meta.title = ld.name || "";
        meta.startDate = ld.startDate || "";
        meta.endDate = ld.endDate || "";
        if (ld.location) {
          meta.venueName = ld.location.name || "";
          meta.address = ld.location.address || "";
        }
      }
    } catch (_) { /* ignore */ }
  }

  // dt/dd フォールバック
  const dlRe = /<dt>([^<]+)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi;
  let dm;
  while ((dm = dlRe.exec(html)) !== null) {
    const key = dm[1].trim();
    const val = stripTags(dm[2]).replace(/\s+/g, " ").trim();
    if (key === "開催日" && !meta.dateText) meta.dateText = val;
    if (key === "開催時間" && !meta.timeText) meta.timeText = val;
    if (key === "開催場所" && !meta.venueName) meta.venueName = val;
    if (key === "開催場所住所") {
      // 住所テキストからエリアリンクを除去
      const addrClean = val.replace(/札幌市[^区]*区のイベント\s*/, "").trim();
      if (addrClean && !meta.address) meta.address = addrClean;
    }
  }

  return meta;
}

/** 日付パース (JSON-LDのstartDate or テキスト) */
function parseDates(meta) {
  const dates = [];
  if (!meta) return dates;

  // JSON-LD startDate: "2026-03-07T09:30:00+0000"
  if (meta.startDate) {
    const sm = meta.startDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (sm) {
      const startY = Number(sm[1]), startMo = Number(sm[2]), startD = Number(sm[3]);
      if (meta.endDate) {
        const em = meta.endDate.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (em) {
          const endY = Number(em[1]), endMo = Number(em[2]), endD = Number(em[3]);
          const start = new Date(startY, startMo - 1, startD);
          const end = new Date(endY, endMo - 1, endD);
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
          }
          return dates;
        }
      }
      dates.push({ y: startY, mo: startMo, d: startD });
      return dates;
    }
  }

  // テキストフォールバック: "2026年 3月 7日"
  if (meta.dateText) {
    const rangeM = meta.dateText.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s*[～~ー-]\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (rangeM) {
      const y1 = Number(rangeM[1]);
      const start = new Date(y1, Number(rangeM[2]) - 1, Number(rangeM[3]));
      const end = new Date(y1, Number(rangeM[4]) - 1, Number(rangeM[5]));
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push({ y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate() });
      }
      return dates;
    }
    const singleM = meta.dateText.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (singleM) {
      dates.push({ y: Number(singleM[1]), mo: Number(singleM[2]), d: Number(singleM[3]) });
    }
  }

  return dates;
}

/** 時間パース */
function parseTime(meta) {
  if (!meta) return null;
  // JSON-LD startDate に時間あり: "2026-03-07T09:30:00+0000"
  if (meta.startDate) {
    const tm = meta.startDate.match(/T(\d{2}):(\d{2})/);
    if (tm && !(Number(tm[1]) === 0 && Number(tm[2]) === 0)) {
      return { startHour: Number(tm[1]), startMinute: Number(tm[2]) };
    }
  }
  // テキスト: "10時　10分"
  if (meta.timeText) {
    const tm = meta.timeText.match(/(\d{1,2})時[\s　]*(\d{1,2})分/);
    if (tm) return { startHour: Number(tm[1]), startMinute: Number(tm[2]) };
  }
  return null;
}

function createSatsuibeCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectSatsuibeEvents(maxDays) {
    // リストページをページネーション取得
    const allCards = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const url = page === 1 ? `${BASE}/category/child` : `${BASE}/category/child/page/${page}`;
        const html = await fetchText(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        allCards.push(...cards);
      } catch (e) {
        // 404 = 最終ページ超過
        break;
      }
    }

    if (allCards.length === 0) return [];

    // 詳細ページバッチ取得
    const detailMap = new Map();
    const uniqueUrls = [...new Set(allCards.map(c => c.url))].slice(0, 50);
    for (let i = 0; i < uniqueUrls.length; i += DETAIL_BATCH) {
      const batch = uniqueUrls.slice(i, i + DETAIL_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const html = await fetchText(url);
          return { url, meta: parseDetailPage(html) };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.meta) detailMap.set(r.value.url, r.value);
      }
    }

    const byId = new Map();

    for (const card of allCards) {
      const detail = detailMap.get(card.url);
      const meta = detail ? detail.meta : null;

      const dates = parseDates(meta);
      if (dates.length === 0) continue;

      const timeRange = parseTime(meta);
      const venueName = sanitizeVenueText(meta?.venueName || "");
      let address = meta?.address ? sanitizeAddressText(meta.address) : "";
      if (address && !address.startsWith("北海道") && !address.startsWith("札幌")) {
        address = `北海道${address}`;
      }

      // ジオコード
      const candidates = [];
      if (address) candidates.push(address);
      if (venueName) candidates.push(`北海道札幌市 ${venueName}`);
      let point = await geocodeForWard(candidates.slice(0, 3), source);
      point = resolveEventPoint(source, venueName, point, address || `北海道札幌市`);
      const resolvedAddress = resolveEventAddress(source, venueName, address, point);

      let count = 0;
      for (const dd of dates) {
        if (count >= 30) break;
        if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;
        count++;

        const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
        const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
        const id = `${srcKey}:${card.url}:${card.title}:${dateKey}`;

        if (byId.has(id)) continue;
        byId.set(id, {
          id, source: srcKey, source_label: label,
          title: card.title,
          starts_at: startsAt, ends_at: endsAt,
          venue_name: venueName, address: resolvedAddress || "",
          url: card.url,
          lat: point ? point.lat : null, lng: point ? point.lng : null,
        });
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createSatsuibeCollector };

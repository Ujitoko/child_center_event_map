/**
 * 長岡市 子育ての駅カレンダーコレクター
 * https://www.city.nagaoka.niigata.jp/event/kosodateYYYYMM.html
 *
 * 13の子育ての駅施設のイベントを月別カレンダーから収集。
 * <table class="Kosodatetbl"> の各行が1日分。
 * 日付: <a name="YYYYMMDD">、施設: <li class="FACILITY_CODE">
 * 全て子育てイベント (フィルタ不要)。~50-80 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, getMonthsForRange } = require("../date-utils");
const { stripTags } = require("../html-utils");

const SITE_BASE = "https://www.city.nagaoka.niigata.jp";

// 施設CSSクラス → 施設情報マッピング
const FACILITIES = {
  teku:   { name: "子育ての駅千秋 てくてく", address: "長岡市千秋1丁目99番地6", lat: 37.4527, lng: 138.8360 },
  tibiko: { name: "子育ての駅 ちびっこ広場", address: "長岡市大手通2丁目5番地", lat: 37.4481, lng: 138.8509 },
  gun:    { name: "子育ての駅 ぐんぐん", address: "長岡市千歳1丁目3番85号", lat: 37.4417, lng: 138.8571 },
  suku:   { name: "子育ての駅とちお すくすく", address: "長岡市栃尾宮沢1765番地", lat: 37.4683, lng: 139.0104 },
  nk:     { name: "子育ての駅なかのしま なかのんひろば", address: "長岡市中野西甲700", lat: 37.4347, lng: 138.9421 },
  ks:     { name: "子育ての駅こしじ のびのび", address: "長岡市浦4800", lat: 37.3933, lng: 138.8115 },
  ms:     { name: "子育ての駅みしま もりもり", address: "長岡市上岩井6834番3", lat: 37.4160, lng: 138.9030 },
  ym:     { name: "子育ての駅やまこし やまっこ", address: "長岡市山古志竹沢甲2837-1", lat: 37.3596, lng: 138.9566 },
  og:     { name: "子育ての駅おぐに たんぽぽ", address: "長岡市小国町相野原139-1", lat: 37.3369, lng: 138.8762 },
  ws:     { name: "子育ての駅わしま わくわく", address: "長岡市小島谷3434-4", lat: 37.5218, lng: 138.7366 },
  tr:     { name: "子育ての駅てらどまり にこにこ", address: "長岡市寺泊敦ヶ曽根671", lat: 37.6182, lng: 138.7700 },
  yi:     { name: "子育ての駅よいた にじの子広場", address: "長岡市与板町与板甲95", lat: 37.5286, lng: 138.8036 },
  kw:     { name: "子育ての駅かわぐち すこやか", address: "長岡市川口武道窪200-32", lat: 37.2968, lng: 138.9406 },
};

/** カレンダーページからイベントを抽出 */
function parseCalendarPage(html) {
  const events = [];
  // <table class="Kosodatetbl"> を抽出
  const tableMatch = html.match(/<table\s+class="Kosodatetbl"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return events;
  const table = tableMatch[1];

  // 各行 <tr> を処理
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(table)) !== null) {
    const row = rowMatch[1];

    // 日付を <a name="YYYYMMDD"> から取得
    const dateAnchor = row.match(/<a\s+name="(\d{8})">/i);
    if (!dateAnchor) continue;
    const dateStr = dateAnchor[1];
    const y = Number(dateStr.substring(0, 4));
    const mo = Number(dateStr.substring(4, 6));
    const d = Number(dateStr.substring(6, 8));
    if (y < 2020 || mo < 1 || mo > 12 || d < 1 || d > 31) continue;

    // コンテンツセル (<td class="calcon">) 内の <li> を処理
    const contentCell = row.match(/<td\s+class="calcon">([\s\S]*?)<\/td>/i);
    if (!contentCell) continue;
    const cellHtml = contentCell[1];

    const liRe = /<li\s+class="([^"]*)">([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRe.exec(cellHtml)) !== null) {
      const facilityCode = liMatch[1].trim();
      const liContent = liMatch[2];

      // 休館日をスキップ
      if (/休館日/.test(liContent)) continue;

      // タイトルとURLを取得
      const linkMatch = liContent.match(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      let title, url;
      if (linkMatch) {
        const href = linkMatch[1].trim();
        title = stripTags(linkMatch[2]).trim();
        // 相対URL解決: "../kosodate/..." → "/kosodate/..."
        if (href.startsWith("../")) {
          url = `${SITE_BASE}/${href.replace(/^\.\.\//, "")}`;
        } else if (href.startsWith("/")) {
          url = `${SITE_BASE}${href}`;
        } else {
          url = `${SITE_BASE}/event/${href}`;
        }
      } else {
        // テキストのみイベント (リンクなし)
        title = stripTags(liContent).trim();
        if (!title) continue;
        url = `${SITE_BASE}/event/kosodate`;
      }

      // タイトル末尾の日付範囲注記を除去 (e.g., "（～3月14日）")
      title = title.replace(/（～\d+月\d+日）$/, "").trim();
      if (!title) continue;

      events.push({ y, mo, d, title, url, facilityCode });
    }
  }
  return events;
}

function createNagaokaKosodateCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectNagaokaKosodateEvents(maxDays) {
    const months = getMonthsForRange(maxDays);

    const allEvents = [];
    for (const ym of months) {
      const ymStr = `${ym.year}${String(ym.month).padStart(2, "0")}`;
      const url = `${SITE_BASE}/event/kosodate${ymStr}.html`;
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

    // 施設ごとにジオコーディング結果をキャッシュ
    const facilityPointCache = new Map();
    for (const [code, fac] of Object.entries(FACILITIES)) {
      facilityPointCache.set(code, { lat: fac.lat, lng: fac.lng });
    }

    const byId = new Map();
    for (const ev of allEvents) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const fac = FACILITIES[ev.facilityCode];
      const venueName = fac ? fac.name : "";
      const address = fac ? fac.address : `新潟県長岡市`;
      let point = fac ? { lat: fac.lat, lng: fac.lng } : null;

      // KNOWN_FACILITIES にない施設の場合はジオコーディング
      if (!point) {
        const candidates = [`新潟県長岡市 ${ev.title}`];
        point = await geocodeForWard(candidates, source);
        point = resolveEventPoint(source, venueName, point, `新潟県${address}`);
      }

      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${srcKey}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      const { startsAt, endsAt } = buildStartsEndsForDate(
        { y: ev.y, mo: ev.mo, d: ev.d }, null
      );

      byId.set(id, {
        id, source: srcKey, source_label: label,
        title: ev.title,
        starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName,
        address: address || "",
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

module.exports = { createNagaokaKosodateCollector };

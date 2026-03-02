/**
 * 川崎市 市民活動センター こども文化センター イベントコレクター
 *
 * kawasaki-shiminkatsudo.or.jp の calendar.json から
 * 26+ こども文化センターのイベントを収集。
 * JSON配列: page_no, page_name, url, date_list, event
 */
const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { KAWASAKI_SOURCE } = require("../../config/wards");

const CALENDAR_URL =
  "https://www.kawasaki-shiminkatsudo.or.jp/seishonen/calendar.json";

// URLスラッグ → 施設名マッピング
const SLUG_TO_FACILITY = {
  asahicho: "旭町こども文化センター",
  chiyogaoka: "千代ヶ丘こども文化センター",
  hirama: "平間こども文化センター",
  kajigaya: "梶ヶ谷こども文化センター",
  kitakase: "北加瀬こども文化センター",
  kosugi: "小杉こども文化センター",
  masugata: "枡形こども文化センター",
  minamigawara: "南河原こども文化センター",
  minamisuge: "南菅こども文化センター",
  mita: "三田こども文化センター",
  miyauchi: "宮内こども文化センター",
  nagao: "長尾こども文化センター",
  nishikase: "西加瀬こども文化センター",
  nishikigaoka: "錦ヶ丘こども文化センター",
  oda: "小田こども文化センター",
  oto: "大戸こども文化センター",
  saiwai: "幸こども文化センター",
  shimohirama: "下平間こども文化センター",
  shinmaruko: "新丸子こども文化センター",
  suenaga: "末長こども文化センター",
  suge: "菅こども文化センター",
};

/**
 * page_name から施設名を抽出
 * 例: "【3月16日】読み聞かせ＆コンサート（北加瀬こども文化センター）" → "北加瀬こども文化センター"
 * フォールバック: URL slug から推定
 */
function extractFacilityName(pageName, url) {
  // fullwidth parentheses で施設名を抽出
  const parenMatch = pageName.match(/（([^）]+)）/);
  if (parenMatch) return parenMatch[1];

  // URLスラッグからフォールバック
  const slugMatch = (url || "").match(/kodomobunka\/([^/]+)\//);
  if (slugMatch && SLUG_TO_FACILITY[slugMatch[1]]) {
    return SLUG_TO_FACILITY[slugMatch[1]];
  }

  return "こども文化センター";
}

/**
 * page_name からイベントタイトルを抽出
 * 【...】プレフィックスと（...）サフィックスを除去
 * 例: "【3月16日】読み聞かせ＆コンサート（北加瀬こども文化センター）" → "読み聞かせ＆コンサート"
 */
function extractTitle(pageName) {
  return pageName
    .replace(/^【[^】]*】\s*/, "")
    .replace(/（[^）]+）$/, "")
    .trim();
}

function createCollectKawasakiShiminkatsudoEvents(deps) {
  const { resolveEventPoint, resolveEventAddress } = deps;
  const source = KAWASAKI_SOURCE;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKawasakiShiminkatsudoEvents(maxDays) {
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let entries;
    try {
      const text = await fetchText(CALENDAR_URL);
      entries = JSON.parse(text);
    } catch (e) {
      console.warn(
        `[${label}/shiminkatsudo] calendar.json fetch failed:`,
        e.message || e
      );
      return [];
    }

    if (!Array.isArray(entries)) {
      console.warn(`[${label}/shiminkatsudo] unexpected JSON format`);
      return [];
    }

    const byId = new Map();

    for (const entry of entries) {
      if (!entry.page_name || !Array.isArray(entry.date_list)) continue;

      const facilityName = extractFacilityName(entry.page_name, entry.url);
      const title = extractTitle(entry.page_name);
      if (!title || title.length < 2) continue;

      const eventUrl = entry.url || CALENDAR_URL;
      const pageNo = entry.page_no || "";

      for (const datePair of entry.date_list) {
        if (!Array.isArray(datePair) || datePair.length < 1) continue;

        const startDate = datePair[0];
        const endDate = datePair[1] || startDate;

        // 日付範囲を展開
        const dates = expandDateRange(startDate, endDate);
        for (const dateKey of dates) {
          if (dateKey < todayStr || dateKey > endStr) continue;

          const id = `${srcKey}:shiminkatsudo:${pageNo}:${dateKey}`;
          if (byId.has(id)) continue;

          const venueName = facilityName;
          let point = null;
          point = resolveEventPoint(
            source,
            venueName,
            point,
            `川崎市 ${venueName}`
          );
          const address = resolveEventAddress(
            source,
            venueName,
            "川崎市",
            point
          );

          byId.set(id, {
            id,
            source: srcKey,
            source_label: label,
            title,
            starts_at: `${dateKey}T00:00:00+09:00`,
            ends_at: null,
            venue_name: venueName,
            address: address || "",
            url: eventUrl,
            lat: point ? point.lat : source.center.lat,
            lng: point ? point.lng : source.center.lng,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(
      `[${label}/shiminkatsudo] ${results.length} events collected`
    );
    return results;
  };
}

/**
 * YYYY-MM-DD 形式の開始日～終了日を個別日付の配列に展開
 * 最大180日制限（安全弁）
 */
function expandDateRange(startStr, endStr) {
  const dates = [];
  if (!startStr) return dates;
  if (!endStr || endStr === startStr) {
    dates.push(startStr);
    return dates;
  }

  const start = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    dates.push(startStr);
    return dates;
  }

  const diffDays = Math.floor(
    (end.getTime() - start.getTime()) / 86400000
  );
  if (diffDays > 180) {
    dates.push(startStr);
    return dates;
  }

  for (let i = 0; i <= diffDays; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }

  return dates;
}

module.exports = { createCollectKawasakiShiminkatsudoEvents };

const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { HACHIOJI_SOURCE } = require("../../config/wards");

// 八王子市の代表点 — GSIが施設名で解決できない時に返す汎用座標
const HACHIOJI_GENERIC_LAT = 35.6667;
const HACHIOJI_GENERIC_LNG = 139.3158;

// GSIが施設名で解決できない既知施設の住所
const KNOWN_FACILITY_ADDRESSES = {
  クリエイトホール: "八王子市東町5-6",
  生涯学習センター: "八王子市東町5-6",
  あったかホール: "八王子市北野町596-3",
  コニカミノルタサイエンスドーム: "八王子市大横町9-13",
  サイエンスドーム: "八王子市大横町9-13",
  京王プラザホテル八王子: "八王子市旭町14-1",
};

/** 会場名から埋め込み住所を抽出し、ジオコーディング候補リストを構築 */
function buildGeoCandidates(venue) {
  const candidates = [];
  // 括弧内の住所を抽出 (例: "八王子市散田町2-37-1", "北野町596-3")
  const addrPatterns = venue.match(/八王子市[^\s（）()]+?[0-9０-９]+[-ー－][0-9０-９]+(?:[-ー－][0-9０-９]+)*/g) || [];
  for (const addr of addrPatterns) {
    candidates.push(addr);
  }
  // 括弧内の町名+番地 (八王子市なし)
  const townPatterns = venue.match(/(?:[\u4E00-\u9FFF]{2,}町)[0-9０-９]+[-ー－][0-9０-９]+(?:[-ー－][0-9０-９]+)*/g) || [];
  for (const town of townPatterns) {
    candidates.push(`八王子市${town}`);
  }
  // 施設名のみ (括弧・階数・部屋名を除去)
  const cleaned = venue
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/\d+階.*$/, "")
    .replace(/\s*(地下|地上).*$/, "")
    .trim();
  if (cleaned && cleaned !== venue) {
    candidates.push(`八王子市 ${cleaned}`);
  }
  // 既知施設の住所引き当て
  const normalized = venue.replace(/[\s　・･]/g, "").replace(/[（(][^）)]*[）)]/g, "");
  for (const [name, addr] of Object.entries(KNOWN_FACILITY_ADDRESSES)) {
    if (normalized.includes(name)) {
      candidates.unshift(addr);
      break;
    }
  }
  // 元の会場名
  candidates.push(`八王子市 ${venue}`);
  return [...new Set(candidates)];
}

function createCollectHachiojiEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;

  return async function collectHachiojiEvents(maxDays) {
    const source = `ward_${HACHIOJI_SOURCE.key}`;
    const label = HACHIOJI_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let json;
    try {
      const text = await fetchText(`${HACHIOJI_SOURCE.baseUrl}/calendar.json`);
      json = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] calendar.json fetch failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(json)) {
      console.warn(`[${label}] calendar.json is not an array`);
      return [];
    }

    // 各イベント × 各日程ペアを展開
    const candidates = [];
    for (const item of json) {
      if (!item.page_name || !item.url || !Array.isArray(item.date_list)) continue;
      for (const pair of item.date_list) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const startDate = pair[0];
        const endDate = pair[1] || pair[0];
        if (endDate < todayStr || startDate > endStr) continue;
        const effectiveStart = startDate < todayStr ? todayStr : startDate;
        candidates.push({
          title: item.page_name,
          url: item.url,
          starts_at: `${effectiveStart}T00:00:00+09:00`,
          venue_name: (item.event && item.event.event_place) || "",
          source,
          source_label: label,
        });
      }
    }

    // 重複除去 (同じURL + 同じ日)
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      const key = `${c.url}:${c.starts_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }

    // ジオコーディング
    const results = [];
    for (const ev of unique) {
      const venue = ev.venue_name;
      let point = null;
      if (venue) {
        const geoCandidates = buildGeoCandidates(venue);
        point = await geocodeForWard(geoCandidates, HACHIOJI_SOURCE);
        // GSIが「八王子市」の代表点を返した場合は未解決とみなす
        if (point && Math.abs(point.lat - HACHIOJI_GENERIC_LAT) < 0.001
            && Math.abs(point.lng - HACHIOJI_GENERIC_LNG) < 0.001) {
          point = null;
        }
        point = resolveEventPoint(HACHIOJI_SOURCE, venue, point, `八王子市 ${venue}`);
      }
      results.push({
        id: `${source}:${ev.url}:${ev.title}:${ev.starts_at.slice(0, 10).replace(/-/g, "")}`,
        source,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: null,
        venue_name: venue,
        address: venue ? `八王子市 ${venue}` : "",
        url: ev.url,
        lat: point ? point.lat : HACHIOJI_SOURCE.center.lat,
        lng: point ? point.lng : HACHIOJI_SOURCE.center.lng,
        point: point || HACHIOJI_SOURCE.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHachiojiEvents };

const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { HACHIOJI_SOURCE } = require("../../config/wards");

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
        point = await geocodeForWard([`八王子市 ${venue}`], HACHIOJI_SOURCE);
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

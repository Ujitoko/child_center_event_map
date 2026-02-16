const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { KAWASAKI_SOURCE } = require("../../config/wards");

function createCollectKawasakiEvents() {
  return async function collectKawasakiEvents(maxDays) {
    const source = `ward_${KAWASAKI_SOURCE.key}`;
    const label = KAWASAKI_SOURCE.label;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // 全ページ取得
    const allEvents = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      let json;
      try {
        const url = `${KAWASAKI_SOURCE.baseUrl}/data/api/v1/events?page=${page}&format=JSON&type=8`;
        const text = await fetchText(url);
        json = JSON.parse(text);
      } catch (e) {
        console.warn(`[${label}] API page ${page} fetch failed:`, e.message || e);
        break;
      }
      if (page === 1) {
        totalPages = json.total_pages || 1;
      }
      if (Array.isArray(json.event_data)) {
        allEvents.push(...json.event_data);
      }
      page++;
    }

    // 日付ごとにレコード展開
    const candidates = [];
    for (const item of allEvents) {
      if (!item.title || !Array.isArray(item.date_list)) continue;
      const title = item.title.replace(/[\r\n]+/g, " ").trim();
      const eventUrl = (Array.isArray(item.rel_list) && item.rel_list.length > 0 && item.rel_list[0].rel_url)
        ? item.rel_list[0].rel_url
        : KAWASAKI_SOURCE.baseUrl;
      for (const d of item.date_list) {
        if (!d.date) continue;
        const dateKey = d.date;
        if (dateKey < todayStr || dateKey > endStr) continue;

        let startsAt = `${d.date}T00:00:00+09:00`;
        let endsAt = null;
        if (d.time_from && d.time_from !== "00:00:00") {
          startsAt = `${d.date}T${d.time_from}+09:00`;
        }
        if (d.time_to && d.time_to !== "00:00:00") {
          endsAt = `${d.date}T${d.time_to}+09:00`;
        }

        const lat = parseFloat(item.place_lat);
        const lng = parseFloat(item.place_lon);
        const hasCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

        candidates.push({
          id: `${source}:${eventUrl}:${title}:${dateKey}`,
          source,
          source_label: label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: item.place || "",
          address: item.place_adr || "",
          url: eventUrl,
          lat: hasCoords ? lat : KAWASAKI_SOURCE.center.lat,
          lng: hasCoords ? lng : KAWASAKI_SOURCE.center.lng,
          point: hasCoords ? { lat, lng } : KAWASAKI_SOURCE.center,
        });
      }
    }

    // 重複除去
    const seen = new Set();
    const results = [];
    for (const c of candidates) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      results.push(c);
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKawasakiEvents };

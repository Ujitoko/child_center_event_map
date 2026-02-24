/**
 * mamafre（ママフレ）コレクター
 * 各都市の mamafre.jp サイトのイベントAPI からJSON形式で取得
 *
 * API: /api/event-api/?start=YYYY/M/D&days=N
 * Response: [{ id, name, slug, start_datetime, end_datetime, target_age, event_type, place, place_name, area }]
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, parseTimeRangeFromText } = require("../date-utils");
const { sanitizeVenueText } = require("../text-utils");

/**
 * @param {Object} config
 * @param {Object} config.source - { key, label, baseUrl, center }
 * @param {string} config.mamafre_base - mamafre サイトベースURL (例: "https://sendai-city.mamafre.jp")
 * @param {string} config.pref - 都道府県名 (ジオコーディング用, 例: "宮城県")
 * @param {string} config.city - 市名 (ジオコーディング用, 例: "仙台市")
 */
function createMamafreCollector(config, deps) {
  const { source, mamafre_base, pref, city } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectMamafreEvents(maxDays) {
    // JST now
    const now = new Date();
    const jstFormatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Tokyo",
      year: "numeric", month: "numeric", day: "numeric",
    });
    const jstParts = jstFormatter.formatToParts(now);
    const y = Number(jstParts.find(p => p.type === "year").value);
    const mo = Number(jstParts.find(p => p.type === "month").value);
    const d = Number(jstParts.find(p => p.type === "day").value);
    const startParam = `${y}/${mo}/${d}`;

    let items = [];
    try {
      const url = `${mamafre_base}/api/event-api/?start=${startParam}&days=${maxDays}`;
      const json = await fetchText(url);
      items = JSON.parse(json);
      if (!Array.isArray(items)) items = [];
    } catch (e) {
      console.warn(`[${label}] mamafre API failed:`, e.message || e);
      return [];
    }

    if (items.length === 0) return [];

    const byId = new Map();

    for (const item of items) {
      const title = (item.name || "").trim();
      if (!title) continue;

      // Parse start_datetime "2026-02-24 09:15:00"
      const startMatch = (item.start_datetime || "").match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
      if (!startMatch) continue;

      const dd = { y: Number(startMatch[1]), mo: Number(startMatch[2]), d: Number(startMatch[3]) };
      if (!inRangeJst(dd.y, dd.mo, dd.d, maxDays)) continue;

      // Time range
      const endMatch = (item.end_datetime || "").match(/(\d{2}):(\d{2})/);
      const timeRange = {
        startH: Number(startMatch[4]),
        startM: Number(startMatch[5]),
        endH: endMatch ? Number(endMatch[1]) : null,
        endM: endMatch ? Number(endMatch[2]) : null,
      };

      // Venue
      const placeName = (item.place_name || "").trim();
      const venue = sanitizeVenueText(placeName.replace(/（[^）]*）$/, "").trim());
      const area = item.area ? decodeURIComponent(item.area) : "";

      // Geocoding
      const candidates = [];
      if (placeName && city) candidates.push(`${pref}${city}${area} ${placeName.replace(/（.*）/, "")}`);
      if (area && city) candidates.push(`${pref}${city}${area}`);
      if (venue) candidates.push(`${pref}${city} ${venue}`);

      let point = await geocodeForWard(candidates.slice(0, 5), source);
      const addrFallback = area ? `${pref}${city}${area}` : `${pref}${city}`;
      point = resolveEventPoint(source, venue, point, addrFallback);
      const resolvedAddress = resolveEventAddress(source, venue, addrFallback, point);

      // Event URL
      const eventUrl = item.slug
        ? `${mamafre_base}/event/${encodeURIComponent(item.slug)}/`
        : mamafre_base;

      const dateKey = `${dd.y}${String(dd.mo).padStart(2, "0")}${String(dd.d).padStart(2, "0")}`;
      const { startsAt, endsAt } = buildStartsEndsForDate(dd, timeRange);
      const id = `${srcKey}:${item.id || dateKey}:${title}:${dateKey}`;

      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: srcKey,
        source_label: label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venue || placeName,
        address: resolvedAddress || "",
        url: eventUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createMamafreCollector };

/**
 * こども広場じゃん・けん・ぽん (na-kodomo.com) コレクター
 *
 * 長野市もんぜんぷら座2F 子育て支援施設
 * WP REST API /wp-json/wp/v2/blog2
 * ~35-50 events/month (all child-focused, 0-3歳対象)
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");
const { stripTags } = require("../html-utils");

const API_BASE = "https://www.na-kodomo.com/wp-json/wp/v2/blog2";
const FACILITY = {
  name: "こども広場じゃん・けん・ぽん",
  address: "長野県長野市新田町1485-1 もんぜんぷら座2F",
  lat: 36.2325,
  lng: 138.1886,
};

function createJyankenponCollector(config, deps) {
  const { source } = config;
  const { resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectJyankenponEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);
    const d = Number(parts.find(p => p.type === "day").value);

    const byId = new Map();
    const point = { lat: FACILITY.lat, lng: FACILITY.lng };
    const resolvedAddr = resolveEventAddress(source, FACILITY.name, FACILITY.address, point);

    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }

      const daysInMonth = new Date(yy, mm, 0).getDate();
      const startDay = i === 0 ? d : 1;
      const afterStr = `${yy}-${String(mm).padStart(2, "0")}-${String(startDay).padStart(2, "0")}T00:00:00`;
      const beforeStr = `${yy}-${String(mm).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}T23:59:59`;

      try {
        const url = `${API_BASE}?after=${afterStr}&before=${beforeStr}&per_page=100&_fields=id,title,date,link,content`;
        const json = await fetchText(url);
        if (!json || json.startsWith("<!")) continue;

        let posts;
        try { posts = JSON.parse(json); } catch (_) { continue; }
        if (!Array.isArray(posts)) continue;

        for (const post of posts) {
          const title = stripTags((post.title?.rendered || "")).trim();
          if (!title) continue;
          // Skip closures
          if (/休館日|お休み/.test(title)) continue;

          // Date from post.date: "2026-03-15T10:17:10"
          const dateM = (post.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (!dateM) continue;
          const pY = Number(dateM[1]), pMo = Number(dateM[2]), pD = Number(dateM[3]);
          if (!inRangeJst(pY, pMo, pD, maxDays)) continue;

          // Extract time from content
          const content = post.content?.rendered || "";
          let timeRange = null;
          const timeM = content.match(/時間[：:]?\s*(\d{1,2})[：:](\d{2})\s*[～〜~-]\s*(\d{1,2})[：:](\d{2})/);
          if (timeM) {
            timeRange = {
              startHour: Number(timeM[1]), startMinute: Number(timeM[2]),
              endHour: Number(timeM[3]), endMinute: Number(timeM[4]),
            };
          }

          const dateKey = `${pY}${String(pMo).padStart(2, "0")}${String(pD).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate({ y: pY, mo: pMo, d: pD }, timeRange);
          const eventUrl = post.link || "https://www.na-kodomo.com/";
          const id = `${srcKey}:${eventUrl}:${title}:${dateKey}`;
          if (byId.has(id)) continue;

          byId.set(id, {
            id, source: srcKey, source_label: label,
            title,
            starts_at: startsAt, ends_at: endsAt,
            venue_name: FACILITY.name,
            address: resolvedAddr || FACILITY.address,
            url: eventUrl,
            lat: point.lat, lng: point.lng,
          });
        }
      } catch (_) { /* skip month */ }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createJyankenponCollector };

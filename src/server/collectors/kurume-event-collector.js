/**
 * 久留米市イベントカレンダー CGI コレクター
 *
 * city.kurume.fukuoka.jp/cgi-bin/event_info/ — カスタムCGI
 * ~60+ child events/month (keyword filter applied)
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate, extractTimeRange } = require("../date-utils");
const { stripTags } = require("../html-utils");

const CHILD_KW = [
  "子育て", "子ども", "こども", "ベビー", "赤ちゃん", "親子", "児童",
  "乳幼児", "幼児", "キッズ", "ブックスタート", "離乳食", "小学生",
  "リトミック", "読み聞かせ", "おはなし会", "ファミリー", "未就学",
];

const BASE = "https://www.city.kurume.fukuoka.jp";

function createKurumeEventCollector(config, deps) {
  const { source } = config;
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKurumeEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);

    const byId = new Map();

    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }

      try {
        const url = `${BASE}/cgi-bin/event_info/event_search.php?sy=${yy}&sm=${mm}`;
        const html = await fetchText(url);
        if (!html) continue;

        // Split by <h3 to get event blocks
        const blocks = html.split(/<h3\s/);
        for (let bi = 1; bi < blocks.length; bi++) {
          const block = blocks[bi];
          // Title + URL: <a href="...">Title</a> (may span lines)
          const titleM = block.match(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
          if (!titleM) continue;
          let eventUrl = titleM[1].trim();
          const title = stripTags(titleM[2]).replace(/\s+/g, " ").trim();
          if (!title) continue;

          // Child keyword filter on title + full block text
          const blockText = stripTags(block);
          const isChild = CHILD_KW.some(kw => title.includes(kw) || blockText.includes(kw));
          if (!isChild) continue;

          // Resolve URL
          if (eventUrl.startsWith("/")) eventUrl = BASE + eventUrl;
          // Skip events already covered by ikigai-kenko collector
          if (eventUrl.includes("ikigai-kenko")) continue;

          // Parse dates from <dd>: "YYYY年MM月DD日（...）～YYYY年MM月DD日（...）"
          const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
          const dates = [];
          let dm;
          while ((dm = datePattern.exec(block)) !== null) {
            dates.push({ y: Number(dm[1]), mo: Number(dm[2]), d: Number(dm[3]) });
            if (dates.length >= 2) break;
          }
          if (dates.length === 0) continue;

          const startDate = dates[0];
          const endDate = dates.length > 1 ? dates[1] : startDate;

          // Extract time: "HH時MM分～" pattern
          let timeRange = null;
          const timeM = block.match(/(\d{1,2})時(\d{2})分\s*[～〜~]/);
          if (timeM) {
            timeRange = { startHour: Number(timeM[1]), startMinute: Number(timeM[2]) };
            const endTimeM = block.match(/(\d{1,2})時(\d{2})分\s*[～〜~]\s*(\d{1,2})時(\d{2})分/);
            if (endTimeM) {
              timeRange.endHour = Number(endTimeM[3]);
              timeRange.endMinute = Number(endTimeM[4]);
            }
          }

          // Venue from <dt>開催場所</dt><dd>...</dd>
          let venue = "";
          const venueM = block.match(/開催場所<\/dt>\s*<dd>([^<]+)/);
          if (venueM) venue = venueM[1].trim();

          // Generate events for date range (max 30 days per event)
          const sd = new Date(startDate.y, startDate.mo - 1, startDate.d);
          const ed = new Date(endDate.y, endDate.mo - 1, endDate.d);
          let count = 0;
          for (let dt = new Date(sd); dt <= ed; dt.setDate(dt.getDate() + 1)) {
            if (count >= 30) break;
            const dy = dt.getFullYear(), dmo = dt.getMonth() + 1, dd = dt.getDate();
            if (!inRangeJst(dy, dmo, dd, maxDays)) continue;
            count++;

            const dateKey = `${dy}${String(dmo).padStart(2, "0")}${String(dd).padStart(2, "0")}`;
            const { startsAt, endsAt } = buildStartsEndsForDate({ y: dy, mo: dmo, d: dd }, timeRange);
            const id = `${srcKey}:${eventUrl}:${title}:${dateKey}`;
            if (byId.has(id)) continue;

            byId.set(id, {
              id, source: srcKey, source_label: label,
              title,
              starts_at: startsAt, ends_at: endsAt,
              venue_name: venue || "",
              address: "",
              url: eventUrl,
              lat: null, lng: null,
            });
          }
        }
      } catch (_) { /* skip month */ }
    }

    // Geocode events (batch by venue)
    const results = Array.from(byId.values());
    const venueGroups = new Map();
    for (const ev of results) {
      const key = ev.venue_name || ev.title;
      if (!venueGroups.has(key)) venueGroups.set(key, []);
      venueGroups.get(key).push(ev);
    }
    const BATCH = 5;
    const entries = Array.from(venueGroups.entries());
    for (let gi = 0; gi < entries.length; gi += BATCH) {
      await Promise.allSettled(entries.slice(gi, gi + BATCH).map(async ([venueName, evts]) => {
        try {
          const query = venueName + " 久留米市";
          const geo = await geocodeForWard(source, query);
          if (geo?.lat) {
            const pt = resolveEventPoint(source, venueName, null, geo);
            for (const ev of evts) {
              ev.lat = (pt || geo).lat;
              ev.lng = (pt || geo).lng;
            }
          }
        } catch (_) {}
      }));
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKurumeEventCollector };

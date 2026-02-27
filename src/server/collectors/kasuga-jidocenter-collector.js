/**
 * 春日市児童センター (WP Events Manager) コレクター
 *
 * kasugashijidocenter.jp — 4施設 (須玖/光町/毛勝/白水)
 * WP Events Manager AJAX API (eventorganiser-fullcal)
 * ~135 events/month
 */
const { fetchText } = require("../fetch-utils");
const { inRangeJst, buildStartsEndsForDate } = require("../date-utils");

const FACILITIES = [
  { cat: "sugu", name: "春日市児童センター(須玖)", address: "福岡県春日市須玖南4-30", lat: 33.5230, lng: 130.4640 },
  { cat: "hikarimachi", name: "春日市児童センター(光町)", address: "福岡県春日市光町1-73", lat: 33.5370, lng: 130.4660 },
  { cat: "kekatsu", name: "春日市児童センター(毛勝)", address: "福岡県春日市天神山2-160", lat: 33.5440, lng: 130.4590 },
  { cat: "shirozu", name: "春日市児童センター(白水)", address: "福岡県春日市白水ヶ丘4-1-1", lat: 33.5160, lng: 130.4530 },
];
const CAT_MAP = Object.fromEntries(FACILITIES.map(f => [f.cat, f]));

const AJAX_BASE = "https://kasugashijidocenter.jp/eventlist/wp-admin/admin-ajax.php";

function createKasugaJidocenterCollector(config, deps) {
  const { source } = config;
  const { resolveEventAddress } = deps;
  const srcKey = `ward_${source.key}`;
  const label = source.label;

  return async function collectKasugaJidocenterEvents(maxDays) {
    const now = new Date();
    const jstFmt = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric" });
    const parts = jstFmt.formatToParts(now);
    const y = Number(parts.find(p => p.type === "year").value);
    const mo = Number(parts.find(p => p.type === "month").value);
    const d = Number(parts.find(p => p.type === "day").value);

    const byId = new Map();

    for (let i = 0; i < 3; i++) {
      let mm = mo + i;
      let yy = y;
      if (mm > 12) { mm -= 12; yy++; }
      const daysInMonth = new Date(yy, mm, 0).getDate();
      const startDay = i === 0 ? d : 1;
      const startStr = `${yy}-${String(mm).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
      const endStr = `${yy}-${String(mm).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

      try {
        const url = `${AJAX_BASE}?action=eventorganiser-fullcal&start=${startStr}&end=${endStr}`;
        const json = await fetchText(url);
        if (!json || json.startsWith("<!") || json.startsWith("<html")) continue;

        let arr;
        try { arr = JSON.parse(json); } catch (_) { continue; }
        if (!Array.isArray(arr)) continue;

        for (const ev of arr) {
          if (!ev.title || !ev.start) continue;
          if (ev.allDay === true) continue; // skip closures (休館日)

          const title = ev.title
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&#\d+;/g, "").replace(/&[a-z]+;/gi, "")
            .replace(/<[^>]+>/g, "").trim();
          if (!title) continue;

          // Facility from category
          const cat = (ev.category || [])[0] || "";
          const facility = CAT_MAP[cat];
          if (!facility) continue;

          const startM = ev.start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
          if (!startM) continue;
          const sY = Number(startM[1]), sMo = Number(startM[2]), sD = Number(startM[3]);
          const sH = Number(startM[4]), sMin = Number(startM[5]);

          if (!inRangeJst(sY, sMo, sD, maxDays)) continue;

          let eH = null, eMin = null;
          if (ev.end) {
            const endM = ev.end.match(/T(\d{2}):(\d{2})/);
            if (endM) { eH = Number(endM[1]); eMin = Number(endM[2]); }
          }

          let timeRange = null;
          if (!(sH === 0 && sMin === 0)) {
            timeRange = { startHour: sH, startMinute: sMin };
            if (eH !== null && !(eH === 0 && eMin === 0)) {
              timeRange.endHour = eH; timeRange.endMinute = eMin;
            }
          }

          const dateKey = `${sY}${String(sMo).padStart(2, "0")}${String(sD).padStart(2, "0")}`;
          const { startsAt, endsAt } = buildStartsEndsForDate({ y: sY, mo: sMo, d: sD }, timeRange);
          const id = `${srcKey}:${facility.cat}:${title}:${dateKey}`;
          if (byId.has(id)) continue;

          const point = { lat: facility.lat, lng: facility.lng };
          const resolvedAddr = resolveEventAddress(source, facility.name, facility.address, point);

          byId.set(id, {
            id, source: srcKey, source_label: label,
            title,
            starts_at: startsAt, ends_at: endsAt,
            venue_name: facility.name,
            address: resolvedAddr || facility.address,
            url: ev.url || "https://kasugashijidocenter.jp/eventlist/",
            lat: point.lat, lng: point.lng,
          });
        }
      } catch (_) { /* skip month on error */ }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createKasugaJidocenterCollector };

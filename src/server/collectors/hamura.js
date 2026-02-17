const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { HAMURA_SOURCE, KNOWN_HAMURA_FACILITIES } = require("../../config/wards");

function reiwaToWestern(reiwaYear) {
  return reiwaYear + 2018;
}

function createCollectHamuraEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
  const source = HAMURA_SOURCE;
  const knownFacilities = KNOWN_HAMURA_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectHamuraEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let html;
    try {
      html = await fetchText(`${source.baseUrl}/prsite/0000019227.html`);
    } catch (e) {
      console.warn(`[${label}] event page fetch failed:`, e.message || e);
      return [];
    }

    const results = [];

    // Split by h2 month headers: 令和N年M月　イベント情報
    const monthRe = /<h2[^>]*>([^<]*令和(\d+)年(\d+)月[^<]*イベント情報[^<]*)<\/h2>/gi;
    const monthSections = [];
    let mm;
    while ((mm = monthRe.exec(html)) !== null) {
      monthSections.push({
        pos: mm.index,
        reiwa: parseInt(mm[2]),
        month: parseInt(mm[3]),
        western: reiwaToWestern(parseInt(mm[2])),
      });
    }

    for (let mi = 0; mi < monthSections.length; mi++) {
      const ms = monthSections[mi];
      const sectionEnd = mi + 1 < monthSections.length
        ? monthSections[mi + 1].pos
        : html.length;
      const sectionHtml = html.slice(ms.pos, sectionEnd);
      const yyyy = ms.western;
      const mon = ms.month;
      const monthStr = `${yyyy}-${String(mon).padStart(2, "0")}`;

      // Check if this month is in range
      const monthStart = `${monthStr}-01`;
      const monthEnd = `${monthStr}-31`;
      if (monthEnd < todayStr || monthStart > endStr) continue;

      // Split by h3 facility headers
      const facilityRe = /<h3[^>]*>([^<]*(?:中央児童館|西児童館|東児童館)[^<]*)<\/h3>/gi;
      const facilities = [];
      let fm;
      while ((fm = facilityRe.exec(sectionHtml)) !== null) {
        const rawName = stripTags(fm[1]).trim();
        const venueName = rawName.replace(/（[^）]*）/g, "").replace(/\s+/g, "").trim();
        facilities.push({ pos: fm.index, name: venueName });
      }

      for (let fi = 0; fi < facilities.length; fi++) {
        const facility = facilities[fi];
        const fEnd = fi + 1 < facilities.length
          ? facilities[fi + 1].pos
          : sectionHtml.length;
        const facilityHtml = sectionHtml.slice(facility.pos, fEnd);

        // Check for "イベントはありません"
        if (/イベントはありません/.test(facilityHtml)) continue;

        // Extract text content from <p> tags
        const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
        let pm;
        let currentDay = 0;
        let currentEvents = [];

        while ((pm = pRe.exec(facilityHtml)) !== null) {
          const pText = stripTags(pm[1]).trim();
          if (!pText || pText === "\n" || /^<br\s*\/?>$/i.test(pm[1].trim())) continue;

          // Skip recurring info, footer links, metadata-only lines
          if (/^☆/.test(pText)) continue;
          if (/^詳しくは/.test(pText)) continue;
          if (/^毎週/.test(pText)) continue;

          // Event date line: 〇N日（曜日）EventName
          const dayMatch = pText.match(/[〇○](\d+)日[（(]([^）)]+)[）)]\s*(.*)/);
          if (dayMatch) {
            currentDay = parseInt(dayMatch[1]);
            const eventName = dayMatch[3] ? dayMatch[3].trim() : "";
            if (eventName && !/^から$/.test(eventName)) {
              const dateKey = `${monthStr}-${String(currentDay).padStart(2, "0")}`;
              if (dateKey >= todayStr && dateKey <= endStr) {
                currentEvents.push({
                  title: eventName,
                  venue: facility.name,
                  dateKey,
                });
              }
            }
            continue;
          }

          // Sub-event line: ・EventName
          const subMatch = pText.match(/^[・･]\s*(.+)/);
          if (subMatch && currentDay > 0) {
            const eventName = subMatch[1].trim();
            if (eventName) {
              const dateKey = `${monthStr}-${String(currentDay).padStart(2, "0")}`;
              if (dateKey >= todayStr && dateKey <= endStr) {
                currentEvents.push({
                  title: eventName,
                  venue: facility.name,
                  dateKey,
                });
              }
            }
            continue;
          }
        }

        results.push(...currentEvents);
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const ev of results) {
      const key = `${ev.title}:${ev.dateKey}:${ev.venue}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ev);
    }

    // Geocode using known facilities
    const geocoded = [];
    for (const ev of unique) {
      let point = null;
      const addr = knownFacilities[ev.venue];
      const candidates = [];
      if (addr) {
        candidates.push(/東京都/.test(addr) ? addr : `東京都${addr}`);
      }
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, ev.venue);
        if (fmAddr && !candidates.some(c => c.includes(fmAddr))) {
          candidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
        }
      }
      candidates.push(`東京都羽村市 ${ev.venue}`);
      if (candidates.length > 0) {
        point = await geocodeForWard(candidates.slice(0, 7), source);
        point = resolveEventPoint(source, ev.venue, point, addr || `${label} ${ev.venue}`);
      }

      const eventUrl = `${source.baseUrl}/prsite/0000019227.html`;
      geocoded.push({
        id: `${srcKey}:${eventUrl}:${ev.title}:${ev.dateKey.replace(/-/g, "")}`,
        source: srcKey,
        source_label: label,
        title: `${ev.venue} ${ev.title}`,
        starts_at: `${ev.dateKey}T00:00:00+09:00`,
        ends_at: null,
        venue_name: ev.venue,
        address: addr || "",
        url: eventUrl,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${geocoded.length} events collected`);
    return geocoded;
  };
}

module.exports = { createCollectHamuraEvents };

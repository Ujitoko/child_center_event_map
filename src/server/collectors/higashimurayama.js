const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText } = require("../date-utils");
const { normalizeText } = require("../text-utils");
const { stripTags } = require("../html-utils");
const { HIGASHIMURAYAMA_SOURCE, KNOWN_HIGASHIMURAYAMA_FACILITIES } = require("../../config/wards");

function buildGeoCandidates(venue, address, knownFacilities) {
  const label = HIGASHIMURAYAMA_SOURCE.label;
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(knownFacilities)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  if (address) {
    candidates.push(/東京都/.test(address) ? address : `東京都${address}`);
  }
  if (venue) {
    candidates.push(`東京都${label} ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHigashimurayamaEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;
  const source = HIGASHIMURAYAMA_SOURCE;
  const knownFacilities = KNOWN_HIGASHIMURAYAMA_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectHigashimurayamaEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // Fetch calendar page (all months in one page)
    let calendarHtml;
    try {
      calendarHtml = await fetchText(`${source.baseUrl}/event/calendar.html`);
    } catch (e) {
      console.warn(`[${label}] calendar page failed:`, e.message || e);
      return [];
    }

    // Parse month sections: <section class="cal_month cal_month_YYYYMM">
    const monthRe = /<section\s+class="cal_month\s+cal_month_(\d{6})[^"]*">([\s\S]*?)<\/section>/gi;
    const eventEntries = [];
    let monthMatch;

    while ((monthMatch = monthRe.exec(calendarHtml)) !== null) {
      const yyyymm = monthMatch[1];
      const yearNum = parseInt(yyyymm.substring(0, 4), 10);
      const monthNum = parseInt(yyyymm.substring(4, 6), 10);
      const monthHtml = monthMatch[2];

      // Split by day markers
      const daySplits = monthHtml.split(/<div\s+class="day">/i);
      for (let i = 1; i < daySplits.length; i++) {
        const dayChunk = daySplits[i];
        const dayNumMatch = dayChunk.match(/^\s*<span>(\d{1,2})<\/span>/);
        if (!dayNumMatch) continue;
        const dayNum = parseInt(dayNumMatch[1], 10);
        const dateKey = `${yearNum}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

        if (dateKey < todayStr || dateKey > endStr) continue;

        // Find kids event items (event_type_02xx)
        const itemRe = /<li\s+class="event_list_item\s+[^"]*event_type_02\d{2}[^"]*">\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let itemMatch;
        while ((itemMatch = itemRe.exec(dayChunk)) !== null) {
          const href = itemMatch[1];
          const url = href.startsWith("http") ? href : `${source.baseUrl}${href}`;
          // Strip trailing date annotations like (最終日) or (3月7日(土曜日)まで)
          let title = normalizeText(stripTags(itemMatch[2]));
          title = title.replace(/\s*[（(](?:最終日|初日|\d{1,2}月\d{1,2}日[^）)]*まで)[）)]$/g, "").trim();
          if (!title) continue;
          eventEntries.push({ url, title, dateKey });
        }
      }
    }

    if (eventEntries.length === 0) {
      console.log(`[${label}] 0 events collected`);
      return [];
    }

    // Group by URL and collect dates
    const eventsByUrl = new Map();
    for (const entry of eventEntries) {
      if (!eventsByUrl.has(entry.url)) {
        eventsByUrl.set(entry.url, { title: entry.title, dates: new Set() });
      }
      eventsByUrl.get(entry.url).dates.add(entry.dateKey);
    }

    // Fetch detail pages for venue info (pd: meta tags)
    const results = [];
    for (const [url, ev] of eventsByUrl) {
      let venue = "";
      let address = "";
      let timeRange = null;

      try {
        const detailHtml = await fetchText(url);

        // pd:locationName meta tag
        const locationMatch = detailHtml.match(/<meta\s+name="pd:locationName"[^>]*content="([^"]*)"[^>]*>/i);
        if (locationMatch && locationMatch[1]) {
          venue = normalizeText(locationMatch[1]);
        }

        // Build address from pd: meta tags
        const prefMatch = detailHtml.match(/<meta\s+name="pd:prefecture"[^>]*content="([^"]*)"[^>]*>/i);
        const cityMatch = detailHtml.match(/<meta\s+name="pd:cityAndCounty"[^>]*content="([^"]*)"[^>]*>/i);
        const streetMatch = detailHtml.match(/<meta\s+name="pd:streetAddress"[^>]*content="([^"]*)"[^>]*>/i);
        const blockMatch = detailHtml.match(/<meta\s+name="pd:cityBlock"[^>]*content="([^"]*)"[^>]*>/i);

        const pref = prefMatch ? normalizeText(prefMatch[1]) : "";
        const city = cityMatch ? normalizeText(cityMatch[1]) : "";
        const street = streetMatch ? normalizeText(streetMatch[1]) : "";
        const block = blockMatch ? normalizeText(blockMatch[1]) : "";

        if (city || street) {
          address = `${pref || "東京都"}${city || label}${street}${block}`;
        }

        // Try pd:abstract for time info
        const abstractMatch = detailHtml.match(/<meta\s+name="pd:(?:abstract|description)"[^>]*content="([^"]*)"[^>]*>/i);
        if (abstractMatch && abstractMatch[1]) {
          timeRange = parseTimeRangeFromText(normalizeText(abstractMatch[1]));
        }
        // Fallback: look for time in body
        if (!timeRange) {
          const timeSection = detailHtml.match(/<h2>\s*(?:日時|時間)\s*<\/h2>([\s\S]*?)(?:<h2|<\/section>)/i);
          if (timeSection) {
            timeRange = parseTimeRangeFromText(normalizeText(stripTags(timeSection[1])));
          }
        }
      } catch (e) {
        console.warn(`[${label}] detail page failed: ${url}`, e.message || e);
      }

      if (!venue) continue;

      // Geocode
      let point = null;
      const candidates = buildGeoCandidates(venue, address, knownFacilities);
      point = await geocodeForWard(candidates, source);
      point = resolveEventPoint(source, venue, point, address || `${label} ${venue}`);

      for (const dateKey of ev.dates) {
        let startsAt, endsAt;
        if (timeRange && timeRange.startHour !== null) {
          const sh = String(timeRange.startHour).padStart(2, "0");
          const sm = String(timeRange.startMinute || 0).padStart(2, "0");
          startsAt = `${dateKey}T${sh}:${sm}:00+09:00`;
          if (timeRange.endHour !== null) {
            const eh = String(timeRange.endHour).padStart(2, "0");
            const em = String(timeRange.endMinute || 0).padStart(2, "0");
            endsAt = `${dateKey}T${eh}:${em}:00+09:00`;
          } else {
            endsAt = null;
          }
        } else {
          startsAt = `${dateKey}T00:00:00+09:00`;
          endsAt = null;
        }

        results.push({
          id: `${srcKey}:${url}:${ev.title}:${dateKey.replace(/-/g, "")}`,
          source: srcKey,
          source_label: label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          venue_name: venue,
          address: address || `${label} ${venue}`,
          url,
          lat: point ? point.lat : source.center.lat,
          lng: point ? point.lng : source.center.lng,
          point: point || source.center,
        });
      }
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHigashimurayamaEvents };

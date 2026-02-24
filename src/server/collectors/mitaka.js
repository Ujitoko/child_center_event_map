const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst, parseTimeRangeFromText, parseDateSpans, explodeSpanToDates, inRangeJst } = require("../date-utils");
const { normalizeText } = require("../text-utils");
const { stripTags } = require("../html-utils");
const { MITAKA_SOURCE } = require("../../config/wards");
const KNOWN_MITAKA_FACILITIES = require("../../config/known-facilities").mitaka;

function buildGeoCandidates(venue, address, knownFacilities) {
  const label = MITAKA_SOURCE.label;
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

function createCollectMitakaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
  const source = MITAKA_SOURCE;
  const knownFacilities = KNOWN_MITAKA_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectMitakaEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // Fetch two section pages (UTF-8, static)
    const seedUrls = [
      `${source.baseUrl}/c_sections/kodomokatei/event.html`,
      `${source.baseUrl}/c_sections/jidouseishonen/event.html`,
    ];

    const allEntries = [];
    for (const seedUrl of seedUrls) {
      try {
        const html = await fetchText(seedUrl);
        const blockRe = /<p\s+class="date">\s*([\s\S]*?)<\/p>[\s\S]*?<h3\s+class="h3style2">\s*<a\s+href="([^"]+)"[^>]*>\s*([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = blockRe.exec(html)) !== null) {
          const dateText = normalizeText(stripTags(m[1]));
          const href = m[2];
          const url = href.startsWith("http") ? href : `${source.baseUrl}${href}`;
          const title = normalizeText(stripTags(m[3]));
          if (!title || !dateText) continue;
          allEntries.push({ dateText, url, title });
        }
      } catch (e) {
        console.warn(`[${label}] list page failed: ${seedUrl}`, e.message || e);
      }
    }

    // Group by URL and collect dates within range
    const eventsByUrl = new Map();
    for (const entry of allEntries) {
      const spans = parseDateSpans(entry.dateText);
      for (const span of spans) {
        const expanded = explodeSpanToDates(span, 90);
        for (const { y, mo, d } of expanded) {
          if (!inRangeJst(y, mo, d, maxDays)) continue;
          const dateKey = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          if (dateKey < todayStr || dateKey > endStr) continue;
          if (!eventsByUrl.has(entry.url)) {
            eventsByUrl.set(entry.url, { title: entry.title, dates: new Set() });
          }
          eventsByUrl.get(entry.url).dates.add(dateKey);
        }
      }
    }

    // Fetch detail pages for venue/time/address
    const results = [];
    for (const [url, ev] of eventsByUrl) {
      let venue = "";
      let address = "";
      let timeRange = null;

      try {
        const detailHtml = await fetchText(url);
        // Extract venue from <h3>会場</h3> or <h3>場所</h3>
        const venueSection = detailHtml.match(/<h3>\s*(?:会場|場所)\s*<\/h3>([\s\S]*?)(?:<h[23]|<div\s+id="contact")/i);
        if (venueSection) {
          const strongMatch = venueSection[1].match(/<strong>([^<]+)<\/strong>/);
          if (strongMatch) {
            venue = normalizeText(stripTags(strongMatch[1]));
          } else {
            const pMatch = venueSection[1].match(/<p[^>]*>([^<]+)<\/p>/);
            if (pMatch) {
              venue = normalizeText(stripTags(pMatch[1]));
            }
          }
        }
        // Extract address from postal code pattern
        const addrMatch = detailHtml.match(/〒\d{3}[-ー－]\d{4}\s*[　\s]*(?:東京都)?\s*(三鷹市[^<\n]{3,40})/);
        if (addrMatch) {
          address = `東京都${normalizeText(addrMatch[1])}`;
        }
        // Extract time from 日時 section
        const timeSection = detailHtml.match(/<h3>\s*日時\s*<\/h3>([\s\S]*?)(?:<h[23]|<\/section|<div\s+id)/i);
        if (timeSection) {
          const timeText = normalizeText(stripTags(timeSection[1]));
          timeRange = parseTimeRangeFromText(timeText);
        }
      } catch (e) {
        console.warn(`[${label}] detail page failed: ${url}`, e.message || e);
      }

      // venue空でもタイトルから施設名をfallback推定
      if (!venue) {
        const titleVenue = ev.title.match(/(?:すくすくひろば|東多世代交流センター|西多世代交流センター|元気創造プラザ|総合保健センター|むらさき子どもひろば|三鷹市公会堂|三鷹市市民協働センター)/);
        if (titleVenue) venue = titleVenue[0];
      }
      if (!venue) venue = "";

      // Geocode
      let point = null;
      const candidates = buildGeoCandidates(venue, address, knownFacilities);
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(source.key, venue);
        if (fmAddr && !candidates.some(c => c.includes(fmAddr))) {
          candidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
        }
      }
      point = await geocodeForWard(candidates.slice(0, 7), source);
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
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
        });
      }
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectMitakaEvents };

const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { KUNITACHI_SOURCE, KNOWN_KUNITACHI_FACILITIES } = require("../../config/wards");

const CHILD_KEYWORDS_RE = /子ども|こども|子育て|親子|キッズ|児童|乳幼児|幼児|赤ちゃん|ベビー|読み聞かせ|絵本|ファミリー|小学生|中学生|ひろば|離乳食|妊娠|出産|プレママ|パパママ/;

function buildGeoCandidates(venue, knownFacilities) {
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "").replace(/[（(][^）)]*[）)]/g, "");
  for (const [name, addr] of Object.entries(knownFacilities)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  if (venue) {
    candidates.push(`東京都国立市 ${venue}`);
  }
  return [...new Set(candidates)];
}

/** Extract venue from detail page HTML table: <th scope="row">ところ/場所</th><td>...</td> */
function extractVenueFromDetail(html) {
  const thRe = /<th[^>]*scope="row"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = thRe.exec(html)) !== null) {
    const label = stripTags(m[1]).replace(/\s/g, "").trim();
    if (/^(ところ|場所|会場|開催場所)$/.test(label)) {
      const venue = stripTags(m[2]).trim();
      if (venue) return venue;
    }
  }
  return "";
}

/** Extract address from toiawase section: 住所：186-0004 国立市中1-15-1 */
function extractAddressFromDetail(html) {
  const toiMatch = html.match(/<div\s+class="toiawase">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i);
  if (!toiMatch) return "";
  const text = stripTags(toiMatch[1]);
  const addrMatch = text.match(/住所[：:]\s*\d{3}-?\d{4}\s*(国立市[^\s電話]+)/);
  if (addrMatch) return addrMatch[1].trim();
  return "";
}

function createCollectKunitachiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
  const source = KUNITACHI_SOURCE;
  const knownFacilities = KNOWN_KUNITACHI_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectKunitachiEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let json;
    try {
      const text = await fetchText(`${source.baseUrl}/calendar.json`);
      json = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] calendar.json fetch failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(json)) {
      console.warn(`[${label}] calendar.json is not an array`);
      return [];
    }

    // Filter child-related events by keyword in page_name
    const childEvents = json.filter((item) => {
      return item.page_name && CHILD_KEYWORDS_RE.test(item.page_name);
    });

    const candidates = [];
    for (const item of childEvents) {
      if (!item.page_name || !item.url || !Array.isArray(item.date_list)) continue;
      for (const pair of item.date_list) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const startDate = pair[0];
        const endDate = pair[1] || pair[0];
        if (endDate < todayStr || startDate > endStr) continue;
        candidates.push({
          title: item.page_name,
          url: item.url,
          starts_at: `${startDate}T00:00:00+09:00`,
          venue_name: (item.event && item.event.event_place) || "",
        });
      }
    }

    // Deduplicate by url + date
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      const key = `${c.url}:${c.starts_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }

    // Fetch detail pages to extract venue info for events without venue
    const urlVenueCache = new Map();
    for (const ev of unique) {
      if (ev.venue_name) continue;
      if (urlVenueCache.has(ev.url)) {
        ev.venue_name = urlVenueCache.get(ev.url);
        continue;
      }
      try {
        const detailHtml = await fetchText(ev.url);
        const venue = extractVenueFromDetail(detailHtml);
        if (venue) {
          ev.venue_name = venue;
          urlVenueCache.set(ev.url, venue);
        } else {
          // Try address from toiawase section
          const addr = extractAddressFromDetail(detailHtml);
          if (addr) {
            urlVenueCache.set(ev.url, addr);
            ev.venue_name = addr;
          } else {
            urlVenueCache.set(ev.url, "");
          }
        }
      } catch (e) {
        console.warn(`[${label}] detail fetch failed for ${ev.url}:`, e.message || e);
        urlVenueCache.set(ev.url, "");
      }
    }

    // Geocode
    const results = [];
    for (const ev of unique) {
      const venue = ev.venue_name;
      let point = null;
      if (venue) {
        const geoCandidates = buildGeoCandidates(venue, knownFacilities);
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(source.key, venue);
          if (fmAddr && !geoCandidates.some(c => c.includes(fmAddr))) {
            geoCandidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), source);
        point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      }
      results.push({
        id: `${srcKey}:${ev.url}:${ev.title}:${ev.starts_at.slice(0, 10).replace(/-/g, "")}`,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: null,
        venue_name: venue,
        address: venue ? `${label} ${venue}` : "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectKunitachiEvents };

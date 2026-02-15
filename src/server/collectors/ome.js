const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { OME_SOURCE, KNOWN_OME_FACILITIES } = require("../../config/wards");

const CHILD_KEYWORDS_RE = /子ども|こども|子育て|親子|キッズ|児童|乳幼児|幼児|赤ちゃん|ベビー|ちびっこ|ファミリー|小学生|ひとり親|ひろば|離乳食/;

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
    candidates.push(`東京都青梅市 ${venue}`);
  }
  return [...new Set(candidates)];
}

/** Extract venue from detail page: 会　場：VENUE or 場　所：VENUE pattern in free text */
function extractVenueFromDetail(html) {
  // Look inside detail_free divs
  const freeRe = /<div\s+class="detail_free"[^>]*>([\s\S]*?)<\/div>/gi;
  let fm;
  while ((fm = freeRe.exec(html)) !== null) {
    const text = stripTags(fm[1]);
    // Match: 会場：, 会　場：, 場所：, 場　所：, ところ：, 開催場所：
    const venueMatch = text.match(/(?:会\s*場|場\s*所|ところ|開催\s*場\s*所)[：:]\s*(.+?)(?:\s*(?:対\s*象|定\s*員|日\s*時|内\s*容|費\s*用|申\s*込|講\s*師|主\s*催|問[い合]|そ\s*の\s*他)[\s：:]|\n|$)/);
    if (venueMatch) {
      const venue = venueMatch[1].trim();
      if (venue) return venue;
    }
  }
  return "";
}

function createCollectOmeEvents(deps) {
  const { geocodeForWard, resolveEventPoint } = deps;
  const source = OME_SOURCE;
  const knownFacilities = KNOWN_OME_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectOmeEvents(maxDays) {
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    // Determine months to fetch
    const months = [];
    const cur = new Date(now);
    cur.setUTCDate(1);
    while (true) {
      const mJst = parseYmdFromJst(cur);
      const ym = mJst.key.slice(0, 7); // YYYY-MM
      months.push(ym);
      cur.setUTCMonth(cur.getUTCMonth() + 1);
      if (mJst.key > endStr) break;
      if (months.length > 4) break;
    }

    const allEvents = [];

    for (const ym of months) {
      const [yyyy, mm] = ym.split("-");
      const url = `${source.baseUrl}/calendar/index.php?ym=${yyyy}/${mm}`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed for ${ym}:`, e.message || e);
        continue;
      }

      // Parse spanning events table (行事予定の表)
      const spanningRe = /<div\s+class="tbl_calendar1">([\s\S]*?)<\/div>/i;
      const spanningMatch = html.match(spanningRe);
      if (spanningMatch) {
        const spanTbl = spanningMatch[1];
        const rowRe = /<tr[^>]*>\s*<td[^>]*>.*?<span[^>]*>([\s\S]*?)<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
        let rm;
        while ((rm = rowRe.exec(spanTbl)) !== null) {
          const dateText = stripTags(rm[1]).trim();
          const titleHtml = rm[2];
          const title = stripTags(titleHtml).trim();
          if (!title || !CHILD_KEYWORDS_RE.test(title)) continue;

          const linkMatch = titleHtml.match(/href="([^"]+)"/);
          const eventUrl = linkMatch
            ? new URL(linkMatch[1], source.baseUrl).href
            : "";

          // Parse date range like "12月24日～2月16日"
          const rangeMatch = dateText.match(/(\d+)月(\d+)日[～〜~](\d+)月(\d+)日/);
          if (rangeMatch) {
            const sm = parseInt(rangeMatch[1]);
            const sd = parseInt(rangeMatch[2]);
            const em = parseInt(rangeMatch[3]);
            const ed = parseInt(rangeMatch[4]);
            const sy = sm > parseInt(mm) ? parseInt(yyyy) - 1 : parseInt(yyyy);
            const ey = em < sm ? parseInt(yyyy) + 1 : sy;
            const startKey = `${sy}-${String(sm).padStart(2, "0")}-${String(sd).padStart(2, "0")}`;
            const endKey = `${ey}-${String(em).padStart(2, "0")}-${String(ed).padStart(2, "0")}`;
            if (endKey >= todayStr && startKey <= endStr) {
              const effectiveStart = startKey < todayStr ? todayStr : startKey;
              allEvents.push({ title, url: eventUrl, dateKey: effectiveStart });
            }
          }
        }
      }

      // Parse day-by-day calendar table (カレンダーの表)
      const calRe = /<div\s+class="tbl_calendar2">([\s\S]*?)<\/div>/i;
      const calMatch = html.match(calRe);
      if (!calMatch) continue;

      const calTbl = calMatch[1];
      let currentDay = 0;

      // Process each row
      const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let trm;
      while ((trm = trRe.exec(calTbl)) !== null) {
        const row = trm[1];
        // Skip header row
        if (/<th\b/i.test(row)) continue;

        // Try to extract day number
        const dayMatch = row.match(/<a\s+[^>]*id="day_(\d+)"/i);
        if (dayMatch) {
          currentDay = parseInt(dayMatch[1]);
        }
        if (currentDay === 0) continue;

        // Extract event from calendar_style4 span
        const eventSpanRe = /<span\s+class="calendar_style4">([\s\S]*?)<\/span>/gi;
        let esm;
        while ((esm = eventSpanRe.exec(row)) !== null) {
          const content = esm[1];
          const title = stripTags(content).replace(/\s*（[\d月日から]+）\s*$/, "").trim();
          if (!title || !CHILD_KEYWORDS_RE.test(title)) continue;

          const linkMatch = content.match(/href="([^"]+)"/);
          const eventUrl = linkMatch
            ? new URL(linkMatch[1], source.baseUrl).href
            : "";

          const dateKey = `${yyyy}-${mm}-${String(currentDay).padStart(2, "0")}`;
          if (dateKey >= todayStr && dateKey <= endStr) {
            allEvents.push({ title, url: eventUrl, dateKey });
          }
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    const unique = [];
    for (const ev of allEvents) {
      const key = `${ev.title}:${ev.dateKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ev);
    }

    // Fetch detail pages to extract venue info
    const urlVenueCache = new Map();
    for (const ev of unique) {
      if (!ev.url) continue;
      if (urlVenueCache.has(ev.url)) continue;
      try {
        const detailHtml = await fetchText(ev.url);
        const venue = extractVenueFromDetail(detailHtml);
        urlVenueCache.set(ev.url, venue);
      } catch (e) {
        console.warn(`[${label}] detail fetch failed for ${ev.url}:`, e.message || e);
        urlVenueCache.set(ev.url, "");
      }
    }

    // Geocode
    const results = [];
    for (const ev of unique) {
      const venue = ev.url ? (urlVenueCache.get(ev.url) || "") : "";
      let point = null;
      if (venue) {
        const geoCandidates = buildGeoCandidates(venue, knownFacilities);
        point = await geocodeForWard(geoCandidates, source);
        point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      }
      const displayUrl = ev.url || source.baseUrl;
      results.push({
        id: `${srcKey}:${displayUrl}:${ev.title}:${ev.dateKey.replace(/-/g, "")}`,
        source: srcKey,
        source_label: label,
        title: ev.title,
        starts_at: `${ev.dateKey}T00:00:00+09:00`,
        ends_at: null,
        venue_name: venue,
        address: venue ? `${label} ${venue}` : "",
        url: displayUrl,
        lat: point ? point.lat : source.center.lat,
        lng: point ? point.lng : source.center.lng,
        point: point || source.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectOmeEvents };

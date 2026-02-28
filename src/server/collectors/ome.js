const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { stripTags } = require("../html-utils");
const { OME_SOURCE } = require("../../config/wards");
const KNOWN_OME_FACILITIES = require("../../config/known-facilities").ome;

const CHILD_KEYWORDS_RE = /子ども|こども|子育て|親子|キッズ|児童|乳幼児|幼児|赤ちゃん|ベビー|ちびっこ|ファミリー|小学生|ひとり親|ひろば|離乳食|おはなし会|家庭の日|読み聞かせ|絵本/;

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
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
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
      const m = parseInt(mm, 10);
      const url = `${source.baseUrl}/calendar/index.php?dsp=2&y=${yyyy}&m=${m}&d=1`;
      let html;
      try {
        html = await fetchText(url);
      } catch (e) {
        console.warn(`[${label}] calendar fetch failed for ${ym}:`, e.message || e);
        continue;
      }

      // Parse event list boxes (visible + hidden)
      const boxRe = /<div\s+class="calendar_event_box">([\s\S]*?)<!-- 一件分ここまで -->/gi;
      let bm;
      while ((bm = boxRe.exec(html)) !== null) {
        const box = bm[1];
        const titleMatch = box.match(/<h3>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        if (!titleMatch) continue;
        const href = titleMatch[1];
        const title = stripTags(titleMatch[2]).trim();
        if (!title || !CHILD_KEYWORDS_RE.test(title)) continue;

        const eventUrl = new URL(href, source.baseUrl).href;

        // Extract date: 「YYYY年M月D日（曜日）」or range 「YYYY年M月D日（曜日）から YYYY年M月D日（曜日）」
        const dateMatch = box.match(/icon_list_date[\s\S]*?<dd>([\s\S]*?)<\/dd>/i);
        if (!dateMatch) continue;
        const dateText = stripTags(dateMatch[1]).replace(/&nbsp;/g, " ").trim();

        const rangeRe = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
        const dates = [];
        let dm;
        while ((dm = rangeRe.exec(dateText)) !== null) {
          dates.push({ y: parseInt(dm[1]), mo: parseInt(dm[2]), d: parseInt(dm[3]) });
        }
        if (dates.length === 0) continue;

        if (dates.length >= 2) {
          // Date range: use effective start
          const startKey = `${dates[0].y}-${String(dates[0].mo).padStart(2, "0")}-${String(dates[0].d).padStart(2, "0")}`;
          const endKey = `${dates[1].y}-${String(dates[1].mo).padStart(2, "0")}-${String(dates[1].d).padStart(2, "0")}`;
          if (endKey >= todayStr && startKey <= endStr) {
            const effectiveStart = startKey < todayStr ? todayStr : startKey;
            allEvents.push({ title, url: eventUrl, dateKey: effectiveStart });
          }
        } else {
          // Single date
          const dk = `${dates[0].y}-${String(dates[0].mo).padStart(2, "0")}-${String(dates[0].d).padStart(2, "0")}`;
          if (dk >= todayStr && dk <= endStr) {
            allEvents.push({ title, url: eventUrl, dateKey: dk });
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
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(source.key, venue);
          if (fmAddr && !geoCandidates.some(c => c.includes(fmAddr))) {
            geoCandidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), source);
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
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectOmeEvents };

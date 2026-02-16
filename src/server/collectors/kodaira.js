const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { KODAIRA_SOURCE, KNOWN_KODAIRA_FACILITIES } = require("../../config/wards");

// 施設ID → 施設名マッピング (data.csv の通しNOに対応)
const FACILITY_ID_NAME = {
  "00399": "中央公民館",
  "00442": "小平市リサイクルセンター",
  "00465": "小平市ふれあい下水道館",
  "00503": "上宿小学校",
  "00504": "小平第一小学校",
  "00506": "小平第三小学校",
  "00510": "小平第七小学校",
  "00518": "花小金井小学校",
  "00540": "小平第一中学校",
  "00555": "鈴木小学校",
  "00728": "白梅学園大学",
  "01127": "中央公園",
};

function buildGeoCandidates(venue, knownFacilities) {
  const label = KODAIRA_SOURCE.label;
  const candidates = [];
  const normalized = venue.replace(/[\s　・･]/g, "");
  for (const [name, addr] of Object.entries(knownFacilities)) {
    const normName = name.replace(/[\s　・･]/g, "");
    if (normalized.includes(normName)) {
      candidates.unshift(/東京都/.test(addr) ? addr : `東京都${addr}`);
      break;
    }
  }
  if (venue) {
    candidates.push(`東京都${label} ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectKodairaEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;
  const source = KODAIRA_SOURCE;
  const knownFacilities = KNOWN_KODAIRA_FACILITIES;
  const label = source.label;
  const srcKey = `ward_${source.key}`;

  return async function collectKodairaEvents(maxDays) {
    const nowJst = parseYmdFromJst(new Date());
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let events;
    try {
      const jsonText = await fetchText(`${source.baseUrl}/c_jsdata/event.json`);
      events = JSON.parse(jsonText);
    } catch (e) {
      console.warn(`[${label}] event.json fetch/parse failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(events)) {
      console.warn(`[${label}] event.json is not an array`);
      return [];
    }

    // Filter children's events by taisyou
    const childTargets = ["小学生以下", "小学生", "中高生", "親子"];
    const childEvents = events.filter((ev) => {
      const targets = Array.isArray(ev.taisyou) ? ev.taisyou : [];
      return targets.some((t) => childTargets.includes(t));
    });

    const results = [];
    for (const item of childEvents) {
      if (!item.title || !Array.isArray(item.dates) || item.dates.length === 0) continue;

      // Extract venue from title (first token often is the facility name)
      let venue = "";
      const titleParts = item.title.split(/\s+/);
      if (titleParts.length > 1) {
        const firstPart = titleParts[0];
        if (/(公民館|館|センター|プラザ|ホール|図書館|体育館|学校|幼稚園|保育園|公園|テラス|村)/.test(firstPart)
          && !/(まつり|フェス|イベント|大会|講座|教室)$/.test(firstPart)) {
          venue = firstPart;
        }
      }
      if (!venue && item.sectionname) {
        if (/(公民館|館|センター)/.test(item.sectionname)) {
          venue = item.sectionname;
        }
      }

      // Get coordinates and facility name from refFacilityIDs
      let facilityPoint = null;
      if (item.refFacilityIDs && !Array.isArray(item.refFacilityIDs)) {
        const facilityId = Object.keys(item.refFacilityIDs)[0];
        if (facilityId) {
          const coords = item.refFacilityIDs[facilityId];
          if (coords && coords.latitude && coords.longitude) {
            facilityPoint = {
              lat: parseFloat(coords.latitude),
              lng: parseFloat(coords.longitude),
            };
          }
          if (!venue && FACILITY_ID_NAME[facilityId]) {
            venue = FACILITY_ID_NAME[facilityId];
          }
        }
      }

      // Geocode if no facility coordinates
      let point = facilityPoint;
      if (!point && venue) {
        const candidates = buildGeoCandidates(venue, knownFacilities);
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(source.key, venue);
          if (fmAddr && !candidates.some(c => c.includes(fmAddr))) {
            candidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
          }
        }
        point = await geocodeForWard(candidates.slice(0, 7), source);
        point = resolveEventPoint(source, venue, point, `${label} ${venue}`);
      }

      const eventUrl = item.url
        ? `${source.baseUrl}${item.url}`
        : source.baseUrl;

      // Process each date range
      for (const dateRange of item.dates) {
        const startDate = new Date(dateRange.start * 1000);
        const endDate = new Date(dateRange.end * 1000);
        const startJst = parseYmdFromJst(startDate);
        const endDateJst = parseYmdFromJst(endDate);

        if (startJst.key === endDateJst.key) {
          // Single day
          if (startJst.key < todayStr || startJst.key > endStr) continue;
          results.push({
            id: `${srcKey}:${eventUrl}:${item.title}:${startJst.key.replace(/-/g, "")}`,
            source: srcKey,
            source_label: label,
            title: item.title,
            starts_at: `${startJst.key}T00:00:00+09:00`,
            ends_at: null,
            venue_name: venue,
            address: venue ? `${label} ${venue}` : "",
            url: eventUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
          });
        } else {
          // Multi-day: expand but cap at 30 days
          const dayMs = 86400000;
          const diffDays = Math.min(Math.floor((endDate - startDate) / dayMs), 30);
          for (let i = 0; i <= diffDays; i++) {
            const d = new Date(startDate.getTime() + i * dayMs);
            const dJst = parseYmdFromJst(d);
            if (dJst.key < todayStr || dJst.key > endStr) continue;
            results.push({
              id: `${srcKey}:${eventUrl}:${item.title}:${dJst.key.replace(/-/g, "")}`,
              source: srcKey,
              source_label: label,
              title: item.title,
              starts_at: `${dJst.key}T00:00:00+09:00`,
              ends_at: null,
              venue_name: venue,
              address: venue ? `${label} ${venue}` : "",
              url: eventUrl,
              lat: point ? point.lat : source.center.lat,
              lng: point ? point.lng : source.center.lng,
              point: point || source.center,
            });
          }
        }
      }
    }

    // Deduplicate by title + date
    const seen = new Set();
    const unique = results.filter((ev) => {
      const key = `${ev.title}:${ev.starts_at.slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[${label}] ${unique.length} events collected`);
    return unique;
  };
}

module.exports = { createCollectKodairaEvents };

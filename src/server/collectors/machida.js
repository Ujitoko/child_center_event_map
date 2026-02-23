const { fetchText } = require("../fetch-utils");
const { parseYmdFromJst } = require("../date-utils");
const { MACHIDA_SOURCE } = require("../../config/wards");

/**
 * 町田市子育てサイト calendar.json コレクター
 * https://kosodate-machida.tokyo.jp/calendar.json
 * 全イベントが子育て関連のため、キーワードフィルタ不要
 */
const KOSODATE_MACHIDA_BASE = "https://kosodate-machida.tokyo.jp";

const KNOWN_MACHIDA_FACILITIES = {
  "子どもセンターただON": "町田市忠生1-11-1",
  "子どもセンターつるっこ": "町田市大蔵町1913",
  "子どもセンターぱお": "町田市中町1-31-22",
  "子どもセンターばあん": "町田市金森4-5-7",
  "子どもセンターまあち": "町田市中町1-31-22",
  "子どもクラブころころ・ぱんだ": "町田市金森3-19-1",
  "子どもクラブただONキッズ": "町田市忠生1-11-1",
  "町田市民文学館": "町田市原町田4-16-17",
  "町田市立中央図書館": "町田市原町田3-2-9",
  "さるびあ図書館": "町田市鶴川6-7",
  "生涯学習センター": "町田市原町田6-8-1",
  "町田市民フォーラム": "町田市原町田4-9-8",
};

function buildGeoCandidates(venue) {
  const candidates = [];
  for (const [name, addr] of Object.entries(KNOWN_MACHIDA_FACILITIES)) {
    if (venue.includes(name)) {
      candidates.push(`東京都${addr}`);
      break;
    }
  }
  const cleaned = venue
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/\d+階.*$/, "")
    .trim();
  if (cleaned) candidates.push(`東京都町田市 ${cleaned}`);
  candidates.push(`東京都町田市 ${venue}`);
  return [...new Set(candidates)];
}

function createCollectMachidaKosodateEvents(deps) {
  const { geocodeForWard, resolveEventPoint, getFacilityAddressFromMaster } = deps;

  return async function collectMachidaKosodateEvents(maxDays) {
    const source = `ward_${MACHIDA_SOURCE.key}`;
    const label = `${MACHIDA_SOURCE.label}子育て`;
    const now = new Date();
    const nowJst = parseYmdFromJst(now);
    const end = new Date();
    end.setUTCDate(end.getUTCDate() + maxDays);
    const endJst = parseYmdFromJst(end);
    const todayStr = nowJst.key;
    const endStr = endJst.key;

    let json;
    try {
      const text = await fetchText(`${KOSODATE_MACHIDA_BASE}/calendar.json`);
      json = JSON.parse(text);
    } catch (e) {
      console.warn(`[${label}] calendar.json fetch failed:`, e.message || e);
      return [];
    }

    if (!Array.isArray(json)) {
      console.warn(`[${label}] calendar.json is not an array`);
      return [];
    }

    const candidates = [];
    for (const item of json) {
      if (!item.page_name || !item.url || !Array.isArray(item.date_list)) continue;
      for (const pair of item.date_list) {
        if (!Array.isArray(pair) || pair.length < 2) continue;
        const startDate = pair[0];
        const endDate = pair[1] || pair[0];
        if (endDate < todayStr || startDate > endStr) continue;
        const effectiveStart = startDate < todayStr ? todayStr : startDate;
        // URLが相対の場合、kosodate-machidaのベースURLで解決
        let eventUrl = item.url;
        if (!eventUrl.startsWith("http")) {
          eventUrl = `${KOSODATE_MACHIDA_BASE}${eventUrl}`;
        }
        candidates.push({
          title: item.page_name,
          url: eventUrl,
          starts_at: `${effectiveStart}T00:00:00+09:00`,
          venue_name: (item.event && item.event.event_place) || "",
          source,
          source_label: MACHIDA_SOURCE.label,
        });
      }
    }

    // 重複除去
    const seen = new Set();
    const unique = [];
    for (const c of candidates) {
      const key = `${c.url}:${c.starts_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(c);
    }

    const results = [];
    for (const ev of unique) {
      const venue = ev.venue_name;
      let point = null;
      if (venue) {
        const geoCandidates = buildGeoCandidates(venue);
        if (getFacilityAddressFromMaster) {
          const fmAddr = getFacilityAddressFromMaster(MACHIDA_SOURCE.key, venue);
          if (fmAddr && !geoCandidates.some(c => c.includes(fmAddr))) {
            geoCandidates.unshift(/東京都/.test(fmAddr) ? fmAddr : `東京都${fmAddr}`);
          }
        }
        point = await geocodeForWard(geoCandidates.slice(0, 7), MACHIDA_SOURCE);
        point = resolveEventPoint(MACHIDA_SOURCE, venue, point, `町田市 ${venue}`);
      }
      results.push({
        id: `${source}:${ev.url}:${ev.title}:${ev.starts_at.slice(0, 10).replace(/-/g, "")}`,
        source,
        source_label: MACHIDA_SOURCE.label,
        title: ev.title,
        starts_at: ev.starts_at,
        ends_at: null,
        venue_name: venue,
        address: venue ? `町田市 ${venue}` : "",
        url: ev.url,
        lat: point ? point.lat : MACHIDA_SOURCE.center.lat,
        lng: point ? point.lng : MACHIDA_SOURCE.center.lng,
        point: point || MACHIDA_SOURCE.center,
      });
    }

    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectMachidaKosodateEvents };

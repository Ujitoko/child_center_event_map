const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
} = require("../date-utils");
const { HADANO_SOURCE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_KEYWORD_RE =
  /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産|おはなし|ブックスタート|ちびっこ|0歳|1歳|2歳|3歳)/;

function isChildRelated(entry) {
  const title = entry.page_name || "";
  const url = entry.url || "";
  if (/kosodate|kodomo/.test(url)) return true;
  if (CHILD_KEYWORD_RE.test(title)) return true;
  if (entry.event && entry.event.event_fields) {
    const fields = Object.values(entry.event.event_fields);
    if (fields.some(f => /子育て|子ども|こども/.test(f))) return true;
  }
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("秦野市") ? address : `秦野市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県秦野市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectHadanoEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectHadanoEvents(maxDays) {
    const source = `ward_${HADANO_SOURCE.key}`;
    const label = HADANO_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // calendar.json から取得 (HTML版は令和N年形式で日付解析困難)
    const rawEntries = [];
    for (const ym of months) {
      const url = `${HADANO_SOURCE.baseUrl}/calendar.json?year=${ym.year}&month=${ym.month}`;
      try {
        const text = await fetchText(url);
        const entries = JSON.parse(text);
        if (Array.isArray(entries)) rawEntries.push(...entries);
      } catch (e) {
        console.warn(`[${label}] calendar.json ${ym.year}/${ym.month} failed:`, e.message || e);
      }
    }

    // 子育て関連フィルタ
    const childEntries = rawEntries.filter(isChildRelated);

    // 重複除去
    const uniqueMap = new Map();
    for (const entry of childEntries) {
      const key = entry.url || entry.page_name;
      if (!uniqueMap.has(key)) uniqueMap.set(key, entry);
    }
    const uniqueEntries = Array.from(uniqueMap.values());

    // 日付展開 + レコード生成
    const byId = new Map();
    for (const entry of uniqueEntries) {
      const title = (entry.page_name || "").trim();
      if (!title) continue;
      const eventUrl = entry.url
        ? (entry.url.startsWith("http") ? entry.url : `${HADANO_SOURCE.baseUrl}${entry.url}`)
        : HADANO_SOURCE.baseUrl;
      const venue = sanitizeVenueText((entry.event && entry.event.event_place) || "");
      const dateList = entry.date_list || [];

      // 会場ジオコーディング
      let geoCandidates = buildGeoCandidates(venue, "");
      if (getFacilityAddressFromMaster && venue) {
        const fmAddr = getFacilityAddressFromMaster(HADANO_SOURCE.key, venue);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), HADANO_SOURCE);
      point = resolveEventPoint(HADANO_SOURCE, venue, point, `${label} ${venue}`);
      const address = resolveEventAddress(HADANO_SOURCE, venue, `${label} ${venue}`, point);

      if (dateList.length > 0) {
        for (const range of dateList) {
          if (!Array.isArray(range) || range.length === 0) continue;
          const startDate = range[0];
          const parts = startDate.split("-");
          if (parts.length !== 3) continue;
          const y = Number(parts[0]);
          const mo = Number(parts[1]);
          const d = Number(parts[2]);
          if (!inRangeJst(y, mo, d, maxDays)) continue;

          const { startsAt, endsAt } = buildStartsEndsForDate({ y, mo, d }, null);
          const dateKey = `${y}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}`;
          const id = `${source}:${eventUrl}:${title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source,
            source_label: label,
            title,
            starts_at: startsAt,
            ends_at: endsAt,
            venue_name: venue,
            address: address || "",
            url: eventUrl,
            lat: point ? point.lat : HADANO_SOURCE.center.lat,
            lng: point ? point.lng : HADANO_SOURCE.center.lng,
          });
        }
      }
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectHadanoEvents };

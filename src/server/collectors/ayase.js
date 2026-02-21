const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseDatesFromHtml,
} = require("../date-utils");
const { AYASE_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_TITLE_RE =
  /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産|おはなし|ブックスタート)/;
const DETAIL_BATCH_SIZE = 6;

function isChildRelated(entry) {
  if (entry.event && entry.event.event_fields) {
    const fields = Object.values(entry.event.event_fields);
    if (fields.some(f => /子育て|子ども|こども/.test(f))) return true;
  }
  if (CHILD_TITLE_RE.test(entry.page_name || "")) return true;
  if (WARD_CHILD_HINT_RE.test(entry.page_name || "")) return true;
  if (entry.url && /\/(kodomokate|kosodate|kodomo)\//.test(entry.url)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("綾瀬市") ? address : `綾瀬市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県綾瀬市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectAyaseEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectAyaseEvents(maxDays) {
    const source = `ward_${AYASE_SOURCE.key}`;
    const label = AYASE_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // calendar.json から取得
    const rawEntries = [];
    for (const ym of months) {
      const url = `${AYASE_SOURCE.baseUrl}/calendar.json?year=${ym.year}&month=${ym.month}&eventTypeNo=1`;
      try {
        const text = await fetchText(url);
        const entries = JSON.parse(text);
        if (Array.isArray(entries)) rawEntries.push(...entries);
      } catch (e) {
        console.warn(`[${label}] calendar.json ${ym.year}/${ym.month} failed:`, e.message || e);
      }
    }

    // 子育てフィルタ + 重複除去
    const uniqueMap = new Map();
    for (const entry of rawEntries) {
      if (!isChildRelated(entry)) continue;
      const key = entry.url || entry.page_name;
      if (!uniqueMap.has(key)) uniqueMap.set(key, entry);
    }

    // 日付展開
    const events = [];
    for (const entry of uniqueMap.values()) {
      const title = (entry.page_name || "").trim();
      if (!title) continue;
      const eventUrl = entry.url || AYASE_SOURCE.baseUrl;
      const venue = sanitizeVenueText((entry.event && entry.event.event_place) || "");
      const dateList = entry.date_list || [];

      if (dateList.length > 0) {
        for (const range of dateList) {
          if (!Array.isArray(range) || range.length === 0) continue;
          const startDate = range[0];
          const parts = startDate.split("-");
          if (parts.length !== 3) continue;
          events.push({ title, url: eventUrl, y: Number(parts[0]), mo: Number(parts[1]), d: Number(parts[2]), venue });
        }
      } else {
        events.push({ title, url: eventUrl, y: 0, mo: 0, d: 0, venue, needDates: true });
      }
    }

    // 日付が必要なイベントの詳細ページを取得
    const needDateUrls = [...new Set(events.filter(e => e.needDates).map(e => e.url))].slice(0, 30);
    const dateMap = new Map();
    for (let i = 0; i < needDateUrls.length; i += DETAIL_BATCH_SIZE) {
      const batch = needDateUrls.slice(i, i + DETAIL_BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(async (url) => {
        const html = await fetchText(url);
        const dates = parseDatesFromHtml(html);
        const meta = parseDetailMeta(html);
        return { url, dates, meta };
      }));
      for (const r of results) {
        if (r.status === "fulfilled") dateMap.set(r.value.url, r.value);
      }
    }

    // 日付補完
    const expanded = [];
    for (const ev of events) {
      if (ev.needDates) {
        const detail = dateMap.get(ev.url);
        if (detail && detail.dates && detail.dates.length > 0) {
          for (const dd of detail.dates) {
            expanded.push({ ...ev, y: dd.y, mo: dd.mo, d: dd.d, venue: ev.venue || sanitizeVenueText((detail.meta && detail.meta.venue) || ""), needDates: false });
          }
        }
      } else {
        expanded.push(ev);
      }
    }

    // 範囲内フィルタ + レコード生成
    const byId = new Map();
    for (const ev of expanded) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;
      const venueName = ev.venue || "";
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      let geoCandidates = buildGeoCandidates(venueName, "");
      if (getFacilityAddressFromMaster && venueName) {
        const fmAddr = getFacilityAddressFromMaster(AYASE_SOURCE.key, venueName);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), AYASE_SOURCE);
      point = resolveEventPoint(AYASE_SOURCE, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(AYASE_SOURCE, venueName, `${label} ${venueName}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, null);
      byId.set(id, {
        id, source, source_label: label,
        title: ev.title, starts_at: startsAt, ends_at: endsAt,
        venue_name: venueName, address: address || "",
        url: ev.url,
        lat: point ? point.lat : null, lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectAyaseEvents };

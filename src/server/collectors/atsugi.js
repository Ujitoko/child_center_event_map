const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  parseTimeRangeFromText,
  buildStartsEndsForDate,
  parseDatesFromHtml,
} = require("../date-utils");
const { ATSUGI_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");
const { sanitizeVenueText, sanitizeAddressText } = require("../text-utils");

const CHILD_TITLE_RE =
  /(子ども|こども|子育て|親子|育児|乳幼児|幼児|児童|キッズ|ベビー|赤ちゃん|読み聞かせ|絵本|離乳食|妊娠|出産|おはなし|ブックスタート)/;
const DETAIL_BATCH_SIZE = 6;

function isChildRelated(entry) {
  // event_fieldsに「子育て」があるか
  if (entry.event && entry.event.event_fields) {
    const fields = Object.values(entry.event.event_fields);
    if (fields.some(f => /子育て|子ども|こども/.test(f))) return true;
  }
  if (CHILD_TITLE_RE.test(entry.page_name || "")) return true;
  if (entry.url && /\/kodomo\//.test(entry.url)) return true;
  return false;
}

function buildGeoCandidates(venue, address) {
  const candidates = [];
  if (address) {
    const full = address.includes("厚木市") ? address : `厚木市${address}`;
    candidates.push(`神奈川県${full}`);
  }
  if (venue) {
    candidates.push(`神奈川県厚木市 ${venue}`);
  }
  return [...new Set(candidates)];
}

function createCollectAtsugiEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  return async function collectAtsugiEvents(maxDays) {
    const source = `ward_${ATSUGI_SOURCE.key}`;
    const label = ATSUGI_SOURCE.label;
    const months = getMonthsForRange(maxDays);

    // calendar.json から取得 (月別)
    const rawEntries = [];
    for (const ym of months) {
      const url = `${ATSUGI_SOURCE.baseUrl}/calendar.json?year=${ym.year}&month=${ym.month}&eventTypeNo=1`;
      try {
        const text = await fetchText(url);
        const entries = JSON.parse(text);
        if (Array.isArray(entries)) rawEntries.push(...entries);
      } catch (e) {
        console.warn(`[${label}] calendar.json ${ym.year}/${ym.month} failed:`, e.message || e);
        // フォールバック: HTMLページをパース
        try {
          const htmlUrl = `${ATSUGI_SOURCE.baseUrl}/calendar.html?year=${ym.year}&month=${ym.month}&eventTypeNo=1`;
          const html = await fetchText(htmlUrl);
          const linkRe = /<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
          let m;
          while ((m = linkRe.exec(html)) !== null) {
            const href = m[1].replace(/&amp;/g, "&").trim();
            const title = stripTags(m[2]).trim();
            if (href && title && /soshiki|kodomo/.test(href)) {
              const absUrl = href.startsWith("http") ? href : `${ATSUGI_SOURCE.baseUrl}${href}`;
              rawEntries.push({ page_name: title, url: absUrl, date_list: [] });
            }
          }
        } catch {}
      }
    }

    // 子育てフィルタ
    const childEntries = rawEntries.filter(isChildRelated);

    // 重複除去
    const uniqueMap = new Map();
    for (const entry of childEntries) {
      const key = entry.url || entry.page_name;
      if (!uniqueMap.has(key)) uniqueMap.set(key, entry);
    }
    const uniqueEntries = Array.from(uniqueMap.values());

    // 日付展開
    const events = [];
    for (const entry of uniqueEntries) {
      const title = (entry.page_name || "").trim();
      if (!title) continue;
      const eventUrl = entry.url || ATSUGI_SOURCE.baseUrl;
      const venue = sanitizeVenueText((entry.event && entry.event.event_place) || "");
      const dateList = entry.date_list || [];

      if (dateList.length > 0) {
        // date_list: [["YYYY-MM-DD", "YYYY-MM-DD"], ...]
        for (const range of dateList) {
          if (!Array.isArray(range) || range.length === 0) continue;
          const startDate = range[0];
          const endDate = range[range.length - 1] || startDate;
          const parts = startDate.split("-");
          if (parts.length !== 3) continue;
          const y = Number(parts[0]);
          const mo = Number(parts[1]);
          const d = Number(parts[2]);
          events.push({ title, url: eventUrl, y, mo, d, venue });
          // 期間イベントの場合、終了日も追加
          if (endDate !== startDate) {
            const eParts = endDate.split("-");
            if (eParts.length === 3) {
              const ey = Number(eParts[0]);
              const emo = Number(eParts[1]);
              const ed = Number(eParts[2]);
              if (ey !== y || emo !== mo || ed !== d) {
                events.push({ title, url: eventUrl, y: ey, mo: emo, d: ed, venue });
              }
            }
          }
        }
      } else {
        // 日付がない場合は詳細ページから取得
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
            const newVenue = ev.venue || sanitizeVenueText((detail.meta && detail.meta.venue) || "");
            expanded.push({ ...ev, y: dd.y, mo: dd.mo, d: dd.d, venue: newVenue, needDates: false });
          }
        }
      } else {
        expanded.push(ev);
      }
    }

    // 範囲内フィルタ + 重複除去
    const byId = new Map();
    for (const ev of expanded) {
      if (!inRangeJst(ev.y, ev.mo, ev.d, maxDays)) continue;

      const venueName = ev.venue || "";
      const dateKey = `${ev.y}${String(ev.mo).padStart(2, "0")}${String(ev.d).padStart(2, "0")}`;
      const id = `${source}:${ev.url}:${ev.title}:${dateKey}`;
      if (byId.has(id)) continue;

      // ジオコーディング
      let geoCandidates = buildGeoCandidates(venueName, "");
      if (getFacilityAddressFromMaster && venueName) {
        const fmAddr = getFacilityAddressFromMaster(ATSUGI_SOURCE.key, venueName);
        if (fmAddr) {
          const full = /神奈川県/.test(fmAddr) ? fmAddr : `神奈川県${fmAddr}`;
          geoCandidates.unshift(full);
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), ATSUGI_SOURCE);
      point = resolveEventPoint(ATSUGI_SOURCE, venueName, point, `${label} ${venueName}`);
      const address = resolveEventAddress(ATSUGI_SOURCE, venueName, `${label} ${venueName}`, point);

      const { startsAt, endsAt } = buildStartsEndsForDate({ y: ev.y, mo: ev.mo, d: ev.d }, null);
      byId.set(id, {
        id,
        source,
        source_label: label,
        title: ev.title,
        starts_at: startsAt,
        ends_at: endsAt,
        venue_name: venueName,
        address: address || "",
        url: ev.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
      });
    }

    const results = Array.from(byId.values());
    console.log(`[${label}] ${results.length} events collected`);
    return results;
  };
}

module.exports = { createCollectAtsugiEvents };

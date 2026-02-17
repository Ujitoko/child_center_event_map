const { normalizeText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  parseDateSpans,
  explodeSpanToDates,
  parseDatesFromHtml,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { extractVenueFromTitle, hasJidokanHint } = require("../venue-utils");
const { isLikelyWardOfficeAddress } = require("../address-utils");
const { collectDetailMetaMap } = require("../ward-parsing");
const { SETAGAYA_SOURCE, SETAGAYA_JIDOKAN_URL_RE } = require("../../config/wards");

function parseSetagayaMonth(html) {
  const out = [];
  const re =
    /<div class="event_item">[\s\S]*?<p class="event_item_ttl">\s*<a href="([^"]+\.html[^"]*)">([\s\S]*?)<\/a>\s*<\/p>[\s\S]*?(?:<p class="event_item_date">([\s\S]*?)<\/p>)?[\s\S]*?<\/div>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(String(m[2] || "").replace(/<[^>]+>/g, ""));
    const dateText = normalizeText(String(m[3] || "").replace(/<[^>]+>/g, ""));
    if (!hrefRaw || !title) continue;
    const absUrl = hrefRaw.startsWith("http") ? hrefRaw : `${SETAGAYA_SOURCE.baseUrl}${hrefRaw}`;
    if (!hasJidokanHint(title) && !SETAGAYA_JIDOKAN_URL_RE.test(absUrl)) continue;
    out.push({ title, url: absUrl, dateText });
  }
  return out;
}

function buildGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(東京都|世田谷区)/.test(address)) add(`東京都世田谷区${address}`);
    add(address);
  }
  if (venue) add(`東京都世田谷区${venue}`);
  if (title) add(`東京都世田谷区${extractVenueFromTitle(title)}`);
  return cands;
}

function createCollectSetagayaJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  async function collectSetagayaJidokanEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rowsAll = [];
    for (const ym of months) {
      const url = `${SETAGAYA_SOURCE.baseUrl}${SETAGAYA_SOURCE.listPath}?type=2&year=${ym.year}&month=${ym.month}`;
      try {
        const html = await fetchText(url);
        rowsAll.push(...parseSetagayaMonth(html));
      } catch (e) {
        console.warn("[setagaya] month fetch failed:", e.message || e);
      }
    }

    const detailMetaMap = await collectDetailMetaMap(rowsAll, maxDays);
    const byId = new Map();

    for (const row of rowsAll) {
      const candidates = [];
      for (const span of parseDateSpans(row.dateText)) {
        candidates.push(...explodeSpanToDates(span));
      }
      const detailMeta = detailMetaMap.get(row.url) || { dates: [], timeRange: null, venue: "", address: "" };
      candidates.push(...detailMeta.dates);
      if (candidates.length === 0) continue;

      const uniq = new Map();
      for (const d of candidates) {
        const key = `${d.y}-${d.mo}-${d.d}`;
        if (!uniq.has(key)) uniq.set(key, d);
      }

      const venueName = detailMeta.venue || extractVenueFromTitle(row.title);
      const rawAddressCandidate = detailMeta.address || "";
      const rawAddressText = isLikelyWardOfficeAddress(SETAGAYA_SOURCE.key, rawAddressCandidate) ? "" : rawAddressCandidate;
      const rowTimeRange = detailMeta.timeRange || parseTimeRangeFromText(`${row.title} ${row.dateText}`);
      const geoVenue = normalizeText(String(venueName || "").replace(/^世田谷区/, ""));
      // Check facility address master for address if detail page didn't provide one
      let geoAddress = rawAddressText;
      if (!geoAddress && getFacilityAddressFromMaster && venueName) {
        geoAddress = getFacilityAddressFromMaster(SETAGAYA_SOURCE.key, venueName);
      }
      const geoCandidates = buildGeoCandidates(row.title, geoVenue || venueName, geoAddress);
      let point = await geocodeForWard(geoCandidates, SETAGAYA_SOURCE);
      point = resolveEventPoint(SETAGAYA_SOURCE, venueName, point, rawAddressText);
      const addressText = resolveEventAddress(SETAGAYA_SOURCE, venueName, rawAddressText, point);

      for (const d of uniq.values()) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, rowTimeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:setagaya:${row.url}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_setagaya",
          source_label: SETAGAYA_SOURCE.label,
          title: row.title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venueName,
          address: addressText,
          url: row.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${SETAGAYA_SOURCE.label} 児童館`,
          tags: ["setagaya_jidokan_event", "setagaya_jidokan"],
        });
      }
    }

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectSetagayaJidokanEvents;
}

module.exports = {
  createCollectSetagayaJidokanEvents,
};

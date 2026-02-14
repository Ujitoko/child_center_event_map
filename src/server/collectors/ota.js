const { normalizeText, sanitizeAddressText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags, parseDetailMeta } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
  parseOtaDatesFromText,
  parseOtaBaseYearMonth,
} = require("../date-utils");
const { extractTokyoAddress, isLikelyWardOfficeAddress } = require("../address-utils");
const { OTA_SOURCE } = require("../../config/wards");

function buildOtaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(東京都|大田区)/.test(address)) add(`東京都大田区${address}`);
    add(address);
  }
  if (venue) add(`東京都大田区${venue}`);
  if (title) add(`東京都大田区${title}`);
  return cands;
}

function buildOtaTags(facilityUrl, venueName, title) {
  const base = ["ota_jidokan_event"];
  const hay = `${facilityUrl || ""} ${venueName || ""} ${title || ""}`;
  if (/otakohiroba|おおたっこひろば/u.test(hay)) {
    base.push("ota_otakko_hiroba");
  } else {
    base.push("ota_jidokan");
  }
  return base;
}

function parseOtaFacilityLinks(indexHtml) {
  const out = [];
  const re = /<a href="([^"]*\/event\/jidoukan\/[^"]*\/index\.html[^"]*)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || /\/event\/jidoukan\/index\.html/i.test(hrefRaw)) continue;
    const abs = hrefRaw.startsWith("http") ? hrefRaw : `${OTA_SOURCE.baseUrl}${hrefRaw}`;
    const title = normalizeText(stripTags(m[2]));
    if (!out.some((x) => x.url === abs)) out.push({ url: abs, title });
  }
  return out;
}

function parseOtaMonthPageLinks(facilityUrl, html) {
  const out = [];
  const baseDir = facilityUrl.replace(/\/index\.html(?:\?.*)?$/i, "/");
  const re = /<a href="([^"]+\.html[^"]*)">([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw || /index\.html(?:\?|$)/i.test(hrefRaw)) continue;
    const abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, facilityUrl).toString();
    if (!abs.startsWith(baseDir)) continue;
    if (!out.includes(abs)) out.push(abs);
  }
  return out.slice(0, 8);
}

function parseOtaEventsFromDetail(detailHtml, monthUrl, facilityName) {
  const { y: baseY, mo: baseMo } = parseOtaBaseYearMonth(detailHtml);
  const out = [];
  const rowRe = /<tr[\s\S]*?<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(detailHtml)) !== null) {
    const tds = [];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let td;
    while ((td = tdRe.exec(row[0])) !== null) tds.push(stripTags(td[1]));
    if (tds.length < 2) continue;
    const title = normalizeText(tds[0]);
    if (!title || /(行事名|対象|内容|時間)/.test(title)) continue;
    const bodyText = normalizeText(tds[1] || "");
    const dateCell = tds[Math.min(2, tds.length - 1)];
    const dates = parseOtaDatesFromText(dateCell, baseY, baseMo);
    if (dates.length === 0) continue;
    let venue = facilityName || "大田区児童館";
    const vm = bodyText.match(/([^\s]{2,50}(?:児童館|ひろば|センター|会館))/u);
    if (vm) venue = vm[1];
    const rowAddress = extractTokyoAddress(`${bodyText} ${tds.join(" ")}`);
    const timeRange = parseTimeRangeFromText(`${title} ${bodyText} ${dateCell} ${tds.join(" ")}`);
    out.push({
      title,
      dates,
      timeRange,
      venue_name: venue,
      address: rowAddress,
      url: monthUrl,
    });
  }
  return out;
}

function createCollectOtaJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, setFacilityAddressToMaster } = deps;

  async function collectOtaJidokanEvents(maxDays) {
    let indexHtml = "";
    try {
      indexHtml = await fetchText(`${OTA_SOURCE.baseUrl}/event/jidoukan/index.html`);
    } catch (e) {
      console.warn("[ota] index fetch failed:", e.message || e);
      return [];
    }

    const facilities = parseOtaFacilityLinks(indexHtml).slice(0, 80);
    const byId = new Map();

    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < facilities.length) {
        const i = idx; idx += 1;
        const facility = facilities[i];
      let facilityHtml = "";
      try {
        facilityHtml = await fetchText(facility.url);
      } catch {
        continue;
      }
      const facilityDetail = parseDetailMeta(facilityHtml);
      let facilityAddress = sanitizeAddressText(facilityDetail.address || "") || extractTokyoAddress(facilityHtml);
      if (isLikelyWardOfficeAddress(OTA_SOURCE.key, facilityAddress)) facilityAddress = "";
      if (facility.title && facilityAddress) setFacilityAddressToMaster(OTA_SOURCE.key, facility.title, facilityAddress);
      const monthLinks = parseOtaMonthPageLinks(facility.url, facilityHtml);
      for (const monthUrl of monthLinks) {
        let detailHtml = "";
        try {
          detailHtml = await fetchText(monthUrl);
        } catch {
          continue;
        }
        const rows = parseOtaEventsFromDetail(detailHtml, monthUrl, facility.title);
        for (const row of rows) {
          const venueName = row.venue_name || facility.title || "大田区児童館";
          const rawAddress = isLikelyWardOfficeAddress(OTA_SOURCE.key, row.address || "")
            ? ""
            : row.address || facilityAddress || "";
          const tags = buildOtaTags(monthUrl, venueName, row.title);
          const geoVenue = normalizeText(String(venueName || "").replace(/^大田区/, ""));
          const geoCandidates = buildOtaGeoCandidates(row.title, geoVenue || venueName, rawAddress);
          let point = await geocodeForWard(geoCandidates, OTA_SOURCE);
          point = resolveEventPoint(OTA_SOURCE, venueName, point, rawAddress);
          const address = resolveEventAddress(OTA_SOURCE, venueName, rawAddress, point);
          for (const d of row.dates) {
            if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
            const { startsAt, endsAt } = buildStartsEndsForDate(d, row.timeRange, 10);
            const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
            const id = `ward:ota:${monthUrl}:${row.title}:${dateKey}`;
            if (byId.has(id)) continue;
            byId.set(id, {
              id,
              source: "ward_ota",
              source_label: OTA_SOURCE.label,
              title: row.title,
              starts_at: startsAt,
              ends_at: endsAt,
              updated_at: startsAt,
              venue_name: venueName,
              address,
              url: row.url,
              lat: point ? point.lat : null,
              lng: point ? point.lng : null,
              participants: null,
              waitlisted: null,
              recently_updated: true,
              query_hit: `${OTA_SOURCE.label} 児童館`,
              tags,
            });
          }
        }
      }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectOtaJidokanEvents;
}

module.exports = {
  createCollectOtaJidokanEvents,
};

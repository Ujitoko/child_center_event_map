const { normalizeJaDigits, normalizeText } = require("../text-utils");
const { normalizeJapaneseEraYears } = require("../text-utils");
const { buildStartsEndsForDate, inRangeJst, parseTimeRangeFromText, parseOtaDatesFromText, parseJpYearMonth, inferChiyodaMonthlyFallbackDate } = require("../date-utils");
const { buildWardGeoCandidates } = require("../ward-parsing");
const { extractTokyoAddress } = require("../address-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags, parseAnchors } = require("../html-utils");
const { CHUO_SOURCE } = require("../../config/wards");

function createCollectChuoAkachanTengokuEvents(deps) {
  const {
    geocodeForWard,
    resolveEventAddress,
    resolveEventPoint,
    getFacilityAddressFromMaster,
  } = deps;

  function parseChuoAkachanTengokuRows(html, pageUrl) {
    const monthHint = parseJpYearMonth(html);
    const out = [];
    const sectionRe =
      /<h4[^>]*>\s*(?:<a[^>]*>\s*&nbsp;\s*<\/a>\s*)?([\s\S]*?)<\/h4>\s*([\s\S]*?)(?=<h4[^>]*>|<p><strong>|<h2>|<div id="cms_hidden_page_event_group"|$)/gi;
    let s;
    while ((s = sectionRe.exec(html)) !== null) {
      const facility = normalizeText(stripTags(s[1]));
      const block = s[2] || "";
      if (!facility) continue;
      const pdfLink = parseAnchors(block, pageUrl).find((a) => /\.pdf(?:\?|$)/i.test(a.url));
      const defaultUrl = (pdfLink && pdfLink.url) || pageUrl;

      const eventRe = /<h5[^>]*>([\s\S]*?)<\/h5>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi;
      let e;
      while ((e = eventRe.exec(block)) !== null) {
        const title = normalizeText(stripTags(e[1]));
        const ul = e[2] || "";
        if (!title) continue;
        const liTexts = [];
        const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        let li;
        while ((li = liRe.exec(ul)) !== null) {
          const t = normalizeText(stripTags(li[1]));
          if (t) liTexts.push(t);
        }
        if (liTexts.length === 0) continue;
        const dateLine = liTexts.find((t) => /(\u958b\u50ac\u65e5\u6642|\u65e5\u6642|\u958b\u50ac\u65e5|\u65e5\u7a0b)/.test(t)) || liTexts[0];
        const normalized = normalizeJapaneseEraYears(normalizeJaDigits(`${title} ${dateLine} ${liTexts.join(" ")}`));
        let dates = parseOtaDatesFromText(normalized, monthHint.y, monthHint.mo);
        if (dates.length === 0) {
          const fallback = inferChiyodaMonthlyFallbackDate(dateLine, monthHint.y, monthHint.mo);
          if (fallback) dates = [fallback];
        }
        if (dates.length === 0) continue;

        const linkInEvent = parseAnchors(ul, pageUrl).find((a) => /\.pdf(?:\?|$)|city\.chuo\.lg\.jp\/.+\.html/i.test(a.url));
        out.push({
          facility,
          title,
          dates,
          timeRange: parseTimeRangeFromText(normalized),
          bodyText: liTexts.join(" "),
          url: (linkInEvent && linkInEvent.url) || defaultUrl,
        });
      }
    }
    return out;
  }

  return async function collectChuoAkachanTengokuEvents(maxDays) {
    const pageUrl = `${CHUO_SOURCE.baseUrl}/a0025/kosodate/kosodate/shien/akachantengoku/akachantengokuevent.html`;
    let html = "";
    try {
      html = await fetchText(pageUrl);
    } catch (e) {
      console.warn("[chuo-akachan] page fetch failed:", e.message || e);
      return [];
    }
    const rows = parseChuoAkachanTengokuRows(html, pageUrl);
    const byId = new Map();
    for (const row of rows) {
      const venueName = row.facility || `${CHUO_SOURCE.label}\u5150\u7ae5\u9928`;
      let rawAddress = extractTokyoAddress(`${row.bodyText || ""} ${row.facility || ""}`);
      if (!rawAddress && getFacilityAddressFromMaster) {
        rawAddress = getFacilityAddressFromMaster(CHUO_SOURCE.key, venueName);
      }
      const geoCandidates = buildWardGeoCandidates(CHUO_SOURCE.label, row.title, venueName, rawAddress);
      if (getFacilityAddressFromMaster) {
        const fmAddr = getFacilityAddressFromMaster(CHUO_SOURCE.key, venueName);
        if (fmAddr && fmAddr !== rawAddress) {
          const fmCands = buildWardGeoCandidates(CHUO_SOURCE.label, "", "", fmAddr);
          for (let ci = fmCands.length - 1; ci >= 0; ci--) {
            if (!geoCandidates.includes(fmCands[ci])) geoCandidates.unshift(fmCands[ci]);
          }
        }
      }
      let point = await geocodeForWard(geoCandidates.slice(0, 7), CHUO_SOURCE);
      point = resolveEventPoint(CHUO_SOURCE, venueName, point, rawAddress);
      const address = resolveEventAddress(CHUO_SOURCE, venueName, rawAddress, point);

      for (const d of row.dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, row.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:chuo:akachan:${row.url}:${row.facility}:${row.title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_chuo",
          source_label: CHUO_SOURCE.label,
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
          query_hit: `${CHUO_SOURCE.label} \u3042\u304b\u3061\u3083\u3093\u5929\u56fd`,
          tags: ["chuo_jidokan_event", "chuo_akachan_tengoku"],
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  };
}

module.exports = {
  createCollectChuoAkachanTengokuEvents,
};

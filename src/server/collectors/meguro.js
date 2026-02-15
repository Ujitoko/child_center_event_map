const { normalizeText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  parseDatesFromHtml,
  parseOtaDatesFromText,
  parseMonthDayFromTextWithBase,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
} = require("../date-utils");
const { extractTokyoAddress, isLikelyWardOfficeAddress } = require("../address-utils");
const { hasJidokanHint } = require("../venue-utils");
const { MEGURO_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

function extractSectionByH2(html, headingRegexSource) {
  const re = new RegExp(`<h2[^>]*>\\s*(?:${headingRegexSource})\\s*<\\/h2>([\\s\\S]*?)(?=<h2[^>]*>|$)`, "i");
  const m = html.match(re);
  return m ? m[1] : "";
}

function parseMeguroEventLinks(indexHtml) {
  const out = [];
  const re = /<a[^>]+href="([^"]*\/(?:event|kosodatekyouiku|jidoukan|kosodate)\/[^"]+\.html[^"]*)"/gi;
  let m;
  while ((m = re.exec(indexHtml)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    if (!hrefRaw) continue;
    let abs = "";
    try {
      abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, `${MEGURO_SOURCE.baseUrl}/`).toString();
    } catch { continue; }
    if (/\/(?:event|kosodatekyouiku|kosodate|jidoukan)\/index(?:\.html)?(?:\?|$)/i.test(abs)) continue;
    if (!/city\.meguro\.tokyo\.jp/i.test(abs)) continue;
    if (!out.includes(abs)) out.push(abs);
  }
  return out;
}

function extractMeguroVenueFromTitle(title) {
  const t = normalizeText(title);
  let m = t.match(/([^\s]{1,60}(?:児童館|児童センター|子育て児童ひろば))/u);
  if (m) return m[1];
  m = t.match(/([^\s]{1,60}(?:ひろば|会館))/u);
  if (m) return m[1];
  return "目黒区児童館";
}

function buildMeguroGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(東京都|目黒区)/.test(address)) add(`東京都目黒区${address}`);
    add(address);
  }
  if (venue) add(`東京都目黒区${venue}`);
  if (title) add(`東京都目黒区${title}`);
  return cands;
}

function createCollectMeguroJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, getFacilityAddressFromMaster } = deps;

  async function collectMeguroJidokanEvents(maxDays) {
    const indexUrls = [
      `${MEGURO_SOURCE.baseUrl}/event/index.html`,
      `${MEGURO_SOURCE.baseUrl}/kosodatekyouiku/kosodate/shien/ibashozukuri/jidoukan/jidoukanevent/index.html`,
      `${MEGURO_SOURCE.baseUrl}/houkago/kosodatekyouiku/kosodate/nixyuuyoujikatudou.html`,
      `${MEGURO_SOURCE.baseUrl}/kosodatekyouiku/kosodate/shien/ibashozukuri/index.html`,
      `${MEGURO_SOURCE.baseUrl}/kosodatekyouiku/kosodate/shien/index.html`,
    ];
    let allHtml = "";
    for (const indexUrl of indexUrls) {
      try {
        allHtml += " " + await fetchText(indexUrl);
      } catch (e) {
        if (indexUrl === indexUrls[0]) console.warn("[meguro] index fetch failed:", e.message || e);
      }
    }
    if (!allHtml.trim()) return [];

    const detailUrls = parseMeguroEventLinks(allHtml).slice(0, 400);
    if (detailUrls.length === 0) return [];

    const now = parseYmdFromJst(new Date());
    const byId = new Map();
    const concurrency = 6;
    let idx = 0;

    async function worker() {
      while (idx < detailUrls.length) {
        const i = idx;
        idx += 1;
        const detailUrl = detailUrls[i];
        let html = "";
        try {
          html = await fetchText(detailUrl);
        } catch {
          continue;
        }

        const h1Raw = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "";
        const title = normalizeText(stripTags(h1Raw));
        if (!title) continue;

        const dateSection = extractSectionByH2(html, "日時|開催日|日程|期間");
        const placeSection = extractSectionByH2(html, "会場|場所|開催場所|実施場所|ところ");
        const taiSection = extractSectionByH2(html, "対象|参加|内容|概要");
        const contentHay = `${title} ${normalizeText(stripTags(dateSection))} ${normalizeText(stripTags(placeSection))} ${normalizeText(stripTags(taiSection))}`;
        if (!WARD_CHILD_HINT_RE.test(contentHay)) continue;

        const dateSectionText = normalizeText(stripTags(dateSection));
        const allText = normalizeText(stripTags(html));

        let dates = parseDatesFromHtml(`${dateSection} ${h1Raw}`);
        if (dates.length === 0) {
          dates = parseOtaDatesFromText(`${dateSectionText} ${title}`, now.y, now.m);
        }
        if (dates.length === 0) {
          dates = parseMonthDayFromTextWithBase(`${dateSectionText} ${title}`, now.y, now.m);
        }
        if (dates.length === 0) {
          dates = parseDatesFromHtml(html);
        }
        if (dates.length === 0) continue;

        const timeRange = parseTimeRangeFromText(`${dateSectionText} ${title} ${allText}`);

        const placeSectionText = normalizeText(stripTags(placeSection));
        const venue = extractMeguroVenueFromTitle(`${title} ${placeSectionText}`);
        let rawAddress =
          extractTokyoAddress(placeSectionText) ||
          extractTokyoAddress(allText);
        if (isLikelyWardOfficeAddress("meguro", rawAddress)) rawAddress = "";
        if (!rawAddress && getFacilityAddressFromMaster) {
          rawAddress = getFacilityAddressFromMaster(MEGURO_SOURCE.key, venue) || "";
        }

        const geoCandidates = buildMeguroGeoCandidates(title, venue, rawAddress);
        let point = await geocodeForWard(geoCandidates, MEGURO_SOURCE);
        point = resolveEventPoint(MEGURO_SOURCE, venue, point, rawAddress);
        const address = resolveEventAddress(MEGURO_SOURCE, venue, rawAddress, point);

        for (const d of dates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:meguro:${detailUrl}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_meguro",
            source_label: MEGURO_SOURCE.label,
            title,
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: venue,
            address,
            url: detailUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${MEGURO_SOURCE.label} 児童館`,
            tags: ["meguro_jidokan_event", "meguro_jidokan"],
          });
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectMeguroJidokanEvents;
}

module.exports = {
  createCollectMeguroJidokanEvents,
};

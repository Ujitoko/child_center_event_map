const { normalizeText, normalizeJaDigits, sanitizeAddressText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags, parseAnchors } = require("../html-utils");
const { toJstDate, parseYmdFromJst, inRangeJst, parseDatesFromHtml, parseJpYearMonth, parseTimeRangeFromText } = require("../date-utils");
const { SHINAGAWA_SOURCE, SHINAGAWA_POCKET_BASE } = require("../../config/wards");

function parseShinagawaPocketDate(textRaw) {
  const text = normalizeText(textRaw);
  const m = text.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

function parseShinagawaPocketDetailMeta(html) {
  const dateText = normalizeText(stripTags((html.match(/<p[^>]*class="right-align"[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || ""));
  const date = parseYmdFromJpText(dateText);
  const bodyText = normalizeJaDigits(normalizeText(stripTags((html.match(/<div[^>]*class="announcement-article"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "")));
  const text = bodyText
    .replace(/(\d{1,2})\s*\u6642(?!\s*\d)/g, "$1:00")
    .replace(/\u5348\u524D/g, "AM ")
    .replace(/\u5348\u5F8C/g, "PM ")
    .replace(/\uFF1A/g, ":")
    .replace(/\u6642/g, ":")
    .replace(/\u5206/g, "")
    .replace(/[\u301C\uFF5E\u30FC\uFF0D\u2212]/g, "~")
    .replace(/\u304B\u3089/g, "~");
  const to24h = (meridiem, hRaw) => {
    let h = Number(hRaw);
    if (!Number.isFinite(h)) return null;
    if (meridiem === "PM" && h < 12) h += 12;
    if (meridiem === "AM" && h === 12) h = 0;
    return h;
  };
  const rangeRe = /(?:\b(AM|PM)\s*)?(\d{1,2})(?::\s*(\d{1,2}))?\s*(?:~|-)\s*(?:\b(AM|PM)\s*)?(\d{1,2})(?::\s*(\d{1,2}))?/gi;
  let m;
  while ((m = rangeRe.exec(text)) !== null) {
    const mer1 = m[1] ? m[1].toUpperCase() : "";
    const mer2 = (m[4] ? m[4].toUpperCase() : "") || mer1;
    const startHour = to24h(mer1, m[2]);
    const startMinute = Number(m[3] || "0");
    const endHour = to24h(mer2, m[5]);
    const endMinute = Number(m[6] || "0");
    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(endHour) ||
      startHour < 0 ||
      startHour > 23 ||
      endHour < 0 ||
      endHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endMinute < 0 ||
      endMinute > 59
    ) {
      continue;
    }
    return { date, startHour, startMinute, endHour, endMinute };
  }
  return { date, startHour: null, startMinute: null, endHour: null, endMinute: null };
}

function parseYmdFromJpText(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw));
  let m = text.match(/(\d{4})\s*\u5E74\s*(\d{1,2})\s*\u6708\s*(\d{1,2})\s*\u65E5/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  m = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  return null;
}

function buildShinagawaGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => {
    const t = normalizeText(x);
    if (!t) return;
    if (!cands.includes(t)) cands.push(t);
  };
  if (address) {
    if (!/(東京都|品川区)/.test(address)) add(`東京都品川区${address}`);
    add(address);
  }
  if (venue) add(`東京都品川区${venue}`);
  if (title) add(`東京都品川区${title}`);
  return cands;
}

function createCollectShinagawaJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress, setFacilityAddressToMaster } = deps;

  return async function collectShinagawaJidokanEvents(maxDays) {
    let centerRootHtml = "";
    try {
      centerRootHtml = await fetchText(`${SHINAGAWA_POCKET_BASE}/open_announcement/center/`);
    } catch (e) {
      console.warn("[shinagawa] center root fetch failed:", e.message || e);
      return [];
    }

    const centerLinks = parseAnchors(centerRootHtml, `${SHINAGAWA_POCKET_BASE}/open_announcement/center/`)
      .map((x) => x.url)
      .filter((u) => /\/nursery\/detail\/S\d+/.test(u))
      .filter((u, i, arr) => arr.indexOf(u) === i)
      .slice(0, 120);

    const byId = new Map();
    const detailMetaCache = new Map();

    async function getDetailMeta(absUrl) {
      if (detailMetaCache.has(absUrl)) return detailMetaCache.get(absUrl);
      let meta = { date: null, startHour: null, startMinute: null, endHour: null, endMinute: null };
      try {
        const detailHtml = await fetchText(absUrl);
        meta = parseShinagawaPocketDetailMeta(detailHtml);
      } catch {
        // ignore detail fetch error
      }
      detailMetaCache.set(absUrl, meta);
      return meta;
    }

    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < centerLinks.length) {
        const ci = idx; idx += 1;
        const centerUrl = centerLinks[ci];
      let centerHtml = "";
      try {
        centerHtml = await fetchText(centerUrl);
      } catch {
        continue;
      }

      const centerName = normalizeText(stripTags((centerHtml.match(/<h1 class="caption page-title">([\s\S]*?)<\/h1>/i) || [])[1] || ""));
      const rowRe = /<tr>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
      let addressText = "";
      let rm;
      while ((rm = rowRe.exec(centerHtml)) !== null) {
        const k = normalizeText(stripTags(rm[1]));
        const v = normalizeText(stripTags(rm[2]));
        if (!addressText && /(\u4f4f\u6240|\u6240\u5728\u5730)/.test(k)) addressText = v;
      }
      addressText = sanitizeAddressText(addressText);
      if (centerName && addressText) setFacilityAddressToMaster(SHINAGAWA_SOURCE.key, centerName, addressText);

      const eventSearchLink = parseAnchors(centerHtml, centerUrl).find((x) => /\/event-calendar\/result\?/.test(x.url));
      const eventSearchUrl =
        eventSearchLink?.url ||
        `${SHINAGAWA_POCKET_BASE}/event-calendar/result?year_from=&month_from=&day_from=&year_to=&month_to=&day_to=&tags%5B%5D=${encodeURIComponent(
          centerName
        )}`;

      let eventListHtml = "";
      try {
        eventListHtml = await fetchText(eventSearchUrl);
      } catch {
        continue;
      }

      const geoCandidates = buildShinagawaGeoCandidates(centerName, centerName, addressText);
      let point = await geocodeForWard(geoCandidates, SHINAGAWA_SOURCE);
      const venueName = centerName || "\u54c1\u5ddd\u533a\u5150\u7ae5\u30bb\u30f3\u30bf\u30fc";
      point = resolveEventPoint(SHINAGAWA_SOURCE, venueName, point, addressText);
      const resolvedAddress = resolveEventAddress(SHINAGAWA_SOURCE, venueName, addressText, point);

      const itemRe = /<li class="list-item">([\s\S]*?)<\/li>/gi;
      let im;
      while ((im = itemRe.exec(eventListHtml)) !== null) {
        const block = im[1];
        const href = (block.match(/<a class="list-item-link" href="([^"]+)"/i) || [])[1] || "";
        const dateText = normalizeText(stripTags((block.match(/<div[^>]*class="text-smaller"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""));
        const rawTitle = (block.match(/<div[^>]*class="text-smaller"[^>]*>[\s\S]*?<\/div>\s*<div>([\s\S]*?)<\/div>/i) || [])[1] || "";
        const titleText = normalizeText(stripTags(rawTitle));
        if (!href || !titleText) continue;
        const d = parseShinagawaPocketDate(dateText);
        if (!d) continue;
        const absUrl = href.startsWith("http") ? href : new URL(href, SHINAGAWA_POCKET_BASE).toString();
        const meta = await getDetailMeta(absUrl);
        const baseDate = meta.date || d;
        if (!inRangeJst(baseDate.y, baseDate.mo, baseDate.d, maxDays)) continue;
        const sh = Number.isFinite(meta.startHour) ? meta.startHour : 10;
        const sm = Number.isFinite(meta.startMinute) ? meta.startMinute : 0;
        const startsAtDate = toJstDate(baseDate.y, baseDate.mo, baseDate.d, sh, sm);
        const startsAt = startsAtDate.toISOString();
        let endsAt = null;
        if (Number.isFinite(meta.endHour) && Number.isFinite(meta.endMinute)) {
          let endDate = toJstDate(baseDate.y, baseDate.mo, baseDate.d, meta.endHour, meta.endMinute);
          if (endDate < startsAtDate) endDate = new Date(endDate.getTime() + 86400000);
          endsAt = endDate.toISOString();
        }
        const dateKey = `${baseDate.y}${String(baseDate.mo).padStart(2, "0")}${String(baseDate.d).padStart(2, "0")}`;
        const id = `ward:shinagawa:${centerName}:${absUrl}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_shinagawa",
          source_label: SHINAGAWA_SOURCE.label,
          title: titleText,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venueName,
          address: resolvedAddress,
          url: absUrl,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${SHINAGAWA_SOURCE.label} \u5150\u7ae5\u9928`,
          tags: ["shinagawa_jidokan_event", "shinagawa_jidokan", "shinagawa_pocket"],
        });
      }
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  };
}

module.exports = { createCollectShinagawaJidokanEvents };

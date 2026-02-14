const { normalizeText, normalizeJaDigits, normalizeJapaneseEraYears, sanitizeAddressText, sanitizeVenueText } = require("../text-utils");
const { fetchText } = require("../fetch-utils");
const { stripTags, parseAnchors } = require("../html-utils");
const {
  parseYmdFromJst,
  inRangeJst,
  getMonthsForRange,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
  parseOtaDatesFromText,
} = require("../date-utils");
const { extractTokyoAddress } = require("../address-utils");
const {
  MINATO_SOURCE,
  MINATO_APII_URL,
  MINATO_ASSOCIE_FUREAI_URL,
  WARD_CHILD_HINT_RE,
  WARD_CHILD_URL_HINT_RE,
} = require("../../config/wards");

function parseMinatoListEventLinks(html, pageUrl) {
  const out = [];
  const re = /<p[^>]*class="event_item_cnt[^"]*"[^>]*>\s*<a href="([^"]+)">([\s\S]*?)<\/a>\s*<\/p>/gi;
  const listHint = WARD_CHILD_HINT_RE;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(stripTags(m[2]));
    if (!hrefRaw || !title) continue;
    let abs = "";
    try { abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString(); } catch { continue; }
    if (!/city\.minato\.tokyo\.jp/i.test(abs)) continue;
    if (!/\/(kouhou\/event|event|kodomo|kosodate|kyoiku|shienshisetsu|akasakashisetsuunei)\//i.test(abs) && !listHint.test(title)) continue;
    out.push({ url: abs, title });
  }
  return out;
}

function parseMinatoSectionText(html, headingJa) {
  const heading = headingJa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<h2[^>]*>\\s*${heading}\\s*<\\/h2>\\s*([\\s\\S]*?)(?=<h2[^>]*>|<div class="event_contents not_print"|<div class="box_link"|<\\/div>\\s*<\\/div>)`, "i");
  const m = html.match(re);
  return normalizeJaDigits(normalizeText(stripTags((m && m[1]) || "")));
}

function parseMinatoDetailMeta(html) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const dateHtml = (html.match(/<div[^>]*class="kaisai_date"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || "";
  const dateText = normalizeJaDigits(normalizeText(stripTags(dateHtml)));
  const placeText = parseMinatoSectionText(html, "\u958B\u50AC\u5834\u6240");
  const addressText = parseMinatoSectionText(html, "\u4F4F\u6240") || parseMinatoSectionText(html, "\u6240\u5728\u5730");
  const detailText = parseMinatoSectionText(html, "\u30A4\u30D9\u30F3\u30C8\u8A73\u7D30");
  const targetText = parseMinatoSectionText(html, "\u5BFE\u8C61");
  const bodyText = normalizeText(`${dateText} ${placeText} ${detailText} ${targetText}`);
  const normalizedDatePayload = normalizeJapaneseEraYears(`${dateText} ${title} ${bodyText}`);
  const now = parseYmdFromJst(new Date());
  const dates = parseOtaDatesFromText(normalizedDatePayload, now.y, now.m);
  const timeRange = parseTimeRangeFromText(`${dateText} ${bodyText}`);
  const venue_name = placeText || "\u6E2F\u533A\u5150\u7AE5\u9928";
  const address = sanitizeAddressText(addressText) || extractTokyoAddress(bodyText);
  return { title, dates, timeRange, venue_name, address, bodyText };
}

function parseNextDataJson(html) {
  const raw = (html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i) || [])[1] || "";
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseMinatoAssocieEvents(html, pageUrl) {
  const out = [];
  const re = /<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<\/a>\s*([\d]{4})\.([\d]{2})\.([\d]{2})<br>\s*([^<]{1,160})/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
    const title = normalizeText(stripTags(m[5]));
    const y = Number(m[2]); const mo = Number(m[3]); const d = Number(m[4]);
    if (!title || !Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) continue;
    let url = pageUrl;
    try { url = hrefRaw ? (hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString()) : pageUrl; } catch { url = pageUrl; }
    out.push({ title, dates: [{ y, mo, d }], timeRange: null, venue_name: "\u5B50\u3069\u3082\u3075\u308C\u3042\u3044\u30EB\u30FC\u30E0(\u897F\u9EBB\u5E03)", address: "", url, lat: null, lng: null, bodyText: title, tags: ["minato_jidokan_event", "minato_fureairoom"] });
  }
  return out;
}

function parseMinatoAppiiFacilityLinks(html, pageUrl) {
  const anchors = parseAnchors(html, pageUrl);
  const out = [];
  for (const a of anchors) {
    if (!/city\.minato\.tokyo\.jp/i.test(a.url)) continue;
    if (!/(shienshisetsu|appy|apii|fureairoom)/i.test(a.url)) continue;
    if (!/(あっぴぃ|子どもふれあいルーム)/.test(a.text)) continue;
    if (!out.includes(a.url)) out.push(a.url);
  }
  return out.slice(0, 24);
}

function parseMinatoExternalFacilityLinks(html, pageUrl) {
  const anchors = parseAnchors(html, pageUrl);
  const out = [];
  for (const a of anchors) {
    if (/city\.minato\.tokyo\.jp/i.test(a.url)) continue;
    if (!/(nihonhoiku|associe|fureairoom|appy)/i.test(a.url)) continue;
    if (!out.includes(a.url)) out.push(a.url);
  }
  return out.slice(0, 4);
}

function parseMinatoNihonhoikuEvents(html, pageUrl) {
  const data = parseNextDataJson(html);
  const pageProps = data?.props?.pageProps || {};
  const storeName = normalizeText(
    pageProps?.content?.baseInfo?.baseInfo?.storeNameKanji?.text ||
    stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split(/[|｜]/)[0]
  );
  const storeAddress = sanitizeAddressText(normalizeText(
    pageProps?.content?.baseInfo?.baseInfo?.address?.text ||
    pageProps?.content?.baseInfo?.address?.text ||
    pageProps?.content?.baseInfo?.baseInfo?.address ||
    pageProps?.content?.baseInfo?.address || ""
  ));
  const lat = Number(pageProps?.content?.baseInfo?.baseInfo?.latlng?.latitude);
  const lng = Number(pageProps?.content?.baseInfo?.baseInfo?.latlng?.longitude);
  const out = [];
  const groups = Array.isArray(pageProps?.posttypesWithPosts) ? pageProps.posttypesWithPosts : [];
  for (const g of groups) {
    const posts = Array.isArray(g?.posts) ? g.posts : [];
    for (const p of posts) {
      const title = normalizeText(p?.title || "");
      const iso = String(p?.period?.start || "").trim();
      if (!title || !iso) continue;
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) continue;
      const d = parseYmdFromJst(dt);
      const bodyText = normalizeText(p?.text || "");
      const timeRange = parseTimeRangeFromText(`${title} ${bodyText}`);
      const dateText = `${title} ${bodyText}`;
      const inferredDates = parseOtaDatesFromText(dateText, d.y, d.m);
      const monthHint = dateText.match(/(\d{1,2})\s*\u6708/);
      const hintedMonth = monthHint ? Number(monthHint[1]) : d.m;
      const inferredWithDayOnly = [...inferredDates];
      const dayOnlyRe = /(^|[^\d\u6708])([0-3]?\d)\s*\u65E5/g;
      let md;
      while ((md = dayOnlyRe.exec(dateText)) !== null) {
        const day = Number(md[2]);
        if (!Number.isFinite(day) || day < 1 || day > 31) continue;
        let y = d.y;
        if (hintedMonth < d.m - 6) y += 1;
        inferredWithDayOnly.push({ y, mo: hintedMonth, d: day });
      }
      const uniqDates = new Map();
      for (const x of inferredWithDayOnly) { const k = `${x.y}-${x.mo}-${x.d}`; if (!uniqDates.has(k)) uniqDates.set(k, x); }
      const dates = uniqDates.size ? Array.from(uniqDates.values()) : [{ y: d.y, mo: d.m, d: d.d }];
      let url = pageUrl;
      try { url = p?.detailLink ? (String(p.detailLink).startsWith("http") ? String(p.detailLink) : new URL(String(p.detailLink), pageUrl).toString()) : pageUrl; } catch { url = pageUrl; }
      out.push({ title, dates, timeRange, venue_name: storeName || "\u5B50\u80B2\u3066\u3072\u308D\u3070 \u3042\u3063\u3074\u3043", address: storeAddress, url, lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null, bodyText, tags: ["minato_jidokan_event", "minato_appii"] });
    }
  }
  return out;
}

function buildMinatoGeoCandidates(title, venue, address) {
  const cands = [];
  const add = (x) => { const t = normalizeText(x); if (!t) return; if (!cands.includes(t)) cands.push(t); };
  if (address) { if (!/\u6771\u4EAC\u90FD\s*\u6E2F\u533A/.test(address)) add(`\u6771\u4EAC\u90FD\u6E2F\u533A${address.replace(/^\s*\u6E2F\u533A/, "")}`); add(address); }
  if (venue) add(`\u6771\u4EAC\u90FD\u6E2F\u533A${venue}`);
  if (title) add(`\u6771\u4EAC\u90FD\u6E2F\u533A${title}`);
  return cands;
}

function createCollectMinatoJidokanEvents(deps) {
  const { geocodeForWard, sanitizeWardPoint, resolveEventPoint, resolveEventAddress } = deps;

  async function collectMinatoFacilityLinkedEvents(maxDays) {
    const raw = [];

    try {
      const associeHtml = await fetchText(MINATO_ASSOCIE_FUREAI_URL);
      raw.push(...parseMinatoAssocieEvents(associeHtml, MINATO_ASSOCIE_FUREAI_URL));
    } catch (e) {
      console.warn("[minato] associe fetch failed:", e.message || e);
    }

    const externalLinks = new Set();
    try {
      const apiiHtml = await fetchText(MINATO_APII_URL);
      const facilityPages = parseMinatoAppiiFacilityLinks(apiiHtml, MINATO_APII_URL);
      for (const fp of facilityPages) {
        try {
          const fHtml = await fetchText(fp);
          for (const ext of parseMinatoExternalFacilityLinks(fHtml, fp)) externalLinks.add(ext);
        } catch {
          // ignore facility page failure
        }
      }
    } catch (e) {
      console.warn("[minato] apii fetch failed:", e.message || e);
    }

    for (const ext of Array.from(externalLinks).slice(0, 50)) {
      let html = "";
      try {
        html = await fetchText(ext);
      } catch {
        continue;
      }
      if (/__NEXT_DATA__/.test(html) || /list\.nihonhoiku\.co\.jp/i.test(ext)) {
        raw.push(...parseMinatoNihonhoikuEvents(html, ext));
      } else if (/associe-international\.co\.jp/i.test(ext)) {
        raw.push(...parseMinatoAssocieEvents(html, ext));
      }
    }

    const byId = new Map();
    for (const ev of raw) {
      for (const d of ev.dates || []) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, ev.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:minato:linked:${ev.url}:${ev.title}:${dateKey}`;
        if (byId.has(id)) continue;

        let point = null;
        if (Number.isFinite(ev.lat) && Number.isFinite(ev.lng)) {
          point = sanitizeWardPoint({ lat: Number(ev.lat), lng: Number(ev.lng) }, MINATO_SOURCE);
        } else {
          const cands = buildMinatoGeoCandidates(ev.title, ev.venue_name, ev.address || "");
          point = await geocodeForWard(cands, MINATO_SOURCE);
        }
        const venueName = ev.venue_name || "\u6E2F\u533A\u5B50\u80B2\u3066\u652F\u63F4\u65BD\u8A2D";
        point = resolveEventPoint(MINATO_SOURCE, venueName, point, ev.address || "");
        const address = resolveEventAddress(MINATO_SOURCE, venueName, ev.address || "", point);

        byId.set(id, {
          id,
          source: "ward_minato",
          source_label: MINATO_SOURCE.label,
          title: ev.title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name: venueName,
          address,
          url: ev.url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${MINATO_SOURCE.label} \u5150\u7AE5\u9928`,
          tags: Array.isArray(ev.tags) && ev.tags.length ? ev.tags : ["minato_jidokan_event", "minato_facility"],
        });
      }
    }

    return Array.from(byId.values());
  }

  async function collectMinatoJidokanEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rows = [];
    for (const m of months) {
      const listUrls = [
        `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=2&siteid=1`,
        `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&siteid=1`,
        `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u3069\u3082")}`,
        `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u89aa\u5b50")}`,
        `${MINATO_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u80b2\u3066")}`,
      ];
      for (const listUrl of listUrls) {
        let html = "";
        try {
          html = await fetchText(listUrl);
        } catch {
          continue;
        }
        rows.push(...parseMinatoListEventLinks(html, listUrl));
      }
    }

    // Supplement with links from static kosodate pages
    const staticPages = [
      `${MINATO_SOURCE.baseUrl}/kodomo/katei/kosodate/jidoukan/index.html`,
      `${MINATO_SOURCE.baseUrl}/kenko/kenko/boshi/koryukai/index.html`,
      `${MINATO_SOURCE.baseUrl}/kodomo/katei/kosodate/index.html`,
    ];
    for (const pageUrl of staticPages) {
      try {
        const html = await fetchText(pageUrl);
        for (const a of parseAnchors(html, pageUrl)) {
          if (!/city\.minato\.tokyo\.jp/i.test(a.url)) continue;
          if (!/\.html(?:\?|$)/i.test(a.url)) continue;
          if (/\/index\.html$/i.test(a.url)) continue;
          if (!/(kodomo|kosodate|shienshisetsu|boshi|jidoukan|kyoiku)/i.test(a.url)) continue;
          const title = normalizeText(stripTags(a.text));
          if (title) rows.push({ url: a.url, title });
        }
      } catch {
        // ignore static page fetch error
      }
    }

    const uniqRows = [];
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
      uniqRows.push(row);
    }

    const byId = new Map();
    const facilityHint = /(\u5150\u7AE5\u9928|\u5150\u7AE5\u30BB\u30F3\u30BF\u30FC|\u5B50\u3069\u3082\u4E2D\u9AD8\u751F\u30D7\u30E9\u30B6|\u5B50\u3069\u3082\u5BB6\u5EAD\u652F\u63F4\u30BB\u30F3\u30BF\u30FC|\u5B50\u80B2\u3066\u3072\u308D\u3070|\u5B66\u7AE5\u30AF\u30E9\u30D6)/i;
    const titleHint = WARD_CHILD_HINT_RE;
    const appiiHint = /(\u3042\u3063\u3074\u3043|\u3075\u308C\u3042\u3044\u30EB\u30FC\u30E0|appy|apii)/i;
    const detailItems = uniqRows.slice(0, 600);
    const detailConcurrency = 6;
    let detailIdx = 0;
    async function detailWorker() {
      while (detailIdx < detailItems.length) {
        const di = detailIdx; detailIdx += 1;
        const row = detailItems[di];
      let detailHtml = "";
      try {
        detailHtml = await fetchText(row.url);
      } catch {
        continue;
      }

      const meta = parseMinatoDetailMeta(detailHtml);
      const title = meta.title || row.title;
      if (!title || !meta.dates || meta.dates.length === 0) continue;
      const hay = `${title} ${meta.venue_name || ""} ${meta.bodyText || ""} ${row.url} ${row.title}`;
      if (!facilityHint.test(hay) && !titleHint.test(hay) && !appiiHint.test(hay) && !WARD_CHILD_URL_HINT_RE.test(row.url) && !/\/kouhou\/event\//i.test(row.url))
        continue;

      const venueName = meta.venue_name || "\u6E2F\u533A\u5150\u7AE5\u9928";
      const rawAddress = meta.address || extractTokyoAddress(meta.bodyText || "");
      const geoCandidates = buildMinatoGeoCandidates(title, venueName, rawAddress);
      let point = await geocodeForWard(geoCandidates, MINATO_SOURCE);
      point = resolveEventPoint(MINATO_SOURCE, venueName, point, rawAddress);
      const address = resolveEventAddress(MINATO_SOURCE, venueName, rawAddress, point);

      for (const d of meta.dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:minato:${row.url}:${title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_minato",
          source_label: MINATO_SOURCE.label,
          title,
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
          query_hit: `${MINATO_SOURCE.label} \u5150\u7AE5\u9928`,
          tags: ["minato_jidokan_event", "minato_kids"],
        });
      }
      }
    }
    await Promise.all(Array.from({ length: detailConcurrency }, () => detailWorker()));

    const linked = await collectMinatoFacilityLinkedEvents(maxDays);
    for (const ev of linked) {
      if (!byId.has(ev.id)) byId.set(ev.id, ev);
    }

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectMinatoJidokanEvents;
}

module.exports = { createCollectMinatoJidokanEvents };

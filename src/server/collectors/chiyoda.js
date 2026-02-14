const { normalizeText, normalizeJaDigits, normalizeJapaneseEraYears, sanitizeAddressText, sanitizeVenueText } = require("../text-utils");
const { fetchText, fetchChiyodaPdfMarkdown } = require("../fetch-utils");
const { stripTags, parseAnchors } = require("../html-utils");
const { isLikelyAudienceText } = require("../venue-utils");
const {
  parseYmdFromJst,
  getMonthsForRange,
  inRangeJst,
  buildStartsEndsForDate,
  parseTimeRangeFromText,
  parseOtaDatesFromText,
  parseChiyodaSlashDates,
  inferChiyodaMonthlyFallbackDate,
  alignMonthlyFallbackDate,
} = require("../date-utils");
const { extractTokyoAddress } = require("../address-utils");
const { CHIYODA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

function parseChiyodaListRows(html, pageUrl, year, month) {
  const out = [];
  const block = (html.match(/<div id="tmp_event_cal_list">([\s\S]*?)<div id="event_cal_list_end_position">/i) || [])[1] || "";
  if (!block) return out;
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr;
  while ((tr = trRe.exec(block)) !== null) {
    const row = tr[0];
    const dayMatch = row.match(/cal_day_(\d{1,2})/i);
    if (!dayMatch) continue;
    const day = Number(dayMatch[1]);
    if (!Number.isFinite(day) || day < 1 || day > 31) continue;
    const linkRe = /<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(row)) !== null) {
      const hrefRaw = String(m[1] || "").replace(/&amp;/g, "&").trim();
      const title = normalizeText(stripTags(m[2]));
      if (!hrefRaw || !title) continue;
      let abs = "";
      try { abs = hrefRaw.startsWith("http") ? hrefRaw : new URL(hrefRaw, pageUrl).toString(); } catch { continue; }
      if (!/city\.chiyoda\.lg\.jp\/(?:koho\/event|koho\/kosodate|kurashi\/kosodate|kosodate|shisetsu\/jidokan|shisetsu\/gakko)\//i.test(abs)) continue;
      out.push({ url: abs, title, date: { y: Number(year), mo: Number(month), d: day } });
    }
  }
  return out;
}

function parseChiyodaDetailMeta(html, fallbackDate) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
  const allText = normalizeJaDigits(normalizeText(stripTags(html)));
  const sections = [];
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = h2Re.exec(html)) !== null) {
    const heading = normalizeText(stripTags(m[1]));
    const value = normalizeJaDigits(normalizeText(stripTags(m[2])));
    if (!heading || !value) continue;
    sections.push({ heading, value });
  }
  const dateText = sections.filter((x) => /日時|開催日|日程|開催期間/i.test(x.heading)).map((x) => x.value).join(" ");
  const timeRange = parseTimeRangeFromText(`${dateText} ${allText}`);
  const normalized = normalizeJapaneseEraYears(dateText || allText);
  const dates = parseOtaDatesFromText(normalized, fallbackDate.y, fallbackDate.mo);
  let venue_name = "";
  let address = "";
  for (const sec of sections) {
    if (/会場|場所|開催場所|実施場所/i.test(sec.heading)) { venue_name = sec.value; break; }
  }
  for (const sec of sections) {
    if (/住所|所在地/i.test(sec.heading)) { address = sec.value; break; }
  }
  if (!venue_name) { const v = normalized.match(/(?:会場|場所|名称)\s*[:：]\s*([^\n]{2,100})/); if (v) venue_name = normalizeText(v[1]); }
  if (!address) { const a = normalized.match(/(?:住所|所在地)\s*[:：]\s*([^\n]{6,180})/); if (a) address = normalizeText(a[1]); }
  if (!venue_name) venue_name = "千代田区子育て関連施設";
  address = sanitizeAddressText(address) || extractTokyoAddress(`${normalized} ${venue_name}`);
  return { title, dates: dates.length ? dates : [fallbackDate], timeRange, venue_name, address, bodyText: allText };
}

function buildChiyodaGeoCandidates(title, venue_name, address) {
  const out = [];
  const push = (s) => { const t = normalizeText(s); if (!t) return; if (!out.includes(t)) out.push(t); };
  if (address) { if (!/東京都/.test(address)) push(`東京都千代田区${address}`); push(address); }
  const venue = normalizeText(venue_name);
  const noisyVenueRe = /(無料|どなたでも|在住|在勤|在学|区民|対象|定員|申込|参加|講座|説明会|オンライン|Zoom|Web|WEB)/i;
  if (venue && !noisyVenueRe.test(venue)) push(`${venue} 千代田区`);
  push(`${title} ${venue_name} 千代田区`);
  push(`${title} 千代田区`);
  push("千代田区役所");
  return out;
}

function parseChiyodaOshiraseRows(html, pageUrl) {
  const out = [];
  const sectionRe = /<h2[^>]*>\s*(?:<a[^>]*>)?([\s\S]*?)(?:<\/a>)?\s*<\/h2>\s*([\s\S]*?)(?=<h2[^>]*>|<div class="child_contents_page_bottom">|<\/article>|$)/gi;
  let m;
  while ((m = sectionRe.exec(html)) !== null) {
    const facility = normalizeText(stripTags(m[1] || ""));
    const block = m[2] || "";
    if (!facility || !/(児童|こども|子ども|わんぱく|ひろば|プラザ|子育て|センター|1番町|四番町|神田|西神田|麹町)/.test(facility)) continue;
    for (const a of parseAnchors(block, pageUrl)) {
      const title = normalizeText(String(a.text || "").replace(/\s*[（(]\s*PDF[^）)]*[）)]\s*/gi, " ").replace(/\s*PDF\s*[:：]?\s*\d+(?:\.\d+)?\s*(?:KB|MB)\s*/gi, " "));
      if (!title) continue;
      const isPdf = /\.pdf(?:\?|$)/i.test(a.url);
      if (!isPdf && !/\/shisetsu\/gakko\//i.test(a.url)) continue;
      out.push({ facility, title, url: a.url, isPdf });
    }
  }
  const uniq = [];
  const seen = new Set();
  for (const row of out) {
    const key = `${row.url}|${row.title}|${row.facility}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(row);
  }
  return uniq;
}

function createCollectChiyodaJidokanEvents(deps) {
  const { geocodeForWard, resolveEventPoint, resolveEventAddress } = deps;

  async function collectChiyodaJidokanEvents(maxDays) {
    const months = getMonthsForRange(maxDays);
    const rows = [];
    for (const m of months) {
      const listUrls = [
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_category=2`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=1`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&event_target=2`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5150\u7ae5")}`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u3069\u3082")}`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=2&year=${m.year}&month=${m.month}&keyword=${encodeURIComponent("\u5b50\u80b2\u3066")}`,
        `${CHIYODA_SOURCE.baseUrl}/cgi-bin/event_cal_multi/calendar.cgi?type=1&year=${m.year}&month=${m.month}`,
      ];
      for (const listUrl of listUrls) {
        let html = "";
        try {
          html = await fetchText(listUrl);
        } catch {
          continue;
        }
        rows.push(...parseChiyodaListRows(html, listUrl, m.year, m.month));
      }
    }

    const uniqRows = [];
    const seen = new Set();
    for (const row of rows) {
      const k = `${row.url}:${row.date.y}-${row.date.mo}-${row.date.d}`;
      if (seen.has(k)) continue;
      seen.add(k);
      uniqRows.push(row);
    }

    const byId = new Map();
    const childHint = WARD_CHILD_HINT_RE;
    const calItems = uniqRows.slice(0, 800);
    const calConcurrency = 6;
    let calIdx = 0;
    async function calWorker() {
      while (calIdx < calItems.length) {
        const ci = calIdx; calIdx += 1;
        const row = calItems[ci];
      let meta = null;
      try {
        const detailHtml = await fetchText(row.url);
        meta = parseChiyodaDetailMeta(detailHtml, row.date);
      } catch {
        meta = {
          title: row.title || "",
          dates: [row.date],
          timeRange: null,
          venue_name: "",
          address: "",
          bodyText: row.title || "",
        };
      }
      const title = meta.title || row.title;
      if (!title || !meta.dates || meta.dates.length === 0) continue;
      if (/(おたより|お便り|たより|だより)/.test(title)) continue;
      if (/(入園の?園児募集|入園募集|申込から入園|申込の流れ|病児・?病後児保育|病児保育|保育所等の定員|定員状況|出生前児童の仮申込|オンライン申請.*入園|フレイル測定会|消費者講座|暮らしのほけん室|待機児童数|プログラム案内$|子育てひろば.*のご案内$)/.test(title)) continue;

      const hay = `${title} ${meta.venue_name || ""} ${meta.bodyText || ""} ${row.title}`;
      const strictChildRe = /(\u5150\u7ae5|\u5b50\u3069\u3082|\u3053\u3069\u3082|\u4e73\u5e7c\u5150|\u89aa\u5b50|\u5b50\u80b2\u3066|\u3042\u304b\u3061\u3083\u3093|\u8d64\u3061\u3083\u3093|\u3072\u308d\u3070|\u308f\u3093\u3071\u304f|\u30d7\u30e9\u30b6)/;
      if (/\/koho\/event\//i.test(row.url || "") && !strictChildRe.test(hay)) continue;
      if (!childHint.test(hay)) continue;

      let venueName = sanitizeVenueText(meta.venue_name);
      if (venueName && (isLikelyAudienceText(venueName) || /^(?:無料|有料|なし|千代田(?:区)?(?:に?在住|在勤|在学))/.test(venueName) || /(?:ましょう|ください|します)[）)（(]?/.test(venueName) || venueName === title)) venueName = "";
      if (!venueName) venueName = "\u5343\u4ee3\u7530\u533a\u5b50\u80b2\u3066\u95a2\u9023\u65bd\u8a2d";
      const rawAddress = meta.address || extractTokyoAddress(meta.bodyText || "");
      const geoCandidates = buildChiyodaGeoCandidates(title, venueName, rawAddress);
      let point = await geocodeForWard(geoCandidates, CHIYODA_SOURCE);
      point = resolveEventPoint(CHIYODA_SOURCE, venueName, point, rawAddress);
      const address = resolveEventAddress(CHIYODA_SOURCE, venueName, rawAddress, point);

      for (const d of meta.dates) {
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:chiyoda:${row.url}:${title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_chiyoda",
          source_label: CHIYODA_SOURCE.label,
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
          query_hit: `${CHIYODA_SOURCE.label} \u5150\u7ae5\u9928`,
          tags: ["chiyoda_jidokan_event", "chiyoda_kosodate"],
        });
      }
      }
    }
    await Promise.all(Array.from({ length: calConcurrency }, () => calWorker()));

    // Supplement chiyoda data by following the official jidokan notice page and parsing linked PDFs.
    const now = parseYmdFromJst(new Date());

    // Supplement with hoikuen event page and asobiba pages
    const supplementUrls = [
      `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/hoiku/event.html`,
      `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/asobibajigyo/kodomohiroba.html`,
      `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/asobibajigyo/athletic-hiroba.html`,
      `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/asobibajigyo/fujimi-kaiho.html`,
    ];
    for (const supUrl of supplementUrls) {
      try {
        const supHtml = await fetchText(supUrl);
        const supTitle = normalizeText(stripTags((supHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || ""));
        const supText = normalizeJaDigits(normalizeJapaneseEraYears(normalizeText(stripTags(supHtml))));
        const supDates = [
          ...parseOtaDatesFromText(supText, now.y, now.m),
          ...parseChiyodaSlashDates(supText, now.y, now.m),
        ];
        const supDateSet = new Set();
        const supUniqDates = [];
        for (const d of supDates) {
          const k = `${d.y}-${d.mo}-${d.d}`;
          if (supDateSet.has(k)) continue;
          supDateSet.add(k);
          supUniqDates.push(d);
        }
        if (supUniqDates.length === 0) continue;
        const supTimeRange = parseTimeRangeFromText(supText);
        let supVenue = sanitizeVenueText((supText.match(/(?:会場|場所)\s*[:：]\s*([^\n]{2,80})/) || [])[1] || "");
        if (supVenue && (isLikelyAudienceText(supVenue) || /^(?:無料|有料|なし|千代田(?:区)?(?:に?在住|在勤|在学))/.test(supVenue) || /(?:ましょう|ください|します)[）)（(]?/.test(supVenue))) supVenue = "";
        if (!supVenue) supVenue = "千代田区子育て施設";
        const supAddress = extractTokyoAddress(supText);
        let point = await geocodeForWard(buildChiyodaGeoCandidates(supTitle, supVenue, supAddress), CHIYODA_SOURCE);
        point = resolveEventPoint(CHIYODA_SOURCE, supVenue, point, supAddress);
        const address = resolveEventAddress(CHIYODA_SOURCE, supVenue, supAddress, point);
        for (const d of supUniqDates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, supTimeRange, 10);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:chiyoda:sup:${supUrl}:${supTitle}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_chiyoda",
            source_label: CHIYODA_SOURCE.label,
            title: supTitle || "千代田区子育てイベント",
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: supVenue,
            address,
            url: supUrl,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${CHIYODA_SOURCE.label} 子育て`,
            tags: ["chiyoda_jidokan_event", "chiyoda_kosodate"],
          });
        }
      } catch {
        // ignore supplement page error
      }
    }

    // Also follow links from hoikuen event page to detail pages
    try {
      const hoikuenHtml = await fetchText(`${CHIYODA_SOURCE.baseUrl}/koho/kosodate/hoiku/event.html`);
      for (const a of parseAnchors(hoikuenHtml, `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/hoiku/`)) {
        if (!/city\.chiyoda\.lg\.jp/i.test(a.url)) continue;
        if (!/\.html(?:\?|$)/i.test(a.url)) continue;
        if (/\/index\.html$/i.test(a.url)) continue;
        if (!/kosodate|hoiku|kodomo/i.test(a.url)) continue;
        try {
          const detailHtml = await fetchText(a.url);
          const fallbackDate = { y: now.y, mo: now.m, d: now.d };
          const meta = parseChiyodaDetailMeta(detailHtml, fallbackDate);
          if (!meta.title || !meta.dates || meta.dates.length === 0) continue;
          if (/(入園の?園児募集|入園募集|申込から入園|申込の流れ|病児・?病後児保育|病児保育|保育所等の定員|定員状況|出生前児童の仮申込|オンライン申請.*入園|フレイル測定会|消費者講座|暮らしのほけん室|待機児童数)/.test(meta.title)) continue;
          let venueName = sanitizeVenueText(meta.venue_name);
          if (venueName && (isLikelyAudienceText(venueName) || /^(?:無料|有料|なし|千代田(?:区)?(?:に?在住|在勤|在学))/.test(venueName) || /(?:ましょう|ください|します)[）)（(]?/.test(venueName) || venueName === meta.title)) venueName = "";
          if (!venueName) venueName = "千代田区保育園";
          const rawAddress = meta.address || extractTokyoAddress(meta.bodyText || "");
          let point = await geocodeForWard(buildChiyodaGeoCandidates(meta.title, venueName, rawAddress), CHIYODA_SOURCE);
          point = resolveEventPoint(CHIYODA_SOURCE, venueName, point, rawAddress);
          const address = resolveEventAddress(CHIYODA_SOURCE, venueName, rawAddress, point);
          for (const d of meta.dates) {
            if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
            const { startsAt, endsAt } = buildStartsEndsForDate(d, meta.timeRange, 10);
            const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
            const id = `ward:chiyoda:hoikuen:${a.url}:${meta.title}:${dateKey}`;
            if (byId.has(id)) continue;
            byId.set(id, {
              id,
              source: "ward_chiyoda",
              source_label: CHIYODA_SOURCE.label,
              title: meta.title,
              starts_at: startsAt,
              ends_at: endsAt,
              updated_at: startsAt,
              venue_name: venueName,
              address,
              url: a.url,
              lat: point ? point.lat : null,
              lng: point ? point.lng : null,
              participants: null,
              waitlisted: null,
              recently_updated: true,
              query_hit: `${CHIYODA_SOURCE.label} 保育園`,
              tags: ["chiyoda_jidokan_event", "chiyoda_hoikuen"],
            });
          }
        } catch {
          // ignore detail page error
        }
      }
    } catch {
      // ignore hoikuen link follow error
    }

    const oshiraseUrl = `${CHIYODA_SOURCE.baseUrl}/koho/kosodate/jidocenter/oshirase.html`;
    let oshiraseHtml = "";
    try {
      oshiraseHtml = await fetchText(oshiraseUrl);
    } catch (e) {
      console.warn("[chiyoda] oshirase fetch failed:", e.message || e);
      oshiraseHtml = "";
    }
    if (oshiraseHtml) {
      const baseOshiraseRows = parseChiyodaOshiraseRows(oshiraseHtml, oshiraseUrl)
        .filter((r) => r.isPdf || /(\u5150\u7ae5|\u3053\u3069\u3082|\u3072\u308d\u3070|\u30d7\u30ed\u30b0\u30e9\u30e0|\u305f\u3088\u308a)/.test(`${r.facility} ${r.title}`))
        .slice(0, 120);
      const facilityPdfRows = [];
      for (const row of baseOshiraseRows.filter((r) => !r.isPdf && /\/shisetsu\/gakko\//i.test(r.url))) {
        let facilityHtml = "";
        try {
          facilityHtml = await fetchText(row.url);
        } catch {
          continue;
        }
        for (const a of parseAnchors(facilityHtml, row.url)) {
          if (!/\/documents\/1830\/.+\.pdf(?:\?|$)/i.test(a.url)) continue;
          const title = normalizeText(a.text || `${row.facility} \u304a\u305f\u3088\u308a`);
          const hay = `${row.facility} ${title} ${a.url}`;
          if (!/(\u5150\u7ae5|\u3053\u3069\u3082|\u3072\u308d\u3070|\u30d7\u30ed\u30b0\u30e9\u30e0|\u305f\u3088\u308a|\u6848\u5185)/.test(hay)) continue;
          facilityPdfRows.push({
            facility: row.facility,
            title,
            url: a.url,
            isPdf: true,
          });
        }
      }
      const oshiraseRows = [];
      const seenOshirase = new Set();
      for (const row of [...baseOshiraseRows, ...facilityPdfRows]) {
        const key = `${row.url}|${row.title}|${row.facility}`;
        if (seenOshirase.has(key)) continue;
        seenOshirase.add(key);
        oshiraseRows.push(row);
      }
      const pdfCache = new Map();
      const oshiraseConcurrency = 6;
      let oshiraseIdx = 0;
      async function oshiraseWorker() {
        while (oshiraseIdx < oshiraseRows.length) {
          const oi = oshiraseIdx; oshiraseIdx += 1;
          const row = oshiraseRows[oi];
        const fallbackDate =
          alignMonthlyFallbackDate(inferChiyodaMonthlyFallbackDate(`${row.title} ${row.facility}`, now.y, now.m), now) || {
          y: now.y,
          mo: now.m,
          d: now.d,
        };
        let detailText = "";
        if (row.isPdf) {
          try {
            if (pdfCache.has(row.url)) {
              detailText = pdfCache.get(row.url);
            } else {
              detailText = await fetchChiyodaPdfMarkdown(row.url);
              pdfCache.set(row.url, detailText);
            }
          } catch {
            detailText = `${row.facility} ${row.title}`;
          }
        } else {
          try {
            detailText = await fetchText(row.url);
          } catch {
            detailText = `${row.facility} ${row.title}`;
          }
        }

        const normalized = normalizeJapaneseEraYears(normalizeJaDigits(normalizeText(`${detailText} ${row.facility} ${row.title}`)));
        const dateCandidates = [
          ...parseOtaDatesFromText(normalized, fallbackDate.y, fallbackDate.mo),
          ...parseChiyodaSlashDates(normalized, fallbackDate.y, fallbackDate.mo),
        ];
        const uniqDates = [];
        const seenDate = new Set();
        for (const d of dateCandidates) {
          const k = `${d.y}-${d.mo}-${d.d}`;
          if (seenDate.has(k)) continue;
          seenDate.add(k);
          uniqDates.push(d);
        }
        const inferredMonthlyDate = alignMonthlyFallbackDate(
          inferChiyodaMonthlyFallbackDate(`${row.title} ${row.facility}`, now.y, now.m),
          now
        );
        const dates = uniqDates.length ? uniqDates.slice(0, 80) : inferredMonthlyDate ? [inferredMonthlyDate] : [fallbackDate];
        if (dates.length === 0) continue;
        if (/(おたより|お便り|たより|だより)/.test(row.title)) continue;
        const venue = row.facility || "\u5343\u4ee3\u7530\u533a\u5150\u7ae5\u9928";
        const title = row.title.includes(row.facility) ? row.title : `${row.facility} ${row.title}`;
        const timeRange = parseTimeRangeFromText(normalized);
        const rawAddress = extractTokyoAddress(normalized);

        let point = await geocodeForWard(buildChiyodaGeoCandidates(title, venue, rawAddress), CHIYODA_SOURCE);
        point = resolveEventPoint(CHIYODA_SOURCE, venue, point, rawAddress);
        const address = resolveEventAddress(CHIYODA_SOURCE, venue, rawAddress, point);

        for (const d of dates) {
          if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
          const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
          const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
          const id = `ward:chiyoda:pdf:${row.url}:${title}:${dateKey}`;
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            source: "ward_chiyoda",
            source_label: CHIYODA_SOURCE.label,
            title,
            starts_at: startsAt,
            ends_at: endsAt,
            updated_at: startsAt,
            venue_name: venue,
            address,
            url: row.url,
            lat: point ? point.lat : null,
            lng: point ? point.lng : null,
            participants: null,
            waitlisted: null,
            recently_updated: true,
            query_hit: `${CHIYODA_SOURCE.label} \u5150\u7ae5\u9928 \u304a\u305f\u3088\u308a`,
            tags: ["chiyoda_jidokan_event", "chiyoda_kosodate", "chiyoda_jidokan_pdf_notice"],
          });
        }
        }
      }
      await Promise.all(Array.from({ length: oshiraseConcurrency }, () => oshiraseWorker()));
    }

    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }

  return collectChiyodaJidokanEvents;
}

module.exports = { createCollectChiyodaJidokanEvents };

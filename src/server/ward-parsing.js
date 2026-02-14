const { normalizeText, normalizeJaDigits, normalizeJapaneseEraYears, sanitizeVenueText, sanitizeAddressText, sanitizeGeoQueryText } = require("./text-utils");
const { stripTags, parseAnchors, parseDetailMeta } = require("./html-utils");
const { extractTokyoAddress } = require("./address-utils");
const { inferWardVenueFromTitle, inferVenueFromTitleSupplement } = require("./venue-utils");
const { fetchText } = require("./fetch-utils");
const { fetchChiyodaPdfMarkdown } = require("./fetch-utils");
const {
  parseOtaDatesFromText,
  parseChiyodaSlashDates,
  parseDatesFromHtml,
  parseTimeRangeFromText,
  parseDateSpecificTimeRanges,
  buildDateKey,
  inRangeJst,
  parseYmdFromJst,
} = require("./date-utils");

function extractDateFromUrl(url, baseY, baseMo) {
  const u = String(url || "");
  let m = u.match(/(20\d{2})(\d{2})(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { y, mo, d };
  }
  m = u.match(/(?:[?&](?:year|Y)=)(20\d{2}).*?(?:[?&](?:month|M)=)(\d{1,2}).*?(?:[?&]day=)(\d{1,2})/i);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return { y, mo, d };
  }
  if (Number.isFinite(baseY) && Number.isFinite(baseMo)) {
    m = u.match(/(?:^|[^\d])(\d{1,2})(?:[^\d]|$)/);
    if (m) {
      const d = Number(m[1]);
      if (d >= 1 && d <= 31) return { y: Number(baseY), mo: Number(baseMo), d };
    }
  }
  return null;
}

function buildWardGeoCandidates(wardLabel, title, venue, address) {
  const out = [];
  const add = (s) => {
    const t = sanitizeGeoQueryText(s);
    if (!t) return;
    if (!out.includes(t)) out.push(t);
  };
  const tokyoWard = `東京都${wardLabel}`;
  const cleanAddress = sanitizeAddressText(address || "");
  const cleanVenue = sanitizeVenueText(venue || "");
  const cleanTitle = sanitizeVenueText(title || "");

  if (cleanAddress) {
    const hasTokyo = /東京都/.test(cleanAddress);
    const hasWard = wardLabel && cleanAddress.includes(wardLabel);
    add(cleanAddress);
    if (!hasTokyo) {
      if (hasWard) {
        add(`東京都${cleanAddress}`);
      } else {
        add(`${tokyoWard}${cleanAddress}`);
      }
    } else if (!hasWard) {
      const noTokyo = cleanAddress.replace(/^東京都\s*/, "");
      add(`${tokyoWard}${noTokyo}`);
    }
    if (hasTokyo) {
      const noTokyo = cleanAddress.replace(/^東京都\s*/, "");
      if (noTokyo) add(noTokyo);
    }
  }
  if (cleanVenue) {
    add(`${tokyoWard}${cleanVenue}`);
    add(`${wardLabel}${cleanVenue}`);
  }
  if (cleanTitle && cleanVenue) add(`${cleanTitle} ${cleanVenue} ${tokyoWard}`);
  if (cleanTitle) add(`${cleanTitle} ${tokyoWard}`);
  return out;
}

function parseWardListRows(html, pageUrl, year, month, opts = {}) {
  const block = opts.blockRe ? (html.match(opts.blockRe)?.[1] || html) : html;
  const out = [];
  const accept = (url, text) => {
    if (!url) return false;
    if (!normalizeText(text)) return false;
    if (opts.urlAllow && !opts.urlAllow.test(url)) return false;
    if (opts.urlDeny && opts.urlDeny.test(url)) return false;
    if (/\/(list_)?calendar(?:\d+)?\.html/i.test(url) && (/^\d{1,2}$/.test(text) || /月/.test(text))) return false;
    if (/calendar\.cgi\?type=[123]/i.test(url) && /^\d{1,2}$/.test(text)) return false;
    return true;
  };

  if (opts.dayBlockRe instanceof RegExp) {
    const flags = opts.dayBlockRe.flags.includes("g") ? opts.dayBlockRe.flags : `${opts.dayBlockRe.flags}g`;
    const dayBlockRe = new RegExp(opts.dayBlockRe.source, flags);
    let dm;
    while ((dm = dayBlockRe.exec(block)) !== null) {
      const day = Number(dm[1]);
      const section = dm[2] || dm[0];
      const date =
        Number.isFinite(day) && day >= 1 && day <= 31 ? { y: Number(year), mo: Number(month), d: Number(day) } : null;
      for (const a of parseAnchors(section, pageUrl)) {
        if (!accept(a.url, a.text)) continue;
        out.push({ url: a.url, title: a.text, date });
      }
    }
  }

  if (!opts.skipTr) {
    const trRe = /<tr[\s\S]*?<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(block)) !== null) {
      const row = tr[0];
      const dayMatch =
        row.match(/cal_day_(\d{1,2})/i) ||
        row.match(/id="day(\d{1,2})"/i) ||
        row.match(/<th[^>]*class="[^"]*(?:day|sat|sun)[^"]*"[^>]*>[\s\S]*?<span[^>]*class="em"[^>]*>\s*(\d{1,2})\s*<\/span>/i) ||
        row.match(/calendar_day[^>]*>\s*(\d{1,2})\s*日/i) ||
        row.match(/class="[^"]*date[^"]*"[^>]*>\s*([\s\S]*?)<\/td>/i);
      let day = null;
      if (dayMatch) {
        const raw = dayMatch[1];
        const n = Number(String(raw).replace(/[^\d]/g, ""));
        if (Number.isFinite(n) && n >= 1 && n <= 31) day = n;
      }
      for (const a of parseAnchors(row, pageUrl)) {
        if (!accept(a.url, a.text)) continue;
        out.push({
          url: a.url,
          title: a.text,
          date: day ? { y: Number(year), mo: Number(month), d: day } : null,
        });
      }
    }
  }

  const runFallback = opts.useAnchorFallback === true && (out.length === 0 || opts.fallbackWhenRowsExist === true);
  if (runFallback) {
    for (const a of parseAnchors(block, pageUrl)) {
      if (!accept(a.url, a.text)) continue;
      const date = extractDateFromUrl(a.url, year, month);
      out.push({ url: a.url, title: a.text, date });
    }
  }

  return out;
}

function buildListCalendarUrl(baseDir, m, now) {
  const suffix = m.year === now.y && m.month === now.m ? "" : `${m.year}${String(m.month).padStart(2, "0")}`;
  return `${baseDir}/list_calendar${suffix}.html`;
}

function parseIsoDateTimeParts(textRaw) {
  const text = normalizeJaDigits(normalizeText(textRaw)).replace(/\//g, "-");
  const m = text.match(/(20\d{2})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2}))?/i);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const h = m[4] === undefined ? null : Number(m[4]);
  const mi = m[5] === undefined ? null : Number(m[5]);
  return {
    y,
    mo,
    d,
    h: Number.isFinite(h) ? h : null,
    mi: Number.isFinite(mi) ? mi : null,
  };
}

function parseJsonLdEventMeta(html) {
  const scriptRe = /<script[^>]*type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(String(html || ""))) !== null) {
    const raw = String(m[2] || "").replace(/<!--|-->/g, " ");
    if (!/"startDate"|"@type"\s*:\s*"Event"/i.test(raw)) continue;
    const startRaw = (raw.match(/"startDate"\s*:\s*"([^"]+)"/i) || [])[1] || "";
    const endRaw = (raw.match(/"endDate"\s*:\s*"([^"]+)"/i) || [])[1] || "";
    let venue_name =
      normalizeText((raw.match(/"location"\s*:\s*"([^"]{1,180})"/i) || [])[1] || "") ||
      normalizeText((raw.match(/"location"\s*:\s*\{[\s\S]{0,900}?"name"\s*:\s*"([^"]{1,180})"/i) || [])[1] || "");
    let address =
      normalizeText((raw.match(/"streetAddress"\s*:\s*"([^"]{2,220})"/i) || [])[1] || "") ||
      normalizeText((raw.match(/"address"\s*:\s*"([^"]{4,220})"/i) || [])[1] || "");
    const start = parseIsoDateTimeParts(startRaw);
    const end = parseIsoDateTimeParts(endRaw);
    const date = start ? { y: start.y, mo: start.mo, d: start.d } : null;
    let timeRange = null;
    if (start && Number.isFinite(start.h)) {
      timeRange = {
        startHour: start.h,
        startMinute: Number.isFinite(start.mi) ? start.mi : 0,
        endHour: end && Number.isFinite(end.h) ? end.h : null,
        endMinute: end && Number.isFinite(end.mi) ? end.mi : null,
      };
    }
    if (venue_name || address || date || timeRange) {
      return { venue_name, address, date, timeRange };
    }
  }
  return { venue_name: "", address: "", date: null, timeRange: null };
}

function parseGenericWardDetailMeta(source, html, fallbackDate, fallbackTitle) {
  const title = normalizeText(stripTags((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "")) || normalizeText(fallbackTitle);
  const allText = normalizeJaDigits(normalizeText(stripTags(html)));
  const jsonLdMeta = parseJsonLdEventMeta(html);
  const sections = [];
  const pushSection = (heading, value) => {
    const h = normalizeText(stripTags(heading));
    const v = normalizeJaDigits(normalizeText(stripTags(value)));
    if (!h || !v) return;
    sections.push({ heading: h, value: v });
  };
  let m;
  const h2Re = /<h2[^>]*>([\s\S]*?)<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  while ((m = h2Re.exec(html)) !== null) pushSection(m[1], m[2]);
  const dtRe = /<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((m = dtRe.exec(html)) !== null) pushSection(m[1], m[2]);
  const thRe = /<tr[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi;
  while ((m = thRe.exec(html)) !== null) pushSection(m[1], m[2]);

  const basic = parseDetailMeta(html);
  let venue_name = sanitizeVenueText(basic.venue || "");
  let address = sanitizeAddressText(basic.address || "");
  for (const sec of sections) {
    if (!venue_name && /会場|場所|開催場所|実施場所/i.test(sec.heading))
      venue_name = sanitizeVenueText(sec.value);
    if (!address && /住所|所在地|住所地/i.test(sec.heading)) address = sanitizeAddressText(sec.value);
  }
  if (!venue_name && jsonLdMeta.venue_name) venue_name = sanitizeVenueText(jsonLdMeta.venue_name);
  if (!address && jsonLdMeta.address) address = sanitizeAddressText(jsonLdMeta.address);
  if (!venue_name) {
    const vm = allText.match(/(?:会場|場所|開催場所|実施場所)\s*[:：]\s*([^\n]{2,120})/);
    if (vm) venue_name = sanitizeVenueText(vm[1]);
  }
  if (!venue_name) {
    const vb = allText.match(/【(?:会場|場所|開催場所|実施場所)】\s*([^\n【]{2,120})/);
    if (vb) venue_name = sanitizeVenueText(vb[1]);
  }
  if (!address) {
    const am = allText.match(/(?:住所|所在地)\s*[:：]\s*([^\n]{4,160})/);
    if (am) address = sanitizeAddressText(am[1]);
  }
  if (!address) {
    const ab = allText.match(/【(?:住所|所在地)】\s*([^\n【]{4,160})/);
    if (ab) address = sanitizeAddressText(ab[1]);
  }
  if (!address) address = extractTokyoAddress(allText);
  const titleForVenue = normalizeText(`${title || ""} ${fallbackTitle || ""}`);
  if ((!venue_name || venue_name === `${source.label}子ども関連施設`) && titleForVenue) {
    const inferredVenue = inferWardVenueFromTitle(titleForVenue, source.label);
    if (inferredVenue && inferredVenue !== `${source.label}子ども関連施設`) venue_name = inferredVenue;
  }
  if (!venue_name || venue_name === `${source.label}子ども関連施設`) {
    const inferredSupplement = inferVenueFromTitleSupplement(`${titleForVenue} ${allText.slice(0, 300)}`, source.label);
    if (inferredSupplement) venue_name = inferredSupplement;
  }
  if (address && source?.label && !address.includes(source.label)) {
    const wardInAddress = (address.match(/([^\s\u3000]{2,8}区)/u) || [])[1] || "";
    if (wardInAddress && wardInAddress !== source.label) address = "";
  }

  const dateText = sections
    .filter((x) => /日時|開催日|日程|期間|対象日/i.test(x.heading))
    .map((x) => x.value)
    .join(" ");
  let datePayload = dateText;
  if (!datePayload) {
    const mm = allText.match(/(?:開催日|日時|日程|期間)[\s\S]{0,260}/);
    datePayload = mm ? mm[0] : allText.slice(0, 480);
  }
  const normalizedDatePayload = normalizeJapaneseEraYears(`${datePayload} ${title}`);
  let dates = parseOtaDatesFromText(normalizedDatePayload, fallbackDate.y, fallbackDate.mo);
  if (jsonLdMeta.date) {
    const d = jsonLdMeta.date;
    dates.push({ y: d.y, mo: d.mo, d: d.d });
  }
  if (dates.length > 0) {
    const uniq = new Map();
    for (const d of dates) {
      const key = `${d.y}-${d.mo}-${d.d}`;
      if (!uniq.has(key)) uniq.set(key, d);
    }
    dates = Array.from(uniq.values());
  }
  if (dates.length === 0 && fallbackDate) dates = [fallbackDate];

  let timeRange = parseTimeRangeFromText(`${dateText} ${allText}`);
  if (!timeRange && jsonLdMeta.timeRange) timeRange = jsonLdMeta.timeRange;
  const timeRangeByDate = parseDateSpecificTimeRanges(`${dateText}\n${allText}`, dates, fallbackDate.y, fallbackDate.mo);
  if (!venue_name) venue_name = `${source.label}子ども関連施設`;
  return { title, dates, timeRange, timeRangeByDate, venue_name, address, bodyText: allText };
}

async function parseGenericWardPdfMeta(source, pdfUrl, fallbackDate, fallbackTitle) {
  const markdown = await fetchChiyodaPdfMarkdown(pdfUrl);
  const normalizedRaw = normalizeJapaneseEraYears(normalizeJaDigits(String(markdown || "")));
  const normalized = normalizeJapaneseEraYears(normalizeJaDigits(normalizeText(markdown)));
  const title = normalizeText(fallbackTitle) || normalizeText((markdown.match(/Title:\s*(.+)/i) || [])[1] || "");
  const venueMatch =
    normalized.match(/(?:会場|場所|開催場所)\s*[:：]\s*([^\n]{2,120})/) ||
    normalized.match(/([^\s]{1,50}(?:児童館|児童センター|ひろば|プラザ))/u) ||
    title.match(/([^\s]{1,50}(?:児童館|児童センター|ひろば|プラザ))/u);
  const venue_name = sanitizeVenueText((venueMatch && venueMatch[1]) || "");
  const dateCandidates = [
    ...parseOtaDatesFromText(`${normalized} ${title}`, fallbackDate.y, fallbackDate.mo),
    ...parseChiyodaSlashDates(normalized, fallbackDate.y, fallbackDate.mo),
  ];
  const uniqDates = [];
  const seenDate = new Set();
  for (const d of dateCandidates) {
    const k = buildDateKey(d.y, d.mo, d.d);
    if (seenDate.has(k)) continue;
    seenDate.add(k);
    uniqDates.push(d);
  }
  const dates = uniqDates.length ? uniqDates.slice(0, 180) : fallbackDate ? [fallbackDate] : [];
  const timeRange = parseTimeRangeFromText(normalizedRaw) || parseTimeRangeFromText(normalized);
  const timeRangeByDate = parseDateSpecificTimeRanges(normalizedRaw, dates, fallbackDate.y, fallbackDate.mo);
  return {
    title,
    dates,
    timeRange,
    timeRangeByDate,
    venue_name: venue_name || `${source.label}子ども関連施設`,
    address: "",
    bodyText: normalized,
  };
}

async function collectDetailMetaMap(rows, maxDays) {
  const map = new Map();
  const urls = Array.from(new Set(rows.map((x) => x.url))).slice(0, 180);
  const concurrency = 6;
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const i = idx;
      idx += 1;
      const url = urls[i];
      try {
        const html = await fetchText(url);
        const dates = parseDatesFromHtml(html).filter((d) => inRangeJst(d.y, d.mo, d.d, maxDays));
        const detail = parseDetailMeta(html);
        const timeRange = parseTimeRangeFromText(stripTags(html));
        const address = sanitizeAddressText(detail.address || "") || extractTokyoAddress(html);
        map.set(url, {
          dates,
          timeRange,
          venue: detail.venue || "",
          address,
        });
      } catch {
        // ignore per-page error
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return map;
}

module.exports = {
  buildListCalendarUrl,
  buildWardGeoCandidates,
  collectDetailMetaMap,
  extractDateFromUrl,
  parseGenericWardDetailMeta,
  parseGenericWardPdfMeta,
  parseIsoDateTimeParts,
  parseJsonLdEventMeta,
  parseWardListRows,
};

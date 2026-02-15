const { normalizeText, sanitizeAddressText, sanitizeVenueText, hasConcreteAddressToken, stripFurigana } = require("../text-utils");
const { buildDateKey, buildStartsEndsForDate, inRangeJst, parseYmdFromJst, getMonthsForRange, parseTimeRangeFromText } = require("../date-utils");
const { buildWardGeoCandidates, parseWardListRows, extractDateFromUrl, parseGenericWardDetailMeta, parseGenericWardPdfMeta } = require("../ward-parsing");
const { extractWardAddressFromText, isLikelyWardOfficeAddress } = require("../address-utils");
const { fetchText } = require("../fetch-utils");
const {
  inferWardVenueFromTitle,
  inferVenueFromTitleSupplement,
  inferWardVenueFromUrl,
  inferRegionalVenueFromTitle,
  isJunkVenueName,
  isLikelyAudienceText,
  isLikelyDepartmentVenue,
  isOnlineOnlyWithoutPlace,
} = require("../venue-utils");
const { WARD_CHILD_HINT_RE, WARD_CHILD_URL_HINT_RE } = require("../../config/wards");

function createCollectWardGenericEvents(deps) {
  const {
    geocodeForWard,
    getFacilityAddressFromMaster,
    haversineKm,
    resolveEventAddress,
    resolveEventPoint,
  } = deps;

  return async function collectWardGenericEvents(source, maxDays, cfg) {
  const months = getMonthsForRange(maxDays);
  const now = parseYmdFromJst(new Date());
  const rows = [];
  let oneTimeListUrls = [];
  if (cfg.oneTimeListUrls) {
    try {
      oneTimeListUrls = (await cfg.oneTimeListUrls(now, maxDays)) || [];
    } catch (e) {
      console.warn(`[ward-generic:${source.key}] oneTimeListUrls failed:`, e.message || e);
      oneTimeListUrls = [];
    }
  }
  for (let mi = 0; mi < months.length; mi += 1) {
    const m = months[mi];
    const listUrls = [
      ...((cfg.listUrls ? cfg.listUrls(m, now, maxDays) : []) || []),
      ...(mi === 0 ? oneTimeListUrls : []),
    ];
    const uniqListUrls = Array.from(new Set(listUrls.map((u) => normalizeText(u)).filter(Boolean)));
    for (const listUrl of uniqListUrls) {
      let html = "";
      try {
        html = await fetchText(listUrl);
      } catch {
        continue;
      }
      rows.push(...parseWardListRows(html, listUrl, m.year, m.month, cfg.parseOpts || {}));
    }
  }

  const uniqRows = [];
  const seenRows = new Set();
  for (const row of rows) {
    const d = row.date ? `${row.date.y}-${row.date.mo}-${row.date.d}` : "";
    const k = `${row.url}|${d}`;
    if (seenRows.has(k)) continue;
    seenRows.add(k);
    uniqRows.push(row);
  }

  const rowsForProcessing = cfg.preferPdfRows
    ? uniqRows
        .slice()
        .sort((a, b) => Number(/\.pdf(?:\?|$)/i.test(b.url || "")) - Number(/\.pdf(?:\?|$)/i.test(a.url || "")))
    : uniqRows;

  const byId = new Map();
  const byContentKey = new Map();
  const preHintRe = cfg.preHintRe || WARD_CHILD_HINT_RE;
  const childHintRe = cfg.childHintRe || WARD_CHILD_HINT_RE;
  const relaxChildFilter = cfg.relaxChildFilter === true;
  const items = rowsForProcessing.slice(0, cfg.maxRows || 520);
  const concurrency = 6;
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx; idx += 1;
      const row = items[i];
    if (cfg.rowUrlAllowRe && !cfg.rowUrlAllowRe.test(row.url || "")) continue;
    if (cfg.rowUrlDenyRe && cfg.rowUrlDenyRe.test(row.url || "")) continue;
    const preHay = `${row.title || ""} ${row.url || ""}`;
    const urlHintMatched = cfg.ignoreUrlHint === true ? false : WARD_CHILD_URL_HINT_RE.test(row.url || "");
    if (cfg.requirePreHint === true && !preHintRe.test(preHay) && !urlHintMatched) continue;

    const fallbackDate = row.date || extractDateFromUrl(row.url, now.y, now.m) || { y: now.y, mo: now.m, d: now.d };
    const isPdfRow = /\.pdf(?:\?|$)/i.test(row.url || "");
    let meta = null;
    if (isPdfRow && cfg.allowPdfDetail === true) {
      try {
        meta = await parseGenericWardPdfMeta(source, row.url, fallbackDate, row.title);
      } catch {
        if (cfg.allowRowFallbackOnDetailError === true) {
          meta = {
            title: row.title || "",
            dates: [fallbackDate],
            timeRange: parseTimeRangeFromText(row.title || ""),
            venue_name: inferWardVenueFromTitle(row.title || "", source.label),
            address: "",
            bodyText: row.title || "",
          };
        } else {
          continue;
        }
      }
    } else {
      let detailHtml = "";
      let useRowFallback = false;
      try {
        detailHtml = await fetchText(row.url);
      } catch {
        if (cfg.allowRowFallbackOnDetailError === true) {
          useRowFallback = true;
        } else {
          continue;
        }
      }
      if (!useRowFallback && /(?:ご指定のページは見つかりませんでした|ページが見つかりません|お探しのページは見つかりません|指定されたページは存在しません)/.test(detailHtml)) continue;
      meta = useRowFallback
        ? {
            title: row.title || "",
            dates: [fallbackDate],
            timeRange: parseTimeRangeFromText(row.title || ""),
            venue_name: inferWardVenueFromTitle(row.title || "", source.label),
            address: "",
            bodyText: row.title || "",
          }
        : parseGenericWardDetailMeta(source, detailHtml, fallbackDate, row.title);
    }
    const title = stripFurigana(meta.title || row.title);
    if (!title) continue;
    if (cfg.titleDenyRe && cfg.titleDenyRe.test(title)) continue;
    if (/(男女共同参画|フレイル予防|認知症サポーター養成|介護予防(?:総合|コネクター)|青少年問題協議会|議会定例会|清掃一部事務組合|景観まちづくり審議会|個人情報の取扱)/.test(title)) continue;
    if (/^(受付時間|検索方法|空家等対策|入札・契約|広報・広聴|気象情報|条例・規則|保育政策|観光|救急医療|足立区役所|検索の方法)$/.test(title)) continue;
    if (!meta.timeRange) {
      meta.timeRange = parseTimeRangeFromText(`${title} ${row.title || ""} ${meta.bodyText || ""}`);
    }

    let venue_name = sanitizeVenueText(meta.venue_name || "");
    const genericVenueRe = new RegExp(
      `^${source.label}(?:\\u5b50\\u3069\\u3082\\u95a2\\u9023\\u65bd\\u8a2d|\\u5150\\u7ae5\\u9928|\\u5150\\u7ae5\\u30bb\\u30f3\\u30bf\\u30fc|\\u5b50\\u80b2\\u3066\\u30a4\\u30d9\\u30f3\\u30c8)$`
    );
    if (!venue_name || genericVenueRe.test(venue_name)) {
      const inferredVenue = inferWardVenueFromTitle(`${title} ${row.title || ""}`, source.label);
      if (inferredVenue) venue_name = inferredVenue;
    }
    if (!venue_name || genericVenueRe.test(venue_name)) {
      const inferredSupplement = inferVenueFromTitleSupplement(`${title} ${row.title || ""} ${meta.bodyText || ""}`, source.label);
      if (inferredSupplement) venue_name = inferredSupplement;
    }
    const nerimaGenericVenue = source?.key === "nerima" && /ねりまのじどうかん|練馬区立児童館/.test(venue_name || "");
    if (!venue_name || genericVenueRe.test(venue_name) || nerimaGenericVenue || isLikelyDepartmentVenue(venue_name) || isJunkVenueName(venue_name)) {
      const urlVenue = inferWardVenueFromUrl(source.key, row.url);
      if (urlVenue) venue_name = urlVenue;
    }
    if (!venue_name || genericVenueRe.test(venue_name)) {
      const regionalVenue = inferRegionalVenueFromTitle(source.key, `${title} ${row.title || ""}`);
      if (regionalVenue) venue_name = regionalVenue;
    }
    if (isLikelyAudienceText(venue_name)) venue_name = "";
    if (isJunkVenueName(venue_name)) venue_name = "";
    if (!venue_name) venue_name = `${source.label}\u5b50\u3069\u3082\u95a2\u9023\u65bd\u8a2d`;
    const venueLooksGeneric =
      genericVenueRe.test(venue_name) ||
      venue_name === `${source.label}\u5b50\u3069\u3082\u95a2\u9023\u65bd\u8a2d` ||
      (source?.key === "nerima" && /ねりまのじどうかん|練馬区立児童館/.test(venue_name || ""));

    let address = sanitizeAddressText(meta.address || "");
    if (isLikelyWardOfficeAddress(source?.key, address)) address = "";
    if (address && source?.label && !address.includes(source.label)) {
      const wardInAddress = (address.match(/([^\s\u3000]{2,8}\u533a)/u) || [])[1] || "";
      if (wardInAddress && wardInAddress !== source.label) address = "";
    }
    if (!address) {
      const inferredAddress = extractWardAddressFromText(source, `${meta.bodyText || ""} ${title} ${row.title || ""} ${venue_name}`);
      if (inferredAddress) address = inferredAddress;
    }
    if (!address && source?.key && venue_name) address = getFacilityAddressFromMaster(source.key, venue_name);
    if (!address && source?.key && venue_name) {
      const baseVenue = venue_name.replace(/[（(][^）)]*[）)].*/u, "").trim();
      if (baseVenue && baseVenue !== venue_name) address = getFacilityAddressFromMaster(source.key, baseVenue);
    }
    if (isLikelyWardOfficeAddress(source?.key, address)) address = "";
    if (!address && source?.key && venue_name) address = getFacilityAddressFromMaster(source.key, venue_name);

    const hay = `${title} ${venue_name} ${address} ${meta.bodyText || ""} ${row.title || ""}`;
    if (!relaxChildFilter && !childHintRe.test(hay) && !urlHintMatched) continue;
    if (cfg.eventWordRe && !cfg.eventWordRe.test(hay)) continue;
    if (cfg.skipOnlineOnlyWithoutPlace === true && isOnlineOnlyWithoutPlace(hay)) continue;

    const dates = Array.isArray(meta.dates) && meta.dates.length ? meta.dates.slice() : [fallbackDate];
    if (cfg.appendFallbackDate === true && fallbackDate) {
      const fk = `${fallbackDate.y}-${fallbackDate.mo}-${fallbackDate.d}`;
      if (!dates.some((d) => `${d.y}-${d.mo}-${d.d}` === fk)) dates.push(fallbackDate);
    }
    let point = await geocodeForWard(buildWardGeoCandidates(source.label, title, venue_name, address).slice(0, 5), source);
    const nearCenter = point && source?.center ? haversineKm(point.lat, point.lng, source.center.lat, source.center.lng) <= 0.35 : false;
    if (nearCenter && address && hasConcreteAddressToken(address)) {
      const strictPoint = await geocodeForWard(buildWardGeoCandidates(source.label, "", "", address).slice(0, 3), source);
      if (strictPoint && haversineKm(strictPoint.lat, strictPoint.lng, point.lat, point.lng) > 0.3) point = strictPoint;
    }
    if (nearCenter && (venueLooksGeneric || !address)) {
      const inferredVenue = inferWardVenueFromTitle(`${title} ${meta.bodyText || ""} ${row.title || ""}`, source.label);
      const retryVenue = sanitizeVenueText(inferredVenue || "");
      if (retryVenue && retryVenue !== venue_name) {
        const retryPoint = await geocodeForWard(buildWardGeoCandidates(source.label, title, retryVenue, "").slice(0, 5), source);
        if (retryPoint) {
          point = retryPoint;
          if (venueLooksGeneric) venue_name = retryVenue;
        }
      }
    }
    point = resolveEventPoint(source, venue_name, point, address);
    address = resolveEventAddress(source, venue_name, address, point);

    for (const d of dates) {
      if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
      const dKey = buildDateKey(d.y, d.mo, d.d);
      const dateTimeRange = meta?.timeRangeByDate && typeof meta.timeRangeByDate === "object" ? meta.timeRangeByDate[dKey] : null;
      const { startsAt, endsAt } = buildStartsEndsForDate(d, dateTimeRange || meta.timeRange, 10);
      const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
      const contentKey = `${source.key}|${title}|${dateKey}|${venue_name}`;
      if (byContentKey.has(contentKey)) continue;
      byContentKey.set(contentKey, true);
      const id = `ward:${source.key}:${row.url}:${title}:${dateKey}`;
      if (byId.has(id)) continue;
      byId.set(id, {
        id,
        source: `ward_${source.key}`,
        source_label: source.label,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        updated_at: startsAt,
        venue_name,
        address,
        url: row.url,
        lat: point ? point.lat : null,
        lng: point ? point.lng : null,
        participants: null,
        waitlisted: null,
        recently_updated: true,
        query_hit: `${source.label} \u5150\u7ae5\u9928`,
        tags: [`${source.key}_jidokan_event`, `${source.key}_kids`],
      });
    }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
};
}

module.exports = {
  createCollectWardGenericEvents,
};

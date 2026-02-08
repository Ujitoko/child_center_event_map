function createCollectKitaJidokanEvents(deps) {
  const {
    KITA_SOURCE,
    WARD_CHILD_HINT_RE,
    buildStartsEndsForDate,
    buildWardGeoCandidates,
    extractTokyoAddress,
    fetchText,
    geocodeForWard,
    inRangeJst,
    normalizeText,
    parseTimeRangeFromText,
    resolveEventAddress,
    resolveEventPoint,
  } = deps;

  return async function collectKitaJidokanEvents(maxDays) {
    let js = "";
    try {
      js = await fetchText(`${KITA_SOURCE.baseUrl}/education/event_edu.js`);
    } catch {
      return [];
    }
    const raw = (js.match(/events:\s*(\[[\s\S]*?\])\s*,\s*categories:/i) || [])[1] || "";
    if (!raw) return [];

    let events = [];
    try {
      events = JSON.parse(raw);
    } catch {
      try {
        events = new Function(`return (${raw});`)();
      } catch {
        events = [];
      }
    }
    if (!Array.isArray(events)) return [];

    const byId = new Map();
    for (const ev of events.slice(0, 1200)) {
      const title = normalizeText(ev?.eventtitle || "");
      if (!title) continue;
      const bodyText = normalizeText(ev?.description || "");
      const venue_name = normalizeText(ev?.place2 || "\u5317\u533a\u5150\u7ae5\u9928");
      const hay = `${title} ${venue_name} ${bodyText}`;
      if (!WARD_CHILD_HINT_RE.test(hay)) continue;

      let url = "";
      try {
        url = ev?.url ? new URL(String(ev.url), `${KITA_SOURCE.baseUrl}/`).toString() : "";
      } catch {
        url = "";
      }
      if (!url) continue;

      const opendays = Array.isArray(ev?.opendays) ? ev.opendays : [];
      if (opendays.length === 0) continue;
      const timeRange = parseTimeRangeFromText(`${(Array.isArray(ev?.times) ? ev.times.join(" ") : "")} ${ev?.time_texts || ""}`);
      const rawAddress = extractTokyoAddress(bodyText);

      let point = await geocodeForWard(buildWardGeoCandidates(KITA_SOURCE.label, title, venue_name, rawAddress).slice(0, 2), KITA_SOURCE);
      point = resolveEventPoint(KITA_SOURCE, venue_name, point, rawAddress);
      const address = resolveEventAddress(KITA_SOURCE, venue_name, rawAddress, point);

      for (const dayText of opendays) {
        const m = String(dayText || "").match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
        if (!m) continue;
        const d = { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
        if (!inRangeJst(d.y, d.mo, d.d, maxDays)) continue;
        const { startsAt, endsAt } = buildStartsEndsForDate(d, timeRange, 10);
        const dateKey = `${d.y}${String(d.mo).padStart(2, "0")}${String(d.d).padStart(2, "0")}`;
        const id = `ward:kita:${url}:${title}:${dateKey}`;
        if (byId.has(id)) continue;
        byId.set(id, {
          id,
          source: "ward_kita",
          source_label: KITA_SOURCE.label,
          title,
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: startsAt,
          venue_name,
          address,
          url,
          lat: point ? point.lat : null,
          lng: point ? point.lng : null,
          participants: null,
          waitlisted: null,
          recently_updated: true,
          query_hit: `${KITA_SOURCE.label} \u5150\u7ae5\u9928`,
          tags: ["kita_jidokan_event", "kita_kids_js"],
        });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  };
}

module.exports = {
  createCollectKitaJidokanEvents,
};

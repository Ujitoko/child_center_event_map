const { normalizeText, sanitizeVenueText } = require("../text-utils");
const { buildStartsEndsForDate, inRangeJst, parseTimeRangeFromText } = require("../date-utils");
const { buildWardGeoCandidates } = require("../ward-parsing");
const { extractTokyoAddress } = require("../address-utils");
const { fetchText } = require("../fetch-utils");
const { isJunkVenueName } = require("../venue-utils");
const { KITA_SOURCE, WARD_CHILD_HINT_RE } = require("../../config/wards");

const KITA_URL_FACILITY_MAP = {
  // old-style paths
  shimojidoukan: "志茂子ども交流館",
  akabane_jido: "赤羽児童館",
  jujo_dai_jido: "十条台子どもセンター",
  kamijujo_higashi_jido: "上十条東児童館",
  jujodai_kodomo: "十条台子どもセンター",
  takinogawa_higashi_jido: "滝野川東児童館",
  takinogawa_nishi_jido: "滝野川西児童館",
  ukima_jido: "浮間児童館",
  nishigaoka_jido: "西が丘児童館",
  ouji_jido: "王子児童館",
  kamiya_jido: "神谷児童館",
  nakazato_jido: "中里児童館",
  tabata_jido: "田端児童館",
  tabata_kodomo: "田端子どもクラブ",
  akabane_nishi_jido: "赤羽西児童館",
  iwabuchi_jido: "岩淵児童館",
  sakurada_jido: "桜田児童館",
  // new-style childrens-center paths
  "childrens-center/ukima": "浮間児童館",
  "childrens-center/shimo": "志茂子ども交流館",
  "childrens-center/akabane": "赤羽児童館",
  "childrens-center/jujodai": "十条台子どもセンター",
  "childrens-center/kamijujo-higashi": "上十条東児童館",
  "childrens-center/takinogawa-higashi": "滝野川東児童館",
  "childrens-center/takinogawa-nishi": "滝野川西児童館",
  "childrens-center/nishigaoka": "西が丘児童館",
  "childrens-center/ouji": "王子児童館",
  "childrens-center/kamiya": "神谷児童館",
  "childrens-center/nakazato": "中里児童館",
  "childrens-center/tabata": "田端児童館",
  "childrens-center/akabane-nishi": "赤羽西児童館",
  "childrens-center/iwabuchi": "岩淵児童館",
  "childrens-center/sakurada": "桜田児童館",
  "childrens-center/fukuro": "袋児童館",
  "childrens-center/hachimanyama": "八幡山子どもセンター",
  "childrens-center/nishigahara": "西が原子どもセンター",
  "childrens-center/takinogawanishi": "滝野川西児童館",
  "childrens-center/takinogawahigashi": "滝野川東児童館",
  "childrens-center/kamijujohigashi": "上十条東児童館",
  "childrens-center/akabanenishi": "赤羽西児童館",
};

function inferKitaVenueFromTitle(title) {
  const t = normalizeText(title);
  if (!t) return "";
  const paren = t.match(
    /[（(]([^）)]{2,60}(?:児童館|児童センター|子ども交流館|交流館|子どもセンター|子どもクラブ|ひろば|プラザ|図書館)[^）)]{0,20})[）)]/u
  );
  if (paren) return sanitizeVenueText(paren[1]);
  const inline = t.match(
    /([^\s]{2,60}(?:児童館|児童センター|子ども交流館|交流館|子どもセンター|子どもクラブ))/u
  );
  if (inline) return sanitizeVenueText(inline[1]);
  return "";
}

function inferKitaVenueFromUrl(url) {
  let pathname = "";
  try { pathname = new URL(String(url || "")).pathname.toLowerCase(); } catch { return ""; }
  for (const [token, venue] of Object.entries(KITA_URL_FACILITY_MAP)) {
    if (token.includes("/")) {
      if (pathname.includes(`/${token}/`)) return venue;
    } else {
      if (pathname.includes(`/${token}/`) || pathname.includes(`/${token}.`)) return venue;
    }
  }
  return "";
}

function createCollectKitaJidokanEvents(deps) {
  const {
    geocodeForWard,
    resolveEventAddress,
    resolveEventPoint,
    getFacilityAddressFromMaster,
  } = deps;

  return async function collectKitaJidokanEvents(maxDays) {
    let js = "";
    try {
      js = await fetchText(`${KITA_SOURCE.baseUrl}/education/event_edu.js`);
    } catch (e) {
      console.warn("[kita] event JS fetch failed:", e.message || e);
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

      let url = "";
      try {
        url = ev?.url ? new URL(String(ev.url), `${KITA_SOURCE.baseUrl}/`).toString() : "";
      } catch {
        url = "";
      }
      if (!url) continue;

      let venue_name = normalizeText(ev?.place2 || "");
      if (!venue_name || isJunkVenueName(venue_name)) venue_name = inferKitaVenueFromTitle(`${title} ${bodyText}`);
      if (!venue_name || isJunkVenueName(venue_name)) venue_name = inferKitaVenueFromUrl(url);
      if (!venue_name) venue_name = "\u5317\u533a\u5150\u7ae5\u9928";
      const hay = `${title} ${venue_name} ${bodyText}`;
      if (!WARD_CHILD_HINT_RE.test(hay)) continue;

      const opendays = Array.isArray(ev?.opendays) ? ev.opendays : [];
      if (opendays.length === 0) continue;
      const timeRange = parseTimeRangeFromText(`${(Array.isArray(ev?.times) ? ev.times.join(" ") : "")} ${ev?.time_texts || ""}`);
      let rawAddress = extractTokyoAddress(bodyText);
      if (!rawAddress && getFacilityAddressFromMaster) {
        rawAddress = getFacilityAddressFromMaster(KITA_SOURCE.key, venue_name) || "";
      }

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

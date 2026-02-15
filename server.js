const http = require("http");
const path = require("path");
const { sendFile, sendJson } = require("./src/server/http-utils");
const { createGeoHelpers, loadGeoCache } = require("./src/server/geo-utils");
const { createFacilityMaster } = require("./src/server/facility-master");
const { createCollectSetagayaJidokanEvents } = require("./src/server/collectors/setagaya");
const { createCollectOtaJidokanEvents } = require("./src/server/collectors/ota");
const { createCollectShinagawaJidokanEvents } = require("./src/server/collectors/shinagawa");
const { createCollectMeguroJidokanEvents } = require("./src/server/collectors/meguro");
const { createCollectShibuyaJidokanEvents } = require("./src/server/collectors/shibuya");
const { createCollectMinatoJidokanEvents } = require("./src/server/collectors/minato");
const { createCollectChiyodaJidokanEvents } = require("./src/server/collectors/chiyoda");
const { createCollectChuoAkachanTengokuEvents } = require("./src/server/collectors/chuo-akachan");
const { createCollectKitaJidokanEvents } = require("./src/server/collectors/kita");
const { createCollectWardGenericEvents } = require("./src/server/collectors/ward-generic");
const { createCollectAdditionalWardsEvents } = require("./src/server/collectors/additional-wards");
const { createCollectHachiojiEvents } = require("./src/server/collectors/hachioji");
const { createCollectMusashinoEvents } = require("./src/server/collectors/musashino");
const { createCollectTachikawaEvents } = require("./src/server/collectors/tachikawa");
const { createCollectMitakaEvents } = require("./src/server/collectors/mitaka");
const { createCollectKodairaEvents } = require("./src/server/collectors/kodaira");
const { createCollectHigashimurayamaEvents } = require("./src/server/collectors/higashimurayama");
const { createCollectKunitachiEvents } = require("./src/server/collectors/kunitachi");
const { createCollectOmeEvents } = require("./src/server/collectors/ome");
const { createCollectHamuraEvents } = require("./src/server/collectors/hamura");
const { createEventJsCollector } = require("./src/server/collectors/event-js-collector");
const { createGetEvents } = require("./src/server/events-service");
const {
  CACHE_TTL_MS,
  KNOWN_NAKANO_FACILITIES, KNOWN_CHIYODA_FACILITIES, KNOWN_CHUO_FACILITIES,
  KNOWN_KOGANEI_FACILITIES,
  KNOWN_ARAKAWA_FACILITIES, KNOWN_CHOFU_FACILITIES, KNOWN_MUSASHIMURAYAMA_FACILITIES,
  KNOWN_KOMAE_FACILITIES,
  KNOWN_MUSASHINO_FACILITIES, KNOWN_TACHIKAWA_FACILITIES,
  AKISHIMA_SOURCE, KNOWN_AKISHIMA_FACILITIES,
  HIGASHIYAMATO_SOURCE, KNOWN_HIGASHIYAMATO_FACILITIES,
  KIYOSE_SOURCE, KNOWN_KIYOSE_FACILITIES,
  TAMA_SOURCE, KNOWN_TAMA_FACILITIES,
  INAGI_SOURCE, KNOWN_INAGI_FACILITIES,
  HINO_SOURCE, KNOWN_HINO_FACILITIES,
  KOKUBUNJI_SOURCE, KNOWN_KOKUBUNJI_FACILITIES,
  HIGASHIKURUME_SOURCE, KNOWN_HIGASHIKURUME_FACILITIES,
  KNOWN_MITAKA_FACILITIES,
  KNOWN_KODAIRA_FACILITIES,
  KNOWN_HIGASHIMURAYAMA_FACILITIES,
  KUNITACHI_SOURCE, KNOWN_KUNITACHI_FACILITIES,
  OME_SOURCE, KNOWN_OME_FACILITIES,
  HAMURA_SOURCE, KNOWN_HAMURA_FACILITIES,
} = require("./src/config/wards");

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, "public");
const SNAPSHOT_PATH = path.join(__dirname, "data", "events_snapshot.json");
const GEO_CACHE_PATH = path.join(__dirname, "data", "geo_cache.json");

// --- Mutable state ---
const cache = { key: "", data: null, savedAt: 0 };
const geoCache = new Map();
const facilityAddressMaster = new Map();
const facilityPointMaster = new Map();

// --- Load persisted geoCache ---
loadGeoCache(GEO_CACHE_PATH, geoCache);

// --- Geo helpers (depends on geoCache) ---
const { geocodeForWard, haversineKm, sanitizeWardPoint } = createGeoHelpers({ geoCache });

// --- Facility master (depends on Maps + sanitizeWardPoint) ---
const {
  getFacilityAddressFromMaster,
  setFacilityAddressToMaster,
  resolveEventAddress,
  resolveEventPoint,
} = createFacilityMaster({ facilityAddressMaster, facilityPointMaster, sanitizeWardPoint });

// --- Pre-populate facility addresses ---
for (const [name, address] of Object.entries(KNOWN_NAKANO_FACILITIES)) {
  setFacilityAddressToMaster("nakano", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHIYODA_FACILITIES)) {
  setFacilityAddressToMaster("chiyoda", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHUO_FACILITIES)) {
  setFacilityAddressToMaster("chuo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOGANEI_FACILITIES)) {
  setFacilityAddressToMaster("koganei", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ARAKAWA_FACILITIES)) {
  setFacilityAddressToMaster("arakawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHOFU_FACILITIES)) {
  setFacilityAddressToMaster("chofu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MUSASHINO_FACILITIES)) {
  setFacilityAddressToMaster("musashino", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TACHIKAWA_FACILITIES)) {
  setFacilityAddressToMaster("tachikawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_AKISHIMA_FACILITIES)) {
  setFacilityAddressToMaster("akishima", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIGASHIYAMATO_FACILITIES)) {
  setFacilityAddressToMaster("higashiyamato", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KIYOSE_FACILITIES)) {
  setFacilityAddressToMaster("kiyose", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TAMA_FACILITIES)) {
  setFacilityAddressToMaster("tama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_INAGI_FACILITIES)) {
  setFacilityAddressToMaster("inagi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HINO_FACILITIES)) {
  setFacilityAddressToMaster("hino", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOKUBUNJI_FACILITIES)) {
  setFacilityAddressToMaster("kokubunji", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIGASHIKURUME_FACILITIES)) {
  setFacilityAddressToMaster("higashikurume", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MITAKA_FACILITIES)) {
  setFacilityAddressToMaster("mitaka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KODAIRA_FACILITIES)) {
  setFacilityAddressToMaster("kodaira", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIGASHIMURAYAMA_FACILITIES)) {
  setFacilityAddressToMaster("higashimurayama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KUNITACHI_FACILITIES)) {
  setFacilityAddressToMaster("kunitachi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_OME_FACILITIES)) {
  setFacilityAddressToMaster("ome", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HAMURA_FACILITIES)) {
  setFacilityAddressToMaster("hamura", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MUSASHIMURAYAMA_FACILITIES)) {
  setFacilityAddressToMaster("musashimurayama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOMAE_FACILITIES)) {
  setFacilityAddressToMaster("komae", name, address);
}

// --- Shared deps for collectors ---
const geoDeps = { geocodeForWard, resolveEventPoint, resolveEventAddress };

// --- Ward-specific collectors ---
const collectSetagayaJidokanEvents = createCollectSetagayaJidokanEvents(geoDeps);
const collectOtaJidokanEvents = createCollectOtaJidokanEvents({ ...geoDeps, setFacilityAddressToMaster });
const collectShinagawaJidokanEvents = createCollectShinagawaJidokanEvents({ ...geoDeps, setFacilityAddressToMaster });
const collectMeguroJidokanEvents = createCollectMeguroJidokanEvents(geoDeps);
const collectShibuyaJidokanEvents = createCollectShibuyaJidokanEvents(geoDeps);
const collectMinatoJidokanEvents = createCollectMinatoJidokanEvents({ ...geoDeps, sanitizeWardPoint });
const collectChiyodaJidokanEvents = createCollectChiyodaJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });

// --- Generic + specialized collectors ---
const collectChuoAkachanTengokuEvents = createCollectChuoAkachanTengokuEvents(geoDeps);
const collectKitaJidokanEvents = createCollectKitaJidokanEvents(geoDeps);
const collectWardGenericEvents = createCollectWardGenericEvents({
  ...geoDeps,
  getFacilityAddressFromMaster,
  haversineKm,
});
const collectHachiojiEvents = createCollectHachiojiEvents(geoDeps);
const collectMusashinoEvents = createCollectMusashinoEvents(geoDeps);
const collectTachikawaEvents = createCollectTachikawaEvents(geoDeps);
const collectMitakaEvents = createCollectMitakaEvents(geoDeps);
const collectKodairaEvents = createCollectKodairaEvents(geoDeps);
const collectHigashimurayamaEvents = createCollectHigashimurayamaEvents(geoDeps);
const collectKunitachiEvents = createCollectKunitachiEvents(geoDeps);
const collectOmeEvents = createCollectOmeEvents(geoDeps);
const collectHamuraEvents = createCollectHamuraEvents(geoDeps);
const collectAkishimaEvents = createEventJsCollector({
  source: AKISHIMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["10"], knownFacilities: KNOWN_AKISHIMA_FACILITIES,
}, geoDeps);
const collectHigashiyamatoEvents = createEventJsCollector({
  source: HIGASHIYAMATO_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20"], knownFacilities: KNOWN_HIGASHIYAMATO_FACILITIES,
}, geoDeps);
const collectKiyoseEvents = createEventJsCollector({
  source: KIYOSE_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: KNOWN_KIYOSE_FACILITIES,
}, geoDeps);
const collectTamaEvents = createEventJsCollector({
  source: TAMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["70"], knownFacilities: KNOWN_TAMA_FACILITIES,
}, geoDeps);
const collectInagiEvents = createEventJsCollector({
  source: INAGI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["40"], knownFacilities: KNOWN_INAGI_FACILITIES,
}, geoDeps);
const collectHinoEvents = createEventJsCollector({
  source: HINO_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["1"], knownFacilities: KNOWN_HINO_FACILITIES,
}, geoDeps);
const collectKokubunjiEvents = createEventJsCollector({
  source: KOKUBUNJI_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6"], knownFacilities: KNOWN_KOKUBUNJI_FACILITIES,
}, geoDeps);
const collectHigashikurumeEvents = createEventJsCollector({
  source: HIGASHIKURUME_SOURCE, jsFile: "event_d.js",
  childCategoryIds: ["6", "7"], knownFacilities: KNOWN_HIGASHIKURUME_FACILITIES,
}, geoDeps);
const collectAdditionalWardsEvents = createCollectAdditionalWardsEvents({
  collectChuoAkachanTengokuEvents,
  collectKitaJidokanEvents,
  collectWardGenericEvents,
});

// --- Events service ---
const getEvents = createGetEvents({
  CACHE_TTL_MS,
  cache,
  snapshotPath: SNAPSHOT_PATH,
  geoCache,
  geoCachePath: GEO_CACHE_PATH,
  collectAdditionalWardsEvents,
  collectChiyodaJidokanEvents,
  collectMeguroJidokanEvents,
  collectMinatoJidokanEvents,
  collectOtaJidokanEvents,
  collectSetagayaJidokanEvents,
  collectShibuyaJidokanEvents,
  collectShinagawaJidokanEvents,
  collectHachiojiEvents,
  collectMusashinoEvents,
  collectTachikawaEvents,
  collectAkishimaEvents,
  collectHigashiyamatoEvents,
  collectKiyoseEvents,
  collectTamaEvents,
  collectInagiEvents,
  collectHinoEvents,
  collectKokubunjiEvents,
  collectHigashikurumeEvents,
  collectMitakaEvents,
  collectKodairaEvents,
  collectHigashimurayamaEvents,
  collectKunitachiEvents,
  collectOmeEvents,
  collectHamuraEvents,
});

// --- HTTP server ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/health") {
    sendJson(res, 200, {
      status: "ok",
      uptime_s: Math.floor(process.uptime()),
      cache_age_s: cache.savedAt ? Math.floor((Date.now() - cache.savedAt) / 1000) : null,
      cached_items: cache.data?.items?.length ?? 0,
    }, req);
    return;
  }

  if (url.pathname === "/api/events") {
    try {
      const days = Number(url.searchParams.get("days") || "30");
      const refresh = url.searchParams.get("refresh") === "1";
      const data = await getEvents(days, refresh);
      sendJson(res, 200, data, req);
    } catch (err) {
      sendJson(res, 500, {
        error: "failed_to_fetch_events",
        message: err instanceof Error ? err.message : String(err),
      }, req);
    }
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    sendFile(res, path.join(PUBLIC_DIR, "index.html"), req);
    return;
  }

  const candidate = path.join(PUBLIC_DIR, url.pathname);
  if (!candidate.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }
  sendFile(res, candidate, req);
});

server.listen(PORT, () => {
  console.log(`kids-play-map running on http://localhost:${PORT}`);
});

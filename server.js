const fs = require("fs");
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
const { createCollectKawasakiEvents } = require("./src/server/collectors/kawasaki");
const { createCollectYokohamaEvents } = require("./src/server/collectors/yokohama");
const { createCollectKamakuraEvents } = require("./src/server/collectors/kamakura");
const { createCollectYokosukaEvents } = require("./src/server/collectors/yokosuka");
const { createCollectYamatoEvents } = require("./src/server/collectors/yamato");
const { createCollectHiratsukaEvents } = require("./src/server/collectors/hiratsuka");
const { createCollectOdawaraEvents } = require("./src/server/collectors/odawara");
const { createCollectHadanoEvents } = require("./src/server/collectors/hadano");
const { createCollectAyaseEvents } = require("./src/server/collectors/ayase");
const { createCollectAtsugiEvents } = require("./src/server/collectors/atsugi");
const { createCollectIseharaEvents } = require("./src/server/collectors/isehara");
const { createCollectMinamiashigaraEvents } = require("./src/server/collectors/minamiashigara");
const { createCalendarJsonCollector } = require("./src/server/collectors/calendar-json-collector");
const { createCollectFujisawaEvents } = require("./src/server/collectors/fujisawa");
const { createCollectNinomiyaEvents } = require("./src/server/collectors/ninomiya");
const { createMunicipalCalendarCollector } = require("./src/server/collectors/municipal-calendar-collector");
const { createCollectMatsudaEvents } = require("./src/server/collectors/matsuda");
const { createCollectKaiseiEvents } = require("./src/server/collectors/kaisei");
const { createCollectYamakitaEvents } = require("./src/server/collectors/yamakita");
const { createCollectMizuhoEvents } = require("./src/server/collectors/mizuho");
const { createCollectHinodeEvents } = require("./src/server/collectors/hinode");
const { createCollectHinoharaEvents } = require("./src/server/collectors/hinohara");
const { createEventJsCollector } = require("./src/server/collectors/event-js-collector");
const { createCollectFunabashiEvents } = require("./src/server/collectors/funabashi");
const { createCollectNaritaEvents } = require("./src/server/collectors/narita");
const { createCollectChibaEvents } = require("./src/server/collectors/chiba");
const { createCollectKashiwaEvents } = require("./src/server/collectors/kashiwa");
const { createCollectIchikawaEvents } = require("./src/server/collectors/ichikawa");
const { createCollectYotsukaidoEvents } = require("./src/server/collectors/yotsukaido");
const { createCollectMatsudoEvents } = require("./src/server/collectors/matsudo");
const { createListCalendarCollector } = require("./src/server/collectors/list-calendar-collector");
const { createTableCalendarCollector } = require("./src/server/collectors/table-calendar-collector");
const { createRdfEventCollector } = require("./src/server/collectors/rdf-event-collector");
const { createCollectIchinomiyaEvents } = require("./src/server/collectors/ichinomiya");
const { createCollectChoshiEvents } = require("./src/server/collectors/choshi");
const {
  createCollectMobaraEvents, createCollectTateyamaEvents,
  createCollectMinamibosoEvents, createCollectOamishirasatoEvents,
  createCollectShisuiEvents, createCollectKozakiEvents,
  createCollectTakoEvents, createCollectShibayamaEvents,
  createCollectMutsuzawaEvents, createCollectChoseiEvents,
  createCollectNagaraEvents, createCollectOnjukuEvents,
  createCollectChonanEvents,
} = require("./src/server/collectors/chiba-remaining");
const { createCollectHakoneEvents } = require("./src/server/collectors/hakone");
const { createEvent2CalendarCollector } = require("./src/server/collectors/event2-calendar-collector");
const { createCollectSaitamaEvents } = require("./src/server/collectors/saitama");
const { createCollectKoshigayaEvents } = require("./src/server/collectors/koshigaya");
const { createCollectSokaEvents } = require("./src/server/collectors/soka");
const { createCollectTsurugashimaEvents } = require("./src/server/collectors/tsurugashima");
const { createCollectHasudaEvents } = require("./src/server/collectors/hasuda");
const { createCollectKamisatoEvents } = require("./src/server/collectors/kamisato");
const { createCollectYoshikawaEvents } = require("./src/server/collectors/yoshikawa");
const { createCollectOganoEvents } = require("./src/server/collectors/ogano");
const { createCollectHigashichichibEvents } = require("./src/server/collectors/higashichichibu");
const { createCollectKawajimaEvents } = require("./src/server/collectors/kawajima");
const { createCollectKitamotoEvents } = require("./src/server/collectors/kitamoto");
const { createCollectInaEvents } = require("./src/server/collectors/ina");
const { createCollectYokozeEvents } = require("./src/server/collectors/yokoze");
const { createCollectNagatoroEvents } = require("./src/server/collectors/nagatoro");
const { createCollectMiyoshiEvents } = require("./src/server/collectors/miyoshi");
const { createCollectHatoyamaEvents } = require("./src/server/collectors/hatoyama");
const { createCollectMiyashiroEvents } = require("./src/server/collectors/miyashiro");
const { createCollectChichibuEvents } = require("./src/server/collectors/chichibu");
const { createCollectRanzanEvents } = require("./src/server/collectors/ranzan");
const { createCollectMatsubushiEvents } = require("./src/server/collectors/matsubushi");
const { createCollectMinanoEvents } = require("./src/server/collectors/minano");
const { createCollectMoroyamaEvents } = require("./src/server/collectors/moroyama");
const { createCollectHanyuEvents } = require("./src/server/collectors/hanyu");
const { createCollectMisatoSaitamaEvents } = require("./src/server/collectors/misato-saitama");
const {
  createCollectUtsunomiyaEvents, createCollectAshikagaEvents,
  createCollectKanumaEvents, createCollectOyamaEvents,
  createCollectOhtawaraEvents, createCollectTochigiSakuraEvents,
  createCollectNasukarasuyamaEvents, createCollectShimotsukeEvents,
  createCollectKaminokawaEvents, createCollectMashikoEvents,
  createCollectMotegiEvents, createCollectIchikaiEvents,
  createCollectHagaEvents, createCollectMibuEvents,
  createCollectNogiEvents, createCollectShioyaEvents,
  createCollectTakanezawaEvents, createCollectNasuEvents,
  createCollectTochigiNakagawaEvents,
} = require("./src/server/collectors/tochigi-remaining");
const {
  createCollectKiryuEvents, createCollectNumataEvents,
  createCollectTatebayashiEvents, createCollectShibukawaEvents,
  createCollectTomiokaEvents, createCollectMidoriEvents,
  createCollectShintoEvents, createCollectYoshiokaEvents,
  createCollectUenoGunmaEvents, createCollectKannaEvents,
  createCollectShimonitaEvents, createCollectNanmokuEvents,
  createCollectKanraEvents, createCollectNaganoharaEvents,
  createCollectTsumagoiEvents, createCollectKusatsuEvents,
  createCollectTakayamaGunmaEvents, createCollectHigashiagatsumaEvents,
  createCollectKatashinaEvents, createCollectKawabaEvents,
  createCollectShowaGunmaEvents, createCollectMinakamiEvents,
  createCollectTamamuraEvents, createCollectItakuraEvents,
  createCollectMeiwaGunmaEvents, createCollectChiyodaGunmaEvents,
  createCollectOizumiEvents, createCollectOraEvents,
} = require("./src/server/collectors/gunma-remaining");
const { createGetEvents } = require("./src/server/events-service");
const {
  CACHE_TTL_MS,
  KNOWN_NAKANO_FACILITIES, KNOWN_CHIYODA_FACILITIES, KNOWN_CHUO_FACILITIES,
  KNOWN_KOGANEI_FACILITIES, KNOWN_FUCHU_FACILITIES,
  KNOWN_ARAKAWA_FACILITIES, KNOWN_CHOFU_FACILITIES, KNOWN_MUSASHIMURAYAMA_FACILITIES,
  KNOWN_KOMAE_FACILITIES,
  KNOWN_MUSASHINO_FACILITIES, KNOWN_TACHIKAWA_FACILITIES,
  KNOWN_OTA_FACILITIES, KNOWN_MINATO_FACILITIES,
  KNOWN_TOSHIMA_FACILITIES, KNOWN_MEGURO_FACILITIES,
  KNOWN_KITA_FACILITIES, KNOWN_ITABASHI_FACILITIES,
  KNOWN_BUNKYO_FACILITIES, KNOWN_AKIRUNO_FACILITIES,
  KNOWN_NISHITOKYO_FACILITIES, KNOWN_SHINJUKU_FACILITIES,
  KNOWN_EDOGAWA_FACILITIES, KNOWN_ADACHI_FACILITIES,
  KNOWN_KOTO_FACILITIES, KNOWN_SETAGAYA_FACILITIES, KNOWN_TAITO_FACILITIES,
  KNOWN_SHIBUYA_FACILITIES, KNOWN_NERIMA_FACILITIES, KNOWN_KATSUSHIKA_FACILITIES,
  KNOWN_SUMIDA_FACILITIES, KNOWN_SUGINAMI_FACILITIES, KNOWN_FUSSA_FACILITIES,
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
  SAGAMIHARA_SOURCE, KNOWN_SAGAMIHARA_FACILITIES,
  EBINA_SOURCE, KNOWN_EBINA_FACILITIES,
  KAMAKURA_SOURCE, KNOWN_KAMAKURA_FACILITIES,
  YOKOSUKA_SOURCE, KNOWN_YOKOSUKA_FACILITIES,
  CHIGASAKI_SOURCE, KNOWN_CHIGASAKI_FACILITIES,
  ZAMA_SOURCE, KNOWN_ZAMA_FACILITIES,
  ZUSHI_SOURCE, KNOWN_ZUSHI_FACILITIES,
  YAMATO_SOURCE, KNOWN_YAMATO_FACILITIES,
  HIRATSUKA_SOURCE, KNOWN_HIRATSUKA_FACILITIES,
  ODAWARA_SOURCE, KNOWN_ODAWARA_FACILITIES,
  HADANO_SOURCE, KNOWN_HADANO_FACILITIES,
  AYASE_SOURCE, KNOWN_AYASE_FACILITIES,
  ATSUGI_SOURCE, KNOWN_ATSUGI_FACILITIES,
  ISEHARA_SOURCE, KNOWN_ISEHARA_FACILITIES,
  MINAMIASHIGARA_SOURCE,
  SAMUKAWA_SOURCE, KNOWN_SAMUKAWA_FACILITIES,
  AIKAWA_SOURCE, KNOWN_AIKAWA_FACILITIES,
  MIURA_SOURCE, KNOWN_MIURA_FACILITIES,
  OISO_SOURCE, HAYAMA_SOURCE, KAISEI_SOURCE, YAMAKITA_SOURCE, KNOWN_YAMAKITA_FACILITIES,
  FUJISAWA_SOURCE, KNOWN_FUJISAWA_FACILITIES,
  NAKAI_SOURCE, KIYOKAWA_SOURCE,
  NINOMIYA_SOURCE, KNOWN_NINOMIYA_FACILITIES,
  OI_SOURCE, YUGAWARA_SOURCE,
  MATSUDA_SOURCE, MANAZURU_SOURCE, HAKONE_SOURCE,
  OKUTAMA_SOURCE, HINODE_SOURCE, HINOHARA_SOURCE,
  NAGAREYAMA_SOURCE, KNOWN_NAGAREYAMA_FACILITIES,
  URAYASU_SOURCE, KNOWN_URAYASU_FACILITIES,
  NODA_SOURCE, KNOWN_NODA_FACILITIES,
  NARASHINO_SOURCE, KNOWN_NARASHINO_FACILITIES,
  SHIROI_SOURCE, KISARAZU_SOURCE, KNOWN_KISARAZU_FACILITIES,
  ISUMI_SOURCE, TOHNOSHO_SOURCE, OTAKI_SOURCE,
  FUNABASHI_SOURCE, KNOWN_FUNABASHI_FACILITIES,
  NARITA_SOURCE, KNOWN_NARITA_FACILITIES,
  CHIBA_CITY_SOURCE, KNOWN_CHIBA_CITY_FACILITIES,
  KASHIWA_SOURCE, KNOWN_KASHIWA_FACILITIES,
  YACHIYO_SOURCE, KNOWN_YACHIYO_FACILITIES,
  ASAHI_SOURCE, KNOWN_ASAHI_FACILITIES,
  KAMOGAWA_SOURCE, KNOWN_KAMOGAWA_FACILITIES,
  YOKOSHIBAHIKARI_SOURCE, ICHIKAWA_SOURCE, KNOWN_ICHIKAWA_FACILITIES,
  KATSUURA_SOURCE, KIMITSU_SOURCE, KYONAN_SOURCE, KNOWN_KYONAN_FACILITIES,
  YOTSUKAIDO_SOURCE, MATSUDO_SOURCE,
  ABIKO_SOURCE, KNOWN_ABIKO_FACILITIES, KAMAGAYA_SOURCE,
  TOMISATO_SOURCE, SHIRAKO_SOURCE, KUJUKURI_SOURCE,
  YACHIMATA_SOURCE, SODEGAURA_SOURCE,
  ICHINOMIYA_SOURCE, CHOSHI_SOURCE,
  SAKURA_SOURCE, FUTTSU_SOURCE, INZAI_SOURCE,
  KATORI_SOURCE, TOGANE_SOURCE, ICHIHARA_SOURCE,
  SOSA_SOURCE, SAMMU_SOURCE, SAKAE_CHIBA_SOURCE,
  MOBARA_SOURCE, TATEYAMA_SOURCE, MINAMIBOSO_SOURCE,
  OAMISHIRASATO_SOURCE, SHISUI_SOURCE, KOZAKI_SOURCE,
  TAKO_SOURCE, SHIBAYAMA_SOURCE, MUTSUZAWA_SOURCE,
  CHOSEI_SOURCE, NAGARA_SOURCE, ONJUKU_SOURCE, CHONAN_SOURCE,
  KAWAGUCHI_SOURCE, KASUKABE_SOURCE,
  FUJIMINO_SOURCE, KNOWN_FUJIMINO_FACILITIES,
  MISATO_SOURCE, KNOWN_MISATO_FACILITIES,
  KAWAGOE_SOURCE, KNOWN_KAWAGOE_FACILITIES,
  WAKO_SOURCE, KNOWN_WAKO_FACILITIES,
  WARABI_SOURCE, KNOWN_WARABI_FACILITIES,
  AGEO_SOURCE, KNOWN_AGEO_FACILITIES,
  NIIZA_SOURCE, ASAKA_SOURCE, TODA_SOURCE, KNOWN_TODA_FACILITIES,
  SHIKI_SOURCE, KNOWN_SHIKI_FACILITIES,
  FUJIMI_SOURCE, KNOWN_FUJIMI_FACILITIES,
  SAYAMA_SOURCE, KNOWN_SAYAMA_FACILITIES,
  YASHIO_SOURCE, KNOWN_YASHIO_FACILITIES,
  SAITAMA_CITY_SOURCE,
  KOSHIGAYA_SOURCE, KNOWN_KOSHIGAYA_FACILITIES,
  TOKOROZAWA_SOURCE, KNOWN_TOKOROZAWA_FACILITIES,
  KUKI_SOURCE, KNOWN_KUKI_FACILITIES,
  KUMAGAYA_SOURCE,
  KOUNOSU_SOURCE, KNOWN_KOUNOSU_FACILITIES,
  SAKADO_SOURCE, KNOWN_SAKADO_FACILITIES,
  HANNO_SOURCE,
  HIGASHIMATSUYAMA_SOURCE,
  GYODA_SOURCE, KNOWN_GYODA_FACILITIES,
  HONJO_SOURCE, KNOWN_HONJO_FACILITIES,
  HIDAKA_SOURCE, KNOWN_HIDAKA_FACILITIES,
  SHIRAOKA_SOURCE, SATTE_SOURCE,
  YORII_SOURCE, SUGITO_SOURCE,
  SOKA_SOURCE, KNOWN_SOKA_FACILITIES,
  TSURUGASHIMA_SOURCE, KNOWN_TSURUGASHIMA_FACILITIES,
  HASUDA_SOURCE, KNOWN_HASUDA_FACILITIES,
  IRUMA_SOURCE, KNOWN_IRUMA_FACILITIES,
  KAZO_SOURCE,
  FUKAYA_SOURCE, OKEGAWA_SOURCE,
  OGOSE_SOURCE, OGAWA_SOURCE, YOSHIMI_SOURCE, KAMIKAWA_SOURCE,
  KAMISATO_SOURCE,
  YOSHIKAWA_SOURCE, KNOWN_YOSHIKAWA_FACILITIES,
  OGANO_SOURCE, HIGASHICHICHIBU_SOURCE,
  KAWAJIMA_SOURCE,
  KITAMOTO_SOURCE, INA_SAITAMA_SOURCE, YOKOZE_SOURCE,
  NAGATORO_SOURCE, KNOWN_NAGATORO_FACILITIES,
  MIYOSHI_SAITAMA_SOURCE, KNOWN_MIYOSHI_SAITAMA_FACILITIES,
  HATOYAMA_SOURCE, KNOWN_HATOYAMA_FACILITIES,
  MIYASHIRO_SOURCE,
  CHICHIBU_SOURCE,
  NAMEGAWA_SOURCE, RANZAN_SOURCE, MATSUBUSHI_SOURCE,
  MINANO_SOURCE, MOROYAMA_SOURCE,
  HANYU_SOURCE, MISATO_SAITAMA_SOURCE,
  // Tochigi
  SANO_SOURCE, NIKKO_SOURCE, MOKA_SOURCE, NASUSHIOBARA_SOURCE,
  TOCHIGI_CITY_SOURCE, YAITA_SOURCE,
  KNOWN_YAITA_FACILITIES, KNOWN_NIKKO_FACILITIES,
  KNOWN_NASUSHIOBARA_FACILITIES, KNOWN_UTSUNOMIYA_FACILITIES,
  // Gunma
  MAEBASHI_SOURCE, KNOWN_MAEBASHI_FACILITIES,
  TAKASAKI_SOURCE, KNOWN_TAKASAKI_FACILITIES,
  ISESAKI_SOURCE, KNOWN_ISESAKI_FACILITIES,
  OTA_GUNMA_SOURCE, KNOWN_OTA_GUNMA_FACILITIES,
  FUJIOKA_GUNMA_SOURCE, KNOWN_FUJIOKA_GUNMA_FACILITIES,
  ANNAKA_SOURCE, KNOWN_ANNAKA_FACILITIES,
  NAKANOJO_SOURCE, KNOWN_NAKANOJO_FACILITIES,
  KIRYU_SOURCE, KNOWN_KIRYU_FACILITIES,
  NUMATA_SOURCE, KNOWN_NUMATA_FACILITIES,
  TATEBAYASHI_SOURCE, KNOWN_TATEBAYASHI_FACILITIES,
  SHIBUKAWA_SOURCE, KNOWN_SHIBUKAWA_FACILITIES,
  TOMIOKA_SOURCE, KNOWN_TOMIOKA_FACILITIES,
  MIDORI_SOURCE, KNOWN_MIDORI_FACILITIES,
  SHINTO_SOURCE, KNOWN_SHINTO_FACILITIES,
  YOSHIOKA_SOURCE, KNOWN_YOSHIOKA_FACILITIES,
  UENO_GUNMA_SOURCE, KNOWN_UENO_GUNMA_FACILITIES,
  KANNA_SOURCE, KNOWN_KANNA_FACILITIES,
  SHIMONITA_SOURCE, KNOWN_SHIMONITA_FACILITIES,
  NANMOKU_SOURCE, KNOWN_NANMOKU_FACILITIES,
  KANRA_SOURCE, KNOWN_KANRA_FACILITIES,
  NAGANOHARA_SOURCE, KNOWN_NAGANOHARA_FACILITIES,
  TSUMAGOI_SOURCE, KNOWN_TSUMAGOI_FACILITIES,
  KUSATSU_SOURCE, KNOWN_KUSATSU_FACILITIES,
  TAKAYAMA_GUNMA_SOURCE, KNOWN_TAKAYAMA_GUNMA_FACILITIES,
  HIGASHIAGATSUMA_SOURCE, KNOWN_HIGASHIAGATSUMA_FACILITIES,
  KATASHINA_SOURCE, KNOWN_KATASHINA_FACILITIES,
  KAWABA_SOURCE, KNOWN_KAWABA_FACILITIES,
  SHOWA_GUNMA_SOURCE, KNOWN_SHOWA_GUNMA_FACILITIES,
  MINAKAMI_SOURCE, KNOWN_MINAKAMI_FACILITIES,
  TAMAMURA_SOURCE, KNOWN_TAMAMURA_FACILITIES,
  ITAKURA_SOURCE, KNOWN_ITAKURA_FACILITIES,
  MEIWA_SOURCE, KNOWN_MEIWA_FACILITIES,
  CHIYODA_GUNMA_SOURCE, KNOWN_CHIYODA_GUNMA_FACILITIES,
  OIZUMI_SOURCE, KNOWN_OIZUMI_FACILITIES,
  ORA_SOURCE, KNOWN_ORA_FACILITIES,
} = require("./src/config/wards");

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, "public");
const SNAPSHOT_PATH = path.join(__dirname, "data", "events_snapshot.json");
const GEO_CACHE_PATH = path.join(__dirname, "data", "geo_cache.json");

// --- Mutable state ---
const cache = { key: "", data: null, savedAt: 0 };

// --- Pre-load snapshot on startup ---
try {
  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  const snapshot = JSON.parse(raw);
  cache.key = "jidokan:90";
  cache.data = snapshot;
  cache.savedAt = Date.now();
  console.log(`[snapshot] pre-loaded ${snapshot.items?.length || 0} items`);
} catch {}

const geoCache = new Map();
const facilityAddressMaster = new Map();
const facilityPointMaster = new Map();

// --- Load persisted geoCache ---
loadGeoCache(GEO_CACHE_PATH, geoCache);
// Purge stale null entries so improved logic can re-geocode
let nullCount = 0;
for (const [k, v] of geoCache.entries()) {
  if (v === null) { geoCache.delete(k); nullCount++; }
}
if (nullCount > 0) console.log(`[geo] purged ${nullCount} stale null entries`);

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
for (const [name, address] of Object.entries(KNOWN_OTA_FACILITIES)) {
  setFacilityAddressToMaster("ota", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MINATO_FACILITIES)) {
  setFacilityAddressToMaster("minato", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TOSHIMA_FACILITIES)) {
  setFacilityAddressToMaster("toshima", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MEGURO_FACILITIES)) {
  setFacilityAddressToMaster("meguro", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KITA_FACILITIES)) {
  setFacilityAddressToMaster("kita", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ITABASHI_FACILITIES)) {
  setFacilityAddressToMaster("itabashi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_BUNKYO_FACILITIES)) {
  setFacilityAddressToMaster("bunkyo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_AKIRUNO_FACILITIES)) {
  setFacilityAddressToMaster("akiruno", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NISHITOKYO_FACILITIES)) {
  setFacilityAddressToMaster("nishitokyo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHINJUKU_FACILITIES)) {
  setFacilityAddressToMaster("shinjuku", name, address);
}
for (const [name, address] of Object.entries(KNOWN_EDOGAWA_FACILITIES)) {
  setFacilityAddressToMaster("edogawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ADACHI_FACILITIES)) {
  setFacilityAddressToMaster("adachi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOTO_FACILITIES)) {
  setFacilityAddressToMaster("koto", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SETAGAYA_FACILITIES)) {
  setFacilityAddressToMaster("setagaya", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TAITO_FACILITIES)) {
  setFacilityAddressToMaster("taito", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHIBUYA_FACILITIES)) {
  setFacilityAddressToMaster("shibuya", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NERIMA_FACILITIES)) {
  setFacilityAddressToMaster("nerima", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KATSUSHIKA_FACILITIES)) {
  setFacilityAddressToMaster("katsushika", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SUMIDA_FACILITIES)) {
  setFacilityAddressToMaster("sumida", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SUGINAMI_FACILITIES)) {
  setFacilityAddressToMaster("suginami", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUSSA_FACILITIES)) {
  setFacilityAddressToMaster("fussa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUCHU_FACILITIES)) {
  setFacilityAddressToMaster("fuchu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SAGAMIHARA_FACILITIES)) {
  setFacilityAddressToMaster("sagamihara", name, address);
}
for (const [name, address] of Object.entries(KNOWN_EBINA_FACILITIES)) {
  setFacilityAddressToMaster("ebina", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHIGASAKI_FACILITIES)) {
  setFacilityAddressToMaster("chigasaki", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ZAMA_FACILITIES)) {
  setFacilityAddressToMaster("zama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ZUSHI_FACILITIES)) {
  setFacilityAddressToMaster("zushi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KAMAKURA_FACILITIES)) {
  setFacilityAddressToMaster("kamakura", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YOKOSUKA_FACILITIES)) {
  setFacilityAddressToMaster("yokosuka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIRATSUKA_FACILITIES)) {
  setFacilityAddressToMaster("hiratsuka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SAMUKAWA_FACILITIES)) {
  setFacilityAddressToMaster("samukawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_AIKAWA_FACILITIES)) {
  setFacilityAddressToMaster("aikawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MIURA_FACILITIES)) {
  setFacilityAddressToMaster("miura", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUJISAWA_FACILITIES)) {
  setFacilityAddressToMaster("fujisawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NINOMIYA_FACILITIES)) {
  setFacilityAddressToMaster("ninomiya", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ODAWARA_FACILITIES)) {
  setFacilityAddressToMaster("odawara", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YAMAKITA_FACILITIES)) {
  setFacilityAddressToMaster("yamakita", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YAMATO_FACILITIES)) {
  setFacilityAddressToMaster("yamato", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HADANO_FACILITIES)) {
  setFacilityAddressToMaster("hadano", name, address);
}
for (const [name, address] of Object.entries(KNOWN_AYASE_FACILITIES)) {
  setFacilityAddressToMaster("ayase", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ATSUGI_FACILITIES)) {
  setFacilityAddressToMaster("atsugi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ISEHARA_FACILITIES)) {
  setFacilityAddressToMaster("isehara", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NAGAREYAMA_FACILITIES)) {
  setFacilityAddressToMaster("nagareyama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_URAYASU_FACILITIES)) {
  setFacilityAddressToMaster("urayasu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NODA_FACILITIES)) {
  setFacilityAddressToMaster("noda", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUNABASHI_FACILITIES)) {
  setFacilityAddressToMaster("funabashi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NARITA_FACILITIES)) {
  setFacilityAddressToMaster("narita", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHIBA_CITY_FACILITIES)) {
  setFacilityAddressToMaster("chiba", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KASHIWA_FACILITIES)) {
  setFacilityAddressToMaster("kashiwa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KISARAZU_FACILITIES)) {
  setFacilityAddressToMaster("kisarazu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ICHIKAWA_FACILITIES)) {
  setFacilityAddressToMaster("ichikawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KAMOGAWA_FACILITIES)) {
  setFacilityAddressToMaster("kamogawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ABIKO_FACILITIES)) {
  setFacilityAddressToMaster("abiko", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NARASHINO_FACILITIES)) {
  setFacilityAddressToMaster("narashino", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ASAHI_FACILITIES)) {
  setFacilityAddressToMaster("asahi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YACHIYO_FACILITIES)) {
  setFacilityAddressToMaster("yachiyo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KYONAN_FACILITIES)) {
  setFacilityAddressToMaster("kyonan", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KAWAGOE_FACILITIES)) {
  setFacilityAddressToMaster("kawagoe", name, address);
}
for (const [name, address] of Object.entries(KNOWN_WAKO_FACILITIES)) {
  setFacilityAddressToMaster("wako", name, address);
}
for (const [name, address] of Object.entries(KNOWN_WARABI_FACILITIES)) {
  setFacilityAddressToMaster("warabi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_AGEO_FACILITIES)) {
  setFacilityAddressToMaster("ageo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TODA_FACILITIES)) {
  setFacilityAddressToMaster("toda", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUJIMINO_FACILITIES)) {
  setFacilityAddressToMaster("fujimino", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MISATO_FACILITIES)) {
  setFacilityAddressToMaster("misato", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KUKI_FACILITIES)) {
  setFacilityAddressToMaster("kuki", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SAKADO_FACILITIES)) {
  setFacilityAddressToMaster("sakado", name, address);
}
for (const [name, address] of Object.entries(KNOWN_GYODA_FACILITIES)) {
  setFacilityAddressToMaster("gyoda", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HONJO_FACILITIES)) {
  setFacilityAddressToMaster("honjo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIDAKA_FACILITIES)) {
  setFacilityAddressToMaster("hidaka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_IRUMA_FACILITIES)) {
  setFacilityAddressToMaster("iruma", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SOKA_FACILITIES)) {
  setFacilityAddressToMaster("soka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TSURUGASHIMA_FACILITIES)) {
  setFacilityAddressToMaster("tsurugashima", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YOSHIKAWA_FACILITIES)) {
  setFacilityAddressToMaster("yoshikawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YASHIO_FACILITIES)) {
  setFacilityAddressToMaster("yashio", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUJIMI_FACILITIES)) {
  setFacilityAddressToMaster("fujimi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHIKI_FACILITIES)) {
  setFacilityAddressToMaster("shiki", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MIYOSHI_SAITAMA_FACILITIES)) {
  setFacilityAddressToMaster("miyoshi_saitama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOSHIGAYA_FACILITIES)) {
  setFacilityAddressToMaster("koshigaya", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HATOYAMA_FACILITIES)) {
  setFacilityAddressToMaster("hatoyama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NAGATORO_FACILITIES)) {
  setFacilityAddressToMaster("nagatoro", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SAYAMA_FACILITIES)) {
  setFacilityAddressToMaster("sayama", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KOUNOSU_FACILITIES)) {
  setFacilityAddressToMaster("kounosu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TOKOROZAWA_FACILITIES)) {
  setFacilityAddressToMaster("tokorozawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HASUDA_FACILITIES)) {
  setFacilityAddressToMaster("hasuda", name, address);
}
// --- Gunma KNOWN_FACILITIES ---
for (const [name, address] of Object.entries(KNOWN_MAEBASHI_FACILITIES)) {
  setFacilityAddressToMaster("maebashi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TAKASAKI_FACILITIES)) {
  setFacilityAddressToMaster("takasaki", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KIRYU_FACILITIES)) {
  setFacilityAddressToMaster("kiryu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ISESAKI_FACILITIES)) {
  setFacilityAddressToMaster("isesaki", name, address);
}
for (const [name, address] of Object.entries(KNOWN_OTA_GUNMA_FACILITIES)) {
  setFacilityAddressToMaster("ota_gunma", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NUMATA_FACILITIES)) {
  setFacilityAddressToMaster("numata", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TATEBAYASHI_FACILITIES)) {
  setFacilityAddressToMaster("tatebayashi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHIBUKAWA_FACILITIES)) {
  setFacilityAddressToMaster("shibukawa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_FUJIOKA_GUNMA_FACILITIES)) {
  setFacilityAddressToMaster("fujioka_gunma", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TOMIOKA_FACILITIES)) {
  setFacilityAddressToMaster("tomioka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ANNAKA_FACILITIES)) {
  setFacilityAddressToMaster("annaka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MIDORI_FACILITIES)) {
  setFacilityAddressToMaster("midori", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHINTO_FACILITIES)) {
  setFacilityAddressToMaster("shinto", name, address);
}
for (const [name, address] of Object.entries(KNOWN_YOSHIOKA_FACILITIES)) {
  setFacilityAddressToMaster("yoshioka", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KANRA_FACILITIES)) {
  setFacilityAddressToMaster("kanra", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NAKANOJO_FACILITIES)) {
  setFacilityAddressToMaster("nakanojo", name, address);
}
for (const [name, address] of Object.entries(KNOWN_KUSATSU_FACILITIES)) {
  setFacilityAddressToMaster("kusatsu", name, address);
}
for (const [name, address] of Object.entries(KNOWN_HIGASHIAGATSUMA_FACILITIES)) {
  setFacilityAddressToMaster("higashiagatsuma", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MINAKAMI_FACILITIES)) {
  setFacilityAddressToMaster("minakami", name, address);
}
for (const [name, address] of Object.entries(KNOWN_TAMAMURA_FACILITIES)) {
  setFacilityAddressToMaster("tamamura", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ITAKURA_FACILITIES)) {
  setFacilityAddressToMaster("itakura", name, address);
}
for (const [name, address] of Object.entries(KNOWN_MEIWA_FACILITIES)) {
  setFacilityAddressToMaster("meiwa", name, address);
}
for (const [name, address] of Object.entries(KNOWN_CHIYODA_GUNMA_FACILITIES)) {
  setFacilityAddressToMaster("chiyoda_gunma", name, address);
}
for (const [name, address] of Object.entries(KNOWN_OIZUMI_FACILITIES)) {
  setFacilityAddressToMaster("oizumi", name, address);
}
for (const [name, address] of Object.entries(KNOWN_ORA_FACILITIES)) {
  setFacilityAddressToMaster("ora", name, address);
}
for (const [name, address] of Object.entries(KNOWN_SHIMONITA_FACILITIES)) {
  setFacilityAddressToMaster("shimonita", name, address);
}
// Tochigi KNOWN_FACILITIES
for (const [name, address] of Object.entries(KNOWN_YAITA_FACILITIES)) {
  setFacilityAddressToMaster("yaita", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NIKKO_FACILITIES)) {
  setFacilityAddressToMaster("nikko", name, address);
}
for (const [name, address] of Object.entries(KNOWN_NASUSHIOBARA_FACILITIES)) {
  setFacilityAddressToMaster("nasushiobara", name, address);
}
for (const [name, address] of Object.entries(KNOWN_UTSUNOMIYA_FACILITIES)) {
  setFacilityAddressToMaster("utsunomiya", name, address);
}

// --- Shared deps for collectors ---
const geoDeps = { geocodeForWard, resolveEventPoint, resolveEventAddress };

// --- Ward-specific collectors ---
const collectSetagayaJidokanEvents = createCollectSetagayaJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });
const collectOtaJidokanEvents = createCollectOtaJidokanEvents({ ...geoDeps, setFacilityAddressToMaster, getFacilityAddressFromMaster });
const collectShinagawaJidokanEvents = createCollectShinagawaJidokanEvents({ ...geoDeps, setFacilityAddressToMaster });
const collectMeguroJidokanEvents = createCollectMeguroJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });
const collectShibuyaJidokanEvents = createCollectShibuyaJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });
const collectMinatoJidokanEvents = createCollectMinatoJidokanEvents({ ...geoDeps, sanitizeWardPoint, getFacilityAddressFromMaster });
const collectChiyodaJidokanEvents = createCollectChiyodaJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });

// --- Generic + specialized collectors ---
const collectChuoAkachanTengokuEvents = createCollectChuoAkachanTengokuEvents({ ...geoDeps, getFacilityAddressFromMaster });
const collectKitaJidokanEvents = createCollectKitaJidokanEvents({ ...geoDeps, getFacilityAddressFromMaster });
const collectWardGenericEvents = createCollectWardGenericEvents({
  ...geoDeps,
  getFacilityAddressFromMaster,
  haversineKm,
});
const geoFmDeps = { ...geoDeps, getFacilityAddressFromMaster };
const collectHachiojiEvents = createCollectHachiojiEvents(geoFmDeps);
const collectMusashinoEvents = createCollectMusashinoEvents(geoFmDeps);
const collectTachikawaEvents = createCollectTachikawaEvents(geoFmDeps);
const collectMitakaEvents = createCollectMitakaEvents(geoFmDeps);
const collectKodairaEvents = createCollectKodairaEvents(geoFmDeps);
const collectHigashimurayamaEvents = createCollectHigashimurayamaEvents(geoFmDeps);
const collectKunitachiEvents = createCollectKunitachiEvents(geoFmDeps);
const collectOmeEvents = createCollectOmeEvents(geoFmDeps);
const collectHamuraEvents = createCollectHamuraEvents(geoFmDeps);
const collectKawasakiEvents = createCollectKawasakiEvents();
const collectYokohamaEvents = createCollectYokohamaEvents();
const collectKamakuraEvents = createCollectKamakuraEvents(geoFmDeps);
const collectYokosukaEvents = createCollectYokosukaEvents(geoFmDeps);
const collectYamatoEvents = createCollectYamatoEvents(geoFmDeps);
const collectHiratsukaEvents = createCollectHiratsukaEvents(geoFmDeps);
const collectOdawaraEvents = createCollectOdawaraEvents(geoFmDeps);
const collectHadanoEvents = createCollectHadanoEvents(geoFmDeps);
const collectAyaseEvents = createCollectAyaseEvents(geoFmDeps);
const collectAtsugiEvents = createCollectAtsugiEvents(geoFmDeps);
const collectIseharaEvents = createCollectIseharaEvents(geoFmDeps);
const collectMinamiashigaraEvents = createCollectMinamiashigaraEvents(geoFmDeps);
const collectFujisawaEvents = createCollectFujisawaEvents(geoFmDeps);
const collectSamukawaEvents = createCalendarJsonCollector({ source: SAMUKAWA_SOURCE }, geoFmDeps);
const collectAikawaEvents = createCalendarJsonCollector({ source: AIKAWA_SOURCE }, geoFmDeps);
const collectMiuraEvents = createCalendarJsonCollector({ source: MIURA_SOURCE }, geoFmDeps);
const collectOisoEvents = createCalendarJsonCollector({ source: OISO_SOURCE }, geoFmDeps);
const collectHayamaEvents = createCalendarJsonCollector({ source: HAYAMA_SOURCE }, geoFmDeps);
const collectNakaiEvents = createCalendarJsonCollector({ source: NAKAI_SOURCE }, geoFmDeps);
const collectKiyokawaEvents = createCalendarJsonCollector({ source: KIYOKAWA_SOURCE }, geoFmDeps);
const collectNinomiyaEvents = createCollectNinomiyaEvents(geoFmDeps);
const collectOiEvents = createMunicipalCalendarCollector({ source: OI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectYugawaraEvents = createMunicipalCalendarCollector({ source: YUGAWARA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectMatsudaEvents = createCollectMatsudaEvents(geoFmDeps);
const collectManazuruEvents = createCalendarJsonCollector({ source: MANAZURU_SOURCE }, geoFmDeps);
const collectHakoneEvents = createCollectHakoneEvents(geoFmDeps);
const collectKaiseiEvents = createCollectKaiseiEvents(geoFmDeps);
const collectYamakitaEvents = createCollectYamakitaEvents(geoFmDeps);
const collectMizuhoEvents = createCollectMizuhoEvents(geoFmDeps);
const collectOkutamaEvents = createCalendarJsonCollector({ source: OKUTAMA_SOURCE }, geoFmDeps);
const collectHinodeEvents = createCollectHinodeEvents(geoFmDeps);
const collectHinoharaEvents = createCollectHinoharaEvents(geoFmDeps);
const eventJsDeps = { ...geoDeps, getFacilityAddressFromMaster };
const collectAkishimaEvents = createEventJsCollector({
  source: AKISHIMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["10"], knownFacilities: KNOWN_AKISHIMA_FACILITIES,
}, eventJsDeps);
const collectHigashiyamatoEvents = createEventJsCollector({
  source: HIGASHIYAMATO_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20"], knownFacilities: KNOWN_HIGASHIYAMATO_FACILITIES,
}, eventJsDeps);
const collectKiyoseEvents = createEventJsCollector({
  source: KIYOSE_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: KNOWN_KIYOSE_FACILITIES,
}, eventJsDeps);
const collectTamaEvents = createEventJsCollector({
  source: TAMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["70"], knownFacilities: KNOWN_TAMA_FACILITIES,
}, eventJsDeps);
const collectInagiEvents = createEventJsCollector({
  source: INAGI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["40"], knownFacilities: KNOWN_INAGI_FACILITIES,
}, eventJsDeps);
const collectHinoEvents = createEventJsCollector({
  source: HINO_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["1"], knownFacilities: KNOWN_HINO_FACILITIES,
}, eventJsDeps);
const collectKokubunjiEvents = createEventJsCollector({
  source: KOKUBUNJI_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6"], knownFacilities: KNOWN_KOKUBUNJI_FACILITIES,
}, eventJsDeps);
const collectHigashikurumeEvents = createEventJsCollector({
  source: HIGASHIKURUME_SOURCE, jsFile: "event_d.js",
  childCategoryIds: ["6", "7"], knownFacilities: KNOWN_HIGASHIKURUME_FACILITIES,
}, eventJsDeps);
const collectSagamiharaEvents = createEventJsCollector({
  source: SAGAMIHARA_SOURCE, jsFile: "event_j.js",
  childCategoryIds: ["5", "6", "13"], knownFacilities: KNOWN_SAGAMIHARA_FACILITIES,
}, eventJsDeps);
const collectEbinaEvents = createEventJsCollector({
  source: EBINA_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6", "7"], knownFacilities: KNOWN_EBINA_FACILITIES,
}, eventJsDeps);
const collectChigasakiEvents = createEventJsCollector({
  source: CHIGASAKI_SOURCE, jsFile: "event_d.js",
  childCategoryIds: [], childCategory2Ids: ["1"], knownFacilities: KNOWN_CHIGASAKI_FACILITIES,
  placeIdMap: {
    "1": "小和田公民館", "2": "鶴嶺公民館", "3": "松林公民館",
    "5": "香川公民館", "7": "茅ヶ崎公園体験学習センター",
    "10": "市民ふれあいプラザ", "20": "茅ヶ崎市立図書館", "22": "青少年会館",
  },
}, eventJsDeps);
const collectZamaEvents = createEventJsCollector({
  source: ZAMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: KNOWN_ZAMA_FACILITIES,
}, eventJsDeps);
const collectZushiEvents = createEventJsCollector({
  source: ZUSHI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20"], knownFacilities: KNOWN_ZUSHI_FACILITIES,
}, eventJsDeps);
// --- 千葉県 event-js-collector ---
const collectNagareyamaEvents = createEventJsCollector({
  source: NAGAREYAMA_SOURCE, jsFile: "event_d.js",
  childCategoryIds: ["6"], knownFacilities: KNOWN_NAGAREYAMA_FACILITIES,
}, eventJsDeps);
const collectUrayasuEvents = createEventJsCollector({
  source: URAYASU_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6"], knownFacilities: KNOWN_URAYASU_FACILITIES,
}, eventJsDeps);
const collectNodaEvents = createEventJsCollector({
  source: NODA_SOURCE, jsFile: "event_data.js",
  childCategoryIds: [], useKeywordFilter: true,
  knownFacilities: KNOWN_NODA_FACILITIES,
}, eventJsDeps);
// --- 千葉県 calendar-json-collector ---
const collectNarashinoEvents = createCalendarJsonCollector({ source: NARASHINO_SOURCE }, geoFmDeps);
const collectShiroiEvents = createCalendarJsonCollector({ source: SHIROI_SOURCE }, geoFmDeps);
const collectKisarazuEvents = createCalendarJsonCollector({ source: KISARAZU_SOURCE }, geoFmDeps);
const collectIsumiEvents = createCalendarJsonCollector({ source: ISUMI_SOURCE }, geoFmDeps);
const collectTohnoshoEvents = createCalendarJsonCollector({ source: TOHNOSHO_SOURCE }, geoFmDeps);
const collectOtakiEvents = createCalendarJsonCollector({ source: OTAKI_SOURCE }, geoFmDeps);
// --- 千葉県 custom collectors ---
const collectFunabashiEvents = createCollectFunabashiEvents(geoFmDeps);
const collectNaritaEvents = createCollectNaritaEvents(geoFmDeps);
const collectChibaCityEvents = createCollectChibaEvents(geoFmDeps);
const collectKashiwaEvents = createCollectKashiwaEvents(geoFmDeps);
// --- 千葉県 municipal-calendar-collector ---
const collectYachiyoEvents = createMunicipalCalendarCollector({ source: YACHIYO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectAsahiEvents = createMunicipalCalendarCollector({ source: ASAHI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectKamogawaEvents = createMunicipalCalendarCollector({ source: KAMOGAWA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYokoshibahikariEvents = createMunicipalCalendarCollector({ source: YOKOSHIBAHIKARI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectIchikawaEvents = createCollectIchikawaEvents(geoFmDeps);
const collectKatsuuraEvents = createMunicipalCalendarCollector({ source: KATSUURA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectKimitsuEvents = createMunicipalCalendarCollector({ source: KIMITSU_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKyonanEvents = createMunicipalCalendarCollector({ source: KYONAN_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYotsukaidoEvents = createCollectYotsukaidoEvents(geoFmDeps);
const collectMatsudoEvents = createCollectMatsudoEvents(geoFmDeps);
// --- 千葉県 list-calendar-collector ---
const collectAbikoEvents = createListCalendarCollector({ source: ABIKO_SOURCE, calendarPath: "/event/event/calendar/" }, geoFmDeps);
const collectKamagayaEvents = createListCalendarCollector({ source: KAMAGAYA_SOURCE, calendarPath: "/event/kodomo_kosodate/calendar/", fallbackPath: "/event/calendar/" }, geoFmDeps);
// --- 千葉県 table-calendar-collector ---
const collectTomisatoEvents = createTableCalendarCollector({ source: TOMISATO_SOURCE }, geoFmDeps);
const collectShirakoEvents = createTableCalendarCollector({ source: SHIRAKO_SOURCE }, geoFmDeps);
const collectKujukuriEvents = createTableCalendarCollector({ source: KUJUKURI_SOURCE }, geoFmDeps);
// --- 千葉県 rdf-event-collector ---
const collectYachimataEvents = createRdfEventCollector({ source: YACHIMATA_SOURCE, feedUrl: "https://www.city.yachimata.lg.jp/rss/10/list5.xml" }, geoFmDeps);
const collectSodegauraEvents = createRdfEventCollector({ source: SODEGAURA_SOURCE, feedUrl: "https://www.city.sodegaura.lg.jp/rss/10/list10.xml" }, geoFmDeps);
// --- 千葉県 custom ---
const collectIchinomiyaEvents = createCollectIchinomiyaEvents(geoFmDeps);
const collectChoshiEvents = createCollectChoshiEvents(geoFmDeps);
// --- 千葉県追加 ---
const collectSakuraEvents = createCalendarJsonCollector({ source: SAKURA_SOURCE }, geoFmDeps);
const collectFuttsuEvents = createEvent2CalendarCollector({ source: FUTTSU_SOURCE, childIconAlts: ["子育て"] }, geoFmDeps);
const collectInzaiEvents = createEvent2CalendarCollector({ source: INZAI_SOURCE, childIconAlts: ["子育て"] }, geoFmDeps);
const collectKatoriEvents = createListCalendarCollector({ source: KATORI_SOURCE, calendarPath: "/yotei/kosodate/calendar/", fallbackPath: "/yotei/calendar/" }, geoFmDeps);
const collectToganeEvents = createEvent2CalendarCollector({ source: TOGANE_SOURCE, childIconAlts: [] }, geoFmDeps);
const collectIchiharaEvents = createCalendarJsonCollector({ source: ICHIHARA_SOURCE }, geoFmDeps);
const collectSosaEvents = createCalendarJsonCollector({ source: SOSA_SOURCE }, geoFmDeps);
const collectSammuEvents = createCalendarJsonCollector({ source: SAMMU_SOURCE }, geoFmDeps);
const collectSakaeChibaEvents = createCalendarJsonCollector({ source: SAKAE_CHIBA_SOURCE }, geoFmDeps);
// --- 千葉県 残り13自治体 custom ---
const collectMobaraEvents = createCollectMobaraEvents(geoFmDeps);
const collectTateyamaEvents = createCollectTateyamaEvents(geoFmDeps);
const collectMinamibosoEvents = createCollectMinamibosoEvents(geoFmDeps);
const collectOamishirasatoEvents = createCollectOamishirasatoEvents(geoFmDeps);
const collectShisuiEvents = createCollectShisuiEvents(geoFmDeps);
const collectKozakiEvents = createCollectKozakiEvents(geoFmDeps);
const collectTakoEvents = createCollectTakoEvents(geoFmDeps);
const collectShibayamaEvents = createCollectShibayamaEvents(geoFmDeps);
const collectMutsuzawaEvents = createCollectMutsuzawaEvents(geoFmDeps);
const collectChoseiEvents = createCollectChoseiEvents(geoFmDeps);
const collectNagaraEvents = createCollectNagaraEvents(geoFmDeps);
const collectOnjukuEvents = createCollectOnjukuEvents(geoFmDeps);
const collectChonanEvents = createCollectChonanEvents(geoFmDeps);
// --- 埼玉県 calendar-json-collector ---
const collectKawaguchiEvents = createCalendarJsonCollector({ source: KAWAGUCHI_SOURCE }, geoFmDeps);
const collectKasukabeEvents = createCalendarJsonCollector({ source: KASUKABE_SOURCE }, geoFmDeps);
const collectFujiminoEvents = createCalendarJsonCollector({ source: FUJIMINO_SOURCE }, geoFmDeps);
const collectMisatoEvents = createCalendarJsonCollector({ source: MISATO_SOURCE }, geoFmDeps);
// --- 埼玉県 event-js-collector ---
const collectKawagoeEvents = createEventJsCollector({
  source: KAWAGOE_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20", "30"], knownFacilities: KNOWN_KAWAGOE_FACILITIES,
}, eventJsDeps);
const collectWakoEvents = createEventJsCollector({
  source: WAKO_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: KNOWN_WAKO_FACILITIES,
}, eventJsDeps);
const collectWarabiEvents = createEventJsCollector({
  source: WARABI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["30"], knownFacilities: KNOWN_WARABI_FACILITIES,
}, eventJsDeps);
// --- 埼玉県 municipal-calendar-collector ---
const collectAgeoEvents = createMunicipalCalendarCollector({ source: AGEO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectNiizaEvents = createMunicipalCalendarCollector({ source: NIIZA_SOURCE, childCategoryIndex: 9 }, geoFmDeps);
const collectAsakaEvents = createMunicipalCalendarCollector({ source: ASAKA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectTodaEvents = createMunicipalCalendarCollector({ source: TODA_SOURCE, childCategoryIndex: 8 }, geoFmDeps);
const collectShikiEvents = createMunicipalCalendarCollector({ source: SHIKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 埼玉県 list-calendar-collector ---
const collectFujimiEvents = createListCalendarCollector({ source: FUJIMI_SOURCE, calendarPath: "/event/naiyo/kodomo_kosodate/calendar/", fallbackPath: "/event/naiyo/calendar/", useQueryParam: true }, geoFmDeps);
const collectSayamaEvents = createListCalendarCollector({ source: SAYAMA_SOURCE, calendarPath: "/kankou/event/kyoiku/calendar/", fallbackPath: "/kankou/event/calendar/", useQueryParam: true }, geoFmDeps);
const collectYashioEvents = createListCalendarCollector({ source: YASHIO_SOURCE, calendarPath: "/event/kosodate/calendar/", fallbackPath: "/event/calendar/", useQueryParam: true }, geoFmDeps);
// --- 埼玉県 list-calendar-collector (追加) ---
const collectTokorozawaEvents = createListCalendarCollector({ source: TOKOROZAWA_SOURCE, calendarPath: "/iitokoro/event/main/kodomo/calendar/", fallbackPath: "/iitokoro/event/main/calendar/" }, geoFmDeps);
const collectKumagayaEvents = createListCalendarCollector({ source: KUMAGAYA_SOURCE, calendarPath: "/kanko/event/kids/calendar/", fallbackPath: "/kanko/event/calendar/" }, geoFmDeps);
// --- 埼玉県 event-js-collector (追加) ---
const collectKukiEvents = createEventJsCollector({
  source: KUKI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["50"], knownFacilities: KNOWN_KUKI_FACILITIES,
}, eventJsDeps);
// --- 埼玉県 municipal-calendar-collector (追加) ---
const collectKounosuEvents = createMunicipalCalendarCollector({ source: KOUNOSU_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectSakadoEvents = createMunicipalCalendarCollector({ source: SAKADO_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectHigashimatsuyamaEvents = createMunicipalCalendarCollector({ source: HIGASHIMATSUYAMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 埼玉県 calendar-json-collector (追加) ---
const collectHannoEvents = createCalendarJsonCollector({ source: HANNO_SOURCE }, geoFmDeps);
const collectGyodaEvents = createCalendarJsonCollector({ source: GYODA_SOURCE }, geoFmDeps);
const collectHonjoEvents = createCalendarJsonCollector({ source: HONJO_SOURCE }, geoFmDeps);
const collectHidakaEvents = createCalendarJsonCollector({ source: HIDAKA_SOURCE }, geoFmDeps);
const collectShiraokaEvents = createCalendarJsonCollector({ source: SHIRAOKA_SOURCE }, geoFmDeps);
const collectSatteEvents = createCalendarJsonCollector({ source: SATTE_SOURCE }, geoFmDeps);
// --- 埼玉県 municipal-calendar-collector (町村) ---
const collectYoriiEvents = createMunicipalCalendarCollector({ source: YORII_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectSugitoEvents = createMunicipalCalendarCollector({ source: SUGITO_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
// --- 埼玉県 custom ---
const collectSaitamaEvents = createCollectSaitamaEvents(geoFmDeps);
const collectKoshigayaEvents = createCollectKoshigayaEvents(geoFmDeps);
const collectSokaEvents = createCollectSokaEvents({ ...geoFmDeps, source: SOKA_SOURCE });
const collectTsurugashimaEvents = createCollectTsurugashimaEvents({ ...geoFmDeps, source: TSURUGASHIMA_SOURCE });
const collectHasudaEvents = createCollectHasudaEvents({ ...geoFmDeps, source: HASUDA_SOURCE });
const collectIrumaEvents = createCalendarJsonCollector({ source: IRUMA_SOURCE, jsonPath: "/cgi-bin/get_event_calendar.php" }, geoFmDeps);
const collectKazoEvents = createCalendarJsonCollector({ source: KAZO_SOURCE }, geoFmDeps);
const collectFukayaEvents = createCalendarJsonCollector({ source: FUKAYA_SOURCE, jsonPath: "/event/calendar.json" }, geoFmDeps);
const collectOkegawaEvents = createCalendarJsonCollector({ source: OKEGAWA_SOURCE }, geoFmDeps);
const collectOgoseEvents = createCalendarJsonCollector({ source: OGOSE_SOURCE }, geoFmDeps);
const collectOgawaEvents = createCalendarJsonCollector({ source: OGAWA_SOURCE }, geoFmDeps);
const collectYoshimiEvents = createCalendarJsonCollector({ source: YOSHIMI_SOURCE }, geoFmDeps);
const collectKamikawaEvents = createCalendarJsonCollector({ source: KAMIKAWA_SOURCE }, geoFmDeps);
const collectKamisatoEvents = createCollectKamisatoEvents({ ...geoFmDeps, source: KAMISATO_SOURCE });
const collectYoshikawaEvents = createCollectYoshikawaEvents({ ...geoFmDeps, source: YOSHIKAWA_SOURCE });
const collectOganoEvents = createCollectOganoEvents({ ...geoFmDeps, source: OGANO_SOURCE });
const collectHigashichichibEvents = createCollectHigashichichibEvents({ ...geoFmDeps, source: HIGASHICHICHIBU_SOURCE });
const collectKawajimaEvents = createCollectKawajimaEvents({ ...geoFmDeps, source: KAWAJIMA_SOURCE });
const collectKitamotoEvents = createCollectKitamotoEvents({ ...geoFmDeps, source: KITAMOTO_SOURCE });
const collectInaEvents = createCollectInaEvents({ ...geoFmDeps, source: INA_SAITAMA_SOURCE });
const collectYokozeEvents = createCollectYokozeEvents({ ...geoFmDeps, source: YOKOZE_SOURCE });
const collectNagatoroEvents = createCollectNagatoroEvents({ ...geoFmDeps, source: NAGATORO_SOURCE });
const collectMiyoshiEvents = createCollectMiyoshiEvents({ ...geoFmDeps, source: MIYOSHI_SAITAMA_SOURCE });
const collectHatoyamaEvents = createCollectHatoyamaEvents({ ...geoFmDeps, source: HATOYAMA_SOURCE });
const collectMiyashiroEvents = createCollectMiyashiroEvents({ ...geoFmDeps, source: MIYASHIRO_SOURCE });
const collectChichibuEvents = createCollectChichibuEvents({ ...geoFmDeps, source: CHICHIBU_SOURCE });
const collectNamegawaEvents = createCalendarJsonCollector({ source: NAMEGAWA_SOURCE, jsonPath: "/cgi-bin/get_event_calendar.php" }, geoFmDeps);
const collectRanzanEvents = createCollectRanzanEvents({ ...geoFmDeps, source: RANZAN_SOURCE });
const collectMatsubushiEvents = createCollectMatsubushiEvents({ ...geoFmDeps, source: MATSUBUSHI_SOURCE });
const collectMinanoEvents = createCollectMinanoEvents({ ...geoFmDeps, source: MINANO_SOURCE });
const collectMoroyamaEvents = createCollectMoroyamaEvents({ ...geoFmDeps, source: MOROYAMA_SOURCE });
const collectHanyuEvents = createCollectHanyuEvents({ ...geoFmDeps, source: HANYU_SOURCE });
const collectMisatoSaitamaEvents = createCollectMisatoSaitamaEvents({ ...geoFmDeps, source: MISATO_SAITAMA_SOURCE });
// --- 栃木県 calendar-json-collector ---
const collectSanoEvents = createCalendarJsonCollector({ source: SANO_SOURCE }, geoFmDeps);
const collectNikkoEvents = createCalendarJsonCollector({ source: NIKKO_SOURCE }, geoFmDeps);
const collectMokaEvents = createCalendarJsonCollector({ source: MOKA_SOURCE }, geoFmDeps);
const collectNasushiobaraEvents = createCalendarJsonCollector({ source: NASUSHIOBARA_SOURCE }, geoFmDeps);
// --- 栃木県 municipal-calendar-collector ---
const collectTochigiCityEvents = createMunicipalCalendarCollector({ source: TOCHIGI_CITY_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYaitaEvents = createMunicipalCalendarCollector({ source: YAITA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 栃木県 custom ---
const collectUtsunomiyaEvents = createCollectUtsunomiyaEvents(geoFmDeps);
const collectAshikagaEvents = createCollectAshikagaEvents(geoFmDeps);
const collectKanumaEvents = createCollectKanumaEvents(geoFmDeps);
const collectOyamaEvents = createCollectOyamaEvents(geoFmDeps);
const collectOhtawaraEvents = createCollectOhtawaraEvents(geoFmDeps);
const collectTochigiSakuraEvents = createCollectTochigiSakuraEvents(geoFmDeps);
const collectNasukarasuyamaEvents = createCollectNasukarasuyamaEvents(geoFmDeps);
const collectShimotsukeEvents = createCollectShimotsukeEvents(geoFmDeps);
const collectKaminokawaEvents = createCollectKaminokawaEvents(geoFmDeps);
const collectMashikoEvents = createCollectMashikoEvents(geoFmDeps);
const collectMotegiEvents = createCollectMotegiEvents(geoFmDeps);
const collectIchikaiEvents = createCollectIchikaiEvents(geoFmDeps);
const collectHagaEvents = createCollectHagaEvents(geoFmDeps);
const collectMibuEvents = createCollectMibuEvents(geoFmDeps);
const collectNogiEvents = createCollectNogiEvents(geoFmDeps);
const collectShioyaEvents = createCollectShioyaEvents(geoFmDeps);
const collectTakanezawaEvents = createCollectTakanezawaEvents(geoFmDeps);
const collectNasuEvents = createCollectNasuEvents(geoFmDeps);
const collectTochigiNakagawaEvents = createCollectTochigiNakagawaEvents(geoFmDeps);
// --- 群馬県 calendar-json-collector ---
const collectMaebashiEvents = createCalendarJsonCollector({ source: MAEBASHI_SOURCE }, geoFmDeps);
const collectIsesakiEvents = createCalendarJsonCollector({ source: ISESAKI_SOURCE }, geoFmDeps);
const collectFujiokaGunmaEvents = createCalendarJsonCollector({ source: FUJIOKA_GUNMA_SOURCE }, geoFmDeps);
// --- 群馬県 municipal-calendar-collector ---
const collectTakasakiEvents = createMunicipalCalendarCollector({ source: TAKASAKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOtaGunmaEvents = createMunicipalCalendarCollector({ source: OTA_GUNMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectAnnakaEvents = createMunicipalCalendarCollector({ source: ANNAKA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectNakanojoEvents = createMunicipalCalendarCollector({ source: NAKANOJO_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 群馬県 custom ---
const collectKiryuEvents = createEventJsCollector({
  source: KIRYU_SOURCE, jsFile: "city_event.js",
  useKeywordFilter: true, knownFacilities: KNOWN_KIRYU_FACILITIES,
}, eventJsDeps);
const collectNumataEvents = createCollectNumataEvents(geoFmDeps);
const collectTatebayashiEvents = createCollectTatebayashiEvents(geoFmDeps);
const collectShibukawaEvents = createCollectShibukawaEvents(geoFmDeps);
const collectTomiokaEvents = createCollectTomiokaEvents(geoFmDeps);
const collectMidoriEvents = createCollectMidoriEvents(geoFmDeps);
const collectShintoEvents = createCollectShintoEvents(geoFmDeps);
const collectYoshiokaEvents = createCollectYoshiokaEvents(geoFmDeps);
const collectUenoGunmaEvents = createCollectUenoGunmaEvents(geoFmDeps);
const collectKannaEvents = createCollectKannaEvents(geoFmDeps);
const collectShimonitaEvents = createCollectShimonitaEvents(geoFmDeps);
const collectNanmokuEvents = createCollectNanmokuEvents(geoFmDeps);
const collectKanraEvents = createCollectKanraEvents(geoFmDeps);
const collectNaganoharaEvents = createCollectNaganoharaEvents(geoFmDeps);
const collectTsumagoiEvents = createCollectTsumagoiEvents(geoFmDeps);
const collectKusatsuEvents = createCollectKusatsuEvents(geoFmDeps);
const collectTakayamaGunmaEvents = createCollectTakayamaGunmaEvents(geoFmDeps);
const collectHigashiagatsumaEvents = createCollectHigashiagatsumaEvents(geoFmDeps);
const collectKatashinaEvents = createCollectKatashinaEvents(geoFmDeps);
const collectKawabaEvents = createCollectKawabaEvents(geoFmDeps);
const collectShowaGunmaEvents = createCollectShowaGunmaEvents(geoFmDeps);
const collectMinakamiEvents = createCollectMinakamiEvents(geoFmDeps);
const collectTamamuraEvents = createCollectTamamuraEvents(geoFmDeps);
const collectItakuraEvents = createCollectItakuraEvents(geoFmDeps);
const collectMeiwaGunmaEvents = createCollectMeiwaGunmaEvents(geoFmDeps);
const collectChiyodaGunmaEvents = createCollectChiyodaGunmaEvents(geoFmDeps);
const collectOizumiEvents = createCollectOizumiEvents(geoFmDeps);
const collectOraEvents = createCollectOraEvents(geoFmDeps);
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
  collectKawasakiEvents,
  collectYokohamaEvents,
  collectSagamiharaEvents,
  collectEbinaEvents,
  collectKamakuraEvents,
  collectYokosukaEvents,
  collectChigasakiEvents,
  collectZamaEvents,
  collectZushiEvents,
  collectYamatoEvents,
  collectHiratsukaEvents,
  collectOdawaraEvents,
  collectHadanoEvents,
  collectAyaseEvents,
  collectAtsugiEvents,
  collectIseharaEvents,
  collectMinamiashigaraEvents,
  collectFujisawaEvents,
  collectSamukawaEvents,
  collectAikawaEvents,
  collectMiuraEvents,
  collectOisoEvents,
  collectHayamaEvents,
  collectNakaiEvents,
  collectKiyokawaEvents,
  collectNinomiyaEvents,
  collectOiEvents,
  collectYugawaraEvents,
  collectMatsudaEvents,
  collectManazuruEvents,
  collectHakoneEvents,
  collectKaiseiEvents,
  collectYamakitaEvents,
  collectMizuhoEvents,
  collectOkutamaEvents,
  collectHinodeEvents,
  collectHinoharaEvents,
  collectNagareyamaEvents,
  collectUrayasuEvents,
  collectNodaEvents,
  collectNarashinoEvents,
  collectShiroiEvents,
  collectKisarazuEvents,
  collectIsumiEvents,
  collectTohnoshoEvents,
  collectOtakiEvents,
  collectFunabashiEvents,
  collectNaritaEvents,
  collectChibaCityEvents,
  collectKashiwaEvents,
  collectYachiyoEvents,
  collectAsahiEvents,
  collectKamogawaEvents,
  collectYokoshibahikariEvents,
  collectIchikawaEvents,
  collectKatsuuraEvents,
  collectKimitsuEvents,
  collectKyonanEvents,
  collectYotsukaidoEvents,
  collectMatsudoEvents,
  collectAbikoEvents,
  collectKamagayaEvents,
  collectTomisatoEvents,
  collectShirakoEvents,
  collectKujukuriEvents,
  collectYachimataEvents,
  collectSodegauraEvents,
  collectIchinomiyaEvents,
  collectChoshiEvents,
  collectSakuraEvents,
  collectFuttsuEvents,
  collectInzaiEvents,
  collectKatoriEvents,
  collectToganeEvents,
  collectIchiharaEvents,
  collectSosaEvents,
  collectSammuEvents,
  collectSakaeChibaEvents,
  collectMobaraEvents,
  collectTateyamaEvents,
  collectMinamibosoEvents,
  collectOamishirasatoEvents,
  collectShisuiEvents,
  collectKozakiEvents,
  collectTakoEvents,
  collectShibayamaEvents,
  collectMutsuzawaEvents,
  collectChoseiEvents,
  collectNagaraEvents,
  collectOnjukuEvents,
  collectChonanEvents,
  collectKawaguchiEvents,
  collectKasukabeEvents,
  collectFujiminoEvents,
  collectMisatoEvents,
  collectKawagoeEvents,
  collectWakoEvents,
  collectWarabiEvents,
  collectAgeoEvents,
  collectNiizaEvents,
  collectAsakaEvents,
  collectTodaEvents,
  collectShikiEvents,
  collectFujimiEvents,
  collectSayamaEvents,
  collectYashioEvents,
  collectSaitamaEvents,
  collectKoshigayaEvents,
  collectTokorozawaEvents,
  collectKukiEvents,
  collectKumagayaEvents,
  collectKounosuEvents,
  collectSakadoEvents,
  collectHannoEvents,
  collectHigashimatsuyamaEvents,
  collectGyodaEvents,
  collectHonjoEvents,
  collectHidakaEvents,
  collectShiraokaEvents,
  collectSatteEvents,
  collectYoriiEvents,
  collectSugitoEvents,
  collectSokaEvents,
  collectTsurugashimaEvents,
  collectHasudaEvents,
  collectIrumaEvents,
  collectKazoEvents,
  collectFukayaEvents,
  collectOkegawaEvents,
  collectOgoseEvents,
  collectOgawaEvents,
  collectYoshimiEvents,
  collectKamikawaEvents,
  collectKamisatoEvents,
  collectYoshikawaEvents,
  collectOganoEvents,
  collectHigashichichibEvents,
  collectKawajimaEvents,
  collectKitamotoEvents,
  collectInaEvents,
  collectYokozeEvents,
  collectNagatoroEvents,
  collectMiyoshiEvents,
  collectHatoyamaEvents,
  collectMiyashiroEvents,
  collectChichibuEvents,
  collectNamegawaEvents,
  collectRanzanEvents,
  collectMatsubushiEvents,
  collectMinanoEvents,
  collectMoroyamaEvents,
  collectHanyuEvents,
  collectMisatoSaitamaEvents,
  // Tochigi
  collectSanoEvents,
  collectNikkoEvents,
  collectMokaEvents,
  collectNasushiobaraEvents,
  collectTochigiCityEvents,
  collectYaitaEvents,
  collectUtsunomiyaEvents,
  collectAshikagaEvents,
  collectKanumaEvents,
  collectOyamaEvents,
  collectOhtawaraEvents,
  collectTochigiSakuraEvents,
  collectNasukarasuyamaEvents,
  collectShimotsukeEvents,
  collectKaminokawaEvents,
  collectMashikoEvents,
  collectMotegiEvents,
  collectIchikaiEvents,
  collectHagaEvents,
  collectMibuEvents,
  collectNogiEvents,
  collectShioyaEvents,
  collectTakanezawaEvents,
  collectNasuEvents,
  collectTochigiNakagawaEvents,
  // Gunma
  collectMaebashiEvents,
  collectIsesakiEvents,
  collectFujiokaGunmaEvents,
  collectTakasakiEvents,
  collectOtaGunmaEvents,
  collectAnnakaEvents,
  collectNakanojoEvents,
  collectKiryuEvents,
  collectNumataEvents,
  collectTatebayashiEvents,
  collectShibukawaEvents,
  collectTomiokaEvents,
  collectMidoriEvents,
  collectShintoEvents,
  collectYoshiokaEvents,
  collectUenoGunmaEvents,
  collectKannaEvents,
  collectShimonitaEvents,
  collectNanmokuEvents,
  collectKanraEvents,
  collectNaganoharaEvents,
  collectTsumagoiEvents,
  collectKusatsuEvents,
  collectTakayamaGunmaEvents,
  collectHigashiagatsumaEvents,
  collectKatashinaEvents,
  collectKawabaEvents,
  collectShowaGunmaEvents,
  collectMinakamiEvents,
  collectTamamuraEvents,
  collectItakuraEvents,
  collectMeiwaGunmaEvents,
  collectChiyodaGunmaEvents,
  collectOizumiEvents,
  collectOraEvents,
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

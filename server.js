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
const { createCollectKatsushikaScheduleEvents } = require("./src/server/collectors/katsushika-schedule");
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
const { createCollectKamakuraEvents, createCollectKamakuraKmspotEvents } = require("./src/server/collectors/kamakura");
const { createCollectYokosukaEvents } = require("./src/server/collectors/yokosuka");
const { createCollectYamatoEvents } = require("./src/server/collectors/yamato");
const { createCollectHiratsukaEvents, createCollectHiratsukaLibraryEvents } = require("./src/server/collectors/hiratsuka");
const { createCollectOdawaraEvents } = require("./src/server/collectors/odawara");
const { createCollectHadanoEvents } = require("./src/server/collectors/hadano");
const { createCollectAyaseEvents } = require("./src/server/collectors/ayase");
const { createCollectAtsugiEvents, createCollectAtsugiKosodateEvents } = require("./src/server/collectors/atsugi");
const { createCollectIseharaEvents } = require("./src/server/collectors/isehara");
const { createCollectMinamiashigaraEvents } = require("./src/server/collectors/minamiashigara");
const { createCalendarJsonCollector } = require("./src/server/collectors/calendar-json-collector");
const { createCollectFujisawaEvents } = require("./src/server/collectors/fujisawa");
const { createCollectNinomiyaEvents } = require("./src/server/collectors/ninomiya");
const { createMunicipalCalendarCollector } = require("./src/server/collectors/municipal-calendar-collector");
const { createCollectMatsudaEvents } = require("./src/server/collectors/matsuda");
const { createCollectKaiseiEvents } = require("./src/server/collectors/kaisei");
const { createCollectYamakitaEvents } = require("./src/server/collectors/yamakita");
const { createCollectMachidaKosodateEvents } = require("./src/server/collectors/machida");
const { createCollectMizuhoEvents } = require("./src/server/collectors/mizuho");
const { createCollectHinodeEvents } = require("./src/server/collectors/hinode");
const { createCollectHinoharaEvents } = require("./src/server/collectors/hinohara");
const { createEventJsCollector } = require("./src/server/collectors/event-js-collector");
const { createCollectFunabashiEvents } = require("./src/server/collectors/funabashi");
const { createCollectFunabashiJidohomeEvents } = require("./src/server/collectors/funabashi-jidohome-collector");
const { createCollectNaritaEvents } = require("./src/server/collectors/narita");
const { createCollectChibaEvents, createCollectChibaCityWardEvents } = require("./src/server/collectors/chiba");
const { createCollectKashiwaEvents } = require("./src/server/collectors/kashiwa");
const { createCollectIchikawaEvents, createCollectIchikawaIkujiEvents } = require("./src/server/collectors/ichikawa");
const { createCollectYotsukaidoEvents } = require("./src/server/collectors/yotsukaido");
const { createCollectMatsudoEvents } = require("./src/server/collectors/matsudo");
const { createListCalendarCollector } = require("./src/server/collectors/list-calendar-collector");
const { createTableCalendarCollector } = require("./src/server/collectors/table-calendar-collector");
const { createRdfEventCollector } = require("./src/server/collectors/rdf-event-collector");
const { createCollectIchinomiyaEvents } = require("./src/server/collectors/ichinomiya");
const { createCollectChoshiEvents } = require("./src/server/collectors/choshi");
const {
  createCollectMobaraEvents, createCollectTateyamaEvents, createCollectKamogawaEvents,
  createCollectMinamibosoEvents, createCollectOamishirasatoEvents,
  createCollectShisuiEvents, createCollectKozakiEvents,
  createCollectTakoEvents, createCollectShibayamaEvents,
  createCollectMutsuzawaEvents, createCollectChoseiEvents,
  createCollectNagaraEvents, createCollectOnjukuEvents,
  createCollectChonanEvents, createCollectKatoriEvents,
  createCollectKimitsuKosodateEvents,
  createCollectMatsudoKosodateEvents, createCollectIchiharaKodomomiraiEvents,
  createCollectMatsudoLibraryEvents,
  createCollectIchiharaSalonEvents,
  createCollectNaritaKosodateEvents,
  createCollectAbikoKosodateEvents,
  createCollectKamagayaKosodateEvents,
  createCollectSakuraLibraryEvents,
  createCollectInzaiLibraryEvents,
} = require("./src/server/collectors/chiba-remaining");
const { createCollectHakoneEvents } = require("./src/server/collectors/hakone");
const { createEvent2CalendarCollector } = require("./src/server/collectors/event2-calendar-collector");
const { createCollectSaitamaEvents } = require("./src/server/collectors/saitama");
const { createCollectSaitamaJidoukanEvents } = require("./src/server/collectors/saitama-jidoukan");
const { createCollectSaitamaHokenEvents } = require("./src/server/collectors/saitama-hoken");
const { createCollectKoshigayaEvents, createCollectKoshigayaKosodateEvents } = require("./src/server/collectors/koshigaya");
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
  createCollectOyamaEvents,
  createCollectOhtawaraEvents, createCollectTochigiSakuraEvents,
  createCollectNasukarasuyamaEvents, createCollectShimotsukeEvents,
  createCollectKaminokawaEvents, createCollectMashikoEvents,
  createCollectMotegiEvents, createCollectIchikaiEvents,
  createCollectHagaEvents, createCollectMibuEvents,
  createCollectNogiEvents, createCollectShioyaEvents,
  createCollectTakanezawaEvents, createCollectNasuEvents,
  createCollectTochigiNakagawaEvents,
  createCollectKanumaCalendarEvents,
  createCollectSanoScheduleEvents,
  createCollectMokaScheduleEvents,
  createCollectTochigiCityScheduleEvents,
  createCollectNasuScheduleEvents,
  createCollectTakanezawaScheduleEvents,
  createCollectNikkoScheduleEvents,
  createCollectNasushiobaraScheduleEvents,
  createCollectOyamaScheduleEvents,
  createCollectOhtawaraScheduleEvents,
  createCollectAshikagaScheduleEvents,
  createCollectShimotsukeScheduleEvents,
  createCollectTochigiSakuraScheduleEvents,
  createCollectOhtawaraPdfScheduleEvents,
  createCollectKanumaPdfScheduleEvents,
  createCollectNasukarasuyamaPdfScheduleEvents,
  createCollectMashikoCalendarEvents,
  createCollectNikkoSupportCenterEvents,
  createCollectOtaGunmaPdfScheduleEvents,
  createCollectShibukawaPdfScheduleEvents,
  createCollectTomiokaPdfScheduleEvents,
  createCollectAnnakaPdfScheduleEvents,
  createCollectMinakamiPdfScheduleEvents,
  createCollectMeiwaPdfScheduleEvents,
  createCollectShintoPdfScheduleEvents,
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
  createCollectOtaGunmaKosodateEvents,
  createCollectFujiokaGunmaKosodateEvents,
  createCollectAnnakaKosodateEvents,
  createCollectMaebashiScheduleEvents,
  createCollectIsesakiScheduleEvents,
  createCollectKiryuScheduleEvents,
  createCollectTatebayashiScheduleEvents,
  createCollectNumataScheduleEvents,
  createCollectKawabaScheduleEvents,
  createCollectShimonitaScheduleEvents,
  createCollectChiyodaGunmaScheduleEvents,
  createCollectFujiokaGunmaScheduleEvents,
  createCollectTamamuraScheduleEvents,
  createCollectKanraScheduleEvents,
  createCollectAnnakaScheduleEvents,
  createCollectHigashiagatsumaScheduleEvents,
  createCollectItakuraCalendarEvents,
  createCollectMidoriScheduleEvents,
  createCollectOizumiScheduleEvents,
  createCollectOtaKodomokanEvents,
  createCollectKiryuShienCenterEvents,
  createCollectNakanojoRecurringEvents,
  createCollectShimonitaCrossRowEvents,
  createCollectTakasakiNandemoEvents,
} = require("./src/server/collectors/gunma-remaining");
const { createCollectMaebashiJidokanEvents } = require("./src/server/collectors/maebashi-jidokan-collector");
const { createCalPhpCollector } = require("./src/server/collectors/cal-php-collector");
const { createMamafreCollector } = require("./src/server/collectors/mamafre-collector");
const { createIkoyoCollector } = require("./src/server/collectors/ikoyo-collector");
const { createKodomoSmileCollector } = require("./src/server/collectors/kodomo-smile-collector");
const {
  createCollectYachiyoIbEvents, createCollectGokaEvents, createCollectOaraiEvents,
  createCollectKawachiIbEvents, createCollectIbarakimachiEvents, createCollectKitaibarakiEvents,
  createCollectUshikuEvents, createCollectAmiEvents, createCollectToneIbEvents,
} = require("./src/server/collectors/ibaraki-extra");
const { createCollectTorideKosodateEvents } = require("./src/server/collectors/toride-kosodate-collector");
const { createCollectTsuchiuraJidokanEvents } = require("./src/server/collectors/tsuchiura-jidokan-collector");
const { createCollectKogaKosodateEvents } = require("./src/server/collectors/koga-kosodate-collector");
const { createCollectJosoKosodateEvents } = require("./src/server/collectors/joso-kosodate-collector");
const { createCollectYukiKosodateEvents } = require("./src/server/collectors/yuki-kosodate-collector");
const { createCollectKotoJidokanEvents } = require("./src/server/collectors/koto-jidokan-collector");
const { createCollectKodomonokuniEvents } = require("./src/server/collectors/kodomonokuni-collector");
const { createCollectKawaguchiJidokanEvents } = require("./src/server/collectors/kawaguchi-jidokan-collector");
const { createCollectKawaguchiKosodateEvents } = require("./src/server/collectors/kawaguchi-kosodate-collector");
const { createCollectKasukabeJidokanEvents } = require("./src/server/collectors/kasukabe-jidokan-collector");
const { createCollectSakadoJidokanEvents } = require("./src/server/collectors/sakado-jidokan-collector");
const { createCollectHigashimatsuyamaKosodateEvents } = require("./src/server/collectors/higashimatsuyama-kosodate-collector");
const { createCalendarCgiCollector } = require("./src/server/collectors/calendar-cgi-collector");
const { createGetEvents } = require("./src/server/events-service");
const FACILITY_REGISTRY = require("./src/config/known-facilities");
const {
  CACHE_TTL_MS, AKISHIMA_SOURCE, HIGASHIYAMATO_SOURCE, KIYOSE_SOURCE, TAMA_SOURCE, INAGI_SOURCE,
  HINO_SOURCE, KOKUBUNJI_SOURCE, HIGASHIKURUME_SOURCE, SAGAMIHARA_SOURCE, EBINA_SOURCE, CHIGASAKI_SOURCE,
  ZAMA_SOURCE, ZUSHI_SOURCE, YAMATO_SOURCE, SAMUKAWA_SOURCE, AIKAWA_SOURCE, MIURA_SOURCE,
  OISO_SOURCE, HAYAMA_SOURCE, NAKAI_SOURCE, KIYOKAWA_SOURCE, OI_SOURCE, YUGAWARA_SOURCE,
  MANAZURU_SOURCE, OKUTAMA_SOURCE, NAGAREYAMA_SOURCE, URAYASU_SOURCE, NODA_SOURCE, NARASHINO_SOURCE,
  SHIROI_SOURCE, KISARAZU_SOURCE, ISUMI_SOURCE, TOHNOSHO_SOURCE, OTAKI_SOURCE, YACHIYO_SOURCE,
  ASAHI_SOURCE, KAMOGAWA_SOURCE, YOKOSHIBAHIKARI_SOURCE, KATSUURA_SOURCE, KIMITSU_SOURCE, KYONAN_SOURCE,
  ABIKO_SOURCE, KAMAGAYA_SOURCE, TOMISATO_SOURCE, SHIRAKO_SOURCE, KUJUKURI_SOURCE, YACHIMATA_SOURCE,
  SODEGAURA_SOURCE, ICHINOMIYA_SOURCE, SAKURA_SOURCE, FUTTSU_SOURCE, INZAI_SOURCE, KATORI_SOURCE,
  TOGANE_SOURCE, ICHIHARA_SOURCE, SOSA_SOURCE, SAMMU_SOURCE, SAKAE_CHIBA_SOURCE, TAKO_SOURCE,
  KAWAGUCHI_SOURCE, KASUKABE_SOURCE, FUJIMINO_SOURCE, MISATO_SOURCE, KAWAGOE_SOURCE, WAKO_SOURCE,
  WARABI_SOURCE, AGEO_SOURCE, NIIZA_SOURCE, ASAKA_SOURCE, TODA_SOURCE, SHIKI_SOURCE,
  FUJIMI_SOURCE, SAYAMA_SOURCE, YASHIO_SOURCE, TOKOROZAWA_SOURCE, KUKI_SOURCE, KUMAGAYA_SOURCE,
  KOUNOSU_SOURCE, SAKADO_SOURCE, HANNO_SOURCE, HIGASHIMATSUYAMA_SOURCE, GYODA_SOURCE, HONJO_SOURCE,
  HIDAKA_SOURCE, SHIRAOKA_SOURCE, SATTE_SOURCE, YORII_SOURCE, SUGITO_SOURCE, SOKA_SOURCE,
  TSURUGASHIMA_SOURCE, HASUDA_SOURCE, IRUMA_SOURCE, KAZO_SOURCE, FUKAYA_SOURCE, OKEGAWA_SOURCE,
  OGOSE_SOURCE, OGAWA_SOURCE, YOSHIMI_SOURCE, KAMIKAWA_SOURCE, KAMISATO_SOURCE, YOSHIKAWA_SOURCE,
  OGANO_SOURCE, HIGASHICHICHIBU_SOURCE, KAWAJIMA_SOURCE, KITAMOTO_SOURCE, INA_SAITAMA_SOURCE, YOKOZE_SOURCE,
  NAGATORO_SOURCE, MIYOSHI_SAITAMA_SOURCE, HATOYAMA_SOURCE, MIYASHIRO_SOURCE, CHICHIBU_SOURCE, NAMEGAWA_SOURCE,
  RANZAN_SOURCE, MATSUBUSHI_SOURCE, MINANO_SOURCE, MOROYAMA_SOURCE, HANYU_SOURCE, MISATO_SAITAMA_SOURCE,
  NIKKO_SOURCE, NASUSHIOBARA_SOURCE, YAITA_SOURCE, MAEBASHI_SOURCE, TAKASAKI_SOURCE, ISESAKI_SOURCE,
  NAKANOJO_SOURCE, KIRYU_SOURCE, MEIWA_SOURCE, HITACHI_IB_SOURCE, HITACHINAKA_SOURCE, TSUKUBA_SOURCE,
  MORIYA_SOURCE, KAMISU_SOURCE, TOKAI_IB_SOURCE, TORIDE_SOURCE, RYUGASAKI_SOURCE, CHIKUSEI_SOURCE, TSUCHIURA_SOURCE,
  ISHIOKA_SOURCE, JOSO_SOURCE, NAKA_IB_SOURCE, BANDO_SOURCE, HITACHIOTA_SOURCE, YUKI_SOURCE,
  TSUKUBAMIRAI_SOURCE, INASHIKI_SOURCE, SAKURAGAWA_SOURCE, HITACHIOMIYA_SOURCE, SHIMOTSUMA_SOURCE, HOKOTA_SOURCE,
  NAMEGATA_SOURCE, ITAKO_SOURCE, KASUMIGAURA_SOURCE, TAKAHAGI_SOURCE, KASAMA_SOURCE, SHIRO_IB_SOURCE,
  DAIGO_SOURCE, AMI_SOURCE, IKOYO_SOURCE, TOKYO_OTA_MAMAFRE_SOURCE, IBARAKI_KAMISU_MAMAFRE_SOURCE, KODOMO_SMILE_SOURCE,
  KOGA_IB_SOURCE, MITO_SOURCE, KASHIMA_IB_SOURCE, AKIRUNO_SOURCE, ANNAKA_SOURCE, ASHIKAGA_SOURCE,
  CHONAN_SOURCE, CHOSEI_SOURCE, FUCHU_SOURCE, HAGA_SOURCE, ICHIKAI_SOURCE, KANRA_SOURCE,
  KAWACHI_IB_SOURCE, KOGANEI_SOURCE, MASHIKO_SOURCE, MINAMIBOSO_SOURCE, MOBARA_SOURCE, NAGARA_SOURCE,
  NASUKARASUYAMA_SOURCE, NISHITOKYO_SOURCE, NUMATA_SOURCE, OAMISHIRASATO_SOURCE, OTA_GUNMA_SOURCE, SHIBAYAMA_SOURCE,
  SHIBUKAWA_SOURCE, SHIOYA_SOURCE, SHISUI_SOURCE, TAKANEZAWA_SOURCE, TATEBAYASHI_SOURCE, TOCHIGI_CITY_SOURCE,
  TOCHIGI_SAKURA_SOURCE, TONE_IB_SOURCE, UENO_GUNMA_SOURCE, USHIKU_SOURCE, UTSUNOMIYA_SOURCE, YACHIYO_IB_SOURCE,
  NOGI_SOURCE, OYAMA_SOURCE, CHILD_KW, IKOYO_CHILD_KW, REGION_GROUPS, PREF_CENTERS,
  ADACHI_SOURCE, EDOGAWA_SOURCE, SUGINAMI_SOURCE, ITABASHI_SOURCE, NERIMA_SOURCE, SHINJUKU_SOURCE,
  NAKANO_SOURCE, TOSHIMA_SOURCE, SUMIDA_SOURCE, BUNKYO_SOURCE, TAITO_SOURCE, ARAKAWA_SOURCE,
  buildSourceToPrefMap,
} = require("./src/config/wards");
const _wardsExports = require("./src/config/wards");

const PORT = process.env.PORT || 8787;
const PUBLIC_DIR = path.join(__dirname, "public");
const SNAPSHOT_PATH = path.join(__dirname, "data", "events_snapshot.json");
const GEO_CACHE_PATH = path.join(__dirname, "data", "geo_cache.json");

// --- Mutable state ---
const cache = { key: "", data: null, savedAt: 0 };
let metadataCache = null;

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
for (const [wardKey, facilities] of Object.entries(FACILITY_REGISTRY)) {
  for (const [name, address] of Object.entries(facilities)) {
    setFacilityAddressToMaster(wardKey, name, address);
  }
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
const collectKamakuraKmspotEvents = createCollectKamakuraKmspotEvents(geoFmDeps);
const collectYokosukaEvents = createCollectYokosukaEvents(geoFmDeps);
const collectYamatoEvents = createCollectYamatoEvents(geoFmDeps);
const collectHiratsukaEvents = createCollectHiratsukaEvents(geoFmDeps);
const collectHiratsukaLibraryEvents = createCollectHiratsukaLibraryEvents(geoFmDeps);
const collectOdawaraEvents = createCollectOdawaraEvents(geoFmDeps);
const collectHadanoEvents = createCollectHadanoEvents(geoFmDeps);
const collectAyaseEvents = createCollectAyaseEvents(geoFmDeps);
const collectAtsugiEvents = createCollectAtsugiEvents(geoFmDeps);
const collectAtsugiKosodateEvents = createCollectAtsugiKosodateEvents(geoFmDeps);
const collectIseharaEvents = createCollectIseharaEvents(geoFmDeps);
const collectMinamiashigaraEvents = createCollectMinamiashigaraEvents(geoFmDeps);
const collectFujisawaEvents = createCollectFujisawaEvents(geoFmDeps);
const collectSamukawaEvents = createCalendarJsonCollector({ source: SAMUKAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectAikawaEvents = createCalendarJsonCollector({ source: AIKAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectMiuraEvents = createCalendarJsonCollector({ source: MIURA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectOisoEvents = createCalendarJsonCollector({ source: OISO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectHayamaEvents = createCalendarJsonCollector({ source: HAYAMA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectNakaiEvents = createCalendarJsonCollector({ source: NAKAI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectKiyokawaEvents = createCalendarJsonCollector({ source: KIYOKAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectNinomiyaEvents = createCollectNinomiyaEvents(geoFmDeps);
const collectOiEvents = createMunicipalCalendarCollector({ source: OI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectYugawaraEvents = createMunicipalCalendarCollector({ source: YUGAWARA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectMatsudaEvents = createCollectMatsudaEvents(geoFmDeps);
const collectManazuruEvents = createCalendarJsonCollector({ source: MANAZURU_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectHakoneEvents = createCollectHakoneEvents(geoFmDeps);
const collectKaiseiEvents = createCollectKaiseiEvents(geoFmDeps);
const collectYamakitaEvents = createCollectYamakitaEvents(geoFmDeps);
const collectMachidaKosodateEvents = createCollectMachidaKosodateEvents(geoFmDeps);
const collectMizuhoEvents = createCollectMizuhoEvents(geoFmDeps);
const collectOkutamaEvents = createCalendarJsonCollector({ source: OKUTAMA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectHinodeEvents = createCollectHinodeEvents(geoFmDeps);
const collectHinoharaEvents = createCollectHinoharaEvents(geoFmDeps);
const collectAkishimaEvents = createEventJsCollector({
  source: AKISHIMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["10"], knownFacilities: FACILITY_REGISTRY.akishima,
  useKeywordFilter: true,
}, geoFmDeps);
const collectHigashiyamatoEvents = createEventJsCollector({
  source: HIGASHIYAMATO_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20"], knownFacilities: FACILITY_REGISTRY.higashiyamato,
  useKeywordFilter: true,
}, geoFmDeps);
const collectKiyoseEvents = createEventJsCollector({
  source: KIYOSE_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: FACILITY_REGISTRY.kiyose,
  useKeywordFilter: true,
}, geoFmDeps);
const collectTamaEvents = createEventJsCollector({
  source: TAMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["70"], knownFacilities: FACILITY_REGISTRY.tama,
  useKeywordFilter: true,
}, geoFmDeps);
const collectInagiEvents = createEventJsCollector({
  source: INAGI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["40"], knownFacilities: FACILITY_REGISTRY.inagi,
  useKeywordFilter: true,
}, geoFmDeps);
const collectHinoEvents = createEventJsCollector({
  source: HINO_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["1"], knownFacilities: FACILITY_REGISTRY.hino,
  useKeywordFilter: true,
}, geoFmDeps);
const collectKokubunjiEvents = createEventJsCollector({
  source: KOKUBUNJI_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6"], knownFacilities: FACILITY_REGISTRY.kokubunji,
  useKeywordFilter: true,
}, geoFmDeps);
const collectHigashikurumeEvents = createEventJsCollector({
  source: HIGASHIKURUME_SOURCE, jsFile: "event_d.js",
  childCategoryIds: ["6", "7"], knownFacilities: FACILITY_REGISTRY.higashikurume,
  useKeywordFilter: true,
}, geoFmDeps);
const collectSagamiharaEvents = createEventJsCollector({
  source: SAGAMIHARA_SOURCE, jsFile: "event_j.js",
  childCategoryIds: ["5", "6", "13"], knownFacilities: FACILITY_REGISTRY.sagamihara,
  useKeywordFilter: true,
}, geoFmDeps);
const collectEbinaEvents = createEventJsCollector({
  source: EBINA_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6", "7"], knownFacilities: FACILITY_REGISTRY.ebina,
  useKeywordFilter: true,
}, geoFmDeps);
const collectChigasakiEvents = createEventJsCollector({
  source: CHIGASAKI_SOURCE, jsFile: "event_d.js",
  childCategoryIds: [], childCategory2Ids: ["1"], knownFacilities: FACILITY_REGISTRY.chigasaki,
  useKeywordFilter: true,
  placeIdMap: {
    "1": "小和田公民館", "2": "鶴嶺公民館", "3": "松林公民館",
    "5": "香川公民館", "7": "茅ヶ崎公園体験学習センター",
    "10": "市民ふれあいプラザ", "20": "茅ヶ崎市立図書館", "22": "青少年会館",
  },
}, geoFmDeps);
const collectZamaEvents = createEventJsCollector({
  source: ZAMA_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: FACILITY_REGISTRY.zama,
  useKeywordFilter: true,
}, geoFmDeps);
const collectZushiEvents = createEventJsCollector({
  source: ZUSHI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20"], knownFacilities: FACILITY_REGISTRY.zushi,
  useKeywordFilter: true,
}, geoFmDeps);
// --- 千葉県 event-js-collector ---
const collectNagareyamaEvents = createEventJsCollector({
  source: NAGAREYAMA_SOURCE, jsFile: "event_d.js",
  childCategoryIds: ["6"], knownFacilities: FACILITY_REGISTRY.nagareyama,
  useKeywordFilter: true,
}, geoFmDeps);
const collectUrayasuEvents = createEventJsCollector({
  source: URAYASU_SOURCE, jsFile: "event_data.js",
  childCategoryIds: ["6"], knownFacilities: FACILITY_REGISTRY.urayasu,
  useKeywordFilter: true,
}, geoFmDeps);
const collectNodaEvents = createEventJsCollector({
  source: NODA_SOURCE, jsFile: "event_data.js",
  childCategoryIds: [], useKeywordFilter: true,
  knownFacilities: FACILITY_REGISTRY.noda,
}, geoFmDeps);
// --- 千葉県 calendar-json-collector ---
const collectNarashinoEvents = createCalendarJsonCollector({ source: NARASHINO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectShiroiEvents = createCalendarJsonCollector({ source: SHIROI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectKisarazuEvents = createCalendarJsonCollector({ source: KISARAZU_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectIsumiEvents = createCalendarJsonCollector({ source: ISUMI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectTohnoshoEvents = createCalendarJsonCollector({ source: TOHNOSHO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectOtakiEvents = createCalendarJsonCollector({ source: OTAKI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// --- 千葉県 custom collectors ---
const collectFunabashiEvents = createCollectFunabashiEvents(geoFmDeps);
const collectFunabashiJidohomeEvents = createCollectFunabashiJidohomeEvents(geoFmDeps);
const collectNaritaEvents = createCollectNaritaEvents(geoFmDeps);
const collectChibaCityEvents = createCollectChibaEvents(geoFmDeps);
const collectChibaCityWardEvents = createCollectChibaCityWardEvents(geoFmDeps);
const collectKashiwaEvents = createCollectKashiwaEvents(geoFmDeps);
// --- 千葉県 municipal-calendar-collector ---
const collectYachiyoEvents = createMunicipalCalendarCollector({ source: YACHIYO_SOURCE, childCategoryIndex: null, useIndexPhpFormat: true }, geoFmDeps);
const collectAsahiEvents = createMunicipalCalendarCollector({ source: ASAHI_SOURCE, childCategoryIndex: 2, useIndexPhpFormat: true }, geoFmDeps);
const collectKamogawaEvents = createCollectKamogawaEvents(geoFmDeps);
const collectYokoshibahikariEvents = createMunicipalCalendarCollector({ source: YOKOSHIBAHIKARI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectIchikawaEvents = createCollectIchikawaEvents(geoFmDeps);
const collectIchikawaIkujiEvents = createCollectIchikawaIkujiEvents(geoFmDeps);
const collectKatsuuraEvents = createMunicipalCalendarCollector({ source: KATSUURA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectKimitsuEvents = createMunicipalCalendarCollector({ source: KIMITSU_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKyonanEvents = createMunicipalCalendarCollector({ source: KYONAN_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectYotsukaidoEvents = createCollectYotsukaidoEvents(geoFmDeps);
const collectMatsudoEvents = createCollectMatsudoEvents(geoFmDeps);
// --- 千葉県 list-calendar-collector ---
const collectAbikoEvents = createListCalendarCollector({ source: ABIKO_SOURCE, calendarPath: "/event/event/calendar/" }, geoFmDeps);
const collectKamagayaEvents = createListCalendarCollector({ source: KAMAGAYA_SOURCE, calendarPath: "/event/calendar/", fallbackPath: "/event/kodomo/calendar/" }, geoFmDeps);
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
const collectSakuraEvents = createCalendarJsonCollector({ source: SAKURA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectFuttsuEvents = createEvent2CalendarCollector({ source: FUTTSU_SOURCE, childIconAlts: ["子育て"] }, geoFmDeps);
const collectInzaiEvents = createEvent2CalendarCollector({ source: INZAI_SOURCE, childIconAlts: ["子育て"] }, geoFmDeps);
const collectKatoriEvents = createCollectKatoriEvents(geoFmDeps);
const collectToganeEvents = createEvent2CalendarCollector({ source: TOGANE_SOURCE, childIconAlts: ["子育て", "子ども"] }, geoFmDeps);
const collectIchiharaEvents = createCalendarJsonCollector({ source: ICHIHARA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectSosaEvents = createCalendarJsonCollector({ source: SOSA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectSammuEvents = createCalendarJsonCollector({ source: SAMMU_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectSakaeChibaEvents = createCalendarJsonCollector({ source: SAKAE_CHIBA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
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
const collectKimitsuKosodateEvents = createCollectKimitsuKosodateEvents(geoFmDeps);
const collectMatsudoKosodateEvents = createCollectMatsudoKosodateEvents(geoFmDeps);
const collectMatsudoLibraryEvents = createCollectMatsudoLibraryEvents(geoFmDeps);
const collectIchiharaKodomomiraiEvents = createCollectIchiharaKodomomiraiEvents(geoFmDeps);
const collectIchiharaSalonEvents = createCollectIchiharaSalonEvents(geoFmDeps);
const collectNaritaKosodateEvents = createCollectNaritaKosodateEvents(geoFmDeps);
const collectAbikoKosodateEvents = createCollectAbikoKosodateEvents(geoFmDeps);
const collectKamagayaKosodateEvents = createCollectKamagayaKosodateEvents(geoFmDeps);
const collectSakuraLibraryEvents = createCollectSakuraLibraryEvents(geoFmDeps);
const collectInzaiLibraryEvents = createCollectInzaiLibraryEvents(geoFmDeps);
// --- 埼玉県 calendar-json-collector ---
const collectKawaguchiEvents = createCalendarJsonCollector({ source: KAWAGUCHI_SOURCE, childKeywords: ["おもちゃ", "工作", "映画会", "図書館", "広場", "子育て", "親子", "幼児", "乳幼児", "健診", "教室", "サロン", "相談", "キッズ", "児童館", "赤ちゃん"] }, geoFmDeps);
const collectKawaguchiJidokanEvents = createCollectKawaguchiJidokanEvents(geoFmDeps);
const collectKawaguchiKosodateEvents = createCollectKawaguchiKosodateEvents(geoFmDeps);
const collectKasukabeEvents = createCalendarJsonCollector({ source: KASUKABE_SOURCE, childKeywords: ["健診", "相談", "教室", "広場", "サロン", "映画会", "工作", "イチゴ", "図書館", "子育て", "親子", "幼児", "乳幼児", "キッズ", "児童", "赤ちゃん", "おはなし"] }, geoFmDeps);
const collectKasukabeJidokanEvents = createCollectKasukabeJidokanEvents(geoFmDeps);
const collectFujiminoEvents = createCalendarJsonCollector({ source: FUJIMINO_SOURCE, childKeywords: ["子育て", "親子", "幼児", "乳幼児", "健診", "教室", "サロン", "相談", "キッズ", "児童", "おはなし", "広場", "赤ちゃん"] }, geoFmDeps);
const collectMisatoEvents = createCalendarJsonCollector({ source: MISATO_SOURCE, childKeywords: ["子育て", "親子", "幼児", "乳幼児", "おはなし会", "読み聞かせ", "教室", "相談", "健診", "キッズ", "児童", "サロン", "ひろば", "赤ちゃん"] }, geoFmDeps);
// --- 埼玉県 event-js-collector ---
const collectKawagoeEvents = createEventJsCollector({
  source: KAWAGOE_SOURCE, jsFile: "event.js",
  childCategoryIds: ["20", "30"], knownFacilities: FACILITY_REGISTRY.kawagoe,
  useKeywordFilter: true,
}, geoFmDeps);
const collectWakoEvents = createEventJsCollector({
  source: WAKO_SOURCE, jsFile: "event.js",
  childCategoryIds: ["60"], knownFacilities: FACILITY_REGISTRY.wako,
  useKeywordFilter: true,
}, geoFmDeps);
const collectWarabiEvents = createEventJsCollector({
  source: WARABI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["30"], knownFacilities: FACILITY_REGISTRY.warabi,
  useKeywordFilter: true,
}, geoFmDeps);
// --- 埼玉県 municipal-calendar-collector ---
const collectAgeoEvents = createMunicipalCalendarCollector({ source: AGEO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectNiizaEvents = createMunicipalCalendarCollector({ source: NIIZA_SOURCE, childCategoryIndex: 9 }, geoFmDeps);
const collectAsakaEvents = createMunicipalCalendarCollector({ source: ASAKA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectTodaEvents = createMunicipalCalendarCollector({ source: TODA_SOURCE, childCategoryIndex: 8 }, geoFmDeps);
const collectShikiEvents = createMunicipalCalendarCollector({ source: SHIKI_SOURCE, childCategoryIndex: null, useIndexPhpFormat: true }, geoFmDeps);
// --- 埼玉県 list-calendar-collector ---
const collectFujimiEvents = createListCalendarCollector({ source: FUJIMI_SOURCE, calendarPath: "/event/naiyo/kodomo_kosodate/calendar/", fallbackPath: "/event/naiyo/calendar/" }, geoFmDeps);
const collectSayamaEvents = createListCalendarCollector({ source: SAYAMA_SOURCE, calendarPath: "/kankou/event/calendar/", fallbackPath: "/kankou/event/kyoiku/calendar/" }, geoFmDeps);
const collectYashioEvents = createListCalendarCollector({ source: YASHIO_SOURCE, calendarPath: "/event/kosodate/calendar/", fallbackPath: "/event/calendar/" }, geoFmDeps);
// --- 埼玉県 list-calendar-collector (追加) ---
const collectTokorozawaEvents = createListCalendarCollector({ source: TOKOROZAWA_SOURCE, calendarPath: "/iitokoro/event/main/calendar/", fallbackPath: "/iitokoro/event/main/kodomo/calendar/" }, geoFmDeps);
const collectKumagayaEvents = createListCalendarCollector({ source: KUMAGAYA_SOURCE, calendarPath: "/kanko/event/kids/calendar/", fallbackPath: "/kanko/event/calendar/" }, geoFmDeps);
// --- 埼玉県 event-js-collector (追加) ---
const collectKukiEvents = createEventJsCollector({
  source: KUKI_SOURCE, jsFile: "event.js",
  childCategoryIds: ["50"], knownFacilities: FACILITY_REGISTRY.kuki,
  useKeywordFilter: true,
}, geoFmDeps);
// --- 埼玉県 municipal-calendar-collector (追加) ---
const collectKounosuEvents = createMunicipalCalendarCollector({ source: KOUNOSU_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectSakadoEvents = createMunicipalCalendarCollector({ source: SAKADO_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectSakadoJidokanEvents = createCollectSakadoJidokanEvents(geoFmDeps);
const collectHigashimatsuyamaEvents = createMunicipalCalendarCollector({ source: HIGASHIMATSUYAMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectHigashimatsuyamaKosodateEvents = createCollectHigashimatsuyamaKosodateEvents(geoFmDeps);
// --- 埼玉県 calendar-json-collector (追加) ---
const collectHannoEvents = createCalendarJsonCollector({ source: HANNO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectGyodaEvents = createCalendarJsonCollector({ source: GYODA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectHonjoEvents = createCalendarJsonCollector({ source: HONJO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectHidakaEvents = createCalendarJsonCollector({ source: HIDAKA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectShiraokaEvents = createCalendarJsonCollector({ source: SHIRAOKA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectSatteEvents = createCalendarJsonCollector({ source: SATTE_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// --- 埼玉県 municipal-calendar-collector (町村) ---
const collectYoriiEvents = createMunicipalCalendarCollector({ source: YORII_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectSugitoEvents = createMunicipalCalendarCollector({ source: SUGITO_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
// --- 埼玉県 custom ---
const collectSaitamaEvents = createCollectSaitamaEvents(geoFmDeps);
const collectSaitamaJidoukanEvents = createCollectSaitamaJidoukanEvents(geoFmDeps);
const collectSaitamaHokenEvents = createCollectSaitamaHokenEvents(geoFmDeps);
const collectKoshigayaEvents = createCollectKoshigayaEvents(geoFmDeps);
const collectKoshigayaKosodateEvents = createCollectKoshigayaKosodateEvents(geoFmDeps);
const collectSokaEvents = createCollectSokaEvents({ ...geoFmDeps, source: SOKA_SOURCE });
const collectTsurugashimaEvents = createCollectTsurugashimaEvents({ ...geoFmDeps, source: TSURUGASHIMA_SOURCE });
const collectHasudaEvents = createCollectHasudaEvents({ ...geoFmDeps, source: HASUDA_SOURCE });
const collectIrumaEvents = createCalendarJsonCollector({ source: IRUMA_SOURCE, jsonPath: "/soshiki/calendar.json", childEventTypeNo: 1, childKeywords: CHILD_KW }, geoFmDeps);
const collectKazoEvents = createCalendarJsonCollector({ source: KAZO_SOURCE, childKeywords: ["児童館", "健診", "相談", "教室", "広場", "サロン", "おもちゃ", "無料開放"] }, geoFmDeps);
const collectFukayaEvents = createCalendarJsonCollector({ source: FUKAYA_SOURCE, jsonPath: "/event/calendar.json", childKeywords: CHILD_KW }, geoFmDeps);
const collectOkegawaEvents = createCalendarJsonCollector({ source: OKEGAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectOgoseEvents = createCalendarJsonCollector({ source: OGOSE_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectOgawaEvents = createCalendarJsonCollector({ source: OGAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectYoshimiEvents = createCalendarJsonCollector({ source: YOSHIMI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectKamikawaEvents = createCalendarJsonCollector({ source: KAMIKAWA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
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
const collectNamegawaEvents = createCalendarJsonCollector({ source: NAMEGAWA_SOURCE, jsonPath: "/cgi-bin/get_event_calendar.php", childKeywords: CHILD_KW }, geoFmDeps);
const collectRanzanEvents = createCollectRanzanEvents({ ...geoFmDeps, source: RANZAN_SOURCE });
const collectMatsubushiEvents = createCollectMatsubushiEvents({ ...geoFmDeps, source: MATSUBUSHI_SOURCE });
const collectMinanoEvents = createCollectMinanoEvents({ ...geoFmDeps, source: MINANO_SOURCE });
const collectMoroyamaEvents = createCollectMoroyamaEvents({ ...geoFmDeps, source: MOROYAMA_SOURCE });
const collectHanyuEvents = createCollectHanyuEvents({ ...geoFmDeps, source: HANYU_SOURCE });
const collectMisatoSaitamaEvents = createCollectMisatoSaitamaEvents({ ...geoFmDeps, source: MISATO_SAITAMA_SOURCE });
// --- 栃木県 calendar-json-collector ---
const collectSanoEvents = createCollectSanoScheduleEvents(geoFmDeps); // スケジュール表コレクター
const collectNikkoEvents = createCalendarJsonCollector({ source: NIKKO_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectMokaEvents = createCollectMokaScheduleEvents(geoFmDeps); // スケジュール表コレクター
const collectNasushiobaraEvents = createCalendarJsonCollector({ source: NASUSHIOBARA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// --- 栃木県 municipal-calendar-collector ---
const collectTochigiCityEvents = createCollectTochigiCityScheduleEvents(geoFmDeps); // スケジュール表コレクター
const collectYaitaEvents = createMunicipalCalendarCollector({ source: YAITA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 栃木県 custom ---
const collectUtsunomiyaEvents = createCollectUtsunomiyaEvents(geoFmDeps);
const collectAshikagaEvents = createCollectAshikagaEvents(geoFmDeps);
const collectKanumaEvents = createCollectKanumaCalendarEvents(geoFmDeps); // カレンダーリスト表示コレクター
const collectOyamaEvents = createCollectOyamaEvents(geoFmDeps);
const collectOhtawaraEvents = createCollectOhtawaraEvents(geoFmDeps);
const collectTochigiSakuraEvents = createCollectTochigiSakuraEvents(geoFmDeps);
const collectNasukarasuyamaEvents = createCollectNasukarasuyamaEvents(geoFmDeps);
const collectShimotsukeEvents = createCollectShimotsukeEvents(geoFmDeps);
const collectKaminokawaEvents = createCollectKaminokawaEvents(geoFmDeps);
const collectMashikoEvents = createCollectMashikoCalendarEvents(geoFmDeps); // カレンダーコレクターに置換
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
const collectMaebashiEvents = createCalendarJsonCollector({ source: MAEBASHI_SOURCE, childEventTypeNo: 1, childKeywords: CHILD_KW }, geoFmDeps);
const collectMaebashiJidokanEvents = createCollectMaebashiJidokanEvents(geoFmDeps);
const collectIsesakiEvents = createCalendarJsonCollector({ source: ISESAKI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectFujiokaGunmaEvents = createCollectFujiokaGunmaKosodateEvents(geoFmDeps); // calendar.jsonに子育てイベントなし→kosodate
// --- 群馬県 municipal-calendar-collector ---
const collectTakasakiEvents = createMunicipalCalendarCollector({ source: TAKASAKI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectOtaGunmaEvents = createCollectOtaGunmaKosodateEvents(geoFmDeps); // calendarに子育てイベントなし→kosodate
const collectKodomonokuniEvents = createCollectKodomonokuniEvents(geoFmDeps); // ぐんまこどもの国 (太田市)
const collectAnnakaEvents = createCollectAnnakaKosodateEvents(geoFmDeps); // calendarに子育てイベントなし→kosodate
const collectNakanojoEvents = createMunicipalCalendarCollector({ source: NAKANOJO_SOURCE, childCategoryIndex: 5 }, geoFmDeps);
// --- 群馬県 custom ---
const collectKiryuEvents = createEventJsCollector({
  source: KIRYU_SOURCE, jsFile: "city_event.js",
  childCategoryIds: ["7"], useKeywordFilter: true, knownFacilities: FACILITY_REGISTRY.kiryu,
}, geoFmDeps);
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
// --- Tochigi/Gunma schedule supplements ---
const collectNasuScheduleEvents = createCollectNasuScheduleEvents(geoFmDeps);
const collectTakanezawaScheduleEvents = createCollectTakanezawaScheduleEvents(geoFmDeps);
const collectNikkoScheduleEvents = createCollectNikkoScheduleEvents(geoFmDeps);
const collectNikkoSupportCenterEvents = createCollectNikkoSupportCenterEvents(geoFmDeps);
const collectNasushiobaraScheduleEvents = createCollectNasushiobaraScheduleEvents(geoFmDeps);
const collectOyamaScheduleEvents = createCollectOyamaScheduleEvents(geoFmDeps);
const collectOhtawaraScheduleEvents = createCollectOhtawaraScheduleEvents(geoFmDeps);
const collectAshikagaScheduleEvents = createCollectAshikagaScheduleEvents(geoFmDeps);
const collectShimotsukeScheduleEvents = createCollectShimotsukeScheduleEvents(geoFmDeps);
const collectTochigiSakuraScheduleEvents = createCollectTochigiSakuraScheduleEvents(geoFmDeps);
const collectOhtawaraPdfScheduleEvents = createCollectOhtawaraPdfScheduleEvents(geoFmDeps);
const collectKanumaPdfScheduleEvents = createCollectKanumaPdfScheduleEvents(geoFmDeps);
const collectNasukarasuyamaPdfScheduleEvents = createCollectNasukarasuyamaPdfScheduleEvents(geoFmDeps);
// --- PDF schedule collectors ---
const collectOtaGunmaPdfScheduleEvents = createCollectOtaGunmaPdfScheduleEvents(geoFmDeps);
const collectShibukawaPdfScheduleEvents = createCollectShibukawaPdfScheduleEvents(geoFmDeps);
const collectTomiokaPdfScheduleEvents = createCollectTomiokaPdfScheduleEvents(geoFmDeps);
const collectAnnakaPdfScheduleEvents = createCollectAnnakaPdfScheduleEvents(geoFmDeps);
const collectMinakamiPdfScheduleEvents = createCollectMinakamiPdfScheduleEvents(geoFmDeps);
const collectMeiwaPdfScheduleEvents = createCollectMeiwaPdfScheduleEvents(geoFmDeps);
const collectShintoPdfScheduleEvents = createCollectShintoPdfScheduleEvents(geoFmDeps);
// --- 群馬県 schedule table collectors (supplement) ---
const collectMaebashiScheduleEvents = createCollectMaebashiScheduleEvents(geoFmDeps);
const collectIsesakiScheduleEvents = createCollectIsesakiScheduleEvents(geoFmDeps);
const collectKiryuScheduleEvents = createCollectKiryuScheduleEvents(geoFmDeps);
const collectTatebayashiScheduleEvents = createCollectTatebayashiScheduleEvents(geoFmDeps);
const collectNumataScheduleEvents = createCollectNumataScheduleEvents(geoFmDeps);
const collectKawabaScheduleEvents = createCollectKawabaScheduleEvents(geoFmDeps);
const collectShimonitaScheduleEvents = createCollectShimonitaScheduleEvents(geoFmDeps);
const collectChiyodaGunmaScheduleEvents = createCollectChiyodaGunmaScheduleEvents(geoFmDeps);
const collectFujiokaGunmaScheduleEvents = createCollectFujiokaGunmaScheduleEvents(geoFmDeps);
const collectTamamuraScheduleEvents = createCollectTamamuraScheduleEvents(geoFmDeps);
const collectKanraScheduleEvents = createCollectKanraScheduleEvents(geoFmDeps);
const collectAnnakaScheduleEvents = createCollectAnnakaScheduleEvents(geoFmDeps);
const collectHigashiagatsumaScheduleEvents = createCollectHigashiagatsumaScheduleEvents(geoFmDeps);
const collectItakuraCalendarEvents = createCollectItakuraCalendarEvents(geoFmDeps);
const collectMidoriScheduleEvents = createCollectMidoriScheduleEvents(geoFmDeps);
const collectOizumiScheduleEvents = createCollectOizumiScheduleEvents(geoFmDeps);
const collectOtaKodomokanEvents = createCollectOtaKodomokanEvents(geoFmDeps);
const collectKiryuShienCenterEvents = createCollectKiryuShienCenterEvents(geoFmDeps);
const collectNakanojoRecurringEvents = createCollectNakanojoRecurringEvents(geoFmDeps);
const collectShimonitaCrossRowEvents = createCollectShimonitaCrossRowEvents(geoFmDeps);
const collectTakasakiNandemoEvents = createCollectTakasakiNandemoEvents(geoFmDeps);
// --- 葛飾区 schedule collector ---
const collectKatsushikaScheduleEvents = createCollectKatsushikaScheduleEvents(geoFmDeps);
// --- 江東区 児童館 collector ---
const collectKotoJidokanEvents = createCollectKotoJidokanEvents(geoFmDeps);
// --- 東京23区 calendar-cgi-collector (Joruri CMS) ---
const collectAdachiEvents = createCalendarCgiCollector({ source: ADACHI_SOURCE, cgiPath: "/cgi-bin/event_cal_multi/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
const collectEdogawaEvents = createCalendarCgiCollector({ source: EDOGAWA_SOURCE, cgiPath: "/cgi-bin/event_cal_multi/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
const collectSuginamiEvents = createCalendarCgiCollector({ source: SUGINAMI_SOURCE, cgiPath: "/cgi-bin/event_cal_multi/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
const collectBunkyoEvents = createCalendarCgiCollector({ source: BUNKYO_SOURCE, cgiPath: "/cgi-bin/event_cal_multi/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
const collectArakawaEvents = createCalendarCgiCollector({ source: ARAKAWA_SOURCE, cgiPath: "/cgi-bin/event_cal_multi/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
const collectToshimaEvents = createCalendarCgiCollector({ source: TOSHIMA_SOURCE, cgiPath: "/cgi-bin/event_cal/calendar.cgi", useKeywordFilter: true }, geoFmDeps);
// --- 東京23区 list-calendar (static HTML) ---
const collectNakanoEvents = createListCalendarCollector({ source: NAKANO_SOURCE, calendarPath: "/event/kosodate/calendar/", fallbackPath: "/event/calendar/" }, geoFmDeps);
const collectSumidaEvents = createListCalendarCollector({ source: SUMIDA_SOURCE, calendarPath: "/eventcalendar/kodomo_kosodate/calendar/", fallbackPath: "/eventcalendar/calendar/" }, geoFmDeps);
const collectTaitoEvents = createListCalendarCollector({ source: TAITO_SOURCE, calendarPath: "/event/kosodate/calendar/", fallbackPath: "/event/calendar/" }, geoFmDeps);
const collectNerimaEvents = createListCalendarCollector({ source: NERIMA_SOURCE, calendarPath: "/kankomoyoshi/event/kodomo/calendar/", fallbackPath: "/kankomoyoshi/event/calendar/" }, geoFmDeps);
// --- 東京23区 calendar-cgi-collector (FourWeb / PHP) ---
const collectItabashiEvents = createCalendarCgiCollector({ source: ITABASHI_SOURCE, cgiPath: "/cgi-evt/event.cgi", categoryParams: "c50=50", mode: "fourweb", useKeywordFilter: false, useUA: true }, geoFmDeps);
const collectShinjukuEvents = createCalendarCgiCollector({ source: SHINJUKU_SOURCE, cgiPath: "/event/calendar/calendar.php", mode: "php", useKeywordFilter: true }, geoFmDeps);
// --- 茨城県 ---
// Tier1: event.js (4市)
const collectHitachiIbEvents = createEventJsCollector({
  source: HITACHI_IB_SOURCE, jsFile: "event.js", childCategoryIds: ["20","70"], useKeywordFilter: true, knownFacilities: FACILITY_REGISTRY.ibaraki_hitachi,
}, geoFmDeps);
const collectHitachinakaEvents = createEventJsCollector({
  source: HITACHINAKA_SOURCE, jsFile: "event.js", childCategoryIds: ["20","30"], useKeywordFilter: true, knownFacilities: FACILITY_REGISTRY.ibaraki_hitachinaka,
}, geoFmDeps);
const collectMoriyaEvents = createEventJsCollector({
  source: MORIYA_SOURCE, jsFile: "event.js", childCategoryIds: ["20"], useKeywordFilter: true,
}, geoFmDeps);
const collectKamisuEvents = createEventJsCollector({
  source: KAMISU_SOURCE, jsFile: "event_data.js", childCategoryIds: ["20"], useKeywordFilter: true,
}, geoFmDeps);
// Tier1: calendar.json (3市村)
const collectTokaiIbEvents = createCalendarJsonCollector({ source: TOKAI_IB_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectTsukubaEvents = createCalendarJsonCollector({ source: TSUKUBA_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// Tier1: list_calendar (龍ケ崎市)
const collectRyugasakiEvents = createListCalendarCollector({ source: RYUGASAKI_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
// Tier2: cal.php コレクター (21自治体)
const collectChikuseiEvents = createCalPhpCollector({ source: CHIKUSEI_SOURCE, category: 6, childCategoryLabels: ["子育て", "教育"] }, geoFmDeps);
const collectTsuchiuraEvents = createCollectTsuchiuraJidokanEvents(geoFmDeps);
const collectIshiokaEvents = createCalPhpCollector({ source: ISHIOKA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectJosoEvents = createCalPhpCollector({ source: JOSO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNakaIbEvents = createCalPhpCollector({ source: NAKA_IB_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectBandoEvents = createCalPhpCollector({ source: BANDO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHitachiotaEvents = createCalPhpCollector({ source: HITACHIOTA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYukiEvents = createCalPhpCollector({ source: YUKI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTsukubamiraiEvents = createCalPhpCollector({ source: TSUKUBAMIRAI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectInashikiEvents = createCalPhpCollector({ source: INASHIKI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectSakuragawaEvents = createCalPhpCollector({ source: SAKURAGAWA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHitachiomiyaEvents = createCalPhpCollector({ source: HITACHIOMIYA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShimotsumaEvents = createCalPhpCollector({ source: SHIMOTSUMA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokotaEvents = createCalPhpCollector({ source: HOKOTA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNamegataEvents = createCalPhpCollector({ source: NAMEGATA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectItakoEvents = createCalPhpCollector({ source: ITAKO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKasumigauraEvents = createCalPhpCollector({ source: KASUMIGAURA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTakahagiEvents = createCalPhpCollector({ source: TAKAHAGI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShiroIbEvents = createCalPhpCollector({ source: SHIRO_IB_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectDaigoEvents = createCalPhpCollector({ source: DAIGO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTorideKosodateEvents = createCollectTorideKosodateEvents(geoFmDeps);
// Tier2: 水戸市 + 鹿嶋市 (カスタムPHP) + 笠間市 (cal.php)
const collectKasamaEvents = createCalPhpCollector({ source: KASAMA_SOURCE, category: 4 }, geoFmDeps);
// --- 茨城県 追加9自治体 ---
const collectYachiyoIbEvents = createCollectYachiyoIbEvents(geoFmDeps);
const collectGokaEvents = createCollectGokaEvents(geoFmDeps);
const collectOaraiEvents = createCollectOaraiEvents(geoFmDeps);
const collectKawachiIbEvents = createCollectKawachiIbEvents(geoFmDeps);
const collectIbarakimachiEvents = createCollectIbarakimachiEvents(geoFmDeps);
const collectKitaibarakiEvents = createCollectKitaibarakiEvents(geoFmDeps);
const collectUshikuEvents = createCollectUshikuEvents(geoFmDeps);
const collectAmiEvents = createCollectAmiEvents(geoFmDeps);
const collectToneIbEvents = createCollectToneIbEvents(geoFmDeps);
// --- 茨城県 カスタムコレクター（古河・常総・結城）---
const collectKogaKosodateEvents = createCollectKogaKosodateEvents(geoFmDeps);
const collectJosoKosodateEvents = createCollectJosoKosodateEvents(geoFmDeps);
const collectYukiKosodateEvents = createCollectYukiKosodateEvents(geoFmDeps);

// --- Child keyword constants (add after other CHILD_KW definitions) ---

// --- Collector instantiation ---

// Dead: Kakamigahara event_j.js 404 (2026-02)
// Dead: Gifu event_j.js 404 (2026-02)

// Dead: Suzuka/Tsu event_j.js 404, Meiwa calendar.json 404 (2026-02)


// 追加ママフレ都市
// 高松市こども未来館 (JSON API)
// 倉敷市・富山市・山形市・白山市 (event.js)
const collectTokyoOtaMamafreEvents = createMamafreCollector({ source: TOKYO_OTA_MAMAFRE_SOURCE, mamafre_base: "https://tokyo-ota-city.mamafre.jp", pref: "東京都", city: "大田区" }, geoFmDeps);
const collectIbarakiKamisuMamafreEvents = createMamafreCollector({ source: IBARAKI_KAMISU_MAMAFRE_SOURCE, mamafre_base: "https://kamisu-city.mamafre.jp", pref: "茨城県", city: "神栖市" }, geoFmDeps);
// いしかわ おやコミ！
// おきなわ子育て応援パスポート
// はっぴーママいしかわ
// 子育てし大県"さが"
// ながはぴ（長崎子育てココロンネット）
// 北九州市元気のもり
// まるがめ子育て応援 (Kagawa)
// みえこどもの城 (Mie)
// 四日市こどもポータル (Mie)
// 亀山市 子育てゆうゆう (Mie, WP calendar, ~41 events/month)
// チアフルながの
// こどもスマイルムーブメント (東京都)
// --- iko-yo (関東7都県) ---
const collectIkoyoKantoEvents = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [8, 9, 10, 11, 12, 13, 14] }, geoFmDeps);

const collectKodomoSmileEvents = createKodomoSmileCollector({ source: KODOMO_SMILE_SOURCE }, geoFmDeps);
// のびすく仙台 (5施設)
// 5-Daysこども文化科学館 (広島)
// サツイベ (札幌)
// えひめこどもの城
// こべっこランド (神戸)
// 浜松ぴっぴ (子育て情報サイト)
// ごーやーどっとネット (沖縄イベントポータル)
// 東広島きんサイト (ファミリーイベント)
// いこーよ (47都道府県を12分割 — 各4県、45sタイムアウト内に収める)
// いこーよ (47都道府県を12分割 — 各4県、45sタイムアウト内に収める)
// childKeywords 省略: いこーよは子育て専門ポータルなので全イベント採用
// 札幌市 (SMART CMS API)

const collectAdditionalWardsEvents = createCollectAdditionalWardsEvents({
  collectChuoAkachanTengokuEvents,
  collectKitaJidokanEvents,
  collectWardGenericEvents,
});

// --- Events service ---
// --- あきる野/府中/小金井/西東京 は additional-wards.js (ward-generic) で収集済み ---
// (municipal-calendar-collector 重複を削除: あきる野は /calendar/ がゴミ収集カレンダーで不正, 他3市も dated URL 404)

// --- Revived collectors (alternative CMS paths) ---
const collectKogaIbEvents = createMunicipalCalendarCollector({ source: KOGA_IB_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMitoEvents = createMunicipalCalendarCollector({ source: MITO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKashimaIbEvents = createMunicipalCalendarCollector({ source: KASHIMA_IB_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// --- Supplemental CMS collectors (endpoint migration) ---
const collectAmiCalEvents = createMunicipalCalendarCollector({ source: AMI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAnnakaCalEvents = createMunicipalCalendarCollector({ source: ANNAKA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAshikagaCalEvents = createMunicipalCalendarCollector({ source: ASHIKAGA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// Chonan: now using RSS+table collector in chiba-remaining.js (municipal-calendar was empty)
const collectChoseiCalEvents = createMunicipalCalendarCollector({ source: CHOSEI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHagaCalEvents = createMunicipalCalendarCollector({ source: HAGA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectIchikaiCalEvents = createMunicipalCalendarCollector({ source: ICHIKAI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKanraCalEvents = createMunicipalCalendarCollector({ source: KANRA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKawachiIbCalEvents = createCalPhpCollector({ source: KAWACHI_IB_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMashikoCalPhpEvents = createCalPhpCollector({ source: MASHIKO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMinamibosoCalEvents = createMunicipalCalendarCollector({ source: MINAMIBOSO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMobaraCalEvents = createMunicipalCalendarCollector({ source: MOBARA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagaraCalEvents = createMunicipalCalendarCollector({ source: NAGARA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNasukarasuyamaCalPhpEvents = createCalPhpCollector({ source: NASUKARASUYAMA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNogiCalJsonEvents = createCalendarJsonCollector({ source: NOGI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNumataCalEvents = createMunicipalCalendarCollector({ source: NUMATA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOamishirasatoCalEvents = createMunicipalCalendarCollector({ source: OAMISHIRASATO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOtaGunmaCalEvents = createMunicipalCalendarCollector({ source: OTA_GUNMA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOyamaCalEvents = createMunicipalCalendarCollector({ source: OYAMA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShibayamaCalEvents = createMunicipalCalendarCollector({ source: SHIBAYAMA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShibukawaCalEvents = createMunicipalCalendarCollector({ source: SHIBUKAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShioyaCalEvents = createMunicipalCalendarCollector({ source: SHIOYA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShisuiCalEvents = createMunicipalCalendarCollector({ source: SHISUI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTakanezawaCalEvents = createMunicipalCalendarCollector({ source: TAKANEZAWA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTatebayashiCalEvents = createMunicipalCalendarCollector({ source: TATEBAYASHI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTochigiCityCalEvents = createMunicipalCalendarCollector({ source: TOCHIGI_CITY_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTochigiSakuraCalEvents = createMunicipalCalendarCollector({ source: TOCHIGI_SAKURA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectToneIbCalJsonEvents = createCalendarJsonCollector({ source: TONE_IB_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectUenoGunmaCalEvents = createMunicipalCalendarCollector({ source: UENO_GUNMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectUshikuCalPhpEvents = createCalPhpCollector({ source: USHIKU_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectUtsunomiyaCalEvents = createMunicipalCalendarCollector({ source: UTSUNOMIYA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYachiyoIbCalJsonEvents = createCalendarJsonCollector({ source: YACHIYO_IB_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);

// 低カバレッジ都道府県 municipal-calendar collectors
// リンキッズやまなし (WP REST API)
// はぐみんNet (愛知県)
// Phase 2: 28 municipal calendar collectors (低カバレッジ都道府県)

// Phase 3: Tier 1 viable endpoints — event-js collectors
// Phase 3: Tier 1 — municipal-calendar collectors
// Phase 3: Tier 1 — calendar-json collectors
// Phase 3: Tier 1 — list-calendar collector

// Phase 3: Tier 2 — custom collectors


// Phase 3: Tier 3 additional municipal-calendar

// Phase 3: Tier 3 custom collectors


const collectors = [
  collectSetagayaJidokanEvents,
  collectOtaJidokanEvents,
  collectShinagawaJidokanEvents,
  collectMeguroJidokanEvents,
  collectShibuyaJidokanEvents,
  collectMinatoJidokanEvents,
  collectChiyodaJidokanEvents,
  collectAdditionalWardsEvents,
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
  collectKodomoSmileEvents,
  collectKawasakiEvents,
  collectYokohamaEvents,
  collectSagamiharaEvents,
  collectEbinaEvents,
  collectKamakuraEvents,
  collectKamakuraKmspotEvents,
  collectYokosukaEvents,
  collectChigasakiEvents,
  collectZamaEvents,
  collectZushiEvents,
  collectYamatoEvents,
  collectHiratsukaEvents,
  collectHiratsukaLibraryEvents,
  collectOdawaraEvents,
  collectHadanoEvents,
  collectAyaseEvents,
  collectAtsugiEvents,
  collectAtsugiKosodateEvents,
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
  collectMachidaKosodateEvents,
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
  collectFunabashiEvents, collectFunabashiJidohomeEvents,
  collectNaritaEvents,
  collectChibaCityEvents,
  collectChibaCityWardEvents,
  collectKashiwaEvents,
  collectYachiyoEvents,
  collectAsahiEvents,
  collectKamogawaEvents,
  collectYokoshibahikariEvents,
  collectIchikawaEvents,
  collectIchikawaIkujiEvents,
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
  collectKimitsuKosodateEvents,
  collectMatsudoKosodateEvents,
  collectMatsudoLibraryEvents,
  collectIchiharaKodomomiraiEvents,
  collectIchiharaSalonEvents,
  collectNaritaKosodateEvents,
  collectAbikoKosodateEvents,
  collectKamagayaKosodateEvents,
  collectSakuraLibraryEvents,
  collectInzaiLibraryEvents,
  collectKawaguchiEvents, collectKawaguchiJidokanEvents, collectKawaguchiKosodateEvents,
  collectKasukabeEvents, collectKasukabeJidokanEvents,
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
  collectSaitamaJidoukanEvents,
  collectSaitamaHokenEvents,
  collectKoshigayaEvents,
  collectKoshigayaKosodateEvents,
  collectTokorozawaEvents,
  collectKukiEvents,
  collectKumagayaEvents,
  collectKounosuEvents,
  collectSakadoEvents, collectSakadoJidokanEvents,
  collectHannoEvents,
  collectHigashimatsuyamaEvents, collectHigashimatsuyamaKosodateEvents,
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
  // あきる野/府中/小金井/西東京 → additional-wards.js で収集 (重複削除)
  // Tochigi
  collectSanoEvents, collectNikkoEvents, collectMokaEvents, collectNasushiobaraEvents,
  collectTochigiCityEvents, collectYaitaEvents, collectUtsunomiyaEvents, collectAshikagaEvents,
  collectKanumaEvents, collectOyamaEvents, collectOhtawaraEvents, collectTochigiSakuraEvents,
  collectNasukarasuyamaEvents, collectShimotsukeEvents, collectKaminokawaEvents, collectMashikoEvents,
  collectMotegiEvents, collectIchikaiEvents, collectHagaEvents, collectMibuEvents,
  collectNogiEvents, collectShioyaEvents, collectTakanezawaEvents, collectNasuEvents, collectTochigiNakagawaEvents,
  // Gunma
  collectMaebashiEvents, collectMaebashiJidokanEvents, collectIsesakiEvents, collectFujiokaGunmaEvents, collectTakasakiEvents,
  collectOtaGunmaEvents, collectKodomonokuniEvents, collectAnnakaEvents, collectNakanojoEvents, collectKiryuEvents,
  collectNumataEvents, collectTatebayashiEvents, collectShibukawaEvents, collectTomiokaEvents,
  collectMidoriEvents, collectShintoEvents, collectYoshiokaEvents, collectUenoGunmaEvents,
  collectKannaEvents, collectShimonitaEvents, collectNanmokuEvents, collectKanraEvents,
  collectNaganoharaEvents, collectTsumagoiEvents, collectKusatsuEvents, collectTakayamaGunmaEvents,
  collectHigashiagatsumaEvents, collectKatashinaEvents, collectKawabaEvents, collectShowaGunmaEvents,
  collectMinakamiEvents, collectTamamuraEvents, collectItakuraEvents, collectMeiwaGunmaEvents,
  collectChiyodaGunmaEvents, collectOizumiEvents, collectOraEvents,
  // Tochigi schedule supplement
  collectNasuScheduleEvents, collectTakanezawaScheduleEvents, collectNikkoScheduleEvents,
  collectNikkoSupportCenterEvents, collectNasushiobaraScheduleEvents, collectOyamaScheduleEvents,
  collectOhtawaraScheduleEvents, collectAshikagaScheduleEvents, collectShimotsukeScheduleEvents,
  collectTochigiSakuraScheduleEvents, collectOhtawaraPdfScheduleEvents, collectKanumaPdfScheduleEvents,
  collectNasukarasuyamaPdfScheduleEvents,
  // PDF schedule collectors
  collectOtaGunmaPdfScheduleEvents, collectShibukawaPdfScheduleEvents, collectTomiokaPdfScheduleEvents,
  collectAnnakaPdfScheduleEvents, collectMinakamiPdfScheduleEvents, collectMeiwaPdfScheduleEvents, collectShintoPdfScheduleEvents,
  // Gunma schedule supplements
  collectMaebashiScheduleEvents, collectIsesakiScheduleEvents, collectKiryuScheduleEvents,
  collectTatebayashiScheduleEvents, collectNumataScheduleEvents, collectKawabaScheduleEvents,
  collectShimonitaScheduleEvents, collectChiyodaGunmaScheduleEvents, collectFujiokaGunmaScheduleEvents,
  collectTamamuraScheduleEvents, collectKanraScheduleEvents, collectAnnakaScheduleEvents,
  collectHigashiagatsumaScheduleEvents, collectItakuraCalendarEvents, collectMidoriScheduleEvents,
  collectOizumiScheduleEvents, collectOtaKodomokanEvents, collectKiryuShienCenterEvents,
  collectNakanojoRecurringEvents, collectShimonitaCrossRowEvents, collectTakasakiNandemoEvents,
  // Katsushika schedule supplement
  collectKatsushikaScheduleEvents,
  // Koto jidokan supplement
  collectKotoJidokanEvents,
  // 東京23区 CGI/list-calendar (12区)
  collectAdachiEvents, collectEdogawaEvents, collectSuginamiEvents,
  collectBunkyoEvents, collectArakawaEvents, collectToshimaEvents,
  collectNakanoEvents, collectSumidaEvents, collectTaitoEvents, collectNerimaEvents,
  collectItabashiEvents, collectShinjukuEvents,
  // Ibaraki
  collectHitachiIbEvents, collectHitachinakaEvents, collectMoriyaEvents, collectKamisuEvents,
  collectTokaiIbEvents, collectTsukubaEvents,
  collectChikuseiEvents,
  collectShimotsumaEvents,
  collectKasumigauraEvents, collectTakahagiEvents,
  collectYachiyoIbEvents, collectGokaEvents, collectOaraiEvents, collectKawachiIbEvents,
  collectIbarakimachiEvents, collectKitaibarakiEvents, collectUshikuEvents, collectAmiEvents, collectToneIbEvents,
  collectTsuchiuraEvents,
  collectTorideKosodateEvents,
  collectRyugasakiEvents,
  collectNakaIbEvents,
  collectIshiokaEvents,
  collectJosoEvents,
  collectTsukubamiraiEvents,
  collectYukiEvents,
  collectBandoEvents,
  collectHitachiotaEvents,
  collectHitachiomiyaEvents,
  collectSakuragawaEvents,
  collectInashikiEvents,
  collectItakoEvents,
  collectNamegataEvents,
  collectShiroIbEvents,
  collectHokotaEvents,
  collectDaigoEvents,
  collectKasamaEvents,
  collectKogaIbEvents,
  collectKogaKosodateEvents,
  collectJosoKosodateEvents,
  collectYukiKosodateEvents,
  collectMitoEvents,
  collectKashimaIbEvents,
  collectTokyoOtaMamafreEvents, collectIbarakiKamisuMamafreEvents, // Supplemental CMS collectors
  collectAmiCalEvents,
  collectAnnakaCalEvents,
  collectAshikagaCalEvents,
  collectChoseiCalEvents,
  collectHagaCalEvents,
  collectIchikaiCalEvents,
  collectKanraCalEvents,
  collectKawachiIbCalEvents,
  collectMashikoCalPhpEvents,
  collectMinamibosoCalEvents,
  collectMobaraCalEvents,
  collectNagaraCalEvents,
  collectNasukarasuyamaCalPhpEvents,
  collectNogiCalJsonEvents,
  collectNumataCalEvents,
  collectOamishirasatoCalEvents,
  collectOtaGunmaCalEvents,
  collectOyamaCalEvents,
  collectShibayamaCalEvents,
  collectShibukawaCalEvents,
  collectShioyaCalEvents,
  collectShisuiCalEvents,
  collectTakanezawaCalEvents,
  collectTatebayashiCalEvents,
  collectTochigiCityCalEvents,
  collectTochigiSakuraCalEvents,
  collectToneIbCalJsonEvents,
  collectUenoGunmaCalEvents,
  collectUshikuCalPhpEvents,
  collectUtsunomiyaCalEvents,
  collectYachiyoIbCalJsonEvents,
  // 低カバレッジ都道府県 追加
  // Phase 2: 28 municipal calendar collectors
  // Phase 3: Tier 1 viable endpoints
  // Phase 3: Tier 2 custom collectors
  // Phase 3: Tier 3 additional municipal-calendar
  // Phase 3: Tier 3 custom collectors
  // Phase 4: Under-50/M probe collectors
  ];
const getEvents = createGetEvents({
  CACHE_TTL_MS, cache, snapshotPath: SNAPSHOT_PATH,
  geoCache, geoCachePath: GEO_CACHE_PATH,
  collectors,
});

// --- Export for collect.js ---
module.exports = {
  collectors, geoCache, cache,
  GEO_CACHE_PATH, SNAPSHOT_PATH,
  REGION_GROUPS, PREF_CENTERS, buildSourceToPrefMap, _wardsExports,
};

// --- HTTP server (only when run directly) ---
if (require.main === module) {
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

    if (url.pathname === "/api/metadata") {
      if (!metadataCache) {
        metadataCache = {
          regions: REGION_GROUPS,
          pref_centers: PREF_CENTERS,
          source_to_pref: buildSourceToPrefMap(_wardsExports),
        };
      }
      sendJson(res, 200, metadataCache, req);
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

    // Serve static data files for local development (frontend fetches ./data/*.json)
    if (url.pathname === "/data/events.json") {
      const snapshot = cache.data || (() => {
        try { return JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf8")); } catch { return null; }
      })();
      if (snapshot) sendJson(res, 200, snapshot, req);
      else sendJson(res, 404, { error: "no data" }, req);
      return;
    }
    if (url.pathname === "/data/metadata.json") {
      if (!metadataCache) {
        metadataCache = {
          regions: REGION_GROUPS,
          pref_centers: PREF_CENTERS,
          source_to_pref: buildSourceToPrefMap(_wardsExports),
        };
      }
      sendJson(res, 200, metadataCache, req);
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
}

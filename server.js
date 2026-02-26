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
  createCollectMobaraEvents, createCollectTateyamaEvents,
  createCollectMinamibosoEvents, createCollectOamishirasatoEvents,
  createCollectShisuiEvents, createCollectKozakiEvents,
  createCollectTakoEvents, createCollectShibayamaEvents,
  createCollectMutsuzawaEvents, createCollectChoseiEvents,
  createCollectNagaraEvents, createCollectOnjukuEvents,
  createCollectChonanEvents, createCollectKimitsuKosodateEvents,
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
const { createCalPhpCollector } = require("./src/server/collectors/cal-php-collector");
const { createTottoriKosodateCollector } = require("./src/server/collectors/tottori-kosodate-collector");
const { createKyotoWakutobiCollector } = require("./src/server/collectors/kyoto-wakutobi-collector");
const { createAkitaKosodateCollector } = require("./src/server/collectors/akita-kosodate-collector");
const { createIkuchanCollector } = require("./src/server/collectors/ikuchan-collector");
const { createFukuikuCollector } = require("./src/server/collectors/fukuiku-collector");
const { createKochiKokohareCollector } = require("./src/server/collectors/kochi-kokohare-collector");
const { createMamafreCollector } = require("./src/server/collectors/mamafre-collector");
const { createHamamatsuOdpfCollector } = require("./src/server/collectors/hamamatsu-odpf-collector");
const { createSapporoKosodateCollector } = require("./src/server/collectors/sapporo-kosodate-collector");
const { createIkoyoCollector } = require("./src/server/collectors/ikoyo-collector");
const { createNaanaOitaCollector } = require("./src/server/collectors/naana-oita-collector");
const { createMiyazakiSukusukuCollector } = require("./src/server/collectors/miyazaki-sukusuku-collector");
const { createKumamotoKosodateCollector } = require("./src/server/collectors/kumamoto-kosodate-collector");
const { createEhimeKirakiraColl } = require("./src/server/collectors/ehime-kirakira-collector");
const { createMocoboxCollector } = require("./src/server/collectors/mocobox-collector");
const { createYamaguchiCalendarColl } = require("./src/server/collectors/yamaguchi-calendar-collector");
const { createNiigataKosodateColl } = require("./src/server/collectors/niigata-kosodate-collector");
const { createKagoshimaYumesukusukuColl } = require("./src/server/collectors/kagoshima-yumesukusuku-collector");
const { createIchinosekiCollector } = require("./src/server/collectors/ichinoseki-collector");
const { createSendaiJidoukanCollector } = require("./src/server/collectors/sendai-jidoukan-collector");
const { createTakamatsuMiraieCollector } = require("./src/server/collectors/takamatsu-miraie-collector");
const { createNaraSuperappCollector } = require("./src/server/collectors/nara-superapp-collector");
const { createYamagataSukusukuCollector } = require("./src/server/collectors/yamagata-sukusuku-collector");
const { createNaganoCheerfulCollector } = require("./src/server/collectors/nagano-cheerful-collector");
const { createFukuokaKodomoCollector } = require("./src/server/collectors/fukuoka-kodomo-collector");
const { createIshikawaOyacomiCollector } = require("./src/server/collectors/ishikawa-oyacomi-collector");
const { createOkinawaKosodateCollector } = require("./src/server/collectors/okinawa-kosodate-collector");
const { createHappymamaIshikawaCollector } = require("./src/server/collectors/happymama-ishikawa-collector");
const { createSagaKosodateCollector } = require("./src/server/collectors/saga-kosodate-collector");
const { createNagahapiCollector } = require("./src/server/collectors/nagahapi-collector");
const { createYamanashiPrefCollector } = require("./src/server/collectors/yamanashi-pref-collector");
const { createKitakyushuGenkinomoriCollector } = require("./src/server/collectors/kitakyushu-genkinomori-collector");
const { createOkayamaKosodateCollector } = require("./src/server/collectors/okayama-kosodate-collector");
const { createToyamaKosodateNetCollector } = require("./src/server/collectors/toyama-kosodate-net-collector");
const { createMarugameNetCollector } = require("./src/server/collectors/marugame-net-collector");
const { createMieKodomonoShiroCollector } = require("./src/server/collectors/mie-kodomono-shiro-collector");
const { createYokkaichiKodomoCollector } = require("./src/server/collectors/yokkaichi-kodomo-collector");
const { createHaguhaguYokoteCollector } = require("./src/server/collectors/haguhagu-yokote-collector");
const { createHappymamaToyamaCollector } = require("./src/server/collectors/happymama-toyama-collector");
const { createKumamotoKodomobunkaCollector } = require("./src/server/collectors/kumamoto-kodomobunka-collector");
const { createKodomoSmileCollector } = require("./src/server/collectors/kodomo-smile-collector");
const { createOsakaKosodatePlazaCollector } = require("./src/server/collectors/osaka-kosodate-plaza-collector");
const { createOsakaPlazaEmCollector } = require("./src/server/collectors/osaka-plaza-em-collector");
const { createNobisukuSendaiCollector } = require("./src/server/collectors/nobisuku-sendai-collector");
const { createMiyazakiSfjCollector } = require("./src/server/collectors/miyazaki-sfj-collector");
const { createKodomoMiraikanCollector } = require("./src/server/collectors/kodomo-miraikan-collector");
const { createPyontaCollector } = require("./src/server/collectors/pyonta-collector");
const { createSatsuibeCollector } = require("./src/server/collectors/satsuibe-collector");
const { createEhimeKodomonoShiroCollector } = require("./src/server/collectors/ehime-kodomono-shiro-collector");
const { createKobekkoCollector } = require("./src/server/collectors/kobekko-collector");
const { createHamamatsuPippiCollector } = require("./src/server/collectors/hamamatsu-pippi-collector");
const { createAngellandCollector } = require("./src/server/collectors/angelland-collector");
const { createOkinawaOkzmCollector } = require("./src/server/collectors/okinawa-okzm-collector");
const { createTottoriKodomonokuniCollector } = require("./src/server/collectors/tottori-kodomonokuni-collector");
const { createAsutamulandCollector } = require("./src/server/collectors/asutamuland-collector");
const { createAquatotoCollector } = require("./src/server/collectors/aquatoto-collector");
const { createKameyamaKosodateCollector } = require("./src/server/collectors/kameyama-kosodate-collector");
const {
  createCollectYachiyoIbEvents, createCollectGokaEvents, createCollectOaraiEvents,
  createCollectKawachiIbEvents, createCollectIbarakimachiEvents, createCollectKitaibarakiEvents,
  createCollectUshikuEvents, createCollectAmiEvents, createCollectToneIbEvents,
} = require("./src/server/collectors/ibaraki-extra");
const { createGetEvents } = require("./src/server/events-service");
const FACILITY_REGISTRY = require("./src/config/known-facilities");
const {
  CACHE_TTL_MS,
  AKISHIMA_SOURCE,
  HIGASHIYAMATO_SOURCE,
  KIYOSE_SOURCE,
  TAMA_SOURCE,
  INAGI_SOURCE,
  HINO_SOURCE,
  KOKUBUNJI_SOURCE,
  HIGASHIKURUME_SOURCE,
  SAGAMIHARA_SOURCE,
  EBINA_SOURCE,
  CHIGASAKI_SOURCE,
  ZAMA_SOURCE,
  ZUSHI_SOURCE,
  YAMATO_SOURCE,
  SAMUKAWA_SOURCE,
  AIKAWA_SOURCE,
  MIURA_SOURCE,
  OISO_SOURCE, HAYAMA_SOURCE, NAKAI_SOURCE, KIYOKAWA_SOURCE,
  OI_SOURCE, YUGAWARA_SOURCE,
  MANAZURU_SOURCE, OKUTAMA_SOURCE, NAGAREYAMA_SOURCE,
  URAYASU_SOURCE,
  NODA_SOURCE,
  NARASHINO_SOURCE,
  SHIROI_SOURCE, KISARAZU_SOURCE,
  ISUMI_SOURCE, TOHNOSHO_SOURCE, OTAKI_SOURCE,
  YACHIYO_SOURCE,
  ASAHI_SOURCE,
  KAMOGAWA_SOURCE,
  YOKOSHIBAHIKARI_SOURCE, KATSUURA_SOURCE, KIMITSU_SOURCE, KYONAN_SOURCE,
  ABIKO_SOURCE, KAMAGAYA_SOURCE,
  TOMISATO_SOURCE, SHIRAKO_SOURCE, KUJUKURI_SOURCE,
  YACHIMATA_SOURCE, SODEGAURA_SOURCE,
  ICHINOMIYA_SOURCE, SAKURA_SOURCE, FUTTSU_SOURCE, INZAI_SOURCE,
  KATORI_SOURCE, TOGANE_SOURCE, ICHIHARA_SOURCE,
  SOSA_SOURCE, SAMMU_SOURCE, SAKAE_CHIBA_SOURCE,
  TAKO_SOURCE, KAWAGUCHI_SOURCE, KASUKABE_SOURCE,
  FUJIMINO_SOURCE,
  MISATO_SOURCE,
  KAWAGOE_SOURCE,
  WAKO_SOURCE,
  WARABI_SOURCE,
  AGEO_SOURCE,
  NIIZA_SOURCE, ASAKA_SOURCE, TODA_SOURCE,
  SHIKI_SOURCE,
  FUJIMI_SOURCE,
  SAYAMA_SOURCE,
  YASHIO_SOURCE,
  TOKOROZAWA_SOURCE,
  KUKI_SOURCE,
  KUMAGAYA_SOURCE,
  KOUNOSU_SOURCE,
  SAKADO_SOURCE,
  HANNO_SOURCE,
  HIGASHIMATSUYAMA_SOURCE,
  GYODA_SOURCE,
  HONJO_SOURCE,
  HIDAKA_SOURCE,
  SHIRAOKA_SOURCE, SATTE_SOURCE,
  YORII_SOURCE, SUGITO_SOURCE,
  SOKA_SOURCE,
  TSURUGASHIMA_SOURCE,
  HASUDA_SOURCE,
  IRUMA_SOURCE,
  KAZO_SOURCE,
  FUKAYA_SOURCE, OKEGAWA_SOURCE,
  OGOSE_SOURCE, OGAWA_SOURCE, YOSHIMI_SOURCE, KAMIKAWA_SOURCE,
  KAMISATO_SOURCE,
  YOSHIKAWA_SOURCE,
  OGANO_SOURCE, HIGASHICHICHIBU_SOURCE,
  KAWAJIMA_SOURCE,
  KITAMOTO_SOURCE, INA_SAITAMA_SOURCE, YOKOZE_SOURCE,
  NAGATORO_SOURCE,
  MIYOSHI_SAITAMA_SOURCE,
  HATOYAMA_SOURCE,
  MIYASHIRO_SOURCE,
  CHICHIBU_SOURCE,
  NAMEGAWA_SOURCE, RANZAN_SOURCE, MATSUBUSHI_SOURCE,
  MINANO_SOURCE, MOROYAMA_SOURCE,
  HANYU_SOURCE, MISATO_SAITAMA_SOURCE,
  // Tochigi
  NIKKO_SOURCE, NASUSHIOBARA_SOURCE,
  YAITA_SOURCE,
  // Gunma
  MAEBASHI_SOURCE,
  TAKASAKI_SOURCE,
  ISESAKI_SOURCE,
  NAKANOJO_SOURCE,
  KIRYU_SOURCE,
  MEIWA_SOURCE,
  // Ibaraki
  HITACHI_IB_SOURCE,
  HITACHINAKA_SOURCE,
  TSUKUBA_SOURCE,
  MORIYA_SOURCE,
  KAMISU_SOURCE,
  TOKAI_IB_SOURCE,
  RYUGASAKI_SOURCE,
  CHIKUSEI_SOURCE,
  TSUCHIURA_SOURCE,
  ISHIOKA_SOURCE,
  JOSO_SOURCE,
  NAKA_IB_SOURCE,
  BANDO_SOURCE,
  HITACHIOTA_SOURCE,
  YUKI_SOURCE,
  TSUKUBAMIRAI_SOURCE,
  INASHIKI_SOURCE,
  SAKURAGAWA_SOURCE,
  HITACHIOMIYA_SOURCE,
  SHIMOTSUMA_SOURCE,
  HOKOTA_SOURCE,
  NAMEGATA_SOURCE,
  ITAKO_SOURCE,
  KASUMIGAURA_SOURCE,
  TAKAHAGI_SOURCE,
  KASAMA_SOURCE,
  SHIRO_IB_SOURCE,
  DAIGO_SOURCE,
  AMI_SOURCE,
  // 東北6県
  AOMORI_AOMORI_SOURCE, HACHINOHE_SOURCE, TSUGARU_SOURCE, YOMOGITA_SOURCE, ITAYANAGI_SOURCE,
  IWATE_ICHINOSEKI_SOURCE, MIYAGI_SENDAI_SOURCE, ISHINOMAKI_SOURCE, HIGASHIMATSUSHIMA_SOURCE, ZAO_SOURCE, SHICHIKASHUKU_SOURCE, SHICHIGAHAMA_SOURCE, TAIWA_SOURCE, NATORI_SOURCE, SHIOGAMA_SOURCE,
  AKITA_KOSODATE_SOURCE, YOKOTE_SOURCE, YURIHONJYO_SOURCE, HACHIROGATA_SOURCE,
  YONEZAWA_SOURCE, SAKATA_SOURCE, KAHOKU_SOURCE, OKURA_SOURCE, SHIRATAKA_SOURCE,
  FUKUSHIMA_KORIYAMA_SOURCE, SOMA_SOURCE, MINAMISOMA_SOURCE, OTAMA_SOURCE, AIZUMISATO_SOURCE, // 北海道
  HOKKAIDO_IWAMIZAWA_SOURCE, HOKKAIDO_SHIBETSU_SOURCE, HOKKAIDO_CHITOSE_SOURCE, HOKKAIDO_MORI_SOURCE, HOKKAIDO_TAIKI_SOURCE, HOKKAIDO_NISEKO_SOURCE, HOKKAIDO_HIGASHIKAGURA_SOURCE, HOKKAIDO_OTOINEPPU_SOURCE, HOKKAIDO_YUBETSU_SOURCE, HOKKAIDO_NAKASATSUNAI_SOURCE, HOKKAIDO_SARABETSU_SOURCE, HOKKAIDO_HIROO_SOURCE, HOKKAIDO_SHIKAOI_SOURCE, HOKKAIDO_AKKESHI_SOURCE, HOKKAIDO_BETSUKAI_SOURCE, HOKKAIDO_NAKASHIBETSU_SOURCE, HOKKAIDO_SHIBETSU_CHO_SOURCE, HOKKAIDO_SHINTOKU_SOURCE, HOKKAIDO_KUTCHAN_SOURCE, HOKKAIDO_HABORO_SOURCE,
  // 中部
  TOYAMA_KUROBE_SOURCE, FUKUI_FUKUIKU_SOURCE, FUKUI_SABAE_SOURCE, FUKUI_ANGELLAND_SOURCE, YAMANASHI_MINAMIALPS_SOURCE, YAMANASHI_HOKUTO_SOURCE, NAGANO_MATSUMOTO_SOURCE, GIFU_KAKAMIGAHARA_SOURCE, SHIZUOKA_FUJIEDA_SOURCE, SHIZUOKA_HAMAMATSU_SOURCE, SHIZUOKA_CITY_SOURCE, AICHI_SHINSHIRO_SOURCE, AICHI_OWARIASAHI_SOURCE, AICHI_NAGOYA_SOURCE, AICHI_TOYOTA_SOURCE, AICHI_KASUGAI_SOURCE, AICHI_ICHINOMIYA_SOURCE, GIFU_GIFU_SOURCE,
  // 近畿
  MIE_SUZUKA_SOURCE, MIE_TSU_SOURCE, SHIGA_OTSU_SOURCE, SHIGA_MORIYAMA_SOURCE, MIE_MEIWA_SOURCE, MIE_KAMEYAMA_KOSODATE_SOURCE, SHIGA_HIKONE_SOURCE, SHIGA_KOKA_SOURCE, SHIGA_MAIBARA_SOURCE, KYOTO_MAMAFRE_SOURCE, KYOTO_WAKUTOBI_SOURCE, KYOTO_KAMEOKA_SOURCE, KYOTO_UJI_SOURCE, KYOTO_MUKO_SOURCE, OSAKA_IZUMIOTSU_SOURCE, OSAKA_KAIZUKA_SOURCE, OSAKA_MORIGUCHI_SOURCE, OSAKA_IBARAKI_SOURCE, OSAKA_NEYAGAWA_SOURCE, OSAKA_IZUMI_SOURCE, OSAKA_FUJIIDERA_SOURCE, OSAKA_SENNAN_SOURCE, OSAKA_HANNAN_SOURCE, OSAKA_KUMATORI_SOURCE, OSAKA_TAKATSUKI_SOURCE, OSAKA_KISHIWADA_SOURCE, OSAKA_KAWACHINAGANO_SOURCE, OSAKA_TONDABAYASHI_SOURCE, OSAKA_SAKAI_SOURCE, OSAKA_SUITA_SOURCE, HYOGO_ASHIYA_SOURCE, HYOGO_ITAMI_SOURCE, HYOGO_KAKOGAWA_SOURCE, HYOGO_TATSUNO_SOURCE, HYOGO_SHISO_SOURCE, HYOGO_KATO_SOURCE, HYOGO_INAGAWA_SOURCE, NARA_KASHIHARA_SOURCE, NARA_GOJO_SOURCE, NARA_TAWARAMOTO_SOURCE, NARA_OJI_SOURCE, NARA_ASUKA_SOURCE, NARA_TOTSUKAWA_SOURCE, WAKAYAMA_HASHIMOTO_SOURCE, // 中国・四国
  TOTTORI_KOSODATE_SOURCE, TOTTORI_SAKAIMINATO_SOURCE, TOTTORI_KODOMONOKUNI_SOURCE, SHIMANE_AMA_SOURCE, OKAYAMA_MIMASAKA_SOURCE, OKAYAMA_HAYASHIMA_SOURCE, HIROSHIMA_HIROSHIMA_SOURCE, HIROSHIMA_IKUCHAN_SOURCE, HIROSHIMA_OTAKE_SOURCE, HIROSHIMA_HIGASHIHIROSHIMA_SOURCE, HIROSHIMA_FUKUYAMA_SOURCE, HIROSHIMA_KURE_SOURCE, HIROSHIMA_ONOMICHI_SOURCE, HIROSHIMA_MIHARA_SOURCE, HIROSHIMA_HATSUKAICHI_SOURCE, YAMAGUCHI_SHIMONOSEKI_SOURCE, YAMAGUCHI_YAMAGUCHI_SOURCE, YAMAGUCHI_SHUNAN_SOURCE, YAMAGUCHI_UBE_SOURCE, TOKUSHIMA_TOKUSHIMA_SOURCE, TOKUSHIMA_ASUTAMULAND_SOURCE, KAGAWA_TAKAMATSU_SOURCE, KAGAWA_TONOSHO_SOURCE, KAGAWA_MARUGAME_SOURCE, KAGAWA_SAKAIDE_SOURCE, EHIME_SEIYO_SOURCE, EHIME_NIIHAMA_SOURCE, EHIME_SAIJO_SOURCE, KOCHI_MUROTO_SOURCE, KOCHI_KOKOHARE_SOURCE,
  // 九州・沖縄
  FUKUOKA_KITAKYUSHU_SOURCE, FUKUOKA_FUKUTSU_SOURCE, FUKUOKA_SHINGU_FK_SOURCE, FUKUOKA_HIROKAWA_SOURCE, FUKUOKA_CHIKUSHINO_SOURCE, FUKUOKA_NAKAGAWA_SOURCE, NAGASAKI_NAGASAKI_SOURCE, NAGASAKI_IKI_SOURCE, NAGASAKI_SAIKAI_SOURCE, NAGASAKI_TOGITSU_SOURCE, SAGA_KARATSU_SOURCE, SAGA_TOSU_SOURCE, KUMAMOTO_TAKAMORI_SOURCE, KUMAMOTO_KIKUCHI_SOURCE, KUMAMOTO_KOSODATE_SOURCE, OITA_TAKETA_SOURCE, OITA_KITSUKI_SOURCE, OITA_KUSU_SOURCE, MIYAZAKI_SUKUSUKU_SOURCE, MIYAZAKI_KIJO_SOURCE, MIYAZAKI_KADOGAWA_SOURCE, MIYAZAKI_MIYAKOJIMA_SOURCE, KAGOSHIMA_SATSUMA_SOURCE, IKOYO_SOURCE, HOKKAIDO_SAPPORO_SOURCE, IWATE_MORIOKA_SOURCE, OITA_OITA_SOURCE, WAKAYAMA_WAKAYAMA_SOURCE, OKINAWA_NAHA_SOURCE, OKINAWA_KITANAKAGUSUKU_SOURCE, OKINAWA_IE_SOURCE, SHIZUOKA_ATAMI_SOURCE, SHIZUOKA_ITO_SOURCE, AICHI_KIYOSU_SOURCE, OKAYAMA_KIBICHUO_SOURCE, MIYAGI_SENDAI_JIDOUKAN_SOURCE, KAGAWA_TAKAMATSU_MIRAIE_SOURCE, OKAYAMA_KURASHIKI_SOURCE, TOYAMA_TOYAMA_SOURCE, YAMAGATA_YAMAGATA_SOURCE, ISHIKAWA_HAKUSAN_SOURCE, TOKYO_OTA_MAMAFRE_SOURCE, IBARAKI_KAMISU_MAMAFRE_SOURCE, NARA_SUPERAPP_SOURCE, YAMAGATA_SUKUSUKU_SOURCE, NAGANO_CHEERFUL_SOURCE, HOKKAIDO_KUSHIRO_SOURCE, HOKKAIDO_OBIHIRO_SOURCE, FUKUOKA_KODOMO_SOURCE, ISHIKAWA_OYACOMI_SOURCE, OKINAWA_KOSODATE_SOURCE, HAPPYMAMA_ISHIKAWA_SOURCE, SAGA_KOSODATE_SOURCE, NAGAHAPI_SOURCE, YAMANASHI_PREF_SOURCE, KITAKYUSHU_GENKINOMORI_SOURCE, OKAYAMA_KOSODATE_SOURCE, TOYAMA_KOSODATE_NET_SOURCE, MARUGAME_NET_SOURCE, MIE_KODOMONO_SHIRO_SOURCE, YOKKAICHI_KODOMO_SOURCE, FUKUSHIMA_SHIRAKAWA_SOURCE, YAMAGUCHI_IWAKUNI_SOURCE, YAMAGUCHI_SANYOONODA_SOURCE, KAGAWA_HIGASHIKAGAWA_SOURCE, EHIME_MOCOBOX_SOURCE, IWATE_PREF_SOURCE, IWATE_HANAMAKI_SOURCE, AKITA_HAGUHAGU_SOURCE, TOYAMA_HAPPYMAMA_SOURCE, KUMAMOTO_KODOMOBUNKA_SOURCE, KODOMO_SMILE_SOURCE, OSAKA_KOSODATE_PLAZA_SOURCE, OSAKA_PLAZA_EM_SOURCE, KOBEKKO_SOURCE, EHIME_KODOMONO_SHIRO_SOURCE, HAMAMATSU_PIPPI_SOURCE, NOBISUKU_SENDAI_SOURCE, MIYAZAKI_SFJ_SOURCE, KODOMO_MIRAIKAN_SOURCE, PYONTA_SOURCE, SATSUIBE_SOURCE, OKINAWA_OKZM_SOURCE,
  NAKADOMARI_SOURCE, MIE_IGA_SOURCE, KYOTO_YAWATA_SOURCE, NIIGATA_KAMO_SOURCE, NIIGATA_MINAMIUONUMA_SOURCE, FURUDONO_SOURCE, KOGA_IB_SOURCE, KYOTO_JOYO_SOURCE, OTSUCHI_SOURCE, MIYAZAKI_MIYAZAKI_SOURCE, MIE_OWASE_SOURCE, NARA_KORYO_SOURCE, NARA_GOSE_SOURCE, AICHI_AISAI_SOURCE, NARA_IKARUGA_SOURCE, SHINJO_SOURCE, OITA_HITA_SOURCE, AICHI_NISSHIN_SOURCE, SHIGA_HINO_SOURCE, MIE_KISOSAKI_SOURCE, GIFU_MOTOSU_SOURCE, TOKUSHIMA_HIGASHIMIYOSHI_SOURCE, OSAKA_HIGASHIOSAKA_SOURCE, NAGASAKI_HIGASHISONOGI_SOURCE, OSAKA_HIRAKATA_SOURCE, MITO_SOURCE, OSAKA_IKEDA_SOURCE, NAGANO_IKEDA_SOURCE, GIFU_KAIZU_SOURCE, NIIGATA_TSUBAME_SOURCE, NIIGATA_TAGAMI_SOURCE, HOKKAIDO_SHIRAOI_SOURCE, HYOGO_KAMIKAWA_SOURCE, HYOGO_FUKUSAKI_SOURCE, AICHI_INAZAWA_SOURCE, HYOGO_INAMI_SOURCE, KYOTO_SEIKA_SOURCE, KYOTO_AYABE_SOURCE, SHIGA_TOYOSATO_SOURCE, KANEYAMA_YM_SOURCE, ISHIKAWA_KANAZAWA_SOURCE, AICHI_AGUI_SOURCE, KASHIMA_IB_SOURCE,
  AICHI_CHIRYU_SOURCE, AICHI_NAGAKUTE_SOURCE, AKIRUNO_SOURCE, ANNAKA_SOURCE, ASHIKAGA_SOURCE, CHONAN_SOURCE, CHOSEI_SOURCE, FUCHU_SOURCE, HAGA_SOURCE, HOKKAIDO_HONBETSU_SOURCE, ICHIKAI_SOURCE, ISHIKAWA_NAKANOTO_SOURCE, KANRA_SOURCE, KAWACHI_IB_SOURCE, KOGANEI_SOURCE, MASHIKO_SOURCE, MINAMIBOSO_SOURCE, MOBARA_SOURCE, NAGANO_IIJIMACHO_SOURCE, NAGARA_SOURCE, NASUKARASUYAMA_SOURCE, NISHITOKYO_SOURCE, NUMATA_SOURCE, OAMISHIRASATO_SOURCE, OTA_GUNMA_SOURCE, SHIBAYAMA_SOURCE, SHIBUKAWA_SOURCE, SHIOYA_SOURCE, SHISUI_SOURCE, SHIZUOKA_KOSAI_SOURCE, SHIZUOKA_SUSONO_SOURCE, TAKANEZAWA_SOURCE, TATEBAYASHI_SOURCE, TOCHIGI_CITY_SOURCE, TOCHIGI_SAKURA_SOURCE, TONE_IB_SOURCE, TOYAMA_ASAHI_TY_SOURCE, TOYAMA_NAMERIKAWA_SOURCE, UENO_GUNMA_SOURCE, USHIKU_SOURCE, UTSUNOMIYA_SOURCE, WAKAYAMA_INAMI_WK_SOURCE, YACHIYO_IB_SOURCE,
  NIIGATA_CITY_KOSODATE_SOURCE, YAMAGUCHI_CALENDAR_SOURCE, EHIME_KIRAKIRA_SOURCE, KAGOSHIMA_YUMESUKUSUKU_SOURCE,
  NOGI_SOURCE, OYAMA_SOURCE, NAGASAKI_ISAHAYA_SOURCE, GIFU_AQUATOTO_SOURCE, GIFU_OGAKI_SOURCE, SHIMANE_MATSUE_SOURCE,
  CHILD_KW, IKOYO_CHILD_KW,
  REGION_GROUPS, PREF_CENTERS, buildSourceToPrefMap,
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
const collectNaritaEvents = createCollectNaritaEvents(geoFmDeps);
const collectChibaCityEvents = createCollectChibaEvents(geoFmDeps);
const collectChibaCityWardEvents = createCollectChibaCityWardEvents(geoFmDeps);
const collectKashiwaEvents = createCollectKashiwaEvents(geoFmDeps);
// --- 千葉県 municipal-calendar-collector ---
const collectYachiyoEvents = createMunicipalCalendarCollector({ source: YACHIYO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectAsahiEvents = createMunicipalCalendarCollector({ source: ASAHI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectKamogawaEvents = createMunicipalCalendarCollector({ source: KAMOGAWA_SOURCE, childCategoryIndex: null }, geoFmDeps);
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
const collectKatoriEvents = createListCalendarCollector({ source: KATORI_SOURCE, calendarPath: "/yotei/kosodate/calendar/", fallbackPath: "/yotei/calendar/" }, geoFmDeps);
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
const collectKasukabeEvents = createCalendarJsonCollector({ source: KASUKABE_SOURCE, childKeywords: ["健診", "相談", "教室", "広場", "サロン", "映画会", "工作", "イチゴ", "図書館", "子育て", "親子", "幼児", "乳幼児", "キッズ", "児童", "赤ちゃん", "おはなし"] }, geoFmDeps);
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
const collectShikiEvents = createMunicipalCalendarCollector({ source: SHIKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
// --- 埼玉県 list-calendar-collector ---
const collectFujimiEvents = createListCalendarCollector({ source: FUJIMI_SOURCE, calendarPath: "/event/naiyo/kodomo_kosodate/calendar/", fallbackPath: "/event/naiyo/calendar/" }, geoFmDeps);
const collectSayamaEvents = createListCalendarCollector({ source: SAYAMA_SOURCE, calendarPath: "/kankou/event/calendar/", fallbackPath: "/kankou/event/kyoiku/calendar/" }, geoFmDeps);
const collectYashioEvents = createListCalendarCollector({ source: YASHIO_SOURCE, calendarPath: "/event/kosodate/calendar/", fallbackPath: "/event/calendar/" }, geoFmDeps);
// --- 埼玉県 list-calendar-collector (追加) ---
const collectTokorozawaEvents = createListCalendarCollector({ source: TOKOROZAWA_SOURCE, calendarPath: "/iitokoro/event/main/kodomo/calendar/", fallbackPath: "/iitokoro/event/main/calendar/" }, geoFmDeps);
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
const collectHigashimatsuyamaEvents = createMunicipalCalendarCollector({ source: HIGASHIMATSUYAMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
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
const collectIrumaEvents = createCalendarJsonCollector({ source: IRUMA_SOURCE, jsonPath: "/cgi-bin/get_event_calendar.php", childEventTypeNo: 1, childKeywords: CHILD_KW }, geoFmDeps);
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
const collectIsesakiEvents = createCalendarJsonCollector({ source: ISESAKI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
const collectFujiokaGunmaEvents = createCollectFujiokaGunmaKosodateEvents(geoFmDeps); // calendar.jsonに子育てイベントなし→kosodate
// --- 群馬県 municipal-calendar-collector ---
const collectTakasakiEvents = createMunicipalCalendarCollector({ source: TAKASAKI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectOtaGunmaEvents = createCollectOtaGunmaKosodateEvents(geoFmDeps); // calendarに子育てイベントなし→kosodate
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
const collectTsuchiuraEvents = createCalPhpCollector({ source: TSUCHIURA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
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
// Tier1: CGI calendar (取手市) - ward-generic経由
// Tier2: 水戸市 + 鹿嶋市 (カスタムPHP) + 笠間市 (cal.php)
const collectKasamaEvents = createCalPhpCollector({ source: KASAMA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW, calPath: "/cal.php" }, geoFmDeps);
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
// --- 東北6県 ---
// 青森県
const collectAomoriAomoriEvents = createEventJsCollector({ source: AOMORI_AOMORI_SOURCE, jsFile: "event.js", childCategoryIds: ["110"], useKeywordFilter: false }, geoFmDeps);
const collectHachinoheEvents = createCalendarJsonCollector({ source: HACHINOHE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectTsugaruEvents = createCalendarJsonCollector({ source: TSUGARU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectYomogitaEvents = createMunicipalCalendarCollector({ source: YOMOGITA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectItayanagiEvents = createEventJsCollector({ source: ITAYANAGI_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 岩手県
const collectIchinosekiEvents = createIchinosekiCollector({ source: IWATE_ICHINOSEKI_SOURCE }, geoFmDeps);
const collectIwateMoriokaEvents = createEventJsCollector({ source: IWATE_MORIOKA_SOURCE, jsFile: "event_data.js", childCategoryIds: ["7"], useKeywordFilter: false }, geoFmDeps);
const collectIwatePrefEvents = createEventJsCollector({ source: IWATE_PREF_SOURCE, jsFile: "event_d.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectIwateHanamakiEvents = createEventJsCollector({ source: IWATE_HANAMAKI_SOURCE, jsFile: "event_d.js", childCategoryIds: ["10"], useKeywordFilter: true }, geoFmDeps);
// 宮城県
const collectMiyagiSendaiEvents = createMamafreCollector({ source: MIYAGI_SENDAI_SOURCE, mamafre_base: "https://sendai-city.mamafre.jp", pref: "宮城県", city: "仙台市" }, geoFmDeps);
const collectSendaiJidoukanEvents = createSendaiJidoukanCollector({ source: MIYAGI_SENDAI_JIDOUKAN_SOURCE }, geoFmDeps);
const collectIshinomakiEvents = createMunicipalCalendarCollector({ source: ISHINOMAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHigashimatsushimaEvents = createListCalendarCollector({ source: HIGASHIMATSUSHIMA_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectZaoEvents = createListCalendarCollector({ source: ZAO_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectShichikashukuEvents = createMunicipalCalendarCollector({ source: SHICHIKASHUKU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShichigahamaEvents = createMunicipalCalendarCollector({ source: SHICHIGAHAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTaiwaEvents = createCalendarJsonCollector({ source: TAIWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNatoriEvents = createMunicipalCalendarCollector({ source: NATORI_SOURCE, childCategoryIndex: 2, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShiogamaEvents = createMunicipalCalendarCollector({ source: SHIOGAMA_SOURCE, childCategoryIndex: 1 }, geoFmDeps);
// 秋田県
const collectAkitaKosodateEvents = createAkitaKosodateCollector({ source: AKITA_KOSODATE_SOURCE }, geoFmDeps);
const collectYokoteEvents = createMunicipalCalendarCollector({ source: YOKOTE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYurihonjyoEvents = createMunicipalCalendarCollector({ source: YURIHONJYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHachirogataEvents = createMunicipalCalendarCollector({ source: HACHIROGATA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHaguhaguYokoteEvents = createHaguhaguYokoteCollector({ source: AKITA_HAGUHAGU_SOURCE }, geoFmDeps);
// 山形県
const collectYonezawaEvents = createCalendarJsonCollector({ source: YONEZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectSakataEvents = createEventJsCollector({ source: SAKATA_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectKahokuEvents = createCalendarJsonCollector({ source: KAHOKU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkuraEvents = createCalendarJsonCollector({ source: OKURA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShiratakaEvents = createMunicipalCalendarCollector({ source: SHIRATAKA_SOURCE, calendarPath: "/miryoku/event/kosodate/calendar/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 福島県
const collectFukushimaKoriyamaEvents = createMunicipalCalendarCollector({ source: FUKUSHIMA_KORIYAMA_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectFukushimaShirakawaEvents = createCalPhpCollector({ source: FUKUSHIMA_SHIRAKAWA_SOURCE, category: 7 }, geoFmDeps);
const collectSomaEvents = createCalendarJsonCollector({ source: SOMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMinamisomaEvents = createCalendarJsonCollector({ source: MINAMISOMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOtamaEvents = createMunicipalCalendarCollector({ source: OTAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAizumisatoEvents = createCalendarJsonCollector({ source: AIZUMISATO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);

// --- Child keyword constants (add after other CHILD_KW definitions) ---

// --- Collector instantiation ---
// 北海道
// 北海道
const collectHokkaidoIwamizawaEvents = createCalendarJsonCollector({ source: HOKKAIDO_IWAMIZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoShibetsuEvents = createCalendarJsonCollector({ source: HOKKAIDO_SHIBETSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoChitoseEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_CHITOSE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoMoriEvents = createCalendarJsonCollector({ source: HOKKAIDO_MORI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoTaikiEvents = createCalendarJsonCollector({ source: HOKKAIDO_TAIKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoNisekoEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_NISEKO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoHigashikaguraEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_HIGASHIKAGURA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoOtoineppuEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_OTOINEPPU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoYubetsuEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_YUBETSU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoNakasatsunaiEvents = createCalPhpCollector({ source: HOKKAIDO_NAKASATSUNAI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoSarabetsuEvents = createCalPhpCollector({ source: HOKKAIDO_SARABETSU_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoHirooEvents = createCalPhpCollector({ source: HOKKAIDO_HIROO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoShikaoiEvents = createCalPhpCollector({ source: HOKKAIDO_SHIKAOI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoAkkeshiEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_AKKESHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoBetsukaiEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_BETSUKAI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoNakashibetsuEvents = createCalPhpCollector({ source: HOKKAIDO_NAKASHIBETSU_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoShibetsuChoEvents = createCalPhpCollector({ source: HOKKAIDO_SHIBETSU_CHO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoShintokuEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_SHINTOKU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoKutchanEvents = createEventJsCollector({ source: HOKKAIDO_KUTCHAN_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoHaboroEvents = createCalPhpCollector({ source: HOKKAIDO_HABORO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// 中部
// 新潟県
const collectNiigataCityKosodateEvents = createNiigataKosodateColl({ source: NIIGATA_CITY_KOSODATE_SOURCE }, geoFmDeps);
// 富山県
const collectToyamaKurobeEvents = createEventJsCollector({ source: TOYAMA_KUROBE_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 石川県
// 福井県
const collectFukuiFukuikuEvents = createFukuikuCollector({ source: FUKUI_FUKUIKU_SOURCE }, geoFmDeps);
const collectFukuiSabaeEvents = createListCalendarCollector({ source: FUKUI_SABAE_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectFukuiAngellandEvents = createAngellandCollector({ source: FUKUI_ANGELLAND_SOURCE }, geoFmDeps);
// 山梨県
const collectYamanashiMinamialpsEvents = createMunicipalCalendarCollector({ source: YAMANASHI_MINAMIALPS_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYamanashiHokutoEvents = createMunicipalCalendarCollector({ source: YAMANASHI_HOKUTO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 長野県
const collectNaganoMatsumotoEvents = createMunicipalCalendarCollector({ source: NAGANO_MATSUMOTO_SOURCE, childCategoryIndex: 3, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 岐阜県
// Dead: Kakamigahara event_j.js 404 (2026-02)
// 静岡県
const collectShizuokaHamamatsuEvents = createHamamatsuOdpfCollector({ source: SHIZUOKA_HAMAMATSU_SOURCE }, geoFmDeps);
const collectShizuokaCityEvents = createMamafreCollector({ source: SHIZUOKA_CITY_SOURCE, mamafre_base: "https://shizuoka-city.mamafre.jp", pref: "静岡県", city: "静岡市" }, geoFmDeps);
// 愛知県
const collectAichiShinshiroEvents = createListCalendarCollector({ source: AICHI_SHINSHIRO_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectAichiOwariasahiEvents = createMunicipalCalendarCollector({ source: AICHI_OWARIASAHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectAichiNagoyaEvents = createEventJsCollector({ source: AICHI_NAGOYA_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: true }, geoFmDeps);
const collectAichiToyotaEvents = createEventJsCollector({ source: AICHI_TOYOTA_SOURCE, jsFile: "event_d.js", childCategoryIds: ["10"], useKeywordFilter: true }, geoFmDeps);
const collectAichiKasugaiEvents = createEventJsCollector({ source: AICHI_KASUGAI_SOURCE, jsFile: "event.js", childCategoryIds: ["5"], useKeywordFilter: true }, geoFmDeps);
const collectAichiIchinomiyaEvents = createEventJsCollector({ source: AICHI_ICHINOMIYA_SOURCE, jsFile: "event_data.js", childCategoryIds: ["6"], useKeywordFilter: true }, geoFmDeps);
// Dead: Gifu event_j.js 404 (2026-02)

// 近畿
// 滋賀県(mamafre)
const collectShigaOtsuEvents = createMamafreCollector({ source: SHIGA_OTSU_SOURCE, mamafre_base: "https://otsu-city.mamafre.jp", pref: "滋賀県", city: "大津市" }, geoFmDeps);
const collectShigaMoriyamaEvents = createMamafreCollector({ source: SHIGA_MORIYAMA_SOURCE, mamafre_base: "https://moriyama-city.mamafre.jp", pref: "滋賀県", city: "守山市" }, geoFmDeps);
// 三重県
// Dead: Suzuka/Tsu event_j.js 404, Meiwa calendar.json 404 (2026-02)
// 滋賀県
const collectShigaHikoneEvents = createCalendarJsonCollector({ source: SHIGA_HIKONE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShigaKokaEvents = createMunicipalCalendarCollector({ source: SHIGA_KOKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaMaibaraEvents = createCalendarJsonCollector({ source: SHIGA_MAIBARA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 京都府
const collectKyotoMamafreEvents = createMamafreCollector({ source: KYOTO_MAMAFRE_SOURCE, mamafre_base: "https://kyoto-city.mamafre.jp", pref: "京都府", city: "京都市" }, geoFmDeps);
const collectKyotoWakutobiEvents = createKyotoWakutobiCollector({ source: KYOTO_WAKUTOBI_SOURCE }, geoFmDeps);
const collectKyotoKameokaEvents = createMunicipalCalendarCollector({ source: KYOTO_KAMEOKA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectKyotoUjiEvents = createMunicipalCalendarCollector({ source: KYOTO_UJI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKyotoMukoEvents = createMunicipalCalendarCollector({ source: KYOTO_MUKO_SOURCE, childCategoryIndex: 3 }, geoFmDeps);
// 大阪府
const collectOsakaIzumiotsuEvents = createCalendarJsonCollector({ source: OSAKA_IZUMIOTSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaKaizukaEvents = createCalendarJsonCollector({ source: OSAKA_KAIZUKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaMoriguchiEvents = createCalendarJsonCollector({ source: OSAKA_MORIGUCHI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaIbarakiEvents = createCalendarJsonCollector({ source: OSAKA_IBARAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaNeyagawaEvents = createCalendarJsonCollector({ source: OSAKA_NEYAGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaIzumiEvents = createCalendarJsonCollector({ source: OSAKA_IZUMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaFujiideraEvents = createCalendarJsonCollector({ source: OSAKA_FUJIIDERA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaSennanEvents = createCalendarJsonCollector({ source: OSAKA_SENNAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaHannanEvents = createCalendarJsonCollector({ source: OSAKA_HANNAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaKumatoriEvents = createCalendarJsonCollector({ source: OSAKA_KUMATORI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaTakatsukiEvents = createMunicipalCalendarCollector({ source: OSAKA_TAKATSUKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaKishiwadaEvents = createMunicipalCalendarCollector({ source: OSAKA_KISHIWADA_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectOsakaKawachinaganoEvents = createMunicipalCalendarCollector({ source: OSAKA_KAWACHINAGANO_SOURCE, childCategoryIndex: 4 }, geoFmDeps);
const collectOsakaTondabayashiEvents = createMunicipalCalendarCollector({ source: OSAKA_TONDABAYASHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaSuitaEvents = createMamafreCollector({ source: OSAKA_SUITA_SOURCE, mamafre_base: "https://suita-city.mamafre.jp", pref: "大阪府", city: "吹田市" }, geoFmDeps);
const collectOsakaSakaiEvents = createListCalendarCollector({ source: OSAKA_SAKAI_SOURCE, calendarPath: "/shievent/kosodate/calendar/" }, geoFmDeps);
// 兵庫県
const collectHyogoAshiyaEvents = createMamafreCollector({ source: HYOGO_ASHIYA_SOURCE, mamafre_base: "https://ashiya-city.mamafre.jp", pref: "兵庫県", city: "芦屋市" }, geoFmDeps);
const collectHyogoItamiEvents = createCalendarJsonCollector({ source: HYOGO_ITAMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoKakogawaEvents = createCalendarJsonCollector({ source: HYOGO_KAKOGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoTatsunoEvents = createCalendarJsonCollector({ source: HYOGO_TATSUNO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoShisoEvents = createCalendarJsonCollector({ source: HYOGO_SHISO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoKatoEvents = createCalendarJsonCollector({ source: HYOGO_KATO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoInagawaEvents = createCalendarJsonCollector({ source: HYOGO_INAGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 奈良県
const collectNaraKashiharaEvents = createCalendarJsonCollector({ source: NARA_KASHIHARA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraGojoEvents = createCalendarJsonCollector({ source: NARA_GOJO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraTawaramotoEvents = createCalendarJsonCollector({ source: NARA_TAWARAMOTO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraOjiEvents = createCalendarJsonCollector({ source: NARA_OJI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraAsukaEvents = createMunicipalCalendarCollector({ source: NARA_ASUKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraTotsukawaEvents = createCalPhpCollector({ source: NARA_TOTSUKAWA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 和歌山県
const collectWakayamaWakayamaEvents = createEventJsCollector({ source: WAKAYAMA_WAKAYAMA_SOURCE, jsFile: "event_d.js", childCategoryIds: ["4"], useKeywordFilter: true }, geoFmDeps);
const collectWakayamaHashimotoEvents = createCalendarJsonCollector({ source: WAKAYAMA_HASHIMOTO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);

// 中国・四国
// 鳥取県
const collectTottoriKosodateEvents = createTottoriKosodateCollector({ source: TOTTORI_KOSODATE_SOURCE }, geoFmDeps);
const collectTottoriSakaiminatoEvents = createEventJsCollector({ source: TOTTORI_SAKAIMINATO_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 鳥取砂丘こどもの国
const collectTottoriKodomonokuniEvents = createTottoriKodomonokuniCollector({ source: TOTTORI_KODOMONOKUNI_SOURCE }, { resolveEventPoint, resolveEventAddress });
// 岡山県
const collectOkayamaMimasakaEvents = createCalendarJsonCollector({ source: OKAYAMA_MIMASAKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkayamaHayashimaEvents = createCalendarJsonCollector({ source: OKAYAMA_HAYASHIMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 広島県
const collectHiroshimaHiroshimaEvents = createEventJsCollector({ source: HIROSHIMA_HIROSHIMA_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: false }, geoFmDeps);
const collectHiroshimaIkuchanEvents = createIkuchanCollector({ source: HIROSHIMA_IKUCHAN_SOURCE }, geoFmDeps);
const collectHiroshimaOtakeEvents = createCalendarJsonCollector({ source: HIROSHIMA_OTAKE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHiroshimaHigashihiroshimaEvents = createCalendarJsonCollector({ source: HIROSHIMA_HIGASHIHIROSHIMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHiroshimaFukuyamaEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_FUKUYAMA_SOURCE, childCategoryIndex: 8 }, geoFmDeps);
const collectHiroshimaOnomichiEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_ONOMICHI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectHiroshimaHatsukaichiEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_HATSUKAICHI_SOURCE, childCategoryIndex: 3 }, geoFmDeps);
// 山口県
const collectYamaguchiShimonosekiEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_SHIMONOSEKI_SOURCE, childCategoryIndex: 2 }, geoFmDeps);
const collectYamaguchiYamaguchiEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_YAMAGUCHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYamaguchiShunanEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_SHUNAN_SOURCE, childCategoryIndex: 4 }, geoFmDeps);
const collectYamaguchiIwakuniEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_IWAKUNI_SOURCE, childCategoryIndex: 1 }, geoFmDeps);
const collectYamaguchiSanyoonodaEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_SANYOONODA_SOURCE, childCategoryIndex: 1 }, geoFmDeps);
const collectYamaguchiUbeEvents = createEventJsCollector({ source: YAMAGUCHI_UBE_SOURCE, jsFile: "event.js", childCategoryIds: ["50"], useKeywordFilter: false }, geoFmDeps);
const collectYamaguchiCalendarEvents = createYamaguchiCalendarColl({ source: YAMAGUCHI_CALENDAR_SOURCE }, geoFmDeps);
// 徳島県
const collectTokushimaTokushimaEvents = createListCalendarCollector({ source: TOKUSHIMA_TOKUSHIMA_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectAsutamulandEvents = createAsutamulandCollector({ source: TOKUSHIMA_ASUTAMULAND_SOURCE }, { resolveEventPoint, resolveEventAddress });
// 香川県
const collectKagawaTakamatsuEvents = createListCalendarCollector({ source: KAGAWA_TAKAMATSU_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectKagawaTonoshoEvents = createCalendarJsonCollector({ source: KAGAWA_TONOSHO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagawaMarugameEvents = createMunicipalCalendarCollector({ source: KAGAWA_MARUGAME_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKagawaSakaideEvents = createMunicipalCalendarCollector({ source: KAGAWA_SAKAIDE_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKagawaHigashikagawaEvents = createCalendarJsonCollector({ source: KAGAWA_HIGASHIKAGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 愛媛県
const collectEhimeSeiyoEvents = createCalendarJsonCollector({ source: EHIME_SEIYO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectEhimeNiihamaEvents = createMunicipalCalendarCollector({ source: EHIME_NIIHAMA_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectEhimeSaijoEvents = createMunicipalCalendarCollector({ source: EHIME_SAIJO_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectEhimeKirakiraEvents = createEhimeKirakiraColl({ source: EHIME_KIRAKIRA_SOURCE }, geoFmDeps);
const collectMocoboxEvents = createMocoboxCollector({ source: EHIME_MOCOBOX_SOURCE }, geoFmDeps);
// 高知県
const collectKochiKokohareEvents = createKochiKokohareCollector({ source: KOCHI_KOKOHARE_SOURCE }, geoFmDeps);

// 九州・沖縄
// 福岡県
const collectFukuokaKitakyushuEvents = createMamafreCollector({ source: FUKUOKA_KITAKYUSHU_SOURCE, mamafre_base: "https://kitakyushu-city.mamafre.jp", pref: "福岡県", city: "北九州市" }, geoFmDeps);
const collectFukuokaFukutsuEvents = createCalendarJsonCollector({ source: FUKUOKA_FUKUTSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaShinguFkEvents = createCalendarJsonCollector({ source: FUKUOKA_SHINGU_FK_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaHirokawaEvents = createCalendarJsonCollector({ source: FUKUOKA_HIROKAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaChikushinoEvents = createMunicipalCalendarCollector({ source: FUKUOKA_CHIKUSHINO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectFukuokaNakagawaEvents = createMunicipalCalendarCollector({ source: FUKUOKA_NAKAGAWA_SOURCE, childCategoryIndex: 1 }, geoFmDeps);
// 長崎県
const collectNagasakiNagasakiEvents = createMunicipalCalendarCollector({ source: NAGASAKI_NAGASAKI_SOURCE, childCategoryIndex: 5, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagasakiIkiEvents = createCalendarJsonCollector({ source: NAGASAKI_IKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiSaikaiEvents = createCalendarJsonCollector({ source: NAGASAKI_SAIKAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiTogitsuEvents = createCalendarJsonCollector({ source: NAGASAKI_TOGITSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 佐賀県
const collectSagaTosuEvents = createMunicipalCalendarCollector({ source: SAGA_TOSU_SOURCE, childCategoryIndex: 1 }, geoFmDeps);
// 熊本県
const collectKumamotoKosodateEvents = createKumamotoKosodateCollector({ source: KUMAMOTO_KOSODATE_SOURCE }, geoFmDeps);
// 大分県
const collectOitaTaketaEvents = createCalendarJsonCollector({ source: OITA_TAKETA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOitaKitsukiEvents = createCalendarJsonCollector({ source: OITA_KITSUKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOitaKusuEvents = createCalendarJsonCollector({ source: OITA_KUSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 宮崎県
const collectMiyazakiSukusukuEvents = createMiyazakiSukusukuCollector({ source: MIYAZAKI_SUKUSUKU_SOURCE }, geoFmDeps);
const collectMiyazakiKijoEvents = createCalendarJsonCollector({ source: MIYAZAKI_KIJO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMiyazakiKadogawaEvents = createCalPhpCollector({ source: MIYAZAKI_KADOGAWA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMiyazakiMiyakojoEvents = createMunicipalCalendarCollector({ source: MIYAZAKI_MIYAKOJIMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 鹿児島県
const collectKagoshimaSatsumaEvents = createCalendarJsonCollector({ source: KAGOSHIMA_SATSUMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagoshimaYumesukusukuEvents = createKagoshimaYumesukusukuColl({ source: KAGOSHIMA_YUMESUKUSUKU_SOURCE }, geoFmDeps);
// 沖縄県
const collectOkinawaKitanakagusukuEvents = createCalendarJsonCollector({ source: OKINAWA_KITANAKAGUSUKU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkinawaIeEvents = createEventJsCollector({ source: OKINAWA_IE_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectOkinawaNahaEvents = createEventJsCollector({ source: OKINAWA_NAHA_SOURCE, jsFile: "event.js", childCategoryIds: ["50"], useKeywordFilter: false }, geoFmDeps);
// 追加ママフレ都市
// 高松市こども未来館 (JSON API)
const collectTakamatsuMiraieEvents = createTakamatsuMiraieCollector({ source: KAGAWA_TAKAMATSU_MIRAIE_SOURCE }, geoFmDeps);
// 倉敷市・富山市・山形市・白山市 (event.js)
const collectOkayamaKurashikiEvents = createEventJsCollector({ source: OKAYAMA_KURASHIKI_SOURCE, jsFile: "event.js", childCategoryIds: [], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectToyamaToyamaEvents = createEventJsCollector({ source: TOYAMA_TOYAMA_SOURCE, jsFile: "event.js", childCategoryIds: [], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYamagataYamagataEvents = createEventJsCollector({ source: YAMAGATA_YAMAGATA_SOURCE, jsFile: "event.js", childCategoryIds: [], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectIshikawaHakusanEvents = createEventJsCollector({ source: ISHIKAWA_HAKUSAN_SOURCE, jsFile: "event.js", childCategoryIds: ["70"], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShizuokaAtamiEvents = createMamafreCollector({ source: SHIZUOKA_ATAMI_SOURCE, mamafre_base: "https://atami-city.mamafre.jp", pref: "静岡県", city: "熱海市" }, geoFmDeps);
const collectShizuokaItoEvents = createMamafreCollector({ source: SHIZUOKA_ITO_SOURCE, mamafre_base: "https://ito-city.mamafre.jp", pref: "静岡県", city: "伊東市" }, geoFmDeps);
const collectAichiKiyosuEvents = createMamafreCollector({ source: AICHI_KIYOSU_SOURCE, mamafre_base: "https://kiyosu-city.mamafre.jp", pref: "愛知県", city: "清須市" }, geoFmDeps);
const collectOkayamaKibichuoEvents = createMamafreCollector({ source: OKAYAMA_KIBICHUO_SOURCE, mamafre_base: "https://kibichuo-town.mamafre.jp", pref: "岡山県", city: "吉備中央町" }, geoFmDeps);
const collectTokyoOtaMamafreEvents = createMamafreCollector({ source: TOKYO_OTA_MAMAFRE_SOURCE, mamafre_base: "https://tokyo-ota-city.mamafre.jp", pref: "東京都", city: "大田区" }, geoFmDeps);
const collectIbarakiKamisuMamafreEvents = createMamafreCollector({ source: IBARAKI_KAMISU_MAMAFRE_SOURCE, mamafre_base: "https://kamisu-city.mamafre.jp", pref: "茨城県", city: "神栖市" }, geoFmDeps);
const collectShizuokaFujiedaMamafreEvents = createMamafreCollector({ source: SHIZUOKA_FUJIEDA_SOURCE, mamafre_base: "https://fujieda-city.mamafre.jp", pref: "静岡県", city: "藤枝市" }, geoFmDeps);
// 北海道 event.js追加
const collectHokkaidoKushiroEvents = createEventJsCollector({ source: HOKKAIDO_KUSHIRO_SOURCE, jsFile: "event.js", childCategoryIds: ["20"], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoObihiroEvents = createEventJsCollector({ source: HOKKAIDO_OBIHIRO_SOURCE, jsFile: "event.js", childCategoryIds: ["60", "110"], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 秋田 横手市 event.js (municipal-calendarに加えて)
const collectYokoteEventJsEvents = createEventJsCollector({ source: YOKOTE_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// いしかわ おやコミ！
const collectIshikawaOyacomiEvents = createIshikawaOyacomiCollector({ source: ISHIKAWA_OYACOMI_SOURCE }, geoFmDeps);
// おきなわ子育て応援パスポート
const collectOkinawaKosodateEvents = createOkinawaKosodateCollector({ source: OKINAWA_KOSODATE_SOURCE }, geoFmDeps);
// 福岡市子ども情報
const collectFukuokaKodomoEvents = createFukuokaKodomoCollector({ source: FUKUOKA_KODOMO_SOURCE }, geoFmDeps);
// はっぴーママいしかわ
const collectHappymamaIshikawaEvents = createHappymamaIshikawaCollector({ source: HAPPYMAMA_ISHIKAWA_SOURCE }, geoFmDeps);
// 子育てし大県"さが"
const collectSagaKosodateEvents = createSagaKosodateCollector({ source: SAGA_KOSODATE_SOURCE }, geoFmDeps);
// ながはぴ（長崎子育てココロンネット）
const collectNagahapiEvents = createNagahapiCollector({ source: NAGAHAPI_SOURCE }, geoFmDeps);
// 山梨県CGIカレンダー
const collectYamanashiPrefEvents = createYamanashiPrefCollector({ source: YAMANASHI_PREF_SOURCE }, geoFmDeps);
// 北九州市元気のもり
const collectKitakyushuGenkinomoriEvents = createKitakyushuGenkinomoriCollector({ source: KITAKYUSHU_GENKINOMORI_SOURCE }, geoFmDeps);
// 岡山市こそだてぽけっと
const collectOkayamaKosodateEvents = createOkayamaKosodateCollector({ source: OKAYAMA_KOSODATE_SOURCE }, geoFmDeps);
// 富山県子育てネッ!とやま
const collectToyamaKosodateNetEvents = createToyamaKosodateNetCollector({ source: TOYAMA_KOSODATE_NET_SOURCE }, geoFmDeps);
const collectToyamaHappymamaEvents = createHappymamaToyamaCollector({ source: TOYAMA_HAPPYMAMA_SOURCE }, geoFmDeps);
// まるがめ子育て応援 (Kagawa)
const collectMarugameNetEvents = createMarugameNetCollector({ source: MARUGAME_NET_SOURCE }, geoFmDeps);
// みえこどもの城 (Mie)
const collectMieKodomonoShiroEvents = createMieKodomonoShiroCollector({ source: MIE_KODOMONO_SHIRO_SOURCE }, geoFmDeps);
// 四日市こどもポータル (Mie)
const collectYokkaichiKodomoEvents = createYokkaichiKodomoCollector({ source: YOKKAICHI_KODOMO_SOURCE }, geoFmDeps);
// 亀山市 子育てゆうゆう (Mie, WP calendar, ~41 events/month)
const collectKameyamaKosodateEvents = createKameyamaKosodateCollector({ source: MIE_KAMEYAMA_KOSODATE_SOURCE }, { resolveEventPoint, resolveEventAddress });
// 奈良スーパーアプリ
const collectNaraSuperappEvents = createNaraSuperappCollector({ source: NARA_SUPERAPP_SOURCE }, geoFmDeps);
// 山形市 元気すくすくネット
const collectYamagataSukusukuEvents = createYamagataSukusukuCollector({ source: YAMAGATA_SUKUSUKU_SOURCE }, geoFmDeps);
// チアフルながの
const collectNaganoCheerfulEvents = createNaganoCheerfulCollector({ source: NAGANO_CHEERFUL_SOURCE }, geoFmDeps);
// 熊本市こども文化会館
const collectKumamotoKodomobunkaEvents = createKumamotoKodomobunkaCollector({ source: KUMAMOTO_KODOMOBUNKA_SOURCE }, geoFmDeps);
// こどもスマイルムーブメント (東京都)
const collectKodomoSmileEvents = createKodomoSmileCollector({ source: KODOMO_SMILE_SOURCE }, geoFmDeps);
// 大阪子ども子育てプラザ
const collectOsakaKosodatePlazaEvents = createOsakaKosodatePlazaCollector({ source: OSAKA_KOSODATE_PLAZA_SOURCE }, geoFmDeps);
// 大阪市プラザ17区 (WP Events Manager AJAX)
const collectOsakaPlazaEmEvents = createOsakaPlazaEmCollector({ source: OSAKA_PLAZA_EM_SOURCE }, { resolveEventPoint, resolveEventAddress });
// のびすく仙台 (5施設)
const collectNobisukuSendaiEvents = createNobisukuSendaiCollector({ source: NOBISUKU_SENDAI_SOURCE }, geoFmDeps);
// 宮崎市児童館SFJ (9施設)
const collectMiyazakiSfjEvents = createMiyazakiSfjCollector({ source: MIYAZAKI_SFJ_SOURCE }, geoFmDeps);
// 富山県こどもみらい館
const collectKodomoMiraikanEvents = createKodomoMiraikanCollector({ source: KODOMO_MIRAIKAN_SOURCE }, geoFmDeps);
// 5-Daysこども文化科学館 (広島)
const collectPyontaEvents = createPyontaCollector({ source: PYONTA_SOURCE }, geoFmDeps);
// サツイベ (札幌)
const collectSatsuibeEvents = createSatsuibeCollector({ source: SATSUIBE_SOURCE }, geoFmDeps);
// えひめこどもの城
const collectEhimeKodomonoShiroEvents = createEhimeKodomonoShiroCollector({ source: EHIME_KODOMONO_SHIRO_SOURCE }, { resolveEventPoint, resolveEventAddress });
// こべっこランド (神戸)
const collectKobekkoEvents = createKobekkoCollector({ source: KOBEKKO_SOURCE }, { resolveEventPoint, resolveEventAddress });
// 浜松ぴっぴ (子育て情報サイト)
const collectHamamatsuPippiEvents = createHamamatsuPippiCollector({ source: HAMAMATSU_PIPPI_SOURCE }, geoFmDeps);
// 沖縄こどもの国 (Okinawa Zoo & Museum)
const collectOkinawaOkzmEvents = createOkinawaOkzmCollector({ source: OKINAWA_OKZM_SOURCE }, geoFmDeps);
// いこーよ (47都道府県を12分割 — 各4県、45sタイムアウト内に収める)
// いこーよ (47都道府県を12分割 — 各4県、45sタイムアウト内に収める)
// childKeywords 省略: いこーよは子育て専門ポータルなので全イベント採用
const collectIkoyo01 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [1,2,3,4] }, geoFmDeps);
const collectIkoyo02 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [5,6,7,8] }, geoFmDeps);
const collectIkoyo03 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [9,10,11,12] }, geoFmDeps);
const collectIkoyo04 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [13,14,15,16] }, geoFmDeps);
const collectIkoyo05 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [17,18,19,20] }, geoFmDeps);
const collectIkoyo06 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [21,22,23,24] }, geoFmDeps);
const collectIkoyo07 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [25,26,27,28] }, geoFmDeps);
const collectIkoyo08 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [29,30,31,32] }, geoFmDeps);
const collectIkoyo09 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [33,34,35,36] }, geoFmDeps);
const collectIkoyo10 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [37,38,39,40] }, geoFmDeps);
const collectIkoyo11 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [41,42,43,44] }, geoFmDeps);
const collectIkoyo12 = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: [45,46,47] }, geoFmDeps);
// 札幌市 (SMART CMS API)
const collectHokkaidoSapporoEvents = createSapporoKosodateCollector({ source: HOKKAIDO_SAPPORO_SOURCE }, geoFmDeps);
// 大分市 (naana)
const collectOitaOitaEvents = createNaanaOitaCollector({ source: OITA_OITA_SOURCE }, geoFmDeps);

const collectAdditionalWardsEvents = createCollectAdditionalWardsEvents({
  collectChuoAkachanTengokuEvents,
  collectKitaJidokanEvents,
  collectWardGenericEvents,
});

// --- Events service ---
// --- Newly discovered alive endpoints ---
const collectAichiChiryuEvents = createMunicipalCalendarCollector({ source: AICHI_CHIRYU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiNagakuteEvents = createMunicipalCalendarCollector({ source: AICHI_NAGAKUTE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAkirunoEvents = createMunicipalCalendarCollector({ source: AKIRUNO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectFuchuEvents = createMunicipalCalendarCollector({ source: FUCHU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoHonbetsuEvents = createCalendarJsonCollector({ source: HOKKAIDO_HONBETSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectIshikawaNakanotoEvents = createMunicipalCalendarCollector({ source: ISHIKAWA_NAKANOTO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKoganeiEvents = createMunicipalCalendarCollector({ source: KOGANEI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaganoIijimachoEvents = createMunicipalCalendarCollector({ source: NAGANO_IIJIMACHO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNishitokyoEvents = createMunicipalCalendarCollector({ source: NISHITOKYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShizuokaKosaiEvents = createMunicipalCalendarCollector({ source: SHIZUOKA_KOSAI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShizuokaSusonoEvents = createMunicipalCalendarCollector({ source: SHIZUOKA_SUSONO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectToyamaAsahiTyEvents = createMunicipalCalendarCollector({ source: TOYAMA_ASAHI_TY_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectToyamaNamerikawaEvents = createMunicipalCalendarCollector({ source: TOYAMA_NAMERIKAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectWakayamaInamiWkEvents = createMunicipalCalendarCollector({ source: WAKAYAMA_INAMI_WK_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// --- Revived collectors (alternative CMS paths) ---
const collectNakadomariEvents = createMunicipalCalendarCollector({ source: NAKADOMARI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoYawataEvents = createMunicipalCalendarCollector({ source: KYOTO_YAWATA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataKamoEvents = createMunicipalCalendarCollector({ source: NIIGATA_KAMO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataMinamiuonumaEvents = createMunicipalCalendarCollector({ source: NIIGATA_MINAMIUONUMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectFurudonoEvents = createMunicipalCalendarCollector({ source: FURUDONO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKogaIbEvents = createMunicipalCalendarCollector({ source: KOGA_IB_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoJoyoEvents = createMunicipalCalendarCollector({ source: KYOTO_JOYO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOtsuchiEvents = createMunicipalCalendarCollector({ source: OTSUCHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMiyazakiMiyazakiEvents = createMunicipalCalendarCollector({ source: MIYAZAKI_MIYAZAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraKoryoEvents = createMunicipalCalendarCollector({ source: NARA_KORYO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraGoseEvents = createMunicipalCalendarCollector({ source: NARA_GOSE_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiAisaiEvents = createMunicipalCalendarCollector({ source: AICHI_AISAI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraIkarugaEvents = createMunicipalCalendarCollector({ source: NARA_IKARUGA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShinjoEvents = createMunicipalCalendarCollector({ source: SHINJO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOitaHitaEvents = createMunicipalCalendarCollector({ source: OITA_HITA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiNisshinEvents = createMunicipalCalendarCollector({ source: AICHI_NISSHIN_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaHinoEvents = createMunicipalCalendarCollector({ source: SHIGA_HINO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOsakaHigashiosakaEvents = createMunicipalCalendarCollector({ source: OSAKA_HIGASHIOSAKA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagasakiHigashisonogiEvents = createMunicipalCalendarCollector({ source: NAGASAKI_HIGASHISONOGI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagasakiIsahayaEvents = createMunicipalCalendarCollector({ source: NAGASAKI_ISAHAYA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOsakaHirakataEvents = createMunicipalCalendarCollector({ source: OSAKA_HIRAKATA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMitoEvents = createMunicipalCalendarCollector({ source: MITO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOsakaIkedaEvents = createMunicipalCalendarCollector({ source: OSAKA_IKEDA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaganoIkedaEvents = createMunicipalCalendarCollector({ source: NAGANO_IKEDA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataTsubameEvents = createMunicipalCalendarCollector({ source: NIIGATA_TSUBAME_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataTagamiEvents = createMunicipalCalendarCollector({ source: NIIGATA_TAGAMI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoShiraoiEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_SHIRAOI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoKamikawaEvents = createMunicipalCalendarCollector({ source: HYOGO_KAMIKAWA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoFukusakiEvents = createMunicipalCalendarCollector({ source: HYOGO_FUKUSAKI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiInazawaEvents = createMunicipalCalendarCollector({ source: AICHI_INAZAWA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoInamiEvents = createMunicipalCalendarCollector({ source: HYOGO_INAMI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoSeikaEvents = createMunicipalCalendarCollector({ source: KYOTO_SEIKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoAyabeEvents = createMunicipalCalendarCollector({ source: KYOTO_AYABE_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaToyosatoEvents = createMunicipalCalendarCollector({ source: SHIGA_TOYOSATO_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKaneyamaYmEvents = createMunicipalCalendarCollector({ source: KANEYAMA_YM_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectIshikawaKanazawaEvents = createMunicipalCalendarCollector({ source: ISHIKAWA_KANAZAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiAguiEvents = createMunicipalCalendarCollector({ source: AICHI_AGUI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKashimaIbEvents = createMunicipalCalendarCollector({ source: KASHIMA_IB_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// --- Supplemental CMS collectors (endpoint migration) ---
const collectAmiCalEvents = createMunicipalCalendarCollector({ source: AMI_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAnnakaCalEvents = createMunicipalCalendarCollector({ source: ANNAKA_SOURCE, calendarPath: "/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAshikagaCalEvents = createMunicipalCalendarCollector({ source: ASHIKAGA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectChonanCalEvents = createMunicipalCalendarCollector({ source: CHONAN_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
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

// 岐阜県: 大垣市子育て支援サイト (calendar.json, 全イベント子育て関連)
const collectGifuOgakiEvents = createCalendarJsonCollector({ source: GIFU_OGAKI_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// 岐阜県: アクア・トト ぎふ (WP REST API + detail, ~15 events/month)
const collectAquatotoEvents = createAquatotoCollector({ source: GIFU_AQUATOTO_SOURCE }, { resolveEventPoint, resolveEventAddress });
// 島根県: 松江市 (calendar.json)

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
  collectFunabashiEvents,
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
  collectSaitamaJidoukanEvents,
  collectSaitamaHokenEvents,
  collectKoshigayaEvents,
  collectKoshigayaKosodateEvents,
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
  collectAkirunoEvents,
  collectFuchuEvents,
  collectKoganeiEvents,
  collectNishitokyoEvents,
  // Tochigi
  collectSanoEvents, collectNikkoEvents, collectMokaEvents, collectNasushiobaraEvents,
  collectTochigiCityEvents, collectYaitaEvents, collectUtsunomiyaEvents, collectAshikagaEvents,
  collectKanumaEvents, collectOyamaEvents, collectOhtawaraEvents, collectTochigiSakuraEvents,
  collectNasukarasuyamaEvents, collectShimotsukeEvents, collectKaminokawaEvents, collectMashikoEvents,
  collectMotegiEvents, collectIchikaiEvents, collectHagaEvents, collectMibuEvents,
  collectNogiEvents, collectShioyaEvents, collectTakanezawaEvents, collectNasuEvents, collectTochigiNakagawaEvents,
  // Gunma
  collectMaebashiEvents, collectIsesakiEvents, collectFujiokaGunmaEvents, collectTakasakiEvents,
  collectOtaGunmaEvents, collectAnnakaEvents, collectNakanojoEvents, collectKiryuEvents,
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
  // Ibaraki
  collectHitachiIbEvents, collectHitachinakaEvents, collectMoriyaEvents, collectKamisuEvents,
  collectTokaiIbEvents, collectTsukubaEvents,
  collectChikuseiEvents,
  collectShimotsumaEvents,
  collectKasumigauraEvents, collectTakahagiEvents,
  collectYachiyoIbEvents, collectGokaEvents, collectOaraiEvents, collectKawachiIbEvents,
  collectIbarakimachiEvents, collectKitaibarakiEvents, collectUshikuEvents, collectAmiEvents, collectToneIbEvents,
  collectTsuchiuraEvents,
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
  collectMitoEvents,
  collectKashimaIbEvents,
  // 東北6県
  collectAomoriAomoriEvents, collectHachinoheEvents, collectTsugaruEvents,
  collectIchinosekiEvents, collectIwateMoriokaEvents, collectIwatePrefEvents, collectIwateHanamakiEvents,
  collectMiyagiSendaiEvents, collectSendaiJidoukanEvents, collectNobisukuSendaiEvents, collectTaiwaEvents, collectNatoriEvents, collectShiogamaEvents,
  collectAkitaKosodateEvents, collectYokoteEventJsEvents, collectHaguhaguYokoteEvents,
  collectYamagataYamagataEvents, collectYamagataSukusukuEvents, collectYonezawaEvents, collectKahokuEvents, collectOkuraEvents, collectFukushimaKoriyamaEvents, collectFukushimaShirakawaEvents, collectSomaEvents, collectMinamisomaEvents, collectAizumisatoEvents,
  collectYomogitaEvents,
  collectItayanagiEvents,
  collectHigashimatsushimaEvents,
  collectZaoEvents,
  collectIshinomakiEvents,
  collectShichikashukuEvents,
  collectYokoteEvents,
  collectYurihonjyoEvents,
  collectShichigahamaEvents,
  collectHachirogataEvents,
  collectSakataEvents,
  collectShiratakaEvents,
  collectOtamaEvents,
  collectFurudonoEvents,
  collectOtsuchiEvents,
  collectShinjoEvents,
  collectKaneyamaYmEvents,
  collectNakadomariEvents,
  // 北海道
  collectHokkaidoIwamizawaEvents, collectHokkaidoShibetsuEvents, collectHokkaidoMoriEvents, collectHokkaidoTaikiEvents, collectHokkaidoSapporoEvents, collectSatsuibeEvents, collectHokkaidoKushiroEvents, collectHokkaidoObihiroEvents,
  collectHokkaidoChitoseEvents,
  collectHokkaidoHigashikaguraEvents,
  collectHokkaidoNakasatsunaiEvents,
  collectHokkaidoNisekoEvents,
  collectHokkaidoYubetsuEvents,
  collectHokkaidoOtoineppuEvents,
  collectHokkaidoSarabetsuEvents,
  collectHokkaidoHirooEvents,
  collectHokkaidoBetsukaiEvents,
  collectHokkaidoShibetsuChoEvents,
  collectHokkaidoShikaoiEvents,
  collectHokkaidoNakashibetsuEvents,
  collectHokkaidoShintokuEvents,
  collectHokkaidoHaboroEvents,
  collectHokkaidoKutchanEvents,
  collectHokkaidoAkkeshiEvents,
  collectHokkaidoShiraoiEvents,
  collectHokkaidoHonbetsuEvents,
  // 中部
  collectFukuiFukuikuEvents,
  collectShizuokaHamamatsuEvents, collectHamamatsuPippiEvents, collectShizuokaCityEvents,
  collectAichiNagoyaEvents, collectAichiToyotaEvents, collectAichiKasugaiEvents, collectAichiIchinomiyaEvents,
  collectNiigataCityKosodateEvents, collectToyamaToyamaEvents, collectToyamaKosodateNetEvents, collectToyamaHappymamaEvents, collectKodomoMiraikanEvents, collectIshikawaHakusanEvents, collectIshikawaOyacomiEvents, collectHappymamaIshikawaEvents, collectNaganoCheerfulEvents, collectYamanashiPrefEvents,
  collectToyamaKurobeEvents,
  collectYamanashiMinamialpsEvents,
  collectFukuiSabaeEvents, collectFukuiAngellandEvents,
  collectYamanashiHokutoEvents,
  collectAichiShinshiroEvents,
  collectNaganoMatsumotoEvents,
  collectAichiOwariasahiEvents,
  collectNiigataKamoEvents,
  collectNiigataMinamiuonumaEvents,
  collectAichiAisaiEvents,
  collectAichiNisshinEvents,
  collectGifuOgakiEvents,
  collectAquatotoEvents,
  collectNaganoIkedaEvents,
  collectNiigataTsubameEvents,
  collectNiigataTagamiEvents,
  collectAichiInazawaEvents,
  collectIshikawaKanazawaEvents,
  collectAichiAguiEvents,
  collectAichiChiryuEvents,
  collectAichiNagakuteEvents,
  collectIshikawaNakanotoEvents,
  collectNaganoIijimachoEvents,
  collectShizuokaKosaiEvents,
  collectShizuokaSusonoEvents,
  collectToyamaAsahiTyEvents,
  collectToyamaNamerikawaEvents,
  // 近畿
  collectShigaOtsuEvents, collectShigaMoriyamaEvents, collectMieKodomonoShiroEvents, collectYokkaichiKodomoEvents, collectKameyamaKosodateEvents, collectShigaHikoneEvents, collectShigaMaibaraEvents, collectKyotoMamafreEvents, collectKyotoWakutobiEvents, collectKyotoKameokaEvents, collectKyotoUjiEvents, collectOsakaIzumiotsuEvents, collectOsakaKaizukaEvents, collectOsakaMoriguchiEvents, collectOsakaIbarakiEvents, collectOsakaNeyagawaEvents, collectOsakaIzumiEvents, collectOsakaFujiideraEvents, collectOsakaSennanEvents, collectOsakaHannanEvents, collectOsakaKumatoriEvents, collectOsakaTakatsukiEvents, collectOsakaKishiwadaEvents, collectOsakaKawachinaganoEvents, collectOsakaSakaiEvents, collectOsakaSuitaEvents, collectOsakaKosodatePlazaEvents, collectOsakaPlazaEmEvents, collectKobekkoEvents, collectHyogoAshiyaEvents, collectHyogoItamiEvents, collectHyogoKakogawaEvents, collectHyogoTatsunoEvents, collectHyogoShisoEvents, collectHyogoKatoEvents, collectHyogoInagawaEvents, collectNaraKashiharaEvents, collectNaraGojoEvents, collectNaraTawaramotoEvents, collectNaraOjiEvents, collectNaraSuperappEvents, collectWakayamaWakayamaEvents, collectWakayamaHashimotoEvents,
  collectKyotoMukoEvents,
  collectShigaKokaEvents,
  collectOsakaTondabayashiEvents,
  collectNaraAsukaEvents,
  collectNaraTotsukawaEvents,
  collectKyotoYawataEvents,
  collectKyotoJoyoEvents,
  collectNaraKoryoEvents,
  collectNaraGoseEvents,
  collectNaraIkarugaEvents,
  collectShigaHinoEvents,
  collectOsakaHigashiosakaEvents,
  collectOsakaHirakataEvents,
  collectOsakaIkedaEvents,
  collectHyogoKamikawaEvents,
  collectHyogoFukusakiEvents,
  collectHyogoInamiEvents,
  collectKyotoSeikaEvents,
  collectKyotoAyabeEvents,
  collectShigaToyosatoEvents,
  collectWakayamaInamiWkEvents,
  // 中国・四国
  collectTottoriKosodateEvents, collectOkayamaKurashikiEvents, collectOkayamaMimasakaEvents, collectOkayamaHayashimaEvents, collectHiroshimaHiroshimaEvents, collectHiroshimaIkuchanEvents, collectPyontaEvents, collectHiroshimaOtakeEvents, collectHiroshimaHigashihiroshimaEvents, collectHiroshimaFukuyamaEvents, collectHiroshimaOnomichiEvents, collectHiroshimaHatsukaichiEvents, collectYamaguchiShimonosekiEvents, collectYamaguchiShunanEvents, collectYamaguchiIwakuniEvents, collectYamaguchiSanyoonodaEvents, collectYamaguchiUbeEvents, collectYamaguchiCalendarEvents, collectTokushimaTokushimaEvents, collectAsutamulandEvents, collectKagawaTakamatsuEvents, collectTakamatsuMiraieEvents, collectKagawaTonoshoEvents, collectKagawaMarugameEvents, collectKagawaSakaideEvents, collectKagawaHigashikagawaEvents, collectMarugameNetEvents, collectEhimeSeiyoEvents, collectEhimeNiihamaEvents, collectEhimeSaijoEvents, collectEhimeKirakiraEvents, collectMocoboxEvents, collectEhimeKodomonoShiroEvents, collectKochiKokohareEvents, collectOkayamaKosodateEvents,
  collectTottoriSakaiminatoEvents,
  collectTottoriKodomonokuniEvents,
  collectYamaguchiYamaguchiEvents,
  // 九州・沖縄
  collectFukuokaKitakyushuEvents, collectFukuokaKodomoEvents, collectKitakyushuGenkinomoriEvents, collectFukuokaFukutsuEvents, collectFukuokaShinguFkEvents, collectFukuokaHirokawaEvents, collectFukuokaNakagawaEvents, collectNagasakiNagasakiEvents, collectNagahapiEvents, collectNagasakiIkiEvents, collectNagasakiSaikaiEvents, collectNagasakiTogitsuEvents, collectSagaTosuEvents, collectSagaKosodateEvents, collectKumamotoKosodateEvents, collectKumamotoKodomobunkaEvents, collectOitaTaketaEvents, collectOitaKitsukiEvents, collectOitaKusuEvents, collectOitaOitaEvents, collectMiyazakiSukusukuEvents, collectMiyazakiSfjEvents, collectMiyazakiKijoEvents, collectMiyazakiMiyakojoEvents, collectKagoshimaSatsumaEvents, collectKagoshimaYumesukusukuEvents, collectOkinawaNahaEvents, collectOkinawaKosodateEvents, collectOkinawaKitanakagusukuEvents, collectOkinawaOkzmEvents, collectShizuokaAtamiEvents, collectShizuokaItoEvents, collectAichiKiyosuEvents, collectOkayamaKibichuoEvents, collectTokyoOtaMamafreEvents, collectIbarakiKamisuMamafreEvents, collectShizuokaFujiedaMamafreEvents, collectFukuokaChikushinoEvents, collectOkinawaIeEvents, collectMiyazakiKadogawaEvents, collectMiyazakiMiyazakiEvents, collectOitaHitaEvents, collectNagasakiHigashisonogiEvents, collectNagasakiIsahayaEvents,   // Supplemental CMS collectors
  collectAmiCalEvents,
  collectAnnakaCalEvents,
  collectAshikagaCalEvents,
  collectChonanCalEvents,
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
  collectIkoyo01, collectIkoyo02, collectIkoyo03, collectIkoyo04,
  collectIkoyo05, collectIkoyo06, collectIkoyo07, collectIkoyo08,
  collectIkoyo09, collectIkoyo10, collectIkoyo11, collectIkoyo12];
const getEvents = createGetEvents({
  CACHE_TTL_MS, cache, snapshotPath: SNAPSHOT_PATH,
  geoCache, geoCachePath: GEO_CACHE_PATH,
  collectors,
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

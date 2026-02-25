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
const { createCollectMitoEvents, createCollectKashimaIbEvents } = require("./src/server/collectors/ibaraki-remaining");
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
  KUNITACHI_SOURCE,
  OME_SOURCE,
  HAMURA_SOURCE,
  SAGAMIHARA_SOURCE,
  EBINA_SOURCE,
  KAMAKURA_SOURCE,
  YOKOSUKA_SOURCE,
  CHIGASAKI_SOURCE,
  ZAMA_SOURCE,
  ZUSHI_SOURCE,
  YAMATO_SOURCE,
  HIRATSUKA_SOURCE,
  ODAWARA_SOURCE,
  HADANO_SOURCE,
  AYASE_SOURCE,
  ATSUGI_SOURCE,
  ISEHARA_SOURCE,
  MINAMIASHIGARA_SOURCE,
  SAMUKAWA_SOURCE,
  AIKAWA_SOURCE,
  MIURA_SOURCE,
  OISO_SOURCE, HAYAMA_SOURCE, KAISEI_SOURCE, YAMAKITA_SOURCE,
  FUJISAWA_SOURCE,
  NAKAI_SOURCE, KIYOKAWA_SOURCE,
  NINOMIYA_SOURCE,
  OI_SOURCE, YUGAWARA_SOURCE,
  MATSUDA_SOURCE, MANAZURU_SOURCE, HAKONE_SOURCE,
  OKUTAMA_SOURCE, HINODE_SOURCE, HINOHARA_SOURCE,
  NAGAREYAMA_SOURCE,
  URAYASU_SOURCE,
  NODA_SOURCE,
  NARASHINO_SOURCE,
  SHIROI_SOURCE, KISARAZU_SOURCE,
  ISUMI_SOURCE, TOHNOSHO_SOURCE, OTAKI_SOURCE,
  FUNABASHI_SOURCE,
  NARITA_SOURCE,
  CHIBA_CITY_SOURCE,
  KASHIWA_SOURCE,
  YACHIYO_SOURCE,
  ASAHI_SOURCE,
  KAMOGAWA_SOURCE,
  YOKOSHIBAHIKARI_SOURCE, ICHIKAWA_SOURCE,
  KATSUURA_SOURCE, KIMITSU_SOURCE, KYONAN_SOURCE,
  YOTSUKAIDO_SOURCE, MATSUDO_SOURCE,
  ABIKO_SOURCE, KAMAGAYA_SOURCE,
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
  SAITAMA_CITY_SOURCE,
  KOSHIGAYA_SOURCE,
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
  SANO_SOURCE, NIKKO_SOURCE, MOKA_SOURCE, NASUSHIOBARA_SOURCE,
  TOCHIGI_CITY_SOURCE, YAITA_SOURCE,
  // Gunma
  MAEBASHI_SOURCE,
  TAKASAKI_SOURCE,
  ISESAKI_SOURCE,
  OTA_GUNMA_SOURCE,
  FUJIOKA_GUNMA_SOURCE,
  ANNAKA_SOURCE,
  NAKANOJO_SOURCE,
  KIRYU_SOURCE,
  NUMATA_SOURCE,
  TATEBAYASHI_SOURCE,
  SHIBUKAWA_SOURCE,
  TOMIOKA_SOURCE,
  MIDORI_SOURCE,
  SHINTO_SOURCE,
  YOSHIOKA_SOURCE,
  UENO_GUNMA_SOURCE,
  KANNA_SOURCE,
  SHIMONITA_SOURCE,
  NANMOKU_SOURCE,
  KANRA_SOURCE,
  NAGANOHARA_SOURCE,
  TSUMAGOI_SOURCE,
  KUSATSU_SOURCE,
  TAKAYAMA_GUNMA_SOURCE,
  HIGASHIAGATSUMA_SOURCE,
  KATASHINA_SOURCE,
  KAWABA_SOURCE,
  SHOWA_GUNMA_SOURCE,
  MINAKAMI_SOURCE,
  TAMAMURA_SOURCE,
  ITAKURA_SOURCE,
  MEIWA_SOURCE,
  CHIYODA_GUNMA_SOURCE,
  OIZUMI_SOURCE,
  ORA_SOURCE,
  // Ibaraki
  MITO_SOURCE,
  HITACHI_IB_SOURCE,
  HITACHINAKA_SOURCE,
  TSUKUBA_SOURCE,
  KOGA_IB_SOURCE,
  MORIYA_SOURCE,
  KAMISU_SOURCE,
  TOKAI_IB_SOURCE,
  TORIDE_SOURCE,
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
  KASHIMA_IB_SOURCE,
  KASAMA_SOURCE,
  SHIRO_IB_SOURCE,
  SAKAI_IB_SOURCE,
  DAIGO_SOURCE,
  YACHIYO_IB_SOURCE,
  GOKA_SOURCE,
  OARAI_SOURCE,
  KAWACHI_IB_SOURCE,
  IBARAKIMACHI_SOURCE,
  KITAIBARAKI_SOURCE,
  USHIKU_SOURCE,
  AMI_SOURCE,
  TONE_IB_SOURCE,
  // 東北6県
  AOMORI_AOMORI_SOURCE, HACHINOHE_SOURCE, TSUGARU_SOURCE, HIRANAI_SOURCE, NAKADOMARI_SOURCE, YOMOGITA_SOURCE, ITAYANAGI_SOURCE,
  IWATE_ICHINOSEKI_SOURCE, KITAKAMI_SOURCE, KUJI_SOURCE, OSHU_SOURCE, NISHIWAGA_SOURCE, ICHINOHE_SOURCE, OTSUCHI_SOURCE,
  MIYAGI_SENDAI_SOURCE, ISHINOMAKI_SOURCE, HIGASHIMATSUSHIMA_SOURCE, ZAO_SOURCE, SHICHIKASHUKU_SOURCE, SHICHIGAHAMA_SOURCE, TAIWA_SOURCE, SHIKAMA_SOURCE, NATORI_SOURCE, SHIOGAMA_SOURCE,
  AKITA_KOSODATE_SOURCE, YOKOTE_SOURCE, YURIHONJYO_SOURCE, OGA_SOURCE, KOSAKA_SOURCE, HACHIROGATA_SOURCE,
  YONEZAWA_SOURCE, SAKATA_SOURCE, SHINJO_SOURCE, NAGAI_SOURCE, NAKAYAMA_YM_SOURCE, KAHOKU_SOURCE, ASAHI_YM_SOURCE, KANEYAMA_YM_SOURCE, MAMUROGAWA_SOURCE, OKURA_SOURCE, SHIRATAKA_SOURCE,
  FUKUSHIMA_CITY_SOURCE, FUKUSHIMA_KORIYAMA_SOURCE, SOMA_SOURCE, MINAMISOMA_SOURCE, OTAMA_SOURCE, SHIMOGO_SOURCE, AIZUMISATO_SOURCE, FURUDONO_SOURCE,
  // 北海道
  HOKKAIDO_IWAMIZAWA_SOURCE, HOKKAIDO_SHIBETSU_SOURCE, HOKKAIDO_CHITOSE_SOURCE, HOKKAIDO_MORI_SOURCE, HOKKAIDO_OZORA_SOURCE, HOKKAIDO_TSUBETSU_SOURCE, HOKKAIDO_TAIKI_SOURCE, HOKKAIDO_NISEKO_SOURCE, HOKKAIDO_SHIRAOI_SOURCE, HOKKAIDO_HIGASHIKAGURA_SOURCE, HOKKAIDO_OTOINEPPU_SOURCE, HOKKAIDO_YUBETSU_SOURCE, HOKKAIDO_NAKASATSUNAI_SOURCE, HOKKAIDO_SARABETSU_SOURCE, HOKKAIDO_HONBETSU_SOURCE, HOKKAIDO_HIROO_SOURCE, HOKKAIDO_SHIKAOI_SOURCE, HOKKAIDO_AKKESHI_SOURCE, HOKKAIDO_BETSUKAI_SOURCE, HOKKAIDO_NAKASHIBETSU_SOURCE, HOKKAIDO_SHIBETSU_CHO_SOURCE, HOKKAIDO_SHINTOKU_SOURCE, HOKKAIDO_KUTCHAN_SOURCE, HOKKAIDO_HABORO_SOURCE,
  // 中部
  NIIGATA_SANJO_SOURCE, NIIGATA_KASHIWAZAKI_SOURCE, NIIGATA_TSUBAME_SOURCE, NIIGATA_AGANO_SOURCE, NIIGATA_SEIRO_SOURCE, NIIGATA_YUZAWA_SOURCE, NIIGATA_KAMO_SOURCE, NIIGATA_MINAMIUONUMA_SOURCE, NIIGATA_TAGAMI_SOURCE, TOYAMA_HIMI_SOURCE, TOYAMA_NAMERIKAWA_SOURCE, TOYAMA_KUROBE_SOURCE, TOYAMA_NYUZEN_SOURCE, TOYAMA_ASAHI_TY_SOURCE, ISHIKAWA_KANAZAWA_SOURCE, ISHIKAWA_KOMATSU_SOURCE, ISHIKAWA_KAGA_SOURCE, ISHIKAWA_NAKANOTO_SOURCE, FUKUI_FUKUIKU_SOURCE, FUKUI_SABAE_SOURCE, YAMANASHI_CHUO_SOURCE, YAMANASHI_MINAMIALPS_SOURCE, YAMANASHI_HOKUTO_SOURCE, NAGANO_MATSUMOTO_SOURCE, NAGANO_SUZAKA_SOURCE, NAGANO_KOMAGANE_SOURCE, NAGANO_CHIKUMA_SOURCE, NAGANO_IIJIMACHO_SOURCE, NAGANO_MATSUKAWA_SOURCE, NAGANO_IKEDA_SOURCE, GIFU_OGAKI_SOURCE, GIFU_SEKI_SOURCE, GIFU_ENA_SOURCE, GIFU_MOTOSU_SOURCE, GIFU_KAIZU_SOURCE, GIFU_ANPACHI_SOURCE, GIFU_IBIGAWA_SOURCE, GIFU_ONO_GF_SOURCE, GIFU_KAKAMIGAHARA_SOURCE, SHIZUOKA_FUJIEDA_SOURCE, SHIZUOKA_SUSONO_SOURCE, SHIZUOKA_KOSAI_SOURCE, SHIZUOKA_IZU_SOURCE, SHIZUOKA_OMAEZAKI_SOURCE, SHIZUOKA_NAGAIZUMI_SOURCE, SHIZUOKA_KANNAMI_SOURCE, SHIZUOKA_HAMAMATSU_SOURCE, SHIZUOKA_CITY_SOURCE, AICHI_TOYOKAWA_SOURCE, AICHI_HEKINAN_SOURCE, AICHI_SHINSHIRO_SOURCE, AICHI_CHIRYU_SOURCE, AICHI_INAZAWA_SOURCE, AICHI_IWAKURA_SOURCE, AICHI_NISSHIN_SOURCE, AICHI_AISAI_SOURCE, AICHI_MIYOSHI_SOURCE, AICHI_NAGAKUTE_SOURCE, AICHI_TOGO_SOURCE, AICHI_AGUI_SOURCE, AICHI_HIGASHIURA_SOURCE, AICHI_OWARIASAHI_SOURCE, AICHI_KOMAKI_SOURCE, AICHI_NAGOYA_SOURCE, AICHI_TOYOTA_SOURCE, AICHI_KASUGAI_SOURCE, AICHI_ICHINOMIYA_SOURCE, GIFU_GIFU_SOURCE,
  // 近畿
  MIE_SUZUKA_SOURCE, MIE_TSU_SOURCE, MIE_TOBA_SOURCE, SHIGA_OTSU_SOURCE, SHIGA_MORIYAMA_SOURCE, MIE_OWASE_SOURCE, MIE_IGA_SOURCE, MIE_KISOSAKI_SOURCE, MIE_TAKI_SOURCE, MIE_MEIWA_SOURCE, SHIGA_HIKONE_SOURCE, SHIGA_NAGAHAMA_SOURCE, SHIGA_OMIHACHIMAN_SOURCE, SHIGA_KOKA_SOURCE, SHIGA_MAIBARA_SOURCE, SHIGA_AISHO_SOURCE, SHIGA_HINO_SOURCE, SHIGA_TOYOSATO_SOURCE, KYOTO_MAMAFRE_SOURCE, KYOTO_WAKUTOBI_SOURCE, KYOTO_MAIZURU_SOURCE, KYOTO_AYABE_SOURCE, KYOTO_JOYO_SOURCE, KYOTO_NAGAOKAKYO_SOURCE, KYOTO_YAWATA_SOURCE, KYOTO_SEIKA_SOURCE, KYOTO_KUMIYAMA_SOURCE, KYOTO_MINAMIYAMASHIRO_SOURCE, KYOTO_KAMEOKA_SOURCE, KYOTO_UJI_SOURCE, KYOTO_MUKO_SOURCE, OSAKA_IKEDA_SOURCE, OSAKA_IZUMIOTSU_SOURCE, OSAKA_KAIZUKA_SOURCE, OSAKA_MORIGUCHI_SOURCE, OSAKA_IBARAKI_SOURCE, OSAKA_HIRAKATA_SOURCE, OSAKA_NEYAGAWA_SOURCE, OSAKA_IZUMI_SOURCE, OSAKA_HABIKINO_SOURCE, OSAKA_FUJIIDERA_SOURCE, OSAKA_HIGASHIOSAKA_SOURCE, OSAKA_SENNAN_SOURCE, OSAKA_HANNAN_SOURCE, OSAKA_KUMATORI_SOURCE, OSAKA_TADAOKA_SOURCE, OSAKA_TAISHI_SOURCE, OSAKA_TAKATSUKI_SOURCE, OSAKA_KISHIWADA_SOURCE, OSAKA_KAWACHINAGANO_SOURCE, OSAKA_TONDABAYASHI_SOURCE, OSAKA_SAKAI_SOURCE, OSAKA_SUITA_SOURCE, HYOGO_ASHIYA_SOURCE, HYOGO_HIMEJI_SOURCE, HYOGO_ITAMI_SOURCE, HYOGO_KAKOGAWA_SOURCE, HYOGO_TATSUNO_SOURCE, HYOGO_ONO_SOURCE, HYOGO_SHISO_SOURCE, HYOGO_KATO_SOURCE, HYOGO_INAGAWA_SOURCE, HYOGO_INAMI_SOURCE, HYOGO_FUKUSAKI_SOURCE, HYOGO_KAMIKAWA_SOURCE, NARA_TENRI_SOURCE, NARA_KASHIHARA_SOURCE, NARA_GOJO_SOURCE, NARA_GOSE_SOURCE, NARA_IKOMA_SOURCE, NARA_IKARUGA_SOURCE, NARA_ANDO_SOURCE, NARA_KAWANISHI_NR_SOURCE, NARA_TAWARAMOTO_SOURCE, NARA_OJI_SOURCE, NARA_KORYO_SOURCE, NARA_ASUKA_SOURCE, NARA_TOTSUKAWA_SOURCE, NARA_SHIMOICHI_SOURCE, WAKAYAMA_HASHIMOTO_SOURCE, WAKAYAMA_INAMI_WK_SOURCE,
  // 中国・四国
  TOTTORI_KOSODATE_SOURCE, TOTTORI_NICHINAN_SOURCE, TOTTORI_SAKAIMINATO_SOURCE, SHIMANE_MASUDA_SOURCE, SHIMANE_AMA_SOURCE, OKAYAMA_OKAYAMA_SOURCE, OKAYAMA_AKAIWA_SOURCE, OKAYAMA_MIMASAKA_SOURCE, OKAYAMA_HAYASHIMA_SOURCE, HIROSHIMA_HIROSHIMA_SOURCE, HIROSHIMA_IKUCHAN_SOURCE, HIROSHIMA_FUCHU_SOURCE, HIROSHIMA_OTAKE_SOURCE, HIROSHIMA_HIGASHIHIROSHIMA_SOURCE, HIROSHIMA_FUKUYAMA_SOURCE, HIROSHIMA_KURE_SOURCE, HIROSHIMA_ONOMICHI_SOURCE, HIROSHIMA_MIHARA_SOURCE, HIROSHIMA_HATSUKAICHI_SOURCE, YAMAGUCHI_HIKARI_SOURCE, YAMAGUCHI_SHIMONOSEKI_SOURCE, YAMAGUCHI_YAMAGUCHI_SOURCE, YAMAGUCHI_SHUNAN_SOURCE, YAMAGUCHI_UBE_SOURCE, TOKUSHIMA_TOKUSHIMA_SOURCE, TOKUSHIMA_NAKA_SOURCE, TOKUSHIMA_HIGASHIMIYOSHI_SOURCE, KAGAWA_TAKAMATSU_SOURCE, KAGAWA_SANUKI_SOURCE, KAGAWA_MITOYO_SOURCE, KAGAWA_TONOSHO_SOURCE, KAGAWA_MARUGAME_SOURCE, KAGAWA_SAKAIDE_SOURCE, EHIME_SEIYO_SOURCE, EHIME_TOBE_SOURCE, EHIME_NIIHAMA_SOURCE, EHIME_SAIJO_SOURCE, KOCHI_MUROTO_SOURCE, KOCHI_KOKOHARE_SOURCE,
  // 九州・沖縄
  FUKUOKA_KITAKYUSHU_SOURCE, FUKUOKA_FUKUTSU_SOURCE, FUKUOKA_SHINGU_FK_SOURCE, FUKUOKA_HIROKAWA_SOURCE, FUKUOKA_KAWARA_SOURCE, FUKUOKA_CHIKUSHINO_SOURCE, FUKUOKA_NAKAGAWA_SOURCE, NAGASAKI_NAGASAKI_SOURCE, NAGASAKI_TSUSHIMA_SOURCE, NAGASAKI_IKI_SOURCE, NAGASAKI_SAIKAI_SOURCE, NAGASAKI_TOGITSU_SOURCE, NAGASAKI_HIGASHISONOGI_SOURCE, SAGA_KARATSU_SOURCE, SAGA_TOSU_SOURCE, KUMAMOTO_TAKAMORI_SOURCE, KUMAMOTO_KIKUCHI_SOURCE, KUMAMOTO_KOSODATE_SOURCE, OITA_HITA_SOURCE, OITA_TAKETA_SOURCE, OITA_KITSUKI_SOURCE, OITA_KUSU_SOURCE, MIYAZAKI_SUKUSUKU_SOURCE, MIYAZAKI_MIYAZAKI_SOURCE, MIYAZAKI_NICHINAN_SOURCE, MIYAZAKI_KIJO_SOURCE, MIYAZAKI_KADOGAWA_SOURCE, MIYAZAKI_MIYAKOJIMA_SOURCE, KAGOSHIMA_SATSUMASENDAI_SOURCE, KAGOSHIMA_MINAMIKYUSHU_SOURCE, KAGOSHIMA_SATSUMA_SOURCE, KAGOSHIMA_KIMOTSUKI_SOURCE, IKOYO_SOURCE, HOKKAIDO_SAPPORO_SOURCE, IWATE_MORIOKA_SOURCE, OITA_OITA_SOURCE, WAKAYAMA_WAKAYAMA_SOURCE, OKINAWA_NAHA_SOURCE, OKINAWA_YOMITAN_SOURCE, OKINAWA_KITANAKAGUSUKU_SOURCE, OKINAWA_IE_SOURCE, SHIZUOKA_ATAMI_SOURCE, SHIZUOKA_ITO_SOURCE, AICHI_KIYOSU_SOURCE, OKAYAMA_KIBICHUO_SOURCE, MIYAGI_SENDAI_JIDOUKAN_SOURCE, KAGAWA_TAKAMATSU_MIRAIE_SOURCE, OKAYAMA_KURASHIKI_SOURCE, TOYAMA_TOYAMA_SOURCE, YAMAGATA_YAMAGATA_SOURCE, ISHIKAWA_HAKUSAN_SOURCE, TOKYO_OTA_MAMAFRE_SOURCE, IBARAKI_KAMISU_MAMAFRE_SOURCE, NARA_SUPERAPP_SOURCE, YAMAGATA_SUKUSUKU_SOURCE, NAGANO_CHEERFUL_SOURCE, HOKKAIDO_KUSHIRO_SOURCE, HOKKAIDO_OBIHIRO_SOURCE, FUKUOKA_KODOMO_SOURCE, ISHIKAWA_OYACOMI_SOURCE, OKINAWA_KOSODATE_SOURCE, HAPPYMAMA_ISHIKAWA_SOURCE, SAGA_KOSODATE_SOURCE, NAGAHAPI_SOURCE, YAMANASHI_PREF_SOURCE, KITAKYUSHU_GENKINOMORI_SOURCE, OKAYAMA_KOSODATE_SOURCE, TOYAMA_KOSODATE_NET_SOURCE,
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
const collectKyonanEvents = createMunicipalCalendarCollector({ source: KYONAN_SOURCE, childCategoryIndex: null }, geoFmDeps);
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
const collectKogaIbEvents = createCalendarJsonCollector({ source: KOGA_IB_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
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
const collectSakaiIbEvents = createCalPhpCollector({ source: SAKAI_IB_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectDaigoEvents = createCalPhpCollector({ source: DAIGO_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// Tier1: CGI calendar (取手市) - ward-generic経由
const collectTorideEvents = createCalendarJsonCollector({ source: TORIDE_SOURCE, childKeywords: CHILD_KW }, geoFmDeps);
// Tier2: 水戸市 + 鹿嶋市 (カスタムPHP) + 笠間市 (cal.php)
const collectMitoEvents = createCollectMitoEvents({ ...geoFmDeps, source: MITO_SOURCE });
const collectKashimaIbEvents = createCollectKashimaIbEvents({ ...geoFmDeps, source: KASHIMA_IB_SOURCE });
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
const collectHiranaiEvents = createCalendarJsonCollector({ source: HIRANAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNakadomariEvents = createCalendarJsonCollector({ source: NAKADOMARI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectYomogitaEvents = createMunicipalCalendarCollector({ source: YOMOGITA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectItayanagiEvents = createEventJsCollector({ source: ITAYANAGI_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 岩手県
const collectIchinosekiEvents = createIchinosekiCollector({ source: IWATE_ICHINOSEKI_SOURCE }, geoFmDeps);
const collectIwateMoriokaEvents = createEventJsCollector({ source: IWATE_MORIOKA_SOURCE, jsFile: "event_data.js", childCategoryIds: ["7"], useKeywordFilter: false }, geoFmDeps);
const collectKitakamiEvents = createCalendarJsonCollector({ source: KITAKAMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKujiEvents = createCalendarJsonCollector({ source: KUJI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOshuEvents = createCalendarJsonCollector({ source: OSHU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNishiwagaEvents = createCalendarJsonCollector({ source: NISHIWAGA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectIchinoheEvents = createCalendarJsonCollector({ source: ICHINOHE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOtsuchiEvents = createMunicipalCalendarCollector({ source: OTSUCHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 宮城県
const collectMiyagiSendaiEvents = createMamafreCollector({ source: MIYAGI_SENDAI_SOURCE, mamafre_base: "https://sendai-city.mamafre.jp", pref: "宮城県", city: "仙台市" }, geoFmDeps);
const collectSendaiJidoukanEvents = createSendaiJidoukanCollector({ source: MIYAGI_SENDAI_JIDOUKAN_SOURCE }, geoFmDeps);
const collectIshinomakiEvents = createMunicipalCalendarCollector({ source: ISHINOMAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHigashimatsushimaEvents = createListCalendarCollector({ source: HIGASHIMATSUSHIMA_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectZaoEvents = createListCalendarCollector({ source: ZAO_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectShichikashukuEvents = createMunicipalCalendarCollector({ source: SHICHIKASHUKU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShichigahamaEvents = createMunicipalCalendarCollector({ source: SHICHIGAHAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectTaiwaEvents = createCalendarJsonCollector({ source: TAIWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShikamaEvents = createCalendarJsonCollector({ source: SHIKAMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNatoriEvents = createMunicipalCalendarCollector({ source: NATORI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectShiogamaEvents = createMunicipalCalendarCollector({ source: SHIOGAMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 秋田県
const collectAkitaKosodateEvents = createAkitaKosodateCollector({ source: AKITA_KOSODATE_SOURCE }, geoFmDeps);
const collectYokoteEvents = createMunicipalCalendarCollector({ source: YOKOTE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYurihonjyoEvents = createMunicipalCalendarCollector({ source: YURIHONJYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOgaEvents = createCalendarJsonCollector({ source: OGA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKosakaEvents = createCalendarJsonCollector({ source: KOSAKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHachirogataEvents = createMunicipalCalendarCollector({ source: HACHIROGATA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 山形県
const collectYonezawaEvents = createCalendarJsonCollector({ source: YONEZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectSakataEvents = createEventJsCollector({ source: SAKATA_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectShinjoEvents = createMunicipalCalendarCollector({ source: SHINJO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagaiEvents = createCalendarJsonCollector({ source: NAGAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNakayamaYmEvents = createCalendarJsonCollector({ source: NAKAYAMA_YM_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKahokuEvents = createCalendarJsonCollector({ source: KAHOKU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAsahiYmEvents = createCalendarJsonCollector({ source: ASAHI_YM_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKaneyamaYmEvents = createCalendarJsonCollector({ source: KANEYAMA_YM_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMamurogawaEvents = createCalendarJsonCollector({ source: MAMUROGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkuraEvents = createCalendarJsonCollector({ source: OKURA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShiratakaEvents = createMunicipalCalendarCollector({ source: SHIRATAKA_SOURCE, calendarPath: "/miryoku/event/kosodate/calendar/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 福島県
const collectFukushimaCityEvents = createCalendarJsonCollector({ source: FUKUSHIMA_CITY_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukushimaKoriyamaEvents = createMunicipalCalendarCollector({ source: FUKUSHIMA_KORIYAMA_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectSomaEvents = createCalendarJsonCollector({ source: SOMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMinamisomaEvents = createCalendarJsonCollector({ source: MINAMISOMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOtamaEvents = createMunicipalCalendarCollector({ source: OTAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShimogoEvents = createCalendarJsonCollector({ source: SHIMOGO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAizumisatoEvents = createCalendarJsonCollector({ source: AIZUMISATO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFurudonoEvents = createMunicipalCalendarCollector({ source: FURUDONO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// --- Child keyword constants (add after other CHILD_KW definitions) ---

// --- Collector instantiation ---
// 北海道
// 北海道
const collectHokkaidoIwamizawaEvents = createCalendarJsonCollector({ source: HOKKAIDO_IWAMIZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoShibetsuEvents = createCalendarJsonCollector({ source: HOKKAIDO_SHIBETSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoChitoseEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_CHITOSE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoMoriEvents = createCalendarJsonCollector({ source: HOKKAIDO_MORI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoOzoraEvents = createCalendarJsonCollector({ source: HOKKAIDO_OZORA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoTsubetsuEvents = createCalendarJsonCollector({ source: HOKKAIDO_TSUBETSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoTaikiEvents = createCalendarJsonCollector({ source: HOKKAIDO_TAIKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHokkaidoNisekoEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_NISEKO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoShiraoiEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_SHIRAOI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoHigashikaguraEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_HIGASHIKAGURA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoOtoineppuEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_OTOINEPPU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoYubetsuEvents = createMunicipalCalendarCollector({ source: HOKKAIDO_YUBETSU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoNakasatsunaiEvents = createCalPhpCollector({ source: HOKKAIDO_NAKASATSUNAI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoSarabetsuEvents = createCalPhpCollector({ source: HOKKAIDO_SARABETSU_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHokkaidoHonbetsuEvents = createCalPhpCollector({ source: HOKKAIDO_HONBETSU_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
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
const collectNiigataSanjoEvents = createCalendarJsonCollector({ source: NIIGATA_SANJO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataKashiwazakiEvents = createCalendarJsonCollector({ source: NIIGATA_KASHIWAZAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataTsubameEvents = createCalendarJsonCollector({ source: NIIGATA_TSUBAME_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataAganoEvents = createCalendarJsonCollector({ source: NIIGATA_AGANO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataSeiroEvents = createCalendarJsonCollector({ source: NIIGATA_SEIRO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataYuzawaEvents = createCalendarJsonCollector({ source: NIIGATA_YUZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNiigataKamoEvents = createMunicipalCalendarCollector({ source: NIIGATA_KAMO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataMinamiuonumaEvents = createMunicipalCalendarCollector({ source: NIIGATA_MINAMIUONUMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataTagamiEvents = createMunicipalCalendarCollector({ source: NIIGATA_TAGAMI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNiigataCityKosodateEvents = createNiigataKosodateColl({ source: NIIGATA_CITY_KOSODATE_SOURCE }, geoFmDeps);
// 富山県
const collectToyamaHimiEvents = createCalendarJsonCollector({ source: TOYAMA_HIMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectToyamaNamerikawaEvents = createCalendarJsonCollector({ source: TOYAMA_NAMERIKAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectToyamaKurobeEvents = createEventJsCollector({ source: TOYAMA_KUROBE_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
const collectToyamaNyuzenEvents = createCalendarJsonCollector({ source: TOYAMA_NYUZEN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectToyamaAsahiTyEvents = createCalendarJsonCollector({ source: TOYAMA_ASAHI_TY_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 石川県
const collectIshikawaKanazawaEvents = createCalendarJsonCollector({ source: ISHIKAWA_KANAZAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectIshikawaKomatsuEvents = createCalendarJsonCollector({ source: ISHIKAWA_KOMATSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectIshikawaKagaEvents = createCalendarJsonCollector({ source: ISHIKAWA_KAGA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectIshikawaNakanotoEvents = createCalendarJsonCollector({ source: ISHIKAWA_NAKANOTO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 福井県
const collectFukuiFukuikuEvents = createFukuikuCollector({ source: FUKUI_FUKUIKU_SOURCE }, geoFmDeps);
const collectFukuiSabaeEvents = createListCalendarCollector({ source: FUKUI_SABAE_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
// 山梨県
const collectYamanashiChuoEvents = createCalendarJsonCollector({ source: YAMANASHI_CHUO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectYamanashiMinamialpsEvents = createMunicipalCalendarCollector({ source: YAMANASHI_MINAMIALPS_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectYamanashiHokutoEvents = createMunicipalCalendarCollector({ source: YAMANASHI_HOKUTO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 長野県
const collectNaganoMatsumotoEvents = createMunicipalCalendarCollector({ source: NAGANO_MATSUMOTO_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaganoSuzakaEvents = createCalendarJsonCollector({ source: NAGANO_SUZAKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaganoKomaganeEvents = createCalendarJsonCollector({ source: NAGANO_KOMAGANE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaganoChikumaEvents = createCalendarJsonCollector({ source: NAGANO_CHIKUMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaganoIijimachoEvents = createCalendarJsonCollector({ source: NAGANO_IIJIMACHO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaganoMatsukawaEvents = createCalendarJsonCollector({ source: NAGANO_MATSUKAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaganoIkedaEvents = createMunicipalCalendarCollector({ source: NAGANO_IKEDA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 岐阜県
const collectGifuOgakiEvents = createMunicipalCalendarCollector({ source: GIFU_OGAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuSekiEvents = createMunicipalCalendarCollector({ source: GIFU_SEKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuEnaEvents = createCalendarJsonCollector({ source: GIFU_ENA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectGifuMotosuEvents = createMunicipalCalendarCollector({ source: GIFU_MOTOSU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuKaizuEvents = createMunicipalCalendarCollector({ source: GIFU_KAIZU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuAnpachiEvents = createMunicipalCalendarCollector({ source: GIFU_ANPACHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuIbigawaEvents = createMunicipalCalendarCollector({ source: GIFU_IBIGAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuOnoGfEvents = createMunicipalCalendarCollector({ source: GIFU_ONO_GF_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectGifuKakamigaharaEvents = createEventJsCollector({ source: GIFU_KAKAMIGAHARA_SOURCE, jsFile: "event.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 静岡県
const collectShizuokaFujiedaEvents = createCalendarJsonCollector({ source: SHIZUOKA_FUJIEDA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaSusonoEvents = createCalendarJsonCollector({ source: SHIZUOKA_SUSONO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaKosaiEvents = createCalendarJsonCollector({ source: SHIZUOKA_KOSAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaIzuEvents = createCalendarJsonCollector({ source: SHIZUOKA_IZU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaOmaezakiEvents = createCalendarJsonCollector({ source: SHIZUOKA_OMAEZAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaNagaizumiEvents = createCalendarJsonCollector({ source: SHIZUOKA_NAGAIZUMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaKannamiEvents = createCalendarJsonCollector({ source: SHIZUOKA_KANNAMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShizuokaHamamatsuEvents = createHamamatsuOdpfCollector({ source: SHIZUOKA_HAMAMATSU_SOURCE }, geoFmDeps);
const collectShizuokaCityEvents = createMamafreCollector({ source: SHIZUOKA_CITY_SOURCE, mamafre_base: "https://shizuoka-city.mamafre.jp", pref: "静岡県", city: "静岡市" }, geoFmDeps);
// 愛知県
const collectAichiToyokawaEvents = createCalendarJsonCollector({ source: AICHI_TOYOKAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiHekinanEvents = createCalendarJsonCollector({ source: AICHI_HEKINAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiShinshiroEvents = createListCalendarCollector({ source: AICHI_SHINSHIRO_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectAichiChiryuEvents = createCalendarJsonCollector({ source: AICHI_CHIRYU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiInazawaEvents = createMunicipalCalendarCollector({ source: AICHI_INAZAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiIwakuraEvents = createMunicipalCalendarCollector({ source: AICHI_IWAKURA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiNisshinEvents = createCalendarJsonCollector({ source: AICHI_NISSHIN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiAisaiEvents = createMunicipalCalendarCollector({ source: AICHI_AISAI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiMiyoshiEvents = createCalendarJsonCollector({ source: AICHI_MIYOSHI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiNagakuteEvents = createCalendarJsonCollector({ source: AICHI_NAGAKUTE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiTogoEvents = createCalendarJsonCollector({ source: AICHI_TOGO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiAguiEvents = createMunicipalCalendarCollector({ source: AICHI_AGUI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectAichiHigashiuraEvents = createCalendarJsonCollector({ source: AICHI_HIGASHIURA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiOwariasahiEvents = createMunicipalCalendarCollector({ source: AICHI_OWARIASAHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectAichiKomakiEvents = createCalendarJsonCollector({ source: AICHI_KOMAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectAichiNagoyaEvents = createEventJsCollector({ source: AICHI_NAGOYA_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: true }, geoFmDeps);
const collectAichiToyotaEvents = createEventJsCollector({ source: AICHI_TOYOTA_SOURCE, jsFile: "event_d.js", childCategoryIds: ["10"], useKeywordFilter: true }, geoFmDeps);
const collectAichiKasugaiEvents = createEventJsCollector({ source: AICHI_KASUGAI_SOURCE, jsFile: "event.js", childCategoryIds: ["5"], useKeywordFilter: true }, geoFmDeps);
const collectAichiIchinomiyaEvents = createEventJsCollector({ source: AICHI_ICHINOMIYA_SOURCE, jsFile: "event_data.js", childCategoryIds: ["6"], useKeywordFilter: true }, geoFmDeps);
const collectGifuGifuEvents = createEventJsCollector({ source: GIFU_GIFU_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: false }, geoFmDeps);

// 近畿
// 滋賀県(mamafre)
const collectShigaOtsuEvents = createMamafreCollector({ source: SHIGA_OTSU_SOURCE, mamafre_base: "https://otsu-city.mamafre.jp", pref: "滋賀県", city: "大津市" }, geoFmDeps);
const collectShigaMoriyamaEvents = createMamafreCollector({ source: SHIGA_MORIYAMA_SOURCE, mamafre_base: "https://moriyama-city.mamafre.jp", pref: "滋賀県", city: "守山市" }, geoFmDeps);
// 三重県
const collectMieSuzukaEvents = createEventJsCollector({ source: MIE_SUZUKA_SOURCE, jsFile: "event.js", childCategoryIds: ["80"], useKeywordFilter: true }, geoFmDeps);
const collectMieTsuEvents = createEventJsCollector({ source: MIE_TSU_SOURCE, jsFile: "event.js", childCategoryIds: ["40"], useKeywordFilter: true }, geoFmDeps);
const collectMieTobaEvents = createCalendarJsonCollector({ source: MIE_TOBA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMieOwaseEvents = createMunicipalCalendarCollector({ source: MIE_OWASE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMieIgaEvents = createMunicipalCalendarCollector({ source: MIE_IGA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMieKisosakiEvents = createMunicipalCalendarCollector({ source: MIE_KISOSAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMieTakiEvents = createCalendarJsonCollector({ source: MIE_TAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMieMeiwaEvents = createCalendarJsonCollector({ source: MIE_MEIWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 滋賀県
const collectShigaHikoneEvents = createCalendarJsonCollector({ source: SHIGA_HIKONE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShigaNagahamaEvents = createMunicipalCalendarCollector({ source: SHIGA_NAGAHAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaOmihachimanEvents = createCalendarJsonCollector({ source: SHIGA_OMIHACHIMAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShigaKokaEvents = createMunicipalCalendarCollector({ source: SHIGA_KOKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaMaibaraEvents = createCalendarJsonCollector({ source: SHIGA_MAIBARA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShigaAishoEvents = createCalendarJsonCollector({ source: SHIGA_AISHO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShigaHinoEvents = createMunicipalCalendarCollector({ source: SHIGA_HINO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectShigaToyosatoEvents = createMunicipalCalendarCollector({ source: SHIGA_TOYOSATO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 京都府
const collectKyotoMamafreEvents = createMamafreCollector({ source: KYOTO_MAMAFRE_SOURCE, mamafre_base: "https://kyoto-city.mamafre.jp", pref: "京都府", city: "京都市" }, geoFmDeps);
const collectKyotoWakutobiEvents = createKyotoWakutobiCollector({ source: KYOTO_WAKUTOBI_SOURCE }, geoFmDeps);
const collectKyotoMaizuruEvents = createMunicipalCalendarCollector({ source: KYOTO_MAIZURU_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoAyabeEvents = createMunicipalCalendarCollector({ source: KYOTO_AYABE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoJoyoEvents = createMunicipalCalendarCollector({ source: KYOTO_JOYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoNagaokakyoEvents = createMunicipalCalendarCollector({ source: KYOTO_NAGAOKAKYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoYawataEvents = createMunicipalCalendarCollector({ source: KYOTO_YAWATA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoSeikaEvents = createCalendarJsonCollector({ source: KYOTO_SEIKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKyotoKumiyamaEvents = createMunicipalCalendarCollector({ source: KYOTO_KUMIYAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoMinamiyamashiroEvents = createMunicipalCalendarCollector({ source: KYOTO_MINAMIYAMASHIRO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKyotoKameokaEvents = createMunicipalCalendarCollector({ source: KYOTO_KAMEOKA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKyotoUjiEvents = createMunicipalCalendarCollector({ source: KYOTO_UJI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKyotoMukoEvents = createMunicipalCalendarCollector({ source: KYOTO_MUKO_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 大阪府
const collectOsakaIkedaEvents = createCalendarJsonCollector({ source: OSAKA_IKEDA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaIzumiotsuEvents = createCalendarJsonCollector({ source: OSAKA_IZUMIOTSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaKaizukaEvents = createCalendarJsonCollector({ source: OSAKA_KAIZUKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaMoriguchiEvents = createCalendarJsonCollector({ source: OSAKA_MORIGUCHI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaIbarakiEvents = createCalendarJsonCollector({ source: OSAKA_IBARAKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaHirakataEvents = createMunicipalCalendarCollector({ source: OSAKA_HIRAKATA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOsakaNeyagawaEvents = createCalendarJsonCollector({ source: OSAKA_NEYAGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaIzumiEvents = createCalendarJsonCollector({ source: OSAKA_IZUMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaHabikinoEvents = createCalendarJsonCollector({ source: OSAKA_HABIKINO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaFujiideraEvents = createCalendarJsonCollector({ source: OSAKA_FUJIIDERA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaHigashiosakaEvents = createMunicipalCalendarCollector({ source: OSAKA_HIGASHIOSAKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOsakaSennanEvents = createCalendarJsonCollector({ source: OSAKA_SENNAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaHannanEvents = createCalendarJsonCollector({ source: OSAKA_HANNAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaKumatoriEvents = createCalendarJsonCollector({ source: OSAKA_KUMATORI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaTadaokaEvents = createCalendarJsonCollector({ source: OSAKA_TADAOKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaTaishiEvents = createCalendarJsonCollector({ source: OSAKA_TAISHI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOsakaTakatsukiEvents = createMunicipalCalendarCollector({ source: OSAKA_TAKATSUKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaKishiwadaEvents = createMunicipalCalendarCollector({ source: OSAKA_KISHIWADA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaKawachinaganoEvents = createMunicipalCalendarCollector({ source: OSAKA_KAWACHINAGANO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaTondabayashiEvents = createMunicipalCalendarCollector({ source: OSAKA_TONDABAYASHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectOsakaSuitaEvents = createMamafreCollector({ source: OSAKA_SUITA_SOURCE, mamafre_base: "https://suita-city.mamafre.jp", pref: "大阪府", city: "吹田市" }, geoFmDeps);
const collectOsakaSakaiEvents = createListCalendarCollector({ source: OSAKA_SAKAI_SOURCE, calendarPath: "/shievent/kosodate/calendar/" }, geoFmDeps);
// 兵庫県
const collectHyogoAshiyaEvents = createMamafreCollector({ source: HYOGO_ASHIYA_SOURCE, mamafre_base: "https://ashiya-city.mamafre.jp", pref: "兵庫県", city: "芦屋市" }, geoFmDeps);
const collectHyogoHimejiEvents = createMunicipalCalendarCollector({ source: HYOGO_HIMEJI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoItamiEvents = createCalendarJsonCollector({ source: HYOGO_ITAMI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoKakogawaEvents = createCalendarJsonCollector({ source: HYOGO_KAKOGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoTatsunoEvents = createCalendarJsonCollector({ source: HYOGO_TATSUNO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoOnoEvents = createCalendarJsonCollector({ source: HYOGO_ONO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoShisoEvents = createCalendarJsonCollector({ source: HYOGO_SHISO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoKatoEvents = createCalendarJsonCollector({ source: HYOGO_KATO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoInagawaEvents = createCalendarJsonCollector({ source: HYOGO_INAGAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHyogoInamiEvents = createMunicipalCalendarCollector({ source: HYOGO_INAMI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoFukusakiEvents = createMunicipalCalendarCollector({ source: HYOGO_FUKUSAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectHyogoKamikawaEvents = createMunicipalCalendarCollector({ source: HYOGO_KAMIKAWA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 奈良県
const collectNaraTenriEvents = createCalendarJsonCollector({ source: NARA_TENRI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraKashiharaEvents = createCalendarJsonCollector({ source: NARA_KASHIHARA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraGojoEvents = createCalendarJsonCollector({ source: NARA_GOJO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraGoseEvents = createMunicipalCalendarCollector({ source: NARA_GOSE_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraIkomaEvents = createMunicipalCalendarCollector({ source: NARA_IKOMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraIkarugaEvents = createMunicipalCalendarCollector({ source: NARA_IKARUGA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraAndoEvents = createMunicipalCalendarCollector({ source: NARA_ANDO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraKawanishiNrEvents = createMunicipalCalendarCollector({ source: NARA_KAWANISHI_NR_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraTawaramotoEvents = createCalendarJsonCollector({ source: NARA_TAWARAMOTO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraOjiEvents = createCalendarJsonCollector({ source: NARA_OJI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNaraKoryoEvents = createMunicipalCalendarCollector({ source: NARA_KORYO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraAsukaEvents = createMunicipalCalendarCollector({ source: NARA_ASUKA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraTotsukawaEvents = createCalPhpCollector({ source: NARA_TOTSUKAWA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNaraShimoichiEvents = createMunicipalCalendarCollector({ source: NARA_SHIMOICHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 和歌山県
const collectWakayamaWakayamaEvents = createEventJsCollector({ source: WAKAYAMA_WAKAYAMA_SOURCE, jsFile: "event_d.js", childCategoryIds: ["4"], useKeywordFilter: true }, geoFmDeps);
const collectWakayamaHashimotoEvents = createCalendarJsonCollector({ source: WAKAYAMA_HASHIMOTO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectWakayamaInamiWkEvents = createMunicipalCalendarCollector({ source: WAKAYAMA_INAMI_WK_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);

// 中国・四国
// 鳥取県
const collectTottoriKosodateEvents = createTottoriKosodateCollector({ source: TOTTORI_KOSODATE_SOURCE }, geoFmDeps);
const collectTottoriNichinanEvents = createCalendarJsonCollector({ source: TOTTORI_NICHINAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectTottoriSakaiminatoEvents = createEventJsCollector({ source: TOTTORI_SAKAIMINATO_SOURCE, jsFile: "calendar/event_j.js", childCategoryIds: [], useKeywordFilter: true }, geoFmDeps);
// 島根県
const collectShimaneMasudaEvents = createCalendarJsonCollector({ source: SHIMANE_MASUDA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectShimaneAmaEvents = createMunicipalCalendarCollector({ source: SHIMANE_AMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 岡山県
const collectOkayamaOkayamaEvents = createMunicipalCalendarCollector({ source: OKAYAMA_OKAYAMA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectOkayamaAkaiwaEvents = createCalendarJsonCollector({ source: OKAYAMA_AKAIWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkayamaMimasakaEvents = createCalendarJsonCollector({ source: OKAYAMA_MIMASAKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOkayamaHayashimaEvents = createCalendarJsonCollector({ source: OKAYAMA_HAYASHIMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 広島県
const collectHiroshimaHiroshimaEvents = createEventJsCollector({ source: HIROSHIMA_HIROSHIMA_SOURCE, jsFile: "event.js", childCategoryIds: ["60"], useKeywordFilter: false }, geoFmDeps);
const collectHiroshimaIkuchanEvents = createIkuchanCollector({ source: HIROSHIMA_IKUCHAN_SOURCE }, geoFmDeps);
const collectHiroshimaFuchuEvents = createCalendarJsonCollector({ source: HIROSHIMA_FUCHU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHiroshimaOtakeEvents = createCalendarJsonCollector({ source: HIROSHIMA_OTAKE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHiroshimaHigashihiroshimaEvents = createCalendarJsonCollector({ source: HIROSHIMA_HIGASHIHIROSHIMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectHiroshimaFukuyamaEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_FUKUYAMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectHiroshimaKureEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_KURE_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectHiroshimaOnomichiEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_ONOMICHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectHiroshimaMiharaEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_MIHARA_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectHiroshimaHatsukaichiEvents = createMunicipalCalendarCollector({ source: HIROSHIMA_HATSUKAICHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 山口県
const collectYamaguchiHikariEvents = createCalendarJsonCollector({ source: YAMAGUCHI_HIKARI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectYamaguchiShimonosekiEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_SHIMONOSEKI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYamaguchiYamaguchiEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_YAMAGUCHI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYamaguchiShunanEvents = createMunicipalCalendarCollector({ source: YAMAGUCHI_SHUNAN_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectYamaguchiUbeEvents = createEventJsCollector({ source: YAMAGUCHI_UBE_SOURCE, jsFile: "event.js", childCategoryIds: ["50"], useKeywordFilter: false }, geoFmDeps);
const collectYamaguchiCalendarEvents = createYamaguchiCalendarColl({ source: YAMAGUCHI_CALENDAR_SOURCE }, geoFmDeps);
// 徳島県
const collectTokushimaTokushimaEvents = createListCalendarCollector({ source: TOKUSHIMA_TOKUSHIMA_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectTokushimaNakaEvents = createCalendarJsonCollector({ source: TOKUSHIMA_NAKA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectTokushimaHigashimiyoshiEvents = createMunicipalCalendarCollector({ source: TOKUSHIMA_HIGASHIMIYOSHI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 香川県
const collectKagawaTakamatsuEvents = createListCalendarCollector({ source: KAGAWA_TAKAMATSU_SOURCE, calendarPath: "/event/kosodate/calendar/" }, geoFmDeps);
const collectKagawaSanukiEvents = createCalPhpCollector({ source: KAGAWA_SANUKI_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKagawaMitoyoEvents = createCalendarJsonCollector({ source: KAGAWA_MITOYO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagawaTonoshoEvents = createCalendarJsonCollector({ source: KAGAWA_TONOSHO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagawaMarugameEvents = createMunicipalCalendarCollector({ source: KAGAWA_MARUGAME_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKagawaSakaideEvents = createMunicipalCalendarCollector({ source: KAGAWA_SAKAIDE_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
// 愛媛県
const collectEhimeSeiyoEvents = createCalendarJsonCollector({ source: EHIME_SEIYO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectEhimeTobeEvents = createCalendarJsonCollector({ source: EHIME_TOBE_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectEhimeNiihamaEvents = createMunicipalCalendarCollector({ source: EHIME_NIIHAMA_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectEhimeSaijoEvents = createMunicipalCalendarCollector({ source: EHIME_SAIJO_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectEhimeKirakiraEvents = createEhimeKirakiraColl({ source: EHIME_KIRAKIRA_SOURCE }, geoFmDeps);
// 高知県
const collectKochiMurotoEvents = createMunicipalCalendarCollector({ source: KOCHI_MUROTO_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectKochiKokohareEvents = createKochiKokohareCollector({ source: KOCHI_KOKOHARE_SOURCE }, geoFmDeps);

// 九州・沖縄
// 福岡県
const collectFukuokaKitakyushuEvents = createMamafreCollector({ source: FUKUOKA_KITAKYUSHU_SOURCE, mamafre_base: "https://kitakyushu-city.mamafre.jp", pref: "福岡県", city: "北九州市" }, geoFmDeps);
const collectFukuokaFukutsuEvents = createCalendarJsonCollector({ source: FUKUOKA_FUKUTSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaShinguFkEvents = createCalendarJsonCollector({ source: FUKUOKA_SHINGU_FK_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaHirokawaEvents = createCalendarJsonCollector({ source: FUKUOKA_HIROKAWA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectFukuokaKawaraEvents = createMunicipalCalendarCollector({ source: FUKUOKA_KAWARA_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectFukuokaChikushinoEvents = createMunicipalCalendarCollector({ source: FUKUOKA_CHIKUSHINO_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectFukuokaNakagawaEvents = createMunicipalCalendarCollector({ source: FUKUOKA_NAKAGAWA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 長崎県
const collectNagasakiNagasakiEvents = createMunicipalCalendarCollector({ source: NAGASAKI_NAGASAKI_SOURCE, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectNagasakiTsushimaEvents = createCalendarJsonCollector({ source: NAGASAKI_TSUSHIMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiIkiEvents = createCalendarJsonCollector({ source: NAGASAKI_IKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiSaikaiEvents = createCalendarJsonCollector({ source: NAGASAKI_SAIKAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiTogitsuEvents = createCalendarJsonCollector({ source: NAGASAKI_TOGITSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectNagasakiHigashisonogiEvents = createCalendarJsonCollector({ source: NAGASAKI_HIGASHISONOGI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 佐賀県
const collectSagaKaratsuEvents = createMunicipalCalendarCollector({ source: SAGA_KARATSU_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectSagaTosuEvents = createMunicipalCalendarCollector({ source: SAGA_TOSU_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 熊本県
const collectKumamotoTakamoriEvents = createMunicipalCalendarCollector({ source: KUMAMOTO_TAKAMORI_SOURCE, childCategoryIndex: null }, geoFmDeps);
const collectKumamotoKikuchiEvents = createMunicipalCalendarCollector({ source: KUMAMOTO_KIKUCHI_SOURCE, calendarPath: "/event/", childCategoryIndex: null }, geoFmDeps);
const collectKumamotoKosodateEvents = createKumamotoKosodateCollector({ source: KUMAMOTO_KOSODATE_SOURCE }, geoFmDeps);
// 大分県
const collectOitaHitaEvents = createCalendarJsonCollector({ source: OITA_HITA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOitaTaketaEvents = createCalendarJsonCollector({ source: OITA_TAKETA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOitaKitsukiEvents = createCalendarJsonCollector({ source: OITA_KITSUKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectOitaKusuEvents = createCalendarJsonCollector({ source: OITA_KUSU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
// 宮崎県
const collectMiyazakiSukusukuEvents = createMiyazakiSukusukuCollector({ source: MIYAZAKI_SUKUSUKU_SOURCE }, geoFmDeps);
const collectMiyazakiMiyazakiEvents = createMunicipalCalendarCollector({ source: MIYAZAKI_MIYAZAKI_SOURCE, calendarPath: "/event/", useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMiyazakiNichinanEvents = createCalendarJsonCollector({ source: MIYAZAKI_NICHINAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMiyazakiKijoEvents = createCalendarJsonCollector({ source: MIYAZAKI_KIJO_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectMiyazakiKadogawaEvents = createCalPhpCollector({ source: MIYAZAKI_KADOGAWA_SOURCE, category: 0, useKeywordFilter: true, childKeywords: CHILD_KW }, geoFmDeps);
const collectMiyazakiMiyakojoEvents = createMunicipalCalendarCollector({ source: MIYAZAKI_MIYAKOJIMA_SOURCE, childCategoryIndex: null }, geoFmDeps);
// 鹿児島県
const collectKagoshimaSatsumasendaiEvents = createCalendarJsonCollector({ source: KAGOSHIMA_SATSUMASENDAI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagoshimaMinamikyushuEvents = createCalendarJsonCollector({ source: KAGOSHIMA_MINAMIKYUSHU_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagoshimaSatsumaEvents = createCalendarJsonCollector({ source: KAGOSHIMA_SATSUMA_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagoshimaKimotsukiEvents = createCalendarJsonCollector({ source: KAGOSHIMA_KIMOTSUKI_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
const collectKagoshimaYumesukusukuEvents = createKagoshimaYumesukusukuColl({ source: KAGOSHIMA_YUMESUKUSUKU_SOURCE }, geoFmDeps);
// 沖縄県
const collectOkinawaYomitanEvents = createCalendarJsonCollector({ source: OKINAWA_YOMITAN_SOURCE, childKeywords: CHILD_KW, useKeywordFilter: true }, geoFmDeps);
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
// 奈良スーパーアプリ
const collectNaraSuperappEvents = createNaraSuperappCollector({ source: NARA_SUPERAPP_SOURCE }, geoFmDeps);
// 山形市 元気すくすくネット
const collectYamagataSukusukuEvents = createYamagataSukusukuCollector({ source: YAMAGATA_SUKUSUKU_SOURCE }, geoFmDeps);
// チアフルながの
const collectNaganoCheerfulEvents = createNaganoCheerfulCollector({ source: NAGANO_CHEERFUL_SOURCE }, geoFmDeps);
// いこーよ (全47都道府県カバー)
const collectIkoyoEvents = createIkoyoCollector({ source: IKOYO_SOURCE, prefectureIds: Array.from({ length: 47 }, (_, i) => i + 1), childKeywords: IKOYO_CHILD_KW }, geoFmDeps);
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
  // 東北6県
  collectAomoriAomoriEvents, collectHachinoheEvents, collectTsugaruEvents,
  collectIchinosekiEvents, collectIwateMoriokaEvents,
  collectMiyagiSendaiEvents, collectSendaiJidoukanEvents, collectTaiwaEvents, collectNatoriEvents, collectShiogamaEvents,
  collectAkitaKosodateEvents, collectYokoteEventJsEvents,
  collectYamagataYamagataEvents, collectYamagataSukusukuEvents, collectYonezawaEvents, collectKahokuEvents, collectOkuraEvents, collectFukushimaKoriyamaEvents, collectSomaEvents, collectMinamisomaEvents, collectAizumisatoEvents,
  // 北海道
  collectHokkaidoIwamizawaEvents, collectHokkaidoShibetsuEvents, collectHokkaidoMoriEvents, collectHokkaidoTaikiEvents, collectHokkaidoSapporoEvents, collectHokkaidoKushiroEvents, collectHokkaidoObihiroEvents,
  // 中部
  collectFukuiFukuikuEvents, collectGifuKakamigaharaEvents, collectGifuGifuEvents,
  collectShizuokaHamamatsuEvents, collectShizuokaCityEvents,
  collectAichiNagoyaEvents, collectAichiToyotaEvents, collectAichiKasugaiEvents, collectAichiIchinomiyaEvents,
  collectMieTsuEvents, collectNiigataCityKosodateEvents, collectToyamaToyamaEvents, collectToyamaKosodateNetEvents, collectIshikawaHakusanEvents, collectIshikawaOyacomiEvents, collectHappymamaIshikawaEvents, collectNaganoCheerfulEvents, collectYamanashiPrefEvents,
  // 中部(dead): collectNiigataKashiwazakiEvents, collectNiigataAganoEvents, collectNiigataSeiroEvents, collectToyamaHimiEvents, collectToyamaNamerikawaEvents, collectToyamaNyuzenEvents, collectToyamaAsahiTyEvents, collectIshikawaKomatsuEvents, collectIshikawaKagaEvents, collectIshikawaNakanotoEvents, collectYamanashiChuoEvents, collectNaganoMatsumotoEvents, collectNaganoSuzakaEvents, collectNaganoKomaganeEvents, collectNaganoIijimachoEvents, collectShizuokaFujiedaEvents, collectShizuokaSusonoEvents, collectShizuokaKosaiEvents, collectShizuokaIzuEvents, collectShizuokaKannamiEvents, collectAichiToyokawaEvents, collectAichiChiryuEvents, collectAichiMiyoshiEvents, collectAichiNagakuteEvents, collectAichiHigashiuraEvents, collectAichiOwariasahiEvents,
  // 近畿
  collectShigaOtsuEvents, collectShigaMoriyamaEvents, collectMieSuzukaEvents, collectMieMeiwaEvents, collectShigaHikoneEvents, collectShigaMaibaraEvents, collectKyotoMamafreEvents, collectKyotoWakutobiEvents, collectKyotoKameokaEvents, collectKyotoUjiEvents, collectOsakaIzumiotsuEvents, collectOsakaKaizukaEvents, collectOsakaMoriguchiEvents, collectOsakaIbarakiEvents, collectOsakaNeyagawaEvents, collectOsakaIzumiEvents, collectOsakaFujiideraEvents, collectOsakaSennanEvents, collectOsakaHannanEvents, collectOsakaKumatoriEvents, collectOsakaTakatsukiEvents, collectOsakaKishiwadaEvents, collectOsakaKawachinaganoEvents, collectOsakaSakaiEvents, collectOsakaSuitaEvents, collectHyogoAshiyaEvents, collectHyogoItamiEvents, collectHyogoKakogawaEvents, collectHyogoTatsunoEvents, collectHyogoShisoEvents, collectHyogoKatoEvents, collectHyogoInagawaEvents, collectNaraKashiharaEvents, collectNaraGojoEvents, collectNaraTawaramotoEvents, collectNaraOjiEvents, collectNaraSuperappEvents, collectWakayamaWakayamaEvents, collectWakayamaHashimotoEvents,
  // 中国・四国
  collectTottoriKosodateEvents, collectOkayamaKurashikiEvents, collectOkayamaMimasakaEvents, collectOkayamaHayashimaEvents, collectHiroshimaHiroshimaEvents, collectHiroshimaIkuchanEvents, collectHiroshimaOtakeEvents, collectHiroshimaHigashihiroshimaEvents, collectHiroshimaFukuyamaEvents, collectHiroshimaOnomichiEvents, collectHiroshimaMiharaEvents, collectHiroshimaHatsukaichiEvents, collectYamaguchiShimonosekiEvents, collectYamaguchiShunanEvents, collectYamaguchiUbeEvents, collectYamaguchiCalendarEvents, collectTokushimaTokushimaEvents, collectKagawaTakamatsuEvents, collectTakamatsuMiraieEvents, collectKagawaTonoshoEvents, collectKagawaMarugameEvents, collectKagawaSakaideEvents, collectEhimeSeiyoEvents, collectEhimeNiihamaEvents, collectEhimeSaijoEvents, collectEhimeKirakiraEvents, collectKochiKokohareEvents, collectOkayamaKosodateEvents,
  // 九州・沖縄
  collectFukuokaKitakyushuEvents, collectFukuokaKodomoEvents, collectKitakyushuGenkinomoriEvents, collectFukuokaFukutsuEvents, collectFukuokaShinguFkEvents, collectFukuokaHirokawaEvents, collectFukuokaNakagawaEvents, collectNagasakiNagasakiEvents, collectNagahapiEvents, collectNagasakiIkiEvents, collectNagasakiSaikaiEvents, collectNagasakiTogitsuEvents, collectSagaTosuEvents, collectSagaKosodateEvents, collectKumamotoKosodateEvents, collectOitaTaketaEvents, collectOitaKitsukiEvents, collectOitaKusuEvents, collectOitaOitaEvents, collectMiyazakiSukusukuEvents, collectMiyazakiKijoEvents, collectMiyazakiMiyakojoEvents, collectKagoshimaSatsumaEvents, collectKagoshimaYumesukusukuEvents, collectOkinawaNahaEvents, collectOkinawaKosodateEvents, collectOkinawaKitanakagusukuEvents, collectShizuokaAtamiEvents, collectShizuokaItoEvents, collectAichiKiyosuEvents, collectOkayamaKibichuoEvents, collectTokyoOtaMamafreEvents, collectIbarakiKamisuMamafreEvents, collectShizuokaFujiedaMamafreEvents, collectIkoyoEvents];
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

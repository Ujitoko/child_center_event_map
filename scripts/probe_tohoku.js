#!/usr/bin/env node
/**
 * 東北6県 全自治体 CMS自動probe
 * calendar.json / cal.php / list_calendar / municipal-calendar(RDF) / WordPress REST をチェック
 */

const TOHOKU = [
  // ========== 青森県 (40) ==========
  { pref: "青森県", key: "aomori_aomori", label: "青森市", domain: "www.city.aomori.aomori.jp" },
  { pref: "青森県", key: "aomori_hirosaki", label: "弘前市", domain: "www.city.hirosaki.aomori.jp" },
  { pref: "青森県", key: "aomori_hachinohe", label: "八戸市", domain: "www.city.hachinohe.aomori.jp" },
  { pref: "青森県", key: "aomori_kuroishi", label: "黒石市", domain: "www.city.kuroishi.aomori.jp" },
  { pref: "青森県", key: "aomori_goshoganawara", label: "五所川原市", domain: "www.city.goshogawara.lg.jp" },
  { pref: "青森県", key: "aomori_towada", label: "十和田市", domain: "www.city.towada.lg.jp" },
  { pref: "青森県", key: "aomori_misawa", label: "三沢市", domain: "www.city.misawa.lg.jp" },
  { pref: "青森県", key: "aomori_mutsu", label: "むつ市", domain: "www.city.mutsu.lg.jp" },
  { pref: "青森県", key: "aomori_tsugaru", label: "つがる市", domain: "www.city.tsugaru.aomori.jp" },
  { pref: "青森県", key: "aomori_hirakawa", label: "平川市", domain: "www.city.hirakawa.lg.jp" },
  { pref: "青森県", key: "aomori_hiranai", label: "平内町", domain: "www.town.hiranai.aomori.jp" },
  { pref: "青森県", key: "aomori_imabetsu", label: "今別町", domain: "www.town.imabetsu.lg.jp" },
  { pref: "青森県", key: "aomori_yomogita", label: "蓬田村", domain: "www.vill.yomogita.lg.jp" },
  { pref: "青森県", key: "aomori_sotogahama", label: "外ヶ浜町", domain: "www.town.sotogahama.lg.jp" },
  { pref: "青森県", key: "aomori_ajigasawa", label: "鰺ヶ沢町", domain: "www.town.ajigasawa.lg.jp" },
  { pref: "青森県", key: "aomori_fukaura", label: "深浦町", domain: "www.town.fukaura.lg.jp" },
  { pref: "青森県", key: "aomori_nishimeya", label: "西目屋村", domain: "www.nishimeya.jp" },
  { pref: "青森県", key: "aomori_fujisaki", label: "藤崎町", domain: "www.town.fujisaki.lg.jp" },
  { pref: "青森県", key: "aomori_owani", label: "大鰐町", domain: "www.town.owani.lg.jp" },
  { pref: "青森県", key: "aomori_inakadate", label: "田舎館村", domain: "www.vill.inakadate.lg.jp" },
  { pref: "青森県", key: "aomori_itayanagi", label: "板柳町", domain: "www.town.itayanagi.aomori.jp" },
  { pref: "青森県", key: "aomori_tsuruta", label: "鶴田町", domain: "www.town.tsuruta.lg.jp" },
  { pref: "青森県", key: "aomori_nakadomari", label: "中泊町", domain: "www.town.nakadomari.lg.jp" },
  { pref: "青森県", key: "aomori_noheji", label: "野辺地町", domain: "www.town.noheji.aomori.jp" },
  { pref: "青森県", key: "aomori_nanbu", label: "南部町", domain: "www.town.aomori-nanbu.lg.jp" },
  { pref: "青森県", key: "aomori_hashikami", label: "階上町", domain: "www.town.hashikami.lg.jp" },
  { pref: "青森県", key: "aomori_shingo", label: "新郷村", domain: "www.vill.shingo.aomori.jp" },
  { pref: "青森県", key: "aomori_shichinohe", label: "七戸町", domain: "www.town.shichinohe.lg.jp" },
  { pref: "青森県", key: "aomori_rokunohe", label: "六戸町", domain: "www.town.rokunohe.aomori.jp" },
  { pref: "青森県", key: "aomori_yokohama", label: "横浜町", domain: "www.town.yokohama.lg.jp" },
  { pref: "青森県", key: "aomori_tohoku", label: "東北町", domain: "www.town.tohoku.lg.jp" },
  { pref: "青森県", key: "aomori_oirase", label: "おいらせ町", domain: "www.town.oirase.aomori.jp" },
  { pref: "青森県", key: "aomori_oma", label: "大間町", domain: "www.town.oma.lg.jp" },
  { pref: "青森県", key: "aomori_kazamaura", label: "風間浦村", domain: "www.kazamaura.jp" },
  { pref: "青森県", key: "aomori_sai", label: "佐井村", domain: "www.vill.sai.lg.jp" },
  { pref: "青森県", key: "aomori_sannohe", label: "三戸町", domain: "www.town.sannohe.lg.jp" },
  { pref: "青森県", key: "aomori_gonohe", label: "五戸町", domain: "www.town.gonohe.lg.jp" },
  { pref: "青森県", key: "aomori_takko", label: "田子町", domain: "www.town.takko.lg.jp" },
  { pref: "青森県", key: "aomori_shirakami", label: "についてはスキップ", skip: true },
  // ========== 岩手県 (33) ==========
  { pref: "岩手県", key: "iwate_morioka", label: "盛岡市", domain: "www.city.morioka.iwate.jp" },
  { pref: "岩手県", key: "iwate_miyako", label: "宮古市", domain: "www.city.miyako.iwate.jp" },
  { pref: "岩手県", key: "iwate_ofunato", label: "大船渡市", domain: "www.city.ofunato.iwate.jp" },
  { pref: "岩手県", key: "iwate_hanamaki", label: "花巻市", domain: "www.city.hanamaki.iwate.jp" },
  { pref: "岩手県", key: "iwate_kitakami", label: "北上市", domain: "www.city.kitakami.iwate.jp" },
  { pref: "岩手県", key: "iwate_kuji", label: "久慈市", domain: "www.city.kuji.iwate.jp" },
  { pref: "岩手県", key: "iwate_tono", label: "遠野市", domain: "www.city.tono.iwate.jp" },
  { pref: "岩手県", key: "iwate_ichinoseki", label: "一関市", domain: "www.city.ichinoseki.iwate.jp" },
  { pref: "岩手県", key: "iwate_rikuzentakata", label: "陸前高田市", domain: "www.city.rikuzentakata.iwate.jp" },
  { pref: "岩手県", key: "iwate_kamaishi", label: "釜石市", domain: "www.city.kamaishi.iwate.jp" },
  { pref: "岩手県", key: "iwate_ninohe", label: "二戸市", domain: "www.city.ninohe.lg.jp" },
  { pref: "岩手県", key: "iwate_hachimantai", label: "八幡平市", domain: "www.city.hachimantai.lg.jp" },
  { pref: "岩手県", key: "iwate_oshu", label: "奥州市", domain: "www.city.oshu.iwate.jp" },
  { pref: "岩手県", key: "iwate_takizawa", label: "滝沢市", domain: "www.city.takizawa.iwate.jp" },
  { pref: "岩手県", key: "iwate_shizukuishi", label: "雫石町", domain: "www.town.shizukuishi.iwate.jp" },
  { pref: "岩手県", key: "iwate_kuzumaki", label: "葛巻町", domain: "www.town.kuzumaki.iwate.jp" },
  { pref: "岩手県", key: "iwate_iwategun", label: "岩手町", domain: "www.town.iwate.iwate.jp" },
  { pref: "岩手県", key: "iwate_shiwa", label: "紫波町", domain: "www.town.shiwa.iwate.jp" },
  { pref: "岩手県", key: "iwate_yahaba", label: "矢巾町", domain: "www.town.yahaba.iwate.jp" },
  { pref: "岩手県", key: "iwate_nishiwaga", label: "西和賀町", domain: "www.town.nishiwaga.lg.jp" },
  { pref: "岩手県", key: "iwate_kanegasaki", label: "金ケ崎町", domain: "www.town.kanegasaki.iwate.jp" },
  { pref: "岩手県", key: "iwate_hiraizumi", label: "平泉町", domain: "www.town.hiraizumi.iwate.jp" },
  { pref: "岩手県", key: "iwate_sumita", label: "住田町", domain: "www.town.sumita.iwate.jp" },
  { pref: "岩手県", key: "iwate_otsuchi", label: "大槌町", domain: "www.town.otsuchi.iwate.jp" },
  { pref: "岩手県", key: "iwate_yamada", label: "山田町", domain: "www.town.yamada.iwate.jp" },
  { pref: "岩手県", key: "iwate_iwaizumi", label: "岩泉町", domain: "www.town.iwaizumi.lg.jp" },
  { pref: "岩手県", key: "iwate_tanohata", label: "田野畑村", domain: "www.vill.tanohata.iwate.jp" },
  { pref: "岩手県", key: "iwate_fudai", label: "普代村", domain: "www.vill.fudai.iwate.jp" },
  { pref: "岩手県", key: "iwate_karumai", label: "軽米町", domain: "www.town.karumai.iwate.jp" },
  { pref: "岩手県", key: "iwate_noda", label: "野田村", domain: "www.vill.noda.iwate.jp" },
  { pref: "岩手県", key: "iwate_hirono", label: "洋野町", domain: "www.town.hirono.iwate.jp" },
  { pref: "岩手県", key: "iwate_ichinohe", label: "一戸町", domain: "www.town.ichinohe.iwate.jp" },
  // ========== 宮城県 (35) ==========
  { pref: "宮城県", key: "miyagi_sendai", label: "仙台市", domain: "www.city.sendai.jp" },
  { pref: "宮城県", key: "miyagi_ishinomaki", label: "石巻市", domain: "www.city.ishinomaki.lg.jp" },
  { pref: "宮城県", key: "miyagi_shiogama", label: "塩竈市", domain: "www.city.shiogama.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_kesennuma", label: "気仙沼市", domain: "www.city.kesennuma.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_shiroishi", label: "白石市", domain: "www.city.shiroishi.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_natori", label: "名取市", domain: "www.city.natori.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_kakuda", label: "角田市", domain: "www.city.kakuda.lg.jp" },
  { pref: "宮城県", key: "miyagi_tagajo", label: "多賀城市", domain: "www.city.tagajo.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_iwanuma", label: "岩沼市", domain: "www.city.iwanuma.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_tome", label: "登米市", domain: "www.city.tome.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_kurihara", label: "栗原市", domain: "www.city.kurihara.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_higashimatsushima", label: "東松島市", domain: "www.city.higashimatsushima.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_osaki", label: "大崎市", domain: "www.city.osaki.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_tomiya", label: "富谷市", domain: "www.tomiya-city.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_zao", label: "蔵王町", domain: "www.town.zao.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_shichikashuku", label: "七ヶ宿町", domain: "www.town.shichikashuku.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_ogawara", label: "大河原町", domain: "www.town.ogawara.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_murata", label: "村田町", domain: "www.town.murata.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_shibata", label: "柴田町", domain: "www.town.shibata.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_kawasaki_miy", label: "川崎町", domain: "www.town.kawasaki.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_marumori", label: "丸森町", domain: "www.town.marumori.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_watari", label: "亘理町", domain: "www.town.watari.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_yamamoto", label: "山元町", domain: "www.town.yamamoto.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_matsushima", label: "松島町", domain: "www.town.matsushima.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_shichigahama", label: "七ヶ浜町", domain: "www.shichigahama.com" },
  { pref: "宮城県", key: "miyagi_rifu", label: "利府町", domain: "www.town.rifu.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_taiwa", label: "大和町", domain: "www.town.taiwa.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_osato", label: "大郷町", domain: "www.town.miyagi-osato.lg.jp" },
  { pref: "宮城県", key: "miyagi_ohira", label: "大衡村", domain: "www.village.ohira.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_kami", label: "加美町", domain: "www.town.kami.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_shikama", label: "色麻町", domain: "www.town.shikama.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_wakuya", label: "涌谷町", domain: "www.town.wakuya.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_misato_miy", label: "美里町", domain: "www.town.misato.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_onagawa", label: "女川町", domain: "www.town.onagawa.miyagi.jp" },
  { pref: "宮城県", key: "miyagi_minamisanriku", label: "南三陸町", domain: "www.town.minamisanriku.miyagi.jp" },
  // ========== 秋田県 (25) ==========
  { pref: "秋田県", key: "akita_akita", label: "秋田市", domain: "www.city.akita.lg.jp" },
  { pref: "秋田県", key: "akita_noshiro", label: "能代市", domain: "www.city.noshiro.lg.jp" },
  { pref: "秋田県", key: "akita_yokote", label: "横手市", domain: "www.city.yokote.lg.jp" },
  { pref: "秋田県", key: "akita_odate", label: "大館市", domain: "www.city.odate.lg.jp" },
  { pref: "秋田県", key: "akita_oga", label: "男鹿市", domain: "www.city.oga.akita.jp" },
  { pref: "秋田県", key: "akita_yuzawa", label: "湯沢市", domain: "www.city-yuzawa.jp" },
  { pref: "秋田県", key: "akita_kazuno", label: "鹿角市", domain: "www.city.kazuno.akita.jp" },
  { pref: "秋田県", key: "akita_yurihonjyo", label: "由利本荘市", domain: "www.city.yurihonjo.lg.jp" },
  { pref: "秋田県", key: "akita_katagami", label: "潟上市", domain: "www.city.katagami.lg.jp" },
  { pref: "秋田県", key: "akita_daisen", label: "大仙市", domain: "www.city.daisen.lg.jp" },
  { pref: "秋田県", key: "akita_kitaakita", label: "北秋田市", domain: "www.city.kitaakita.akita.jp" },
  { pref: "秋田県", key: "akita_nikaho", label: "にかほ市", domain: "www.city.nikaho.lg.jp" },
  { pref: "秋田県", key: "akita_semboku", label: "仙北市", domain: "www.city.semboku.akita.jp" },
  { pref: "秋田県", key: "akita_kosaka", label: "小坂町", domain: "www.town.kosaka.akita.jp" },
  { pref: "秋田県", key: "akita_kamikoani", label: "上小阿仁村", domain: "www.vill.kamikoani.akita.jp" },
  { pref: "秋田県", key: "akita_fujisato", label: "藤里町", domain: "www.town.fujisato.lg.jp" },
  { pref: "秋田県", key: "akita_mitane", label: "三種町", domain: "www.town.mitane.akita.jp" },
  { pref: "秋田県", key: "akita_happo", label: "八峰町", domain: "www.town.happou.akita.jp" },
  { pref: "秋田県", key: "akita_gojome", label: "五城目町", domain: "www.town.gojome.akita.jp" },
  { pref: "秋田県", key: "akita_hachirogata", label: "八郎潟町", domain: "www.town.hachirogata.akita.jp" },
  { pref: "秋田県", key: "akita_ikawa", label: "井川町", domain: "www.town.ikawa.akita.jp" },
  { pref: "秋田県", key: "akita_misato_ak", label: "美郷町", domain: "www.town.misato.akita.jp" },
  { pref: "秋田県", key: "akita_ugo", label: "羽後町", domain: "www.town.ugo.lg.jp" },
  { pref: "秋田県", key: "akita_higashinaruse", label: "東成瀬村", domain: "www.higashinaruse.com" },
  { pref: "秋田県", key: "akita_ogata", label: "大潟村", domain: "www.vill.ogata.akita.jp" },
  // ========== 山形県 (35) ==========
  { pref: "山形県", key: "yamagata_yamagata", label: "山形市", domain: "www.city.yamagata-yamagata.lg.jp" },
  { pref: "山形県", key: "yamagata_yonezawa", label: "米沢市", domain: "www.city.yonezawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_tsuruoka", label: "鶴岡市", domain: "www.city.tsuruoka.lg.jp" },
  { pref: "山形県", key: "yamagata_sakata", label: "酒田市", domain: "www.city.sakata.lg.jp" },
  { pref: "山形県", key: "yamagata_shinjo", label: "新庄市", domain: "www.city.shinjo.yamagata.jp" },
  { pref: "山形県", key: "yamagata_sagae", label: "寒河江市", domain: "www.city.sagae.yamagata.jp" },
  { pref: "山形県", key: "yamagata_kaminoyama", label: "上山市", domain: "www.city.kaminoyama.yamagata.jp" },
  { pref: "山形県", key: "yamagata_murayama", label: "村山市", domain: "www.city.murayama.lg.jp" },
  { pref: "山形県", key: "yamagata_nagai", label: "長井市", domain: "www.city.nagai.yamagata.jp" },
  { pref: "山形県", key: "yamagata_tendo", label: "天童市", domain: "www.city.tendo.yamagata.jp" },
  { pref: "山形県", key: "yamagata_higashine", label: "東根市", domain: "www.city.higashine.yamagata.jp" },
  { pref: "山形県", key: "yamagata_obanazawa", label: "尾花沢市", domain: "www.city.obanazawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_nanyo", label: "南陽市", domain: "www.city.nanyo.yamagata.jp" },
  { pref: "山形県", key: "yamagata_yamanobe", label: "山辺町", domain: "www.town.yamanobe.yamagata.jp" },
  { pref: "山形県", key: "yamagata_nakayama", label: "中山町", domain: "www.town.nakayama.yamagata.jp" },
  { pref: "山形県", key: "yamagata_kahoku", label: "河北町", domain: "www.town.kahoku.yamagata.jp" },
  { pref: "山形県", key: "yamagata_nishikawa", label: "西川町", domain: "www.town.nishikawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_asahi_ym", label: "朝日町", domain: "www.town.asahi.yamagata.jp" },
  { pref: "山形県", key: "yamagata_oe", label: "大江町", domain: "www.town.oe.yamagata.jp" },
  { pref: "山形県", key: "yamagata_oishida", label: "大石田町", domain: "www.town.oishida.yamagata.jp" },
  { pref: "山形県", key: "yamagata_kaneyama", label: "金山町", domain: "www.town.kaneyama.yamagata.jp" },
  { pref: "山形県", key: "yamagata_mogami", label: "最上町", domain: "mogami.tv" },
  { pref: "山形県", key: "yamagata_funagata", label: "舟形町", domain: "www.town.funagata.yamagata.jp" },
  { pref: "山形県", key: "yamagata_mamurogawa", label: "真室川町", domain: "www.town.mamurogawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_okura", label: "大蔵村", domain: "www.vill.ohkura.yamagata.jp" },
  { pref: "山形県", key: "yamagata_tozawa", label: "戸沢村", domain: "www.vill.tozawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_takahata", label: "高畠町", domain: "www.town.takahata.yamagata.jp" },
  { pref: "山形県", key: "yamagata_kawanishi", label: "川西町", domain: "www.town.kawanishi.yamagata.jp" },
  { pref: "山形県", key: "yamagata_oguni", label: "小国町", domain: "www.town.oguni.yamagata.jp" },
  { pref: "山形県", key: "yamagata_shirataka", label: "白鷹町", domain: "www.town.shirataka.lg.jp" },
  { pref: "山形県", key: "yamagata_iide", label: "飯豊町", domain: "www.town.iide.yamagata.jp" },
  { pref: "山形県", key: "yamagata_mikawa", label: "三川町", domain: "www.town.mikawa.yamagata.jp" },
  { pref: "山形県", key: "yamagata_shonai", label: "庄内町", domain: "www.town.shonai.yamagata.jp" },
  { pref: "山形県", key: "yamagata_yuza", label: "遊佐町", domain: "www.town.yuza.yamagata.jp" },
  { pref: "山形県", key: "yamagata_sakegawa", label: "鮭川村", domain: "www.vill.sakegawa.yamagata.jp" },
  // ========== 福島県 (59) ==========
  { pref: "福島県", key: "fukushima_fukushima", label: "福島市", domain: "www.city.fukushima.fukushima.jp" },
  { pref: "福島県", key: "fukushima_aizuwakamatsu", label: "会津若松市", domain: "www.city.aizuwakamatsu.fukushima.jp" },
  { pref: "福島県", key: "fukushima_koriyama", label: "郡山市", domain: "www.city.koriyama.lg.jp" },
  { pref: "福島県", key: "fukushima_iwaki", label: "いわき市", domain: "www.city.iwaki.lg.jp" },
  { pref: "福島県", key: "fukushima_shirakawa", label: "白河市", domain: "www.city.shirakawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_sukagawa", label: "須賀川市", domain: "www.city.sukagawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kitakata", label: "喜多方市", domain: "www.city.kitakata.fukushima.jp" },
  { pref: "福島県", key: "fukushima_soma", label: "相馬市", domain: "www.city.soma.fukushima.jp" },
  { pref: "福島県", key: "fukushima_nihonmatsu", label: "二本松市", domain: "www.city.nihonmatsu.lg.jp" },
  { pref: "福島県", key: "fukushima_tamura", label: "田村市", domain: "www.city.tamura.lg.jp" },
  { pref: "福島県", key: "fukushima_minamisoma", label: "南相馬市", domain: "www.city.minamisoma.lg.jp" },
  { pref: "福島県", key: "fukushima_date", label: "伊達市", domain: "www.city.fukushima-date.lg.jp" },
  { pref: "福島県", key: "fukushima_motomiya", label: "本宮市", domain: "www.city.motomiya.lg.jp" },
  { pref: "福島県", key: "fukushima_koori", label: "桑折町", domain: "www.town.koori.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kunimi", label: "国見町", domain: "www.town.kunimi.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kawamata", label: "川俣町", domain: "www.town.kawamata.lg.jp" },
  { pref: "福島県", key: "fukushima_otama", label: "大玉村", domain: "www.vill.otama.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kagamiishi", label: "鏡石町", domain: "www.town.kagamiishi.fukushima.jp" },
  { pref: "福島県", key: "fukushima_tenei", label: "天栄村", domain: "www.vill.tenei.fukushima.jp" },
  { pref: "福島県", key: "fukushima_shimogo", label: "下郷町", domain: "www.town.shimogo.fukushima.jp" },
  { pref: "福島県", key: "fukushima_hinoemata", label: "檜枝岐村", domain: "www.vill.hinoemata.lg.jp" },
  { pref: "福島県", key: "fukushima_tadami", label: "只見町", domain: "www.town.tadami.lg.jp" },
  { pref: "福島県", key: "fukushima_minamiaizu", label: "南会津町", domain: "www.town.minamiaizu.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kitashiobara", label: "北塩原村", domain: "www.vill.kitashiobara.fukushima.jp" },
  { pref: "福島県", key: "fukushima_bandai", label: "磐梯町", domain: "www.town.bandai.fukushima.jp" },
  { pref: "福島県", key: "fukushima_inawashiro", label: "猪苗代町", domain: "www.town.inawashiro.fukushima.jp" },
  { pref: "福島県", key: "fukushima_aizubange", label: "会津坂下町", domain: "www.town.aizubange.fukushima.jp" },
  { pref: "福島県", key: "fukushima_yanaizu", label: "柳津町", domain: "www.town.yanaizu.fukushima.jp" },
  { pref: "福島県", key: "fukushima_mishima", label: "三島町", domain: "www.town.mishima.fukushima.jp" },
  { pref: "福島県", key: "fukushima_kaneyama_fk", label: "金山町", domain: "www.town.kaneyama.fukushima.jp" },
  { pref: "福島県", key: "fukushima_showamura", label: "昭和村", domain: "www.vill.showa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_aizumisato", label: "会津美里町", domain: "www.town.aizumisato.fukushima.jp" },
  { pref: "福島県", key: "fukushima_nishiaizu", label: "西会津町", domain: "www.town.nishiaizu.fukushima.jp" },
  { pref: "福島県", key: "fukushima_izumizaki", label: "泉崎村", domain: "www.vill.izumizaki.fukushima.jp" },
  { pref: "福島県", key: "fukushima_nakajima", label: "中島村", domain: "www.vill.nakajima.fukushima.jp" },
  { pref: "福島県", key: "fukushima_yabuki", label: "矢吹町", domain: "www.town.yabuki.fukushima.jp" },
  { pref: "福島県", key: "fukushima_tanagura", label: "棚倉町", domain: "www.town.tanagura.fukushima.jp" },
  { pref: "福島県", key: "fukushima_yamatsuri", label: "矢祭町", domain: "www.town.yamatsuri.fukushima.jp" },
  { pref: "福島県", key: "fukushima_hanawa", label: "塙町", domain: "www.town.hanawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_samegawa", label: "鮫川村", domain: "www.vill.samegawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_ishikawa", label: "石川町", domain: "www.town.ishikawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_tamakawa", label: "玉川村", domain: "www.vill.tamakawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_hirata", label: "平田村", domain: "www.vill.hirata.fukushima.jp" },
  { pref: "福島県", key: "fukushima_asakawa", label: "浅川町", domain: "www.town.asakawa.fukushima.jp" },
  { pref: "福島県", key: "fukushima_furudono", label: "古殿町", domain: "www.town.furudono.fukushima.jp" },
  { pref: "福島県", key: "fukushima_miharu", label: "三春町", domain: "www.town.miharu.fukushima.jp" },
  { pref: "福島県", key: "fukushima_ono", label: "小野町", domain: "www.town.ono.fukushima.jp" },
  { pref: "福島県", key: "fukushima_hirono_fk", label: "広野町", domain: "www.town.hirono.fukushima.jp" },
  { pref: "福島県", key: "fukushima_naraha", label: "楢葉町", domain: "www.town.naraha.lg.jp" },
  { pref: "福島県", key: "fukushima_tomioka", label: "富岡町", domain: "www.tomioka-town.jp" },
  { pref: "福島県", key: "fukushima_kawauchi", label: "川内村", domain: "www.kawauchimura.jp" },
  { pref: "福島県", key: "fukushima_okuma", label: "大熊町", domain: "www.town.okuma.fukushima.jp" },
  { pref: "福島県", key: "fukushima_futaba", label: "双葉町", domain: "www.town.futaba.fukushima.jp" },
  { pref: "福島県", key: "fukushima_namie", label: "浪江町", domain: "www.town.namie.fukushima.jp" },
  { pref: "福島県", key: "fukushima_katsurao", label: "葛尾村", domain: "www.katsurao.org" },
  { pref: "福島県", key: "fukushima_shinchi", label: "新地町", domain: "www.shinchi-town.jp" },
  { pref: "福島県", key: "fukushima_iitate", label: "飯舘村", domain: "www.vill.iitate.fukushima.jp" },
  { pref: "福島県", key: "fukushima_iidate2", skip: true }, // dup guard
  { pref: "福島県", key: "fukushima_otama2", skip: true }, // dup guard
];

const ACTIVE = TOHOKU.filter(m => !m.skip);

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: 0, text: async () => "", error: e.message };
  }
}

async function probeOne(muni) {
  const results = { key: muni.key, label: muni.label, pref: muni.pref, hits: [] };
  const base = `https://${muni.domain}`;
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ymDash = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // 1. calendar.json
  try {
    const res = await fetchWithTimeout(`${base}/calendar.json`);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("[") || text.startsWith("{")) {
        const data = JSON.parse(text);
        const count = Array.isArray(data) ? data.length : 0;
        results.hits.push({ type: "calendar.json", url: `${base}/calendar.json`, count });
      }
    }
  } catch {}

  // 2. cal.php
  for (const path of [`/cal.php?ym=${ym}`, `/cgi/cal.php?ym=${ym}`]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("calendarlist") || text.includes("calendar_day") || text.includes("<table")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "cal.php", url: `${base}${path}`, eventCount });
        }
      }
    } catch {}
  }

  // 3. list_calendar
  for (const path of [
    `/event/kosodate/calendar/list_calendar${ym}.html`,
    `/event/kosodate/calendar/list_calendar.html`,
    `/event/calendar/list_calendar${ym}.html`,
    `/event/list_calendar${ym}.html`,
  ]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("calendarlist") || text.includes("calendar_day")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "list_calendar", url: `${base}${path}`, eventCount });
          break;
        }
      }
    } catch {}
  }

  // 4. municipal-calendar (RDF/event pages)
  for (const path of [
    `/event/${ym}.html`,
    `/event2/${ym}.html`,
    `/miryoku/event/kosodate/calendar/${ym}.html`,
  ]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("event_day") || text.includes("calendar") || text.includes("イベント")) {
          const eventCount = (text.match(/<a\s+href=/gi) || []).length;
          results.hits.push({ type: "municipal-calendar", url: `${base}${path}`, eventCount });
          break;
        }
      }
    } catch {}
  }

  // 5. WordPress REST
  try {
    const res = await fetchWithTimeout(`${base}/wp-json/wp/v2/posts?per_page=5`);
    if (res.ok) {
      const text = await res.text();
      if (text.startsWith("[")) {
        const data = JSON.parse(text);
        results.hits.push({ type: "wordpress", url: `${base}/wp-json/wp/v2/posts`, count: data.length });
      }
    }
  } catch {}

  // 6. event_j.js (Joruri CMS)
  try {
    const res = await fetchWithTimeout(`${base}/calendar/event_j.js`);
    if (res.ok) {
      const text = await res.text();
      if (text.includes("eventlist") || text.includes("var ")) {
        results.hits.push({ type: "event_j.js", url: `${base}/calendar/event_j.js` });
      }
    }
  } catch {}

  return results;
}

async function main() {
  console.log(`東北6県 CMS probe: ${ACTIVE.length} municipalities`);
  console.log("=".repeat(60));

  const BATCH = 10;
  const allResults = [];

  for (let i = 0; i < ACTIVE.length; i += BATCH) {
    const batch = ACTIVE.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(m => probeOne(m)));
    allResults.push(...batchResults);

    for (const r of batchResults) {
      if (r.hits.length > 0) {
        console.log(`✓ ${r.pref} ${r.label} (${r.key})`);
        for (const h of r.hits) {
          console.log(`  ${h.type}: ${h.url} ${h.count != null ? `(${h.count} entries)` : ""} ${h.eventCount != null ? `(${h.eventCount} links)` : ""}`);
        }
      } else {
        console.log(`✗ ${r.pref} ${r.label}`);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  const byType = {};
  for (const r of allResults) {
    for (const h of r.hits) {
      if (!byType[h.type]) byType[h.type] = [];
      byType[h.type].push({ ...r, hit: h });
    }
  }

  for (const [type, entries] of Object.entries(byType)) {
    console.log(`\n${type} (${entries.length} hits):`);
    for (const e of entries) {
      console.log(`  ${e.pref} ${e.label}: ${e.hit.url} ${e.hit.count != null ? `(${e.hit.count})` : ""} ${e.hit.eventCount != null ? `(${e.hit.eventCount} links)` : ""}`);
    }
  }

  const hitCount = allResults.filter(r => r.hits.length > 0).length;
  console.log(`\nTotal: ${hitCount}/${ACTIVE.length} municipalities with at least one CMS pattern`);
}

main().catch(console.error);

#!/usr/bin/env node
/**
 * 中国5県 + 四国4県 全自治体 CMS自動probe
 */

const REGION = [
  // ========== 鳥取県 (19) ==========
  { pref: "鳥取県", key: "tottori_tottori", label: "鳥取市", domain: "www.city.tottori.lg.jp" },
  { pref: "鳥取県", key: "tottori_yonago", label: "米子市", domain: "www.city.yonago.lg.jp" },
  { pref: "鳥取県", key: "tottori_kurayoshi", label: "倉吉市", domain: "www.city.kurayoshi.lg.jp" },
  { pref: "鳥取県", key: "tottori_sakaiminato", label: "境港市", domain: "www.city.sakaiminato.lg.jp" },
  { pref: "鳥取県", key: "tottori_iwami", label: "岩美町", domain: "www.iwami.gr.jp" },
  { pref: "鳥取県", key: "tottori_wakasa_tt", label: "若桜町", domain: "www.town.wakasa.tottori.jp" },
  { pref: "鳥取県", key: "tottori_chizu", label: "智頭町", domain: "www.town.chizu.tottori.jp" },
  { pref: "鳥取県", key: "tottori_yazu", label: "八頭町", domain: "www.town.yazu.tottori.jp" },
  { pref: "鳥取県", key: "tottori_misasa", label: "三朝町", domain: "www.town.misasa.tottori.jp" },
  { pref: "鳥取県", key: "tottori_yurihama", label: "湯梨浜町", domain: "www.yurihama.jp" },
  { pref: "鳥取県", key: "tottori_kotoura", label: "琴浦町", domain: "www.town.kotoura.tottori.jp" },
  { pref: "鳥取県", key: "tottori_hokuei", label: "北栄町", domain: "www.e-hokuei.net" },
  { pref: "鳥取県", key: "tottori_hiezu", label: "日吉津村", domain: "www.vill.hiezu.tottori.jp" },
  { pref: "鳥取県", key: "tottori_daisen", label: "大山町", domain: "www.daisen.jp" },
  { pref: "鳥取県", key: "tottori_nanbu", label: "南部町", domain: "www.town.nanbu.tottori.jp" },
  { pref: "鳥取県", key: "tottori_hoki", label: "伯耆町", domain: "www.houki-town.jp" },
  { pref: "鳥取県", key: "tottori_nichinan", label: "日南町", domain: "www.town.nichinan.lg.jp" },
  { pref: "鳥取県", key: "tottori_hino", label: "日野町", domain: "www.town.hino.tottori.jp" },
  { pref: "鳥取県", key: "tottori_kofu_tt", label: "江府町", domain: "www.town-kofu.jp" },

  // ========== 島根県 (19) ==========
  { pref: "島根県", key: "shimane_matsue", label: "松江市", domain: "www.city.matsue.shimane.jp" },
  { pref: "島根県", key: "shimane_hamada", label: "浜田市", domain: "www.city.hamada.shimane.jp" },
  { pref: "島根県", key: "shimane_izumo", label: "出雲市", domain: "www.city.izumo.shimane.jp" },
  { pref: "島根県", key: "shimane_masuda", label: "益田市", domain: "www.city.masuda.lg.jp" },
  { pref: "島根県", key: "shimane_oda", label: "大田市", domain: "www.city.ohda.lg.jp" },
  { pref: "島根県", key: "shimane_yasugi", label: "安来市", domain: "www.city.yasugi.shimane.jp" },
  { pref: "島根県", key: "shimane_gotsu", label: "江津市", domain: "www.city.gotsu.lg.jp" },
  { pref: "島根県", key: "shimane_unnan", label: "雲南市", domain: "www.city.unnan.shimane.jp" },
  { pref: "島根県", key: "shimane_okuizumo", label: "奥出雲町", domain: "www.town.okuizumo.shimane.jp" },
  { pref: "島根県", key: "shimane_iinan", label: "飯南町", domain: "www.iinan.jp" },
  { pref: "島根県", key: "shimane_kawamoto", label: "川本町", domain: "www.town.shimane-kawamoto.lg.jp" },
  { pref: "島根県", key: "shimane_misato_sm", label: "美郷町", domain: "www.town.shimane-misato.lg.jp" },
  { pref: "島根県", key: "shimane_onan", label: "邑南町", domain: "www.town.ohnan.lg.jp" },
  { pref: "島根県", key: "shimane_tsuwano", label: "津和野町", domain: "www.town.tsuwano.lg.jp" },
  { pref: "島根県", key: "shimane_yoshika", label: "吉賀町", domain: "www.town.yoshika.lg.jp" },
  { pref: "島根県", key: "shimane_ama", label: "海士町", domain: "www.town.ama.shimane.jp" },
  { pref: "島根県", key: "shimane_nishinoshima", label: "西ノ島町", domain: "www.town.nishinoshima.shimane.jp" },
  { pref: "島根県", key: "shimane_chibu", label: "知夫村", domain: "www.vill.chibu.lg.jp" },
  { pref: "島根県", key: "shimane_okinoshima", label: "隠岐の島町", domain: "www.town.okinoshima.shimane.jp" },

  // ========== 岡山県 (27) ==========
  { pref: "岡山県", key: "okayama_okayama", label: "岡山市", domain: "www.city.okayama.jp" },
  { pref: "岡山県", key: "okayama_kurashiki", label: "倉敷市", domain: "www.city.kurashiki.okayama.jp" },
  { pref: "岡山県", key: "okayama_tsuyama", label: "津山市", domain: "www.city.tsuyama.lg.jp" },
  { pref: "岡山県", key: "okayama_tamano", label: "玉野市", domain: "www.city.tamano.lg.jp" },
  { pref: "岡山県", key: "okayama_kasaoka", label: "笠岡市", domain: "www.city.kasaoka.okayama.jp" },
  { pref: "岡山県", key: "okayama_ibara", label: "井原市", domain: "www.city.ibara.okayama.jp" },
  { pref: "岡山県", key: "okayama_soja", label: "総社市", domain: "www.city.soja.okayama.jp" },
  { pref: "岡山県", key: "okayama_takahashi", label: "高梁市", domain: "www.city.takahashi.lg.jp" },
  { pref: "岡山県", key: "okayama_niimi", label: "新見市", domain: "www.city.niimi.okayama.jp" },
  { pref: "岡山県", key: "okayama_bizen", label: "備前市", domain: "www.city.bizen.lg.jp" },
  { pref: "岡山県", key: "okayama_setouchi", label: "瀬戸内市", domain: "www.city.setouchi.lg.jp" },
  { pref: "岡山県", key: "okayama_akaiwa", label: "赤磐市", domain: "www.city.akaiwa.lg.jp" },
  { pref: "岡山県", key: "okayama_maniwa", label: "真庭市", domain: "www.city.maniwa.lg.jp" },
  { pref: "岡山県", key: "okayama_mimasaka", label: "美作市", domain: "www.city.mimasaka.lg.jp" },
  { pref: "岡山県", key: "okayama_asakuchi", label: "浅口市", domain: "www.city.asakuchi.lg.jp" },
  { pref: "岡山県", key: "okayama_wake", label: "和気町", domain: "www.town.wake.lg.jp" },
  { pref: "岡山県", key: "okayama_hayashima", label: "早島町", domain: "www.town.hayashima.lg.jp" },
  { pref: "岡山県", key: "okayama_satosho", label: "里庄町", domain: "www.town.satosho.okayama.jp" },
  { pref: "岡山県", key: "okayama_yakage", label: "矢掛町", domain: "www.town.yakage.lg.jp" },
  { pref: "岡山県", key: "okayama_kagamino", label: "鏡野町", domain: "www.town.kagamino.lg.jp" },
  { pref: "岡山県", key: "okayama_shoo", label: "勝央町", domain: "www.town.shoo.lg.jp" },
  { pref: "岡山県", key: "okayama_nagi", label: "奈義町", domain: "www.town.nagi.okayama.jp" },
  { pref: "岡山県", key: "okayama_nishiawakura", label: "西粟倉村", domain: "www.vill.nishiawakura.okayama.jp" },
  { pref: "岡山県", key: "okayama_kumenan", label: "久米南町", domain: "www.town.kumenan.lg.jp" },
  { pref: "岡山県", key: "okayama_misaki_ok", label: "美咲町", domain: "www.town.misaki.okayama.jp" },
  { pref: "岡山県", key: "okayama_kibichuo", label: "吉備中央町", domain: "www.town.kibichuo.lg.jp" },
  { pref: "岡山県", key: "okayama_shinjo_ok", label: "新庄村", domain: "www.vill.shinjo.okayama.jp" },

  // ========== 広島県 (23) ==========
  { pref: "広島県", key: "hiroshima_hiroshima", label: "広島市", domain: "www.city.hiroshima.lg.jp" },
  { pref: "広島県", key: "hiroshima_kure", label: "呉市", domain: "www.city.kure.lg.jp" },
  { pref: "広島県", key: "hiroshima_takehara", label: "竹原市", domain: "www.city.takehara.lg.jp" },
  { pref: "広島県", key: "hiroshima_mihara", label: "三原市", domain: "www.city.mihara.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_onomichi", label: "尾道市", domain: "www.city.onomichi.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_fukuyama", label: "福山市", domain: "www.city.fukuyama.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_fuchu", label: "府中市", domain: "www.city.fuchu.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_miyoshi_hr", label: "三次市", domain: "www.city.miyoshi.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_shobara", label: "庄原市", domain: "www.city.shobara.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_otake", label: "大竹市", domain: "www.city.otake.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_higashihiroshima", label: "東広島市", domain: "www.city.higashihiroshima.lg.jp" },
  { pref: "広島県", key: "hiroshima_hatsukaichi", label: "廿日市市", domain: "www.city.hatsukaichi.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_akitakata", label: "安芸高田市", domain: "www.akitakata.jp" },
  { pref: "広島県", key: "hiroshima_etajima", label: "江田島市", domain: "www.city.etajima.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_fuchu_cho", label: "府中町", domain: "www.town.fuchu.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_kaita", label: "海田町", domain: "www.town.kaita.lg.jp" },
  { pref: "広島県", key: "hiroshima_kumano_hr", label: "熊野町", domain: "www.town.kumano.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_saka", label: "坂町", domain: "www.town.saka.lg.jp" },
  { pref: "広島県", key: "hiroshima_akiota", label: "安芸太田町", domain: "www.akiota.jp" },
  { pref: "広島県", key: "hiroshima_kitahiroshima_hr", label: "北広島町", domain: "www.town.kitahiroshima.lg.jp" },
  { pref: "広島県", key: "hiroshima_osakikamijima", label: "大崎上島町", domain: "www.town.osakikamijima.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_sera", label: "世羅町", domain: "www.town.sera.hiroshima.jp" },
  { pref: "広島県", key: "hiroshima_jinsekikogen", label: "神石高原町", domain: "www.jinsekikogen.jp" },

  // ========== 山口県 (19) ==========
  { pref: "山口県", key: "yamaguchi_shimonoseki", label: "下関市", domain: "www.city.shimonoseki.lg.jp" },
  { pref: "山口県", key: "yamaguchi_ube", label: "宇部市", domain: "www.city.ube.yamaguchi.jp" },
  { pref: "山口県", key: "yamaguchi_yamaguchi", label: "山口市", domain: "www.city.yamaguchi.lg.jp" },
  { pref: "山口県", key: "yamaguchi_hagi", label: "萩市", domain: "www.city.hagi.lg.jp" },
  { pref: "山口県", key: "yamaguchi_hofu", label: "防府市", domain: "www.city.hofu.yamaguchi.jp" },
  { pref: "山口県", key: "yamaguchi_kudamatsu", label: "下松市", domain: "www.city.kudamatsu.lg.jp" },
  { pref: "山口県", key: "yamaguchi_iwakuni", label: "岩国市", domain: "www.city.iwakuni.lg.jp" },
  { pref: "山口県", key: "yamaguchi_hikari", label: "光市", domain: "www.city.hikari.lg.jp" },
  { pref: "山口県", key: "yamaguchi_nagato", label: "長門市", domain: "www.city.nagato.yamaguchi.jp" },
  { pref: "山口県", key: "yamaguchi_yanai", label: "柳井市", domain: "www.city-yanai.jp" },
  { pref: "山口県", key: "yamaguchi_mine", label: "美祢市", domain: "www.city.mine.lg.jp" },
  { pref: "山口県", key: "yamaguchi_shunan", label: "周南市", domain: "www.city.shunan.lg.jp" },
  { pref: "山口県", key: "yamaguchi_sanyo_onoda", label: "山陽小野田市", domain: "www.city.sanyo-onoda.lg.jp" },
  { pref: "山口県", key: "yamaguchi_suooshima", label: "周防大島町", domain: "www.town.suo-oshima.lg.jp" },
  { pref: "山口県", key: "yamaguchi_waki", label: "和木町", domain: "www.town.waki.lg.jp" },
  { pref: "山口県", key: "yamaguchi_kamijima", label: "上関町", domain: "www.town.kaminoseki.lg.jp" },
  { pref: "山口県", key: "yamaguchi_tabuse", label: "田布施町", domain: "www.town.tabuse.lg.jp" },
  { pref: "山口県", key: "yamaguchi_hirao", label: "平生町", domain: "www.town.hirao.lg.jp" },
  { pref: "山口県", key: "yamaguchi_abu", label: "阿武町", domain: "www.town.abu.lg.jp" },

  // ========== 徳島県 (24) ==========
  { pref: "徳島県", key: "tokushima_tokushima", label: "徳島市", domain: "www.city.tokushima.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_naruto", label: "鳴門市", domain: "www.city.naruto.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_komatsushima", label: "小松島市", domain: "www.city.komatsushima.lg.jp" },
  { pref: "徳島県", key: "tokushima_anan", label: "阿南市", domain: "www.city.anan.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_yoshinogawa", label: "吉野川市", domain: "www.city.yoshinogawa.lg.jp" },
  { pref: "徳島県", key: "tokushima_awa", label: "阿波市", domain: "www.city.awa.lg.jp" },
  { pref: "徳島県", key: "tokushima_mima", label: "美馬市", domain: "www.city.mima.lg.jp" },
  { pref: "徳島県", key: "tokushima_miyoshi_tk", label: "三好市", domain: "www.city.miyoshi.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_katsuura", label: "勝浦町", domain: "www.town.katsuura.lg.jp" },
  { pref: "徳島県", key: "tokushima_kamikatsu", label: "上勝町", domain: "www.kamikatsu.jp" },
  { pref: "徳島県", key: "tokushima_sanagochi", label: "佐那河内村", domain: "www.vill.sanagochi.lg.jp" },
  { pref: "徳島県", key: "tokushima_ishii", label: "石井町", domain: "www.town.ishii.lg.jp" },
  { pref: "徳島県", key: "tokushima_kamiyama", label: "神山町", domain: "www.town.kamiyama.lg.jp" },
  { pref: "徳島県", key: "tokushima_naka", label: "那賀町", domain: "www.town.tokushima-naka.lg.jp" },
  { pref: "徳島県", key: "tokushima_mugi", label: "牟岐町", domain: "www.town.mugi.lg.jp" },
  { pref: "徳島県", key: "tokushima_minami", label: "美波町", domain: "www.town.minami.lg.jp" },
  { pref: "徳島県", key: "tokushima_kaiyo", label: "海陽町", domain: "www.town.kaiyo.lg.jp" },
  { pref: "徳島県", key: "tokushima_matsushige", label: "松茂町", domain: "www.town.matsushige.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_kitajima", label: "北島町", domain: "www.town.kitajima.lg.jp" },
  { pref: "徳島県", key: "tokushima_aizumi", label: "藍住町", domain: "www.town.aizumi.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_itano", label: "板野町", domain: "www.town.itano.tokushima.jp" },
  { pref: "徳島県", key: "tokushima_kamiita", label: "上板町", domain: "www.town.kamiita.lg.jp" },
  { pref: "徳島県", key: "tokushima_tsurugi", label: "つるぎ町", domain: "www.town.tokushima-tsurugi.lg.jp" },
  { pref: "徳島県", key: "tokushima_higashimiyoshi", label: "東みよし町", domain: "www.town.higashimiyoshi.lg.jp" },

  // ========== 香川県 (17) ==========
  { pref: "香川県", key: "kagawa_takamatsu", label: "高松市", domain: "www.city.takamatsu.kagawa.jp" },
  { pref: "香川県", key: "kagawa_marugame", label: "丸亀市", domain: "www.city.marugame.lg.jp" },
  { pref: "香川県", key: "kagawa_sakaide", label: "坂出市", domain: "www.city.sakaide.lg.jp" },
  { pref: "香川県", key: "kagawa_zentsuji", label: "善通寺市", domain: "www.city.zentsuji.kagawa.jp" },
  { pref: "香川県", key: "kagawa_kanonji", label: "観音寺市", domain: "www.city.kanonji.kagawa.jp" },
  { pref: "香川県", key: "kagawa_sanuki", label: "さぬき市", domain: "www.city.sanuki.kagawa.jp" },
  { pref: "香川県", key: "kagawa_higashikagawa", label: "東かがわ市", domain: "www.city.higashikagawa.lg.jp" },
  { pref: "香川県", key: "kagawa_mitoyo", label: "三豊市", domain: "www.city.mitoyo.lg.jp" },
  { pref: "香川県", key: "kagawa_tonosho", label: "土庄町", domain: "www.town.tonosho.kagawa.jp" },
  { pref: "香川県", key: "kagawa_shodoshima", label: "小豆島町", domain: "www.town.shodoshima.lg.jp" },
  { pref: "香川県", key: "kagawa_miki", label: "三木町", domain: "www.town.miki.lg.jp" },
  { pref: "香川県", key: "kagawa_naoshima", label: "直島町", domain: "www.town.naoshima.lg.jp" },
  { pref: "香川県", key: "kagawa_utazu", label: "宇多津町", domain: "www.town.utazu.kagawa.jp" },
  { pref: "香川県", key: "kagawa_ayagawa", label: "綾川町", domain: "www.town.ayagawa.lg.jp" },
  { pref: "香川県", key: "kagawa_kotohira", label: "琴平町", domain: "www.town.kotohira.kagawa.jp" },
  { pref: "香川県", key: "kagawa_tadotsu", label: "多度津町", domain: "www.town.tadotsu.kagawa.jp" },
  { pref: "香川県", key: "kagawa_manno", label: "まんのう町", domain: "www.town.manno.lg.jp" },

  // ========== 愛媛県 (20) ==========
  { pref: "愛媛県", key: "ehime_matsuyama", label: "松山市", domain: "www.city.matsuyama.ehime.jp" },
  { pref: "愛媛県", key: "ehime_imabari", label: "今治市", domain: "www.city.imabari.ehime.jp" },
  { pref: "愛媛県", key: "ehime_uwajima", label: "宇和島市", domain: "www.city.uwajima.ehime.jp" },
  { pref: "愛媛県", key: "ehime_yawatahama", label: "八幡浜市", domain: "www.city.yawatahama.ehime.jp" },
  { pref: "愛媛県", key: "ehime_niihama", label: "新居浜市", domain: "www.city.niihama.lg.jp" },
  { pref: "愛媛県", key: "ehime_saijo", label: "西条市", domain: "www.city.saijo.ehime.jp" },
  { pref: "愛媛県", key: "ehime_ozu", label: "大洲市", domain: "www.city.ozu.ehime.jp" },
  { pref: "愛媛県", key: "ehime_iyo", label: "伊予市", domain: "www.city.iyo.lg.jp" },
  { pref: "愛媛県", key: "ehime_shikokuchuo", label: "四国中央市", domain: "www.city.shikokuchuo.ehime.jp" },
  { pref: "愛媛県", key: "ehime_seiyo", label: "西予市", domain: "www.city.seiyo.ehime.jp" },
  { pref: "愛媛県", key: "ehime_toon", label: "東温市", domain: "www.city.toon.ehime.jp" },
  { pref: "愛媛県", key: "ehime_kamijima", label: "上島町", domain: "www.town.kamijima.ehime.jp" },
  { pref: "愛媛県", key: "ehime_kumakogen", label: "久万高原町", domain: "www.kumakogen.jp" },
  { pref: "愛媛県", key: "ehime_matsuno", label: "松野町", domain: "www.town.matsuno.ehime.jp" },
  { pref: "愛媛県", key: "ehime_kihoku", label: "鬼北町", domain: "www.town.kihoku.ehime.jp" },
  { pref: "愛媛県", key: "ehime_ainan", label: "愛南町", domain: "www.town.ainan.ehime.jp" },
  { pref: "愛媛県", key: "ehime_masaki", label: "松前町", domain: "www.town.masaki.ehime.jp" },
  { pref: "愛媛県", key: "ehime_tobe", label: "砥部町", domain: "www.town.tobe.ehime.jp" },
  { pref: "愛媛県", key: "ehime_uchiko", label: "内子町", domain: "www.town.uchiko.ehime.jp" },
  { pref: "愛媛県", key: "ehime_ikata", label: "伊方町", domain: "www.town.ikata.ehime.jp" },

  // ========== 高知県 (34) ==========
  { pref: "高知県", key: "kochi_kochi", label: "高知市", domain: "www.city.kochi.kochi.jp" },
  { pref: "高知県", key: "kochi_muroto", label: "室戸市", domain: "www.city.muroto.kochi.jp" },
  { pref: "高知県", key: "kochi_aki", label: "安芸市", domain: "www.city.aki.kochi.jp" },
  { pref: "高知県", key: "kochi_nankoku", label: "南国市", domain: "www.city.nankoku.lg.jp" },
  { pref: "高知県", key: "kochi_tosa", label: "土佐市", domain: "www.city.tosa.lg.jp" },
  { pref: "高知県", key: "kochi_susaki", label: "須崎市", domain: "www.city.susaki.lg.jp" },
  { pref: "高知県", key: "kochi_sukumo", label: "宿毛市", domain: "www.city.sukumo.kochi.jp" },
  { pref: "高知県", key: "kochi_tosashimizu", label: "土佐清水市", domain: "www.city.tosashimizu.kochi.jp" },
  { pref: "高知県", key: "kochi_shimanto", label: "四万十市", domain: "www.city.shimanto.lg.jp" },
  { pref: "高知県", key: "kochi_konan", label: "香南市", domain: "www.city.kochi-konan.lg.jp" },
  { pref: "高知県", key: "kochi_kami", label: "香美市", domain: "www.city.kami.kochi.jp" },
  { pref: "高知県", key: "kochi_toyo", label: "東洋町", domain: "www.town.toyo.kochi.jp" },
  { pref: "高知県", key: "kochi_nahari", label: "奈半利町", domain: "www.town.nahari.kochi.jp" },
  { pref: "高知県", key: "kochi_tano", label: "田野町", domain: "www.town.tano.kochi.jp" },
  { pref: "高知県", key: "kochi_yasuda", label: "安田町", domain: "www.town.yasuda.kochi.jp" },
  { pref: "高知県", key: "kochi_kitagawa", label: "北川村", domain: "www.vill.kitagawa.kochi.jp" },
  { pref: "高知県", key: "kochi_umaji", label: "馬路村", domain: "www.vill.umaji.kochi.jp" },
  { pref: "高知県", key: "kochi_geisei", label: "芸西村", domain: "www.vill.geisei.kochi.jp" },
  { pref: "高知県", key: "kochi_motoyama", label: "本山町", domain: "www.town.motoyama.kochi.jp" },
  { pref: "高知県", key: "kochi_otoyo", label: "大豊町", domain: "www.town.otoyo.kochi.jp" },
  { pref: "高知県", key: "kochi_tosacho", label: "土佐町", domain: "www.town.tosa.kochi.jp" },
  { pref: "高知県", key: "kochi_ino", label: "いの町", domain: "www.town.ino.kochi.jp" },
  { pref: "高知県", key: "kochi_niyodogawa", label: "仁淀川町", domain: "www.town.niyodogawa.lg.jp" },
  { pref: "高知県", key: "kochi_nakatosa", label: "中土佐町", domain: "www.town.nakatosa.lg.jp" },
  { pref: "高知県", key: "kochi_sakawa", label: "佐川町", domain: "www.town.sakawa.lg.jp" },
  { pref: "高知県", key: "kochi_ochi", label: "越知町", domain: "www.town.ochi.kochi.jp" },
  { pref: "高知県", key: "kochi_yusuhara", label: "梼原町", domain: "www.town.yusuhara.kochi.jp" },
  { pref: "高知県", key: "kochi_tsuno", label: "津野町", domain: "www.town.kochi-tsuno.lg.jp" },
  { pref: "高知県", key: "kochi_shimanto_cho", label: "四万十町", domain: "www.town.shimanto.lg.jp" },
  { pref: "高知県", key: "kochi_otsuki", label: "大月町", domain: "www.town.otsuki.kochi.jp" },
  { pref: "高知県", key: "kochi_mihara_kc", label: "三原村", domain: "www.vill.mihara.kochi.jp" },
  { pref: "高知県", key: "kochi_kuroshio", label: "黒潮町", domain: "www.town.kuroshio.lg.jp" },
  { pref: "高知県", key: "kochi_okawa", label: "大川村", domain: "www.vill.okawa.kochi.jp" },
  { pref: "高知県", key: "kochi_hidaka_kc", label: "日高村", domain: "www.vill.hidaka.kochi.jp" },
];

const ACTIVE = REGION.filter(m => !m.skip);

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }, signal: controller.signal, redirect: "follow" });
    clearTimeout(timer); return res;
  } catch (e) { clearTimeout(timer); return { ok: false, status: 0, text: async () => "", error: e.message }; }
}

async function probeOne(muni) {
  const results = { key: muni.key, label: muni.label, pref: muni.pref, hits: [] };
  const base = `https://${muni.domain}`;
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  try { const res = await fetchWithTimeout(`${base}/calendar.json`); if (res.ok) { const text = await res.text(); if (text.startsWith("[") || text.startsWith("{")) { const data = JSON.parse(text); results.hits.push({ type: "calendar.json", url: `${base}/calendar.json`, count: Array.isArray(data) ? data.length : 0 }); } } } catch {}
  for (const path of [`/cal.php?ym=${ym}`, `/cgi/cal.php?ym=${ym}`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("calendarlist") || text.includes("calendar_day") || text.includes("<table")) { results.hits.push({ type: "cal.php", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); } } } catch {} }
  for (const path of [`/event/kosodate/calendar/list_calendar${ym}.html`, `/event/kosodate/calendar/list_calendar.html`, `/event/calendar/list_calendar${ym}.html`, `/event/list_calendar${ym}.html`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("calendarlist") || text.includes("calendar_day")) { results.hits.push({ type: "list_calendar", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); break; } } } catch {} }
  for (const path of [`/event/${ym}.html`, `/event2/${ym}.html`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("event_day") || text.includes("calendar") || text.includes("イベント")) { results.hits.push({ type: "municipal-calendar", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); break; } } } catch {} }
  try { const res = await fetchWithTimeout(`${base}/wp-json/wp/v2/posts?per_page=5`); if (res.ok) { const text = await res.text(); if (text.startsWith("[")) { results.hits.push({ type: "wordpress", url: `${base}/wp-json/wp/v2/posts`, count: JSON.parse(text).length }); } } } catch {}
  for (const path of ["/calendar/event_j.js", "/event_j.js"]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("eventlist") || text.includes("var ")) { results.hits.push({ type: "event_j.js", url: `${base}${path}` }); break; } } } catch {} }

  return results;
}

async function main() {
  console.log(`中国・四国9県 CMS probe: ${ACTIVE.length} municipalities`);
  console.log("=".repeat(60));
  const BATCH = 10; const allResults = [];
  for (let i = 0; i < ACTIVE.length; i += BATCH) {
    const batch = ACTIVE.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(m => probeOne(m)));
    allResults.push(...batchResults);
    for (const r of batchResults) { if (r.hits.length > 0) { console.log(`✓ ${r.pref} ${r.label} (${r.key})`); for (const h of r.hits) console.log(`  ${h.type}: ${h.url} ${h.count != null ? `(${h.count} entries)` : ""} ${h.eventCount != null ? `(${h.eventCount} links)` : ""}`); } }
  }
  console.log("\n" + "=".repeat(60)); console.log("SUMMARY");
  const byType = {};
  for (const r of allResults) for (const h of r.hits) { if (!byType[h.type]) byType[h.type] = []; byType[h.type].push({ ...r, hit: h }); }
  for (const [type, entries] of Object.entries(byType)) { console.log(`\n${type} (${entries.length} hits):`); for (const e of entries) console.log(`  ${e.pref} ${e.label}: ${e.hit.url} ${e.hit.count != null ? `(${e.hit.count})` : ""} ${e.hit.eventCount != null ? `(${e.hit.eventCount} links)` : ""}`); }
  console.log(`\nTotal: ${allResults.filter(r => r.hits.length > 0).length}/${ACTIVE.length} municipalities with at least one CMS pattern`);
}
main().catch(console.error);

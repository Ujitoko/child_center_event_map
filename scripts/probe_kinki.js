#!/usr/bin/env node
/**
 * 近畿7府県 全自治体 CMS自動probe
 * 三重, 滋賀, 京都, 大阪, 兵庫, 奈良, 和歌山
 */

const KINKI = [
  // ========== 三重県 (29) ==========
  { pref: "三重県", key: "mie_tsu", label: "津市", domain: "www.info.city.tsu.mie.jp" },
  { pref: "三重県", key: "mie_yokkaichi", label: "四日市市", domain: "www.city.yokkaichi.lg.jp" },
  { pref: "三重県", key: "mie_ise", label: "伊勢市", domain: "www.city.ise.mie.jp" },
  { pref: "三重県", key: "mie_matsusaka", label: "松阪市", domain: "www.city.matsusaka.mie.jp" },
  { pref: "三重県", key: "mie_kuwana", label: "桑名市", domain: "www.city.kuwana.lg.jp" },
  { pref: "三重県", key: "mie_suzuka", label: "鈴鹿市", domain: "www.city.suzuka.lg.jp" },
  { pref: "三重県", key: "mie_nabari", label: "名張市", domain: "www.city.nabari.lg.jp" },
  { pref: "三重県", key: "mie_owase", label: "尾鷲市", domain: "www.city.owase.lg.jp" },
  { pref: "三重県", key: "mie_kameyama", label: "亀山市", domain: "www.city.kameyama.mie.jp" },
  { pref: "三重県", key: "mie_toba", label: "鳥羽市", domain: "www.city.toba.mie.jp" },
  { pref: "三重県", key: "mie_kumano", label: "熊野市", domain: "www.city.kumano.mie.jp" },
  { pref: "三重県", key: "mie_inabe", label: "いなべ市", domain: "www.city.inabe.mie.jp" },
  { pref: "三重県", key: "mie_shima", label: "志摩市", domain: "www.city.shima.mie.jp" },
  { pref: "三重県", key: "mie_iga", label: "伊賀市", domain: "www.city.iga.lg.jp" },
  { pref: "三重県", key: "mie_kisosaki", label: "木曽岬町", domain: "www.town.kisosaki.lg.jp" },
  { pref: "三重県", key: "mie_toin", label: "東員町", domain: "www.town.toin.lg.jp" },
  { pref: "三重県", key: "mie_komono", label: "菰野町", domain: "www.town.komono.mie.jp" },
  { pref: "三重県", key: "mie_asahi", label: "朝日町", domain: "www.town.asahi.mie.jp" },
  { pref: "三重県", key: "mie_kawagoe", label: "川越町", domain: "www.town.kawagoe.mie.jp" },
  { pref: "三重県", key: "mie_taki", label: "多気町", domain: "www.town.taki.mie.jp" },
  { pref: "三重県", key: "mie_meiwa", label: "明和町", domain: "www.town.meiwa.mie.jp" },
  { pref: "三重県", key: "mie_odai", label: "大台町", domain: "www.town.odai.lg.jp" },
  { pref: "三重県", key: "mie_watarai", label: "度会町", domain: "www.town.watarai.lg.jp" },
  { pref: "三重県", key: "mie_taiki_mie", label: "大紀町", domain: "www.town.taiki.mie.jp" },
  { pref: "三重県", key: "mie_minamiise", label: "南伊勢町", domain: "www.town.minamiise.lg.jp" },
  { pref: "三重県", key: "mie_kihoku", label: "紀北町", domain: "www.town.mie-kihoku.lg.jp" },
  { pref: "三重県", key: "mie_mihama_mie", label: "御浜町", domain: "www.town.mihama.mie.jp" },
  { pref: "三重県", key: "mie_kiho", label: "紀宝町", domain: "www.town.kiho.lg.jp" },
  { pref: "三重県", key: "mie_tamaki", label: "玉城町", domain: "www.town.tamaki.mie.jp" },

  // ========== 滋賀県 (19) ==========
  { pref: "滋賀県", key: "shiga_otsu", label: "大津市", domain: "www.city.otsu.lg.jp" },
  { pref: "滋賀県", key: "shiga_hikone", label: "彦根市", domain: "www.city.hikone.lg.jp" },
  { pref: "滋賀県", key: "shiga_nagahama", label: "長浜市", domain: "www.city.nagahama.lg.jp" },
  { pref: "滋賀県", key: "shiga_omihachiman", label: "近江八幡市", domain: "www.city.omihachiman.lg.jp" },
  { pref: "滋賀県", key: "shiga_kusatsu", label: "草津市", domain: "www.city.kusatsu.shiga.jp" },
  { pref: "滋賀県", key: "shiga_moriyama", label: "守山市", domain: "www.city.moriyama.lg.jp" },
  { pref: "滋賀県", key: "shiga_ritto", label: "栗東市", domain: "www.city.ritto.lg.jp" },
  { pref: "滋賀県", key: "shiga_koka", label: "甲賀市", domain: "www.city.koka.lg.jp" },
  { pref: "滋賀県", key: "shiga_yasu", label: "野洲市", domain: "www.city.yasu.lg.jp" },
  { pref: "滋賀県", key: "shiga_konan", label: "湖南市", domain: "www.city.konan.lg.jp" },
  { pref: "滋賀県", key: "shiga_takashima", label: "高島市", domain: "www.city.takashima.lg.jp" },
  { pref: "滋賀県", key: "shiga_higashiomi", label: "東近江市", domain: "www.city.higashiomi.shiga.jp" },
  { pref: "滋賀県", key: "shiga_maibara", label: "米原市", domain: "www.city.maibara.lg.jp" },
  { pref: "滋賀県", key: "shiga_hino", label: "日野町", domain: "www.town.shiga-hino.lg.jp" },
  { pref: "滋賀県", key: "shiga_ryuo", label: "竜王町", domain: "www.town.ryuoh.shiga.jp" },
  { pref: "滋賀県", key: "shiga_aisho", label: "愛荘町", domain: "www.town.aisho.shiga.jp" },
  { pref: "滋賀県", key: "shiga_toyosato", label: "豊郷町", domain: "www.town.toyosato.shiga.jp" },
  { pref: "滋賀県", key: "shiga_koura", label: "甲良町", domain: "www.town.koura.shiga.jp" },
  { pref: "滋賀県", key: "shiga_taga", label: "多賀町", domain: "www.town.taga.lg.jp" },

  // ========== 京都府 (26) ==========
  { pref: "京都府", key: "kyoto_kyoto", label: "京都市", domain: "www.city.kyoto.lg.jp" },
  { pref: "京都府", key: "kyoto_fukuchiyama", label: "福知山市", domain: "www.city.fukuchiyama.lg.jp" },
  { pref: "京都府", key: "kyoto_maizuru", label: "舞鶴市", domain: "www.city.maizuru.kyoto.jp" },
  { pref: "京都府", key: "kyoto_ayabe", label: "綾部市", domain: "www.city.ayabe.lg.jp" },
  { pref: "京都府", key: "kyoto_uji", label: "宇治市", domain: "www.city.uji.kyoto.jp" },
  { pref: "京都府", key: "kyoto_miyazu", label: "宮津市", domain: "www.city.miyazu.kyoto.jp" },
  { pref: "京都府", key: "kyoto_kameoka", label: "亀岡市", domain: "www.city.kameoka.kyoto.jp" },
  { pref: "京都府", key: "kyoto_joyo", label: "城陽市", domain: "www.city.joyo.kyoto.jp" },
  { pref: "京都府", key: "kyoto_muko", label: "向日市", domain: "www.city.muko.kyoto.jp" },
  { pref: "京都府", key: "kyoto_nagaokakyo", label: "長岡京市", domain: "www.city.nagaokakyo.lg.jp" },
  { pref: "京都府", key: "kyoto_yawata", label: "八幡市", domain: "www.city.yawata.kyoto.jp" },
  { pref: "京都府", key: "kyoto_kyotanabe", label: "京田辺市", domain: "www.kyotanabe.jp" },
  { pref: "京都府", key: "kyoto_kyotango", label: "京丹後市", domain: "www.city.kyotango.lg.jp" },
  { pref: "京都府", key: "kyoto_nantan", label: "南丹市", domain: "www.city.nantan.kyoto.jp" },
  { pref: "京都府", key: "kyoto_kizugawa", label: "木津川市", domain: "www.city.kizugawa.lg.jp" },
  { pref: "京都府", key: "kyoto_oyamazaki", label: "大山崎町", domain: "www.town.oyamazaki.kyoto.jp" },
  { pref: "京都府", key: "kyoto_kumiyama", label: "久御山町", domain: "www.town.kumiyama.lg.jp" },
  { pref: "京都府", key: "kyoto_ide", label: "井手町", domain: "www.town.ide.kyoto.jp" },
  { pref: "京都府", key: "kyoto_ujitawara", label: "宇治田原町", domain: "www.town.ujitawara.kyoto.jp" },
  { pref: "京都府", key: "kyoto_wazuka", label: "和束町", domain: "www.town.wazuka.lg.jp" },
  { pref: "京都府", key: "kyoto_seika", label: "精華町", domain: "www.town.seika.kyoto.jp" },
  { pref: "京都府", key: "kyoto_minamiyamashiro", label: "南山城村", domain: "www.vill.minamiyamashiro.lg.jp" },
  { pref: "京都府", key: "kyoto_kyotamba", label: "京丹波町", domain: "www.town.kyotamba.kyoto.jp" },
  { pref: "京都府", key: "kyoto_ine", label: "伊根町", domain: "www.town.ine.kyoto.jp" },
  { pref: "京都府", key: "kyoto_yosano", label: "与謝野町", domain: "www.town.yosano.lg.jp" },
  { pref: "京都府", key: "kyoto_kasagi", label: "笠置町", domain: "www.town.kasagi.lg.jp" },

  // ========== 大阪府 (43) ==========
  { pref: "大阪府", key: "osaka_osaka", label: "大阪市", domain: "www.city.osaka.lg.jp" },
  { pref: "大阪府", key: "osaka_sakai", label: "堺市", domain: "www.city.sakai.lg.jp" },
  { pref: "大阪府", key: "osaka_kishiwada", label: "岸和田市", domain: "www.city.kishiwada.osaka.jp" },
  { pref: "大阪府", key: "osaka_toyonaka", label: "豊中市", domain: "www.city.toyonaka.osaka.jp" },
  { pref: "大阪府", key: "osaka_ikeda", label: "池田市", domain: "www.city.ikeda.osaka.jp" },
  { pref: "大阪府", key: "osaka_suita", label: "吹田市", domain: "www.city.suita.osaka.jp" },
  { pref: "大阪府", key: "osaka_izumiotsu", label: "泉大津市", domain: "www.city.izumiotsu.lg.jp" },
  { pref: "大阪府", key: "osaka_takatsuki", label: "高槻市", domain: "www.city.takatsuki.osaka.jp" },
  { pref: "大阪府", key: "osaka_kaizuka", label: "貝塚市", domain: "www.city.kaizuka.lg.jp" },
  { pref: "大阪府", key: "osaka_moriguchi", label: "守口市", domain: "www.city.moriguchi.osaka.jp" },
  { pref: "大阪府", key: "osaka_hirakata", label: "枚方市", domain: "www.city.hirakata.osaka.jp" },
  { pref: "大阪府", key: "osaka_ibaraki", label: "茨木市", domain: "www.city.ibaraki.osaka.jp" },
  { pref: "大阪府", key: "osaka_yao", label: "八尾市", domain: "www.city.yao.osaka.jp" },
  { pref: "大阪府", key: "osaka_izumisano", label: "泉佐野市", domain: "www.city.izumisano.lg.jp" },
  { pref: "大阪府", key: "osaka_tondabayashi", label: "富田林市", domain: "www.city.tondabayashi.lg.jp" },
  { pref: "大阪府", key: "osaka_neyagawa", label: "寝屋川市", domain: "www.city.neyagawa.osaka.jp" },
  { pref: "大阪府", key: "osaka_kawachinagano", label: "河内長野市", domain: "www.city.kawachinagano.lg.jp" },
  { pref: "大阪府", key: "osaka_matsubara", label: "松原市", domain: "www.city.matsubara.lg.jp" },
  { pref: "大阪府", key: "osaka_daito", label: "大東市", domain: "www.city.daito.lg.jp" },
  { pref: "大阪府", key: "osaka_izumi", label: "和泉市", domain: "www.city.osaka-izumi.lg.jp" },
  { pref: "大阪府", key: "osaka_minoo", label: "箕面市", domain: "www.city.minoh.lg.jp" },
  { pref: "大阪府", key: "osaka_kashiwara", label: "柏原市", domain: "www.city.kashiwara.osaka.jp" },
  { pref: "大阪府", key: "osaka_habikino", label: "羽曳野市", domain: "www.city.habikino.lg.jp" },
  { pref: "大阪府", key: "osaka_kadoma", label: "門真市", domain: "www.city.kadoma.osaka.jp" },
  { pref: "大阪府", key: "osaka_settsu", label: "摂津市", domain: "www.city.settsu.osaka.jp" },
  { pref: "大阪府", key: "osaka_takaishi", label: "高石市", domain: "www.city.takaishi.lg.jp" },
  { pref: "大阪府", key: "osaka_fujiidera", label: "藤井寺市", domain: "www.city.fujiidera.lg.jp" },
  { pref: "大阪府", key: "osaka_higashiosaka", label: "東大阪市", domain: "www.city.higashiosaka.lg.jp" },
  { pref: "大阪府", key: "osaka_sennan", label: "泉南市", domain: "www.city.sennan.lg.jp" },
  { pref: "大阪府", key: "osaka_shijonawate", label: "四條畷市", domain: "www.city.shijonawate.lg.jp" },
  { pref: "大阪府", key: "osaka_katano", label: "交野市", domain: "www.city.katano.osaka.jp" },
  { pref: "大阪府", key: "osaka_osakasayama", label: "大阪狭山市", domain: "www.city.osakasayama.osaka.jp" },
  { pref: "大阪府", key: "osaka_hannan", label: "阪南市", domain: "www.city.hannan.lg.jp" },
  { pref: "大阪府", key: "osaka_shimamoto", label: "島本町", domain: "www.town.shimamoto.lg.jp" },
  { pref: "大阪府", key: "osaka_toyono", label: "豊能町", domain: "www.town.toyono.osaka.jp" },
  { pref: "大阪府", key: "osaka_nose", label: "能勢町", domain: "www.town.nose.osaka.jp" },
  { pref: "大阪府", key: "osaka_tadaoka", label: "忠岡町", domain: "www.town.tadaoka.osaka.jp" },
  { pref: "大阪府", key: "osaka_kumatori", label: "熊取町", domain: "www.town.kumatori.lg.jp" },
  { pref: "大阪府", key: "osaka_tajiri", label: "田尻町", domain: "www.town.tajiri.osaka.jp" },
  { pref: "大阪府", key: "osaka_misaki", label: "岬町", domain: "www.town.misaki.osaka.jp" },
  { pref: "大阪府", key: "osaka_taishi", label: "太子町", domain: "www.town.taishi.osaka.jp" },
  { pref: "大阪府", key: "osaka_kanan", label: "河南町", domain: "www.town.kanan.osaka.jp" },
  { pref: "大阪府", key: "osaka_chihayaakasaka", label: "千早赤阪村", domain: "www.vill.chihayaakasaka.osaka.jp" },

  // ========== 兵庫県 (41) ==========
  { pref: "兵庫県", key: "hyogo_kobe", label: "神戸市", domain: "www.city.kobe.lg.jp" },
  { pref: "兵庫県", key: "hyogo_himeji", label: "姫路市", domain: "www.city.himeji.lg.jp" },
  { pref: "兵庫県", key: "hyogo_amagasaki", label: "尼崎市", domain: "www.city.amagasaki.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_akashi", label: "明石市", domain: "www.city.akashi.lg.jp" },
  { pref: "兵庫県", key: "hyogo_nishinomiya", label: "西宮市", domain: "www.nishi.or.jp" },
  { pref: "兵庫県", key: "hyogo_sumoto", label: "洲本市", domain: "www.city.sumoto.lg.jp" },
  { pref: "兵庫県", key: "hyogo_ashiya", label: "芦屋市", domain: "www.city.ashiya.lg.jp" },
  { pref: "兵庫県", key: "hyogo_itami", label: "伊丹市", domain: "www.city.itami.lg.jp" },
  { pref: "兵庫県", key: "hyogo_aioi", label: "相生市", domain: "www.city.aioi.lg.jp" },
  { pref: "兵庫県", key: "hyogo_toyooka", label: "豊岡市", domain: "www.city.toyooka.lg.jp" },
  { pref: "兵庫県", key: "hyogo_kakogawa", label: "加古川市", domain: "www.city.kakogawa.lg.jp" },
  { pref: "兵庫県", key: "hyogo_tatsuno", label: "たつの市", domain: "www.city.tatsuno.lg.jp" },
  { pref: "兵庫県", key: "hyogo_ako", label: "赤穂市", domain: "www.city.ako.lg.jp" },
  { pref: "兵庫県", key: "hyogo_nishiwaki", label: "西脇市", domain: "www.city.nishiwaki.lg.jp" },
  { pref: "兵庫県", key: "hyogo_takarazuka", label: "宝塚市", domain: "www.city.takarazuka.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_miki", label: "三木市", domain: "www.city.miki.lg.jp" },
  { pref: "兵庫県", key: "hyogo_takasago", label: "高砂市", domain: "www.city.takasago.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_kawanishi", label: "川西市", domain: "www.city.kawanishi.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_ono", label: "小野市", domain: "www.city.ono.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_sanda", label: "三田市", domain: "www.city.sanda.lg.jp" },
  { pref: "兵庫県", key: "hyogo_kasai", label: "加西市", domain: "www.city.kasai.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_tanba", label: "丹波市", domain: "www.city.tamba.lg.jp" },
  { pref: "兵庫県", key: "hyogo_minamiawaji", label: "南あわじ市", domain: "www.city.minamiawaji.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_asago", label: "朝来市", domain: "www.city.asago.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_awaji", label: "淡路市", domain: "www.city.awaji.lg.jp" },
  { pref: "兵庫県", key: "hyogo_shiso", label: "宍粟市", domain: "www.city.shiso.lg.jp" },
  { pref: "兵庫県", key: "hyogo_kato", label: "加東市", domain: "www.city.kato.lg.jp" },
  { pref: "兵庫県", key: "hyogo_tambasasayama", label: "丹波篠山市", domain: "www.city.tambasasayama.lg.jp" },
  { pref: "兵庫県", key: "hyogo_inagawa", label: "猪名川町", domain: "www.town.inagawa.lg.jp" },
  { pref: "兵庫県", key: "hyogo_taka", label: "多可町", domain: "www.town.taka.lg.jp" },
  { pref: "兵庫県", key: "hyogo_harima", label: "播磨町", domain: "www.town.harima.lg.jp" },
  { pref: "兵庫県", key: "hyogo_inami", label: "稲美町", domain: "www.town.hyogo-inami.lg.jp" },
  { pref: "兵庫県", key: "hyogo_fukusaki", label: "福崎町", domain: "www.town.fukusaki.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_kamikawa", label: "神河町", domain: "www.town.kamikawa.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_taishi_hg", label: "太子町", domain: "www.town.hyogo-taishi.lg.jp" },
  { pref: "兵庫県", key: "hyogo_kamigori", label: "上郡町", domain: "www.town.kamigori.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_sayo", label: "佐用町", domain: "www.town.sayo.lg.jp" },
  { pref: "兵庫県", key: "hyogo_kami", label: "香美町", domain: "www.town.mikata-kami.lg.jp" },
  { pref: "兵庫県", key: "hyogo_shinonsen", label: "新温泉町", domain: "www.town.shinonsen.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_yabu", label: "養父市", domain: "www.city.yabu.hyogo.jp" },
  { pref: "兵庫県", key: "hyogo_ichikawa", label: "市川町", domain: "www.town.ichikawa.lg.jp" },

  // ========== 奈良県 (39) ==========
  { pref: "奈良県", key: "nara_nara", label: "奈良市", domain: "www.city.nara.lg.jp" },
  { pref: "奈良県", key: "nara_yamatotakada", label: "大和高田市", domain: "www.city.yamatotakada.nara.jp" },
  { pref: "奈良県", key: "nara_yamatokoriyama", label: "大和郡山市", domain: "www.city.yamatokoriyama.lg.jp" },
  { pref: "奈良県", key: "nara_tenri", label: "天理市", domain: "www.city.tenri.nara.jp" },
  { pref: "奈良県", key: "nara_kashihara", label: "橿原市", domain: "www.city.kashihara.nara.jp" },
  { pref: "奈良県", key: "nara_sakurai", label: "桜井市", domain: "www.city.sakurai.lg.jp" },
  { pref: "奈良県", key: "nara_gojo", label: "五條市", domain: "www.city.gojo.lg.jp" },
  { pref: "奈良県", key: "nara_gose", label: "御所市", domain: "www.city.gose.nara.jp" },
  { pref: "奈良県", key: "nara_ikoma", label: "生駒市", domain: "www.city.ikoma.lg.jp" },
  { pref: "奈良県", key: "nara_kashiba", label: "香芝市", domain: "www.city.kashiba.lg.jp" },
  { pref: "奈良県", key: "nara_katsuragi", label: "葛城市", domain: "www.city.katsuragi.nara.jp" },
  { pref: "奈良県", key: "nara_uda", label: "宇陀市", domain: "www.city.uda.nara.jp" },
  { pref: "奈良県", key: "nara_yamazoe", label: "山添村", domain: "www.vill.yamazoe.nara.jp" },
  { pref: "奈良県", key: "nara_heguri", label: "平群町", domain: "www.town.heguri.nara.jp" },
  { pref: "奈良県", key: "nara_sango", label: "三郷町", domain: "www.town.sango.nara.jp" },
  { pref: "奈良県", key: "nara_ikaruga", label: "斑鳩町", domain: "www.town.ikaruga.nara.jp" },
  { pref: "奈良県", key: "nara_ando", label: "安堵町", domain: "www.town.ando.nara.jp" },
  { pref: "奈良県", key: "nara_kawanishi_nr", label: "川西町", domain: "www.town.nara-kawanishi.lg.jp" },
  { pref: "奈良県", key: "nara_miyake", label: "三宅町", domain: "www.town.miyake.lg.jp" },
  { pref: "奈良県", key: "nara_tawaramoto", label: "田原本町", domain: "www.town.tawaramoto.nara.jp" },
  { pref: "奈良県", key: "nara_soni", label: "曽爾村", domain: "www.vill.soni.nara.jp" },
  { pref: "奈良県", key: "nara_mitsue", label: "御杖村", domain: "www.vill.mitsue.nara.jp" },
  { pref: "奈良県", key: "nara_takatori", label: "高取町", domain: "www.town.takatori.nara.jp" },
  { pref: "奈良県", key: "nara_asuka", label: "明日香村", domain: "www.asukamura.jp" },
  { pref: "奈良県", key: "nara_kamikitayama", label: "上北山村", domain: "www.vill.kamikitayama.nara.jp" },
  { pref: "奈良県", key: "nara_shimokitayama", label: "下北山村", domain: "www.vill.shimokitayama.lg.jp" },
  { pref: "奈良県", key: "nara_tenkawa", label: "天川村", domain: "www.vill.tenkawa.nara.jp" },
  { pref: "奈良県", key: "nara_nosegawa", label: "野迫川村", domain: "www.vill.nosegawa.nara.jp" },
  { pref: "奈良県", key: "nara_totsukawa", label: "十津川村", domain: "www.vill.totsukawa.lg.jp" },
  { pref: "奈良県", key: "nara_shimokitayama2", skip: true },
  { pref: "奈良県", key: "nara_kurotaki", label: "黒滝村", domain: "www.vill.kurotaki.nara.jp" },
  { pref: "奈良県", key: "nara_oyodo", label: "大淀町", domain: "www.town.oyodo.lg.jp" },
  { pref: "奈良県", key: "nara_shimoichi", label: "下市町", domain: "www.town.shimoichi.lg.jp" },
  { pref: "奈良県", key: "nara_yoshino", label: "吉野町", domain: "www.town.yoshino.nara.jp" },
  { pref: "奈良県", key: "nara_ouda", label: "大宇陀町", skip: true },
  { pref: "奈良県", key: "nara_kanmaki", label: "上牧町", domain: "www.town.kanmaki.nara.jp" },
  { pref: "奈良県", key: "nara_oji", label: "王寺町", domain: "www.town.oji.nara.jp" },
  { pref: "奈良県", key: "nara_koryo", label: "広陵町", domain: "www.town.koryo.nara.jp" },
  { pref: "奈良県", key: "nara_kawai", label: "河合町", domain: "www.town.kawai.nara.jp" },

  // ========== 和歌山県 (30) ==========
  { pref: "和歌山県", key: "wakayama_wakayama", label: "和歌山市", domain: "www.city.wakayama.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_kainan", label: "海南市", domain: "www.city.kainan.lg.jp" },
  { pref: "和歌山県", key: "wakayama_hashimoto", label: "橋本市", domain: "www.city.hashimoto.lg.jp" },
  { pref: "和歌山県", key: "wakayama_arida", label: "有田市", domain: "www.city.arida.lg.jp" },
  { pref: "和歌山県", key: "wakayama_gobo", label: "御坊市", domain: "www.city.gobo.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_tanabe", label: "田辺市", domain: "www.city.tanabe.lg.jp" },
  { pref: "和歌山県", key: "wakayama_shingu", label: "新宮市", domain: "www.city.shingu.lg.jp" },
  { pref: "和歌山県", key: "wakayama_kinokawa", label: "紀の川市", domain: "www.city.kinokawa.lg.jp" },
  { pref: "和歌山県", key: "wakayama_iwade", label: "岩出市", domain: "www.city.iwade.lg.jp" },
  { pref: "和歌山県", key: "wakayama_kimino", label: "紀美野町", domain: "www.town.kimino.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_katsuragi_wk", label: "かつらぎ町", domain: "www.town.katsuragi.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_kudoyama", label: "九度山町", domain: "www.town.kudoyama.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_koya", label: "高野町", domain: "www.town.koya.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_yuasa", label: "湯浅町", domain: "www.town.yuasa.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_hirogawa", label: "広川町", domain: "www.town.hirogawa.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_aridagawa", label: "有田川町", domain: "www.town.aridagawa.lg.jp" },
  { pref: "和歌山県", key: "wakayama_mihama_wk", label: "美浜町", domain: "www.town.mihama.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_hidaka", label: "日高町", domain: "www.town.hidaka.lg.jp" },
  { pref: "和歌山県", key: "wakayama_yura", label: "由良町", domain: "www.town.yura.lg.jp" },
  { pref: "和歌山県", key: "wakayama_inami_wk", label: "印南町", domain: "www.town.wakayama-inami.lg.jp" },
  { pref: "和歌山県", key: "wakayama_minabe", label: "みなべ町", domain: "www.town.minabe.lg.jp" },
  { pref: "和歌山県", key: "wakayama_hidakagawa", label: "日高川町", domain: "www.town.hidakagawa.lg.jp" },
  { pref: "和歌山県", key: "wakayama_shirahama", label: "白浜町", domain: "www.town.shirahama.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_kamitonda", label: "上富田町", domain: "www.town.kamitonda.lg.jp" },
  { pref: "和歌山県", key: "wakayama_susami", label: "すさみ町", domain: "www.town.susami.lg.jp" },
  { pref: "和歌山県", key: "wakayama_nachikatsuura", label: "那智勝浦町", domain: "www.town.nachikatsuura.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_taiji", label: "太地町", domain: "www.town.taiji.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_kozagawa", label: "古座川町", domain: "www.town.kozagawa.lg.jp" },
  { pref: "和歌山県", key: "wakayama_kushimoto", label: "串本町", domain: "www.town.kushimoto.wakayama.jp" },
  { pref: "和歌山県", key: "wakayama_kitayama", label: "北山村", domain: "www.vill.kitayama.wakayama.jp" },
];

const ACTIVE = KINKI.filter(m => !m.skip);

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: controller.signal, redirect: "follow",
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

  try { const res = await fetchWithTimeout(`${base}/calendar.json`); if (res.ok) { const text = await res.text(); if (text.startsWith("[") || text.startsWith("{")) { const data = JSON.parse(text); results.hits.push({ type: "calendar.json", url: `${base}/calendar.json`, count: Array.isArray(data) ? data.length : 0 }); } } } catch {}

  for (const path of [`/cal.php?ym=${ym}`, `/cgi/cal.php?ym=${ym}`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("calendarlist") || text.includes("calendar_day") || text.includes("<table")) { results.hits.push({ type: "cal.php", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); } } } catch {} }

  for (const path of [`/event/kosodate/calendar/list_calendar${ym}.html`, `/event/kosodate/calendar/list_calendar.html`, `/event/calendar/list_calendar${ym}.html`, `/event/list_calendar${ym}.html`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("calendarlist") || text.includes("calendar_day")) { results.hits.push({ type: "list_calendar", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); break; } } } catch {} }

  for (const path of [`/event/${ym}.html`, `/event2/${ym}.html`]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("event_day") || text.includes("calendar") || text.includes("イベント")) { results.hits.push({ type: "municipal-calendar", url: `${base}${path}`, eventCount: (text.match(/<a\s+href=/gi) || []).length }); break; } } } catch {} }

  try { const res = await fetchWithTimeout(`${base}/wp-json/wp/v2/posts?per_page=5`); if (res.ok) { const text = await res.text(); if (text.startsWith("[")) { results.hits.push({ type: "wordpress", url: `${base}/wp-json/wp/v2/posts`, count: JSON.parse(text).length }); } } } catch {}

  for (const path of ["/calendar/event_j.js", "/event_j.js"]) { try { const res = await fetchWithTimeout(`${base}${path}`); if (res.ok) { const text = await res.text(); if (text.includes("eventlist") || text.includes("var ")) { results.hits.push({ type: "event_j.js", url: `${base}${path}` }); break; } } } catch {} }

  return results;
}

async function main() {
  console.log(`近畿7府県 CMS probe: ${ACTIVE.length} municipalities`);
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

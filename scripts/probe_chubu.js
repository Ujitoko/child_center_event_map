#!/usr/bin/env node
/**
 * 中部9県 全自治体 CMS自動probe
 * 新潟, 富山, 石川, 福井, 山梨, 長野, 岐阜, 静岡, 愛知
 */

const CHUBU = [
  // ========== 新潟県 (30) ==========
  { pref: "新潟県", key: "niigata_niigata", label: "新潟市", domain: "www.city.niigata.lg.jp" },
  { pref: "新潟県", key: "niigata_nagaoka", label: "長岡市", domain: "www.city.nagaoka.niigata.jp" },
  { pref: "新潟県", key: "niigata_sanjo", label: "三条市", domain: "www.city.sanjo.niigata.jp" },
  { pref: "新潟県", key: "niigata_kashiwazaki", label: "柏崎市", domain: "www.city.kashiwazaki.lg.jp" },
  { pref: "新潟県", key: "niigata_shibata", label: "新発田市", domain: "www.city.shibata.lg.jp" },
  { pref: "新潟県", key: "niigata_ojiya", label: "小千谷市", domain: "www.city.ojiya.niigata.jp" },
  { pref: "新潟県", key: "niigata_kamo", label: "加茂市", domain: "www.city.kamo.niigata.jp" },
  { pref: "新潟県", key: "niigata_tokamachi", label: "十日町市", domain: "www.city.tokamachi.lg.jp" },
  { pref: "新潟県", key: "niigata_mitsuke", label: "見附市", domain: "www.city.mitsuke.niigata.jp" },
  { pref: "新潟県", key: "niigata_murakami", label: "村上市", domain: "www.city.murakami.lg.jp" },
  { pref: "新潟県", key: "niigata_tsubame", label: "燕市", domain: "www.city.tsubame.niigata.jp" },
  { pref: "新潟県", key: "niigata_itoigawa", label: "糸魚川市", domain: "www.city.itoigawa.lg.jp" },
  { pref: "新潟県", key: "niigata_myoko", label: "妙高市", domain: "www.city.myoko.niigata.jp" },
  { pref: "新潟県", key: "niigata_gosen", label: "五泉市", domain: "www.city.gosen.lg.jp" },
  { pref: "新潟県", key: "niigata_joetsu", label: "上越市", domain: "www.city.joetsu.niigata.jp" },
  { pref: "新潟県", key: "niigata_agano", label: "阿賀野市", domain: "www.city.agano.niigata.jp" },
  { pref: "新潟県", key: "niigata_sado", label: "佐渡市", domain: "www.city.sado.niigata.jp" },
  { pref: "新潟県", key: "niigata_uonuma", label: "魚沼市", domain: "www.city.uonuma.lg.jp" },
  { pref: "新潟県", key: "niigata_minamiuonuma", label: "南魚沼市", domain: "www.city.minamiuonuma.niigata.jp" },
  { pref: "新潟県", key: "niigata_tainai", label: "胎内市", domain: "www.city.tainai.niigata.jp" },
  { pref: "新潟県", key: "niigata_seiro", label: "聖籠町", domain: "www.town.seiro.niigata.jp" },
  { pref: "新潟県", key: "niigata_yahiko", label: "弥彦村", domain: "www.vill.yahiko.niigata.jp" },
  { pref: "新潟県", key: "niigata_tagami", label: "田上町", domain: "www.town.tagami.niigata.jp" },
  { pref: "新潟県", key: "niigata_aga", label: "阿賀町", domain: "www.town.aga.niigata.jp" },
  { pref: "新潟県", key: "niigata_izumozaki", label: "出雲崎町", domain: "www.town.izumozaki.niigata.jp" },
  { pref: "新潟県", key: "niigata_yuzawa", label: "湯沢町", domain: "www.town.yuzawa.lg.jp" },
  { pref: "新潟県", key: "niigata_tsunan", label: "津南町", domain: "www.town.tsunan.niigata.jp" },
  { pref: "新潟県", key: "niigata_kariwa", label: "刈羽村", domain: "www.vill.kariwa.niigata.jp" },
  { pref: "新潟県", key: "niigata_sekikawa", label: "関川村", domain: "www.vill.sekikawa.niigata.jp" },
  { pref: "新潟県", key: "niigata_awashimaura", label: "粟島浦村", domain: "www.vill.awashimaura.lg.jp" },

  // ========== 富山県 (15) ==========
  { pref: "富山県", key: "toyama_toyama", label: "富山市", domain: "www.city.toyama.lg.jp" },
  { pref: "富山県", key: "toyama_takaoka", label: "高岡市", domain: "www.city.takaoka.toyama.jp" },
  { pref: "富山県", key: "toyama_uozu", label: "魚津市", domain: "www.city.uozu.toyama.jp" },
  { pref: "富山県", key: "toyama_himi", label: "氷見市", domain: "www.city.himi.toyama.jp" },
  { pref: "富山県", key: "toyama_namerikawa", label: "滑川市", domain: "www.city.namerikawa.toyama.jp" },
  { pref: "富山県", key: "toyama_kurobe", label: "黒部市", domain: "www.city.kurobe.toyama.jp" },
  { pref: "富山県", key: "toyama_tonami", label: "砺波市", domain: "www.city.tonami.lg.jp" },
  { pref: "富山県", key: "toyama_oyabe", label: "小矢部市", domain: "www.city.oyabe.toyama.jp" },
  { pref: "富山県", key: "toyama_nanto", label: "南砺市", domain: "www.city.nanto.toyama.jp" },
  { pref: "富山県", key: "toyama_imizu", label: "射水市", domain: "www.city.imizu.toyama.jp" },
  { pref: "富山県", key: "toyama_funahashi", label: "舟橋村", domain: "www.vill.funahashi.toyama.jp" },
  { pref: "富山県", key: "toyama_kamiichi", label: "上市町", domain: "www.town.kamiichi.toyama.jp" },
  { pref: "富山県", key: "toyama_tateyama", label: "立山町", domain: "www.town.tateyama.toyama.jp" },
  { pref: "富山県", key: "toyama_nyuzen", label: "入善町", domain: "www.town.nyuzen.toyama.jp" },
  { pref: "富山県", key: "toyama_asahi_ty", label: "朝日町", domain: "www.town.asahi.toyama.jp" },

  // ========== 石川県 (19) ==========
  { pref: "石川県", key: "ishikawa_kanazawa", label: "金沢市", domain: "www4.city.kanazawa.lg.jp" },
  { pref: "石川県", key: "ishikawa_nanao", label: "七尾市", domain: "www.city.nanao.lg.jp" },
  { pref: "石川県", key: "ishikawa_komatsu", label: "小松市", domain: "www.city.komatsu.lg.jp" },
  { pref: "石川県", key: "ishikawa_wajima", label: "輪島市", domain: "www.city.wajima.ishikawa.jp" },
  { pref: "石川県", key: "ishikawa_suzu", label: "珠洲市", domain: "www.city.suzu.lg.jp" },
  { pref: "石川県", key: "ishikawa_kaga", label: "加賀市", domain: "www.city.kaga.ishikawa.jp" },
  { pref: "石川県", key: "ishikawa_hakui", label: "羽咋市", domain: "www.city.hakui.lg.jp" },
  { pref: "石川県", key: "ishikawa_kahoku", label: "かほく市", domain: "www.city.kahoku.lg.jp" },
  { pref: "石川県", key: "ishikawa_hakusan", label: "白山市", domain: "www.city.hakusan.lg.jp" },
  { pref: "石川県", key: "ishikawa_nomi", label: "能美市", domain: "www.city.nomi.ishikawa.jp" },
  { pref: "石川県", key: "ishikawa_nonoichi", label: "野々市市", domain: "www.city.nonoichi.lg.jp" },
  { pref: "石川県", key: "ishikawa_kawakita", label: "川北町", domain: "www.town.kawakita.ishikawa.jp" },
  { pref: "石川県", key: "ishikawa_uchinada", label: "内灘町", domain: "www.town.uchinada.lg.jp" },
  { pref: "石川県", key: "ishikawa_tsubata", label: "津幡町", domain: "www.town.tsubata.lg.jp" },
  { pref: "石川県", key: "ishikawa_shika", label: "志賀町", domain: "www.town.shika.lg.jp" },
  { pref: "石川県", key: "ishikawa_hodatsushimizu", label: "宝達志水町", domain: "www.hodatsushimizu.jp" },
  { pref: "石川県", key: "ishikawa_nakanoto", label: "中能登町", domain: "www.town.nakanoto.ishikawa.jp" },
  { pref: "石川県", key: "ishikawa_anamizu", label: "穴水町", domain: "www.town.anamizu.lg.jp" },
  { pref: "石川県", key: "ishikawa_noto", label: "能登町", domain: "www.town.noto.lg.jp" },

  // ========== 福井県 (17) ==========
  { pref: "福井県", key: "fukui_fukui", label: "福井市", domain: "www.city.fukui.lg.jp" },
  { pref: "福井県", key: "fukui_tsuruga", label: "敦賀市", domain: "www.city.tsuruga.lg.jp" },
  { pref: "福井県", key: "fukui_obama", label: "小浜市", domain: "www.city.obama.fukui.jp" },
  { pref: "福井県", key: "fukui_ono", label: "大野市", domain: "www.city.ono.fukui.jp" },
  { pref: "福井県", key: "fukui_katsuyama", label: "勝山市", domain: "www.city.katsuyama.fukui.jp" },
  { pref: "福井県", key: "fukui_sabae", label: "鯖江市", domain: "www.city.sabae.fukui.jp" },
  { pref: "福井県", key: "fukui_awara", label: "あわら市", domain: "www.city.awara.lg.jp" },
  { pref: "福井県", key: "fukui_echizen", label: "越前市", domain: "www.city.echizen.lg.jp" },
  { pref: "福井県", key: "fukui_sakai", label: "坂井市", domain: "www.city.fukui-sakai.lg.jp" },
  { pref: "福井県", key: "fukui_eiheiji", label: "永平寺町", domain: "www.town.eiheiji.lg.jp" },
  { pref: "福井県", key: "fukui_ikeda", label: "池田町", domain: "www.town.ikeda.fukui.jp" },
  { pref: "福井県", key: "fukui_minamiechizen", label: "南越前町", domain: "www.town.minamiechizen.lg.jp" },
  { pref: "福井県", key: "fukui_echizen_cho", label: "越前町", domain: "www.town.echizen.fukui.jp" },
  { pref: "福井県", key: "fukui_mihama", label: "美浜町", domain: "www.town.mihama.fukui.jp" },
  { pref: "福井県", key: "fukui_takahama", label: "高浜町", domain: "www.town.takahama.fukui.jp" },
  { pref: "福井県", key: "fukui_ohi", label: "おおい町", domain: "www.town.ohi.fukui.jp" },
  { pref: "福井県", key: "fukui_wakasa", label: "若狭町", domain: "www.town.fukui-wakasa.lg.jp" },

  // ========== 山梨県 (27) ==========
  { pref: "山梨県", key: "yamanashi_kofu", label: "甲府市", domain: "www.city.kofu.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_fujiyoshida", label: "富士吉田市", domain: "www.city.fujiyoshida.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_tsuru", label: "都留市", domain: "www.city.tsuru.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_otsuki", label: "大月市", domain: "www.city.otsuki.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_nirasaki", label: "韮崎市", domain: "www.city.nirasaki.lg.jp" },
  { pref: "山梨県", key: "yamanashi_minamialps", label: "南アルプス市", domain: "www.city.minami-alps.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_hokuto", label: "北杜市", domain: "www.city.hokuto.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_kai", label: "甲斐市", domain: "www.city.kai.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_fuefuki", label: "笛吹市", domain: "www.city.fuefuki.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_uenohara", label: "上野原市", domain: "www.city.uenohara.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_koshu", label: "甲州市", domain: "www.city.koshu.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_chuo", label: "中央市", domain: "www.city.chuo.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_ichikawamisato", label: "市川三郷町", domain: "www.town.ichikawamisato.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_hayakawa", label: "早川町", domain: "www.town.hayakawa.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_minobu", label: "身延町", domain: "www.town.minobu.lg.jp" },
  { pref: "山梨県", key: "yamanashi_nanbu", label: "南部町", domain: "www.town.nanbu.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_fujikawa", label: "富士川町", domain: "www.town.fujikawa.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_showa", label: "昭和町", domain: "www.town.showa.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_oshino", label: "忍野村", domain: "www.vill.oshino.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_yamanakako", label: "山中湖村", domain: "www.vill.yamanakako.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_narusawa", label: "鳴沢村", domain: "www.vill.narusawa.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_fujikawaguchiko", label: "富士河口湖町", domain: "www.town.fujikawaguchiko.lg.jp" },
  { pref: "山梨県", key: "yamanashi_kosugemura", label: "小菅村", domain: "www.vill.kosuge.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_tabayama", label: "丹波山村", domain: "www.vill.tabayama.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_nishikatsura", label: "西桂町", domain: "www.town.nishikatsura.yamanashi.jp" },
  { pref: "山梨県", key: "yamanashi_doshi", label: "道志村", domain: "www.vill.doshi.lg.jp" },
  { pref: "山梨県", key: "yamanashi_yamanashi", label: "山梨市", domain: "www.city.yamanashi.yamanashi.jp" },

  // ========== 長野県 (77) ==========
  { pref: "長野県", key: "nagano_nagano", label: "長野市", domain: "www.city.nagano.nagano.jp" },
  { pref: "長野県", key: "nagano_matsumoto", label: "松本市", domain: "www.city.matsumoto.nagano.jp" },
  { pref: "長野県", key: "nagano_ueda", label: "上田市", domain: "www.city.ueda.nagano.jp" },
  { pref: "長野県", key: "nagano_okaya", label: "岡谷市", domain: "www.city.okaya.lg.jp" },
  { pref: "長野県", key: "nagano_iida", label: "飯田市", domain: "www.city.iida.lg.jp" },
  { pref: "長野県", key: "nagano_suwa", label: "諏訪市", domain: "www.city.suwa.lg.jp" },
  { pref: "長野県", key: "nagano_suzaka", label: "須坂市", domain: "www.city.suzaka.nagano.jp" },
  { pref: "長野県", key: "nagano_komoro", label: "小諸市", domain: "www.city.komoro.lg.jp" },
  { pref: "長野県", key: "nagano_ina", label: "伊那市", domain: "www.city.ina.nagano.jp" },
  { pref: "長野県", key: "nagano_komagane", label: "駒ヶ根市", domain: "www.city.komagane.nagano.jp" },
  { pref: "長野県", key: "nagano_nakano", label: "中野市", domain: "www.city.nakano.nagano.jp" },
  { pref: "長野県", key: "nagano_omachi", label: "大町市", domain: "www.city.omachi.nagano.jp" },
  { pref: "長野県", key: "nagano_iiyama", label: "飯山市", domain: "www.city.iiyama.nagano.jp" },
  { pref: "長野県", key: "nagano_chino", label: "茅野市", domain: "www.city.chino.lg.jp" },
  { pref: "長野県", key: "nagano_shiojiri", label: "塩尻市", domain: "www.city.shiojiri.lg.jp" },
  { pref: "長野県", key: "nagano_saku", label: "佐久市", domain: "www.city.saku.nagano.jp" },
  { pref: "長野県", key: "nagano_chikuma", label: "千曲市", domain: "www.city.chikuma.lg.jp" },
  { pref: "長野県", key: "nagano_tomi", label: "東御市", domain: "www.city.tomi.nagano.jp" },
  { pref: "長野県", key: "nagano_azumino", label: "安曇野市", domain: "www.city.azumino.nagano.jp" },
  { pref: "長野県", key: "nagano_karuizawa", label: "軽井沢町", domain: "www.town.karuizawa.lg.jp" },
  { pref: "長野県", key: "nagano_miyota", label: "御代田町", domain: "www.town.miyota.nagano.jp" },
  { pref: "長野県", key: "nagano_tateshina", label: "立科町", domain: "www.town.tateshina.nagano.jp" },
  { pref: "長野県", key: "nagano_nagawa", label: "長和町", domain: "www.town.nagawa.nagano.jp" },
  { pref: "長野県", key: "nagano_shimosuwa", label: "下諏訪町", domain: "www.town.shimosuwa.lg.jp" },
  { pref: "長野県", key: "nagano_fujimi", label: "富士見町", domain: "www.town.fujimi.lg.jp" },
  { pref: "長野県", key: "nagano_haramura", label: "原村", domain: "www.vill.hara.lg.jp" },
  { pref: "長野県", key: "nagano_tatsuno", label: "辰野町", domain: "www.town.tatsuno.lg.jp" },
  { pref: "長野県", key: "nagano_minowa", label: "箕輪町", domain: "www.town.minowa.lg.jp" },
  { pref: "長野県", key: "nagano_iijimacho", label: "飯島町", domain: "www.town.iijima.lg.jp" },
  { pref: "長野県", key: "nagano_minamiminowa", label: "南箕輪村", domain: "www.vill.minamiminowa.lg.jp" },
  { pref: "長野県", key: "nagano_nakagawa_ng", label: "中川村", domain: "www.vill.nakagawa.nagano.jp" },
  { pref: "長野県", key: "nagano_miyada", label: "宮田村", domain: "www.vill.miyada.nagano.jp" },
  { pref: "長野県", key: "nagano_matsukawa", label: "松川町", domain: "www.town.matsukawa.lg.jp" },
  { pref: "長野県", key: "nagano_takamori", label: "高森町", domain: "www.town.takamori.nagano.jp" },
  { pref: "長野県", key: "nagano_anan", label: "阿南町", domain: "www.town.anan.nagano.jp" },
  { pref: "長野県", key: "nagano_agematsu", label: "上松町", domain: "www.town.agematsu.nagano.jp" },
  { pref: "長野県", key: "nagano_kiso", label: "木曽町", domain: "www.town-kiso.com" },
  { pref: "長野県", key: "nagano_ikeda", label: "池田町", domain: "www.ikedamachi.net" },
  { pref: "長野県", key: "nagano_matsukawa_ng", label: "松川村", domain: "www.vill.matsukawa.nagano.jp" },
  { pref: "長野県", key: "nagano_hakuba", label: "白馬村", domain: "www.vill.hakuba.lg.jp" },
  { pref: "長野県", key: "nagano_otari", label: "小谷村", domain: "www.vill.otari.nagano.jp" },
  { pref: "長野県", key: "nagano_sakaki", label: "坂城町", domain: "www.town.sakaki.nagano.jp" },
  { pref: "長野県", key: "nagano_obuse", label: "小布施町", domain: "www.town.obuse.nagano.jp" },
  { pref: "長野県", key: "nagano_takayama_ng", label: "高山村", domain: "www.vill.takayama.nagano.jp" },
  { pref: "長野県", key: "nagano_yamanouchi", label: "山ノ内町", domain: "www.town.yamanouchi.nagano.jp" },
  { pref: "長野県", key: "nagano_kijimadaira", label: "木島平村", domain: "www.vill.kijimadaira.lg.jp" },
  { pref: "長野県", key: "nagano_nozawaonsen", label: "野沢温泉村", domain: "www.vill.nozawaonsen.nagano.jp" },
  { pref: "長野県", key: "nagano_shinano", label: "信濃町", domain: "www.town.shinano.lg.jp" },
  { pref: "長野県", key: "nagano_iizuna", label: "飯綱町", domain: "www.town.iizuna.nagano.jp" },
  { pref: "長野県", key: "nagano_sakae", label: "栄村", domain: "www.vill.sakae.nagano.jp" },

  // ========== 岐阜県 (42) ==========
  { pref: "岐阜県", key: "gifu_gifu", label: "岐阜市", domain: "www.city.gifu.lg.jp" },
  { pref: "岐阜県", key: "gifu_ogaki", label: "大垣市", domain: "www.city.ogaki.lg.jp" },
  { pref: "岐阜県", key: "gifu_takayama", label: "高山市", domain: "www.city.takayama.lg.jp" },
  { pref: "岐阜県", key: "gifu_tajimi", label: "多治見市", domain: "www.city.tajimi.lg.jp" },
  { pref: "岐阜県", key: "gifu_seki", label: "関市", domain: "www.city.seki.lg.jp" },
  { pref: "岐阜県", key: "gifu_nakatsugawa", label: "中津川市", domain: "www.city.nakatsugawa.lg.jp" },
  { pref: "岐阜県", key: "gifu_mino", label: "美濃市", domain: "www.city.mino.gifu.jp" },
  { pref: "岐阜県", key: "gifu_mizunami", label: "瑞浪市", domain: "www.city.mizunami.lg.jp" },
  { pref: "岐阜県", key: "gifu_hashima", label: "羽島市", domain: "www.city.hashima.lg.jp" },
  { pref: "岐阜県", key: "gifu_ena", label: "恵那市", domain: "www.city.ena.lg.jp" },
  { pref: "岐阜県", key: "gifu_minokamo", label: "美濃加茂市", domain: "www.city.minokamo.lg.jp" },
  { pref: "岐阜県", key: "gifu_toki", label: "土岐市", domain: "www.city.toki.lg.jp" },
  { pref: "岐阜県", key: "gifu_kakamigahara", label: "各務原市", domain: "www.city.kakamigahara.lg.jp" },
  { pref: "岐阜県", key: "gifu_kani", label: "可児市", domain: "www.city.kani.lg.jp" },
  { pref: "岐阜県", key: "gifu_yamagata_gf", label: "山県市", domain: "www.city.yamagata.gifu.jp" },
  { pref: "岐阜県", key: "gifu_mizuho", label: "瑞穂市", domain: "www.city.mizuho.lg.jp" },
  { pref: "岐阜県", key: "gifu_hida", label: "飛騨市", domain: "www.city.hida.gifu.jp" },
  { pref: "岐阜県", key: "gifu_motosu", label: "本巣市", domain: "www.city.motosu.lg.jp" },
  { pref: "岐阜県", key: "gifu_gujo", label: "郡上市", domain: "www.city.gujo.gifu.jp" },
  { pref: "岐阜県", key: "gifu_gero", label: "下呂市", domain: "www.city.gero.lg.jp" },
  { pref: "岐阜県", key: "gifu_kaizu", label: "海津市", domain: "www.city.kaizu.lg.jp" },
  { pref: "岐阜県", key: "gifu_ginan", label: "岐南町", domain: "www.town.ginan.lg.jp" },
  { pref: "岐阜県", key: "gifu_kasamatsu", label: "笠松町", domain: "www.town.kasamatsu.gifu.jp" },
  { pref: "岐阜県", key: "gifu_yoro", label: "養老町", domain: "www.town.yoro.gifu.jp" },
  { pref: "岐阜県", key: "gifu_tarui", label: "垂井町", domain: "www.town.tarui.lg.jp" },
  { pref: "岐阜県", key: "gifu_sekigahara", label: "関ケ原町", domain: "www.town.sekigahara.gifu.jp" },
  { pref: "岐阜県", key: "gifu_godo", label: "神戸町", domain: "www.town.godo.gifu.jp" },
  { pref: "岐阜県", key: "gifu_wanouchi", label: "輪之内町", domain: "www.town.wanouchi.lg.jp" },
  { pref: "岐阜県", key: "gifu_anpachi", label: "安八町", domain: "www.town.anpachi.lg.jp" },
  { pref: "岐阜県", key: "gifu_ibigawa", label: "揖斐川町", domain: "www.town.ibigawa.lg.jp" },
  { pref: "岐阜県", key: "gifu_ono_gf", label: "大野町", domain: "www.town-ono.jp" },
  { pref: "岐阜県", key: "gifu_ikeda_gf", label: "池田町", domain: "www.town.ikeda.gifu.jp" },
  { pref: "岐阜県", key: "gifu_kitakata_gf", label: "北方町", domain: "www.town.kitagata.gifu.jp" },
  { pref: "岐阜県", key: "gifu_sakahogi", label: "坂祝町", domain: "www.town.sakahogi.gifu.jp" },
  { pref: "岐阜県", key: "gifu_tomika", label: "富加町", domain: "www.town.tomika.gifu.jp" },
  { pref: "岐阜県", key: "gifu_kawabe", label: "川辺町", domain: "www.town.kawabe.gifu.jp" },
  { pref: "岐阜県", key: "gifu_hichiso", label: "七宗町", domain: "www.hichiso.jp" },
  { pref: "岐阜県", key: "gifu_yaotsu", label: "八百津町", domain: "www.town.yaotsu.lg.jp" },
  { pref: "岐阜県", key: "gifu_shirakawa", label: "白川町", domain: "www.town.shirakawa.lg.jp" },
  { pref: "岐阜県", key: "gifu_mitake", label: "御嵩町", domain: "www.town.mitake.lg.jp" },
  { pref: "岐阜県", key: "gifu_shirakawago", label: "白川村", domain: "shirakawa-go.org" },
  { pref: "岐阜県", key: "gifu_higashishirakawa", label: "東白川村", domain: "www.vill.higashishirakawa.gifu.jp" },

  // ========== 静岡県 (35) ==========
  { pref: "静岡県", key: "shizuoka_shizuoka", label: "静岡市", domain: "www.city.shizuoka.lg.jp" },
  { pref: "静岡県", key: "shizuoka_hamamatsu", label: "浜松市", domain: "www.city.hamamatsu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_numazu", label: "沼津市", domain: "www.city.numazu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_atami", label: "熱海市", domain: "www.city.atami.lg.jp" },
  { pref: "静岡県", key: "shizuoka_mishima", label: "三島市", domain: "www.city.mishima.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_fujinomiya", label: "富士宮市", domain: "www.city.fujinomiya.lg.jp" },
  { pref: "静岡県", key: "shizuoka_ito", label: "伊東市", domain: "www.city.ito.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_shimada", label: "島田市", domain: "www.city.shimada.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_fuji", label: "富士市", domain: "www.city.fuji.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_iwata", label: "磐田市", domain: "www.city.iwata.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_yaizu", label: "焼津市", domain: "www.city.yaizu.lg.jp" },
  { pref: "静岡県", key: "shizuoka_kakegawa", label: "掛川市", domain: "www.city.kakegawa.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_fujieda", label: "藤枝市", domain: "www.city.fujieda.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_gotemba", label: "御殿場市", domain: "www.city.gotemba.lg.jp" },
  { pref: "静岡県", key: "shizuoka_fukuroi", label: "袋井市", domain: "www.city.fukuroi.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_shimoda", label: "下田市", domain: "www.city.shimoda.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_susono", label: "裾野市", domain: "www.city.susono.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_kosai", label: "湖西市", domain: "www.city.kosai.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_izunokuni", label: "伊豆の国市", domain: "www.city.izunokuni.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_izu", label: "伊豆市", domain: "www.city.izu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_omaezaki", label: "御前崎市", domain: "www.city.omaezaki.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_kikugawa", label: "菊川市", domain: "www.city.kikugawa.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_makinohara", label: "牧之原市", domain: "www.city.makinohara.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_nagaizumi", label: "長泉町", domain: "www.town.nagaizumi.lg.jp" },
  { pref: "静岡県", key: "shizuoka_shimizu_cho", label: "清水町", domain: "www.town.shimizu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_kannami", label: "函南町", domain: "www.town.kannami.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_oyama", label: "小山町", domain: "www.town.oyama.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_yoshida", label: "吉田町", domain: "www.town.yoshida.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_kawanehon", label: "川根本町", domain: "www.town.kawanehon.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_mori", label: "森町", domain: "www.town.morimachi.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_higashiizu", label: "東伊豆町", domain: "www.town.higashiizu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_kawazu", label: "河津町", domain: "www.town.kawazu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_minamiizu", label: "南伊豆町", domain: "www.town.minamiizu.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_matsuzaki", label: "松崎町", domain: "www.town.matsuzaki.shizuoka.jp" },
  { pref: "静岡県", key: "shizuoka_nishiizu", label: "西伊豆町", domain: "www.town.nishiizu.shizuoka.jp" },

  // ========== 愛知県 (54) ==========
  { pref: "愛知県", key: "aichi_nagoya", label: "名古屋市", domain: "www.city.nagoya.jp" },
  { pref: "愛知県", key: "aichi_toyohashi", label: "豊橋市", domain: "www.city.toyohashi.lg.jp" },
  { pref: "愛知県", key: "aichi_okazaki", label: "岡崎市", domain: "www.city.okazaki.lg.jp" },
  { pref: "愛知県", key: "aichi_ichinomiya", label: "一宮市", domain: "www.city.ichinomiya.aichi.jp" },
  { pref: "愛知県", key: "aichi_seto", label: "瀬戸市", domain: "www.city.seto.aichi.jp" },
  { pref: "愛知県", key: "aichi_handa", label: "半田市", domain: "www.city.handa.lg.jp" },
  { pref: "愛知県", key: "aichi_kasugai", label: "春日井市", domain: "www.city.kasugai.lg.jp" },
  { pref: "愛知県", key: "aichi_toyokawa", label: "豊川市", domain: "www.city.toyokawa.lg.jp" },
  { pref: "愛知県", key: "aichi_tsushima", label: "津島市", domain: "www.city.tsushima.lg.jp" },
  { pref: "愛知県", key: "aichi_hekinan", label: "碧南市", domain: "www.city.hekinan.lg.jp" },
  { pref: "愛知県", key: "aichi_kariya", label: "刈谷市", domain: "www.city.kariya.lg.jp" },
  { pref: "愛知県", key: "aichi_toyota", label: "豊田市", domain: "www.city.toyota.aichi.jp" },
  { pref: "愛知県", key: "aichi_anjo", label: "安城市", domain: "www.city.anjo.aichi.jp" },
  { pref: "愛知県", key: "aichi_nishio", label: "西尾市", domain: "www.city.nishio.aichi.jp" },
  { pref: "愛知県", key: "aichi_gamagori", label: "蒲郡市", domain: "www.city.gamagori.lg.jp" },
  { pref: "愛知県", key: "aichi_inuyama", label: "犬山市", domain: "www.city.inuyama.aichi.jp" },
  { pref: "愛知県", key: "aichi_tokoname", label: "常滑市", domain: "www.city.tokoname.aichi.jp" },
  { pref: "愛知県", key: "aichi_konan", label: "江南市", domain: "www.city.konan.lg.jp" },
  { pref: "愛知県", key: "aichi_komaki", label: "小牧市", domain: "www.city.komaki.aichi.jp" },
  { pref: "愛知県", key: "aichi_inazawa", label: "稲沢市", domain: "www.city.inazawa.aichi.jp" },
  { pref: "愛知県", key: "aichi_shinshiro", label: "新城市", domain: "www.city.shinshiro.lg.jp" },
  { pref: "愛知県", key: "aichi_tokai", label: "東海市", domain: "www.city.tokai.aichi.jp" },
  { pref: "愛知県", key: "aichi_obu", label: "大府市", domain: "www.city.obu.aichi.jp" },
  { pref: "愛知県", key: "aichi_chita", label: "知多市", domain: "www.city.chita.lg.jp" },
  { pref: "愛知県", key: "aichi_chiryu", label: "知立市", domain: "www.city.chiryu.aichi.jp" },
  { pref: "愛知県", key: "aichi_owariasahi", label: "尾張旭市", domain: "www.city.owariasahi.lg.jp" },
  { pref: "愛知県", key: "aichi_takahama", label: "高浜市", domain: "www.city.takahama.lg.jp" },
  { pref: "愛知県", key: "aichi_iwakura", label: "岩倉市", domain: "www.city.iwakura.aichi.jp" },
  { pref: "愛知県", key: "aichi_toyoake", label: "豊明市", domain: "www.city.toyoake.lg.jp" },
  { pref: "愛知県", key: "aichi_nisshin", label: "日進市", domain: "www.city.nisshin.lg.jp" },
  { pref: "愛知県", key: "aichi_tahara", label: "田原市", domain: "www.city.tahara.aichi.jp" },
  { pref: "愛知県", key: "aichi_aisai", label: "愛西市", domain: "www.city.aisai.lg.jp" },
  { pref: "愛知県", key: "aichi_kiyosu", label: "清須市", domain: "www.city.kiyosu.aichi.jp" },
  { pref: "愛知県", key: "aichi_kitanagoya", label: "北名古屋市", domain: "www.city.kitanagoya.lg.jp" },
  { pref: "愛知県", key: "aichi_yatomi", label: "弥富市", domain: "www.city.yatomi.lg.jp" },
  { pref: "愛知県", key: "aichi_miyoshi", label: "みよし市", domain: "www.city.aichi-miyoshi.lg.jp" },
  { pref: "愛知県", key: "aichi_ama", label: "あま市", domain: "www.city.ama.aichi.jp" },
  { pref: "愛知県", key: "aichi_nagakute", label: "長久手市", domain: "www.city.nagakute.lg.jp" },
  { pref: "愛知県", key: "aichi_togo", label: "東郷町", domain: "www.town.aichi-togo.lg.jp" },
  { pref: "愛知県", key: "aichi_toyoyama", label: "豊山町", domain: "www.town.toyoyama.lg.jp" },
  { pref: "愛知県", key: "aichi_oguchi", label: "大口町", domain: "www.town.oguchi.lg.jp" },
  { pref: "愛知県", key: "aichi_fuso", label: "扶桑町", domain: "www.town.fuso.lg.jp" },
  { pref: "愛知県", key: "aichi_oharu", label: "大治町", domain: "www.town.oharu.aichi.jp" },
  { pref: "愛知県", key: "aichi_kanie", label: "蟹江町", domain: "www.town.kanie.aichi.jp" },
  { pref: "愛知県", key: "aichi_tobishima", label: "飛島村", domain: "www.vill.tobishima.aichi.jp" },
  { pref: "愛知県", key: "aichi_agui", label: "阿久比町", domain: "www.town.agui.lg.jp" },
  { pref: "愛知県", key: "aichi_higashiura", label: "東浦町", domain: "www.town.aichi-higashiura.lg.jp" },
  { pref: "愛知県", key: "aichi_minamichita", label: "南知多町", domain: "www.town.minamichita.lg.jp" },
  { pref: "愛知県", key: "aichi_mihama_ac", label: "美浜町", domain: "www.town.aichi-mihama.lg.jp" },
  { pref: "愛知県", key: "aichi_taketoyo", label: "武豊町", domain: "www.town.taketoyo.lg.jp" },
  { pref: "愛知県", key: "aichi_kota", label: "幸田町", domain: "www.town.kota.lg.jp" },
  { pref: "愛知県", key: "aichi_shitara", label: "設楽町", domain: "www.town.shitara.lg.jp" },
  { pref: "愛知県", key: "aichi_toei", label: "東栄町", domain: "www.town.toei.aichi.jp" },
  { pref: "愛知県", key: "aichi_toyone", label: "豊根村", domain: "www.vill.toyone.aichi.jp" },
];

const ACTIVE = CHUBU.filter(m => !m.skip);

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

  for (const path of [`/event/${ym}.html`, `/event2/${ym}.html`]) {
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

  for (const path of ["/calendar/event_j.js", "/event_j.js"]) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`);
      if (res.ok) {
        const text = await res.text();
        if (text.includes("eventlist") || text.includes("var ")) {
          results.hits.push({ type: "event_j.js", url: `${base}${path}` });
          break;
        }
      }
    } catch {}
  }

  return results;
}

async function main() {
  console.log(`中部9県 CMS probe: ${ACTIVE.length} municipalities`);
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
        for (const h of r.hits) console.log(`  ${h.type}: ${h.url} ${h.count != null ? `(${h.count} entries)` : ""} ${h.eventCount != null ? `(${h.eventCount} links)` : ""}`);
      }
    }
  }
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  const byType = {};
  for (const r of allResults) for (const h of r.hits) { if (!byType[h.type]) byType[h.type] = []; byType[h.type].push({ ...r, hit: h }); }
  for (const [type, entries] of Object.entries(byType)) {
    console.log(`\n${type} (${entries.length} hits):`);
    for (const e of entries) console.log(`  ${e.pref} ${e.label}: ${e.hit.url} ${e.hit.count != null ? `(${e.hit.count})` : ""} ${e.hit.eventCount != null ? `(${e.hit.eventCount} links)` : ""}`);
  }
  const hitCount = allResults.filter(r => r.hits.length > 0).length;
  console.log(`\nTotal: ${hitCount}/${ACTIVE.length} municipalities with at least one CMS pattern`);
}
main().catch(console.error);
